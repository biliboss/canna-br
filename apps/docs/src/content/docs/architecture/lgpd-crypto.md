---
title: "LGPD — Modelo de Criptografia"
description: "AES-256-GCM por membro, crypto-deletion Art. 18 IV, CPF hash — dados de saúde protegidos na camada de dados."
---

## Hierarquia de Chaves — Envelope Encryption

A proteção criptográfica usa **envelope encryption** com Data Encryption Keys (DEK) **aleatórias por membro**. Derivação determinística foi descartada porque, com `site_key + member_id + salt` ainda existentes, a chave é recriável — anulando o crypto-deletion. Padrão envelope é a forma compatível com auditoria e LGPD Art. 18 IV.

```
Master Key (HashiCorp Vault / env cifrado)
  └── Site KEK (Key Encryption Key, rotação trimestral, por tenant)
        └── EncryptedMemberDEK (DEK aleatória, cifrada com Site KEK, armazenada por membro)
              └── AES-256-GCM(dado sensível, MemberDEK em claro)
```

### Master Key

- Armazenada em HashiCorp Vault (self-hosted) ou variável de ambiente cifrada no deploy Kamal
- Nunca aparece no banco de dados
- Rotação: anual ou após incidente de segurança

### Site KEK (Key Encryption Key)

- Derivada da Master Key + `site_id` (HKDF, não armazenada em DB)
- Rotação trimestral (jan / abr / jul / out)
- Após rotação: re-cifrar todas as `EncryptedMemberDEK` com a nova KEK (job background BullMQ)
- Versão da KEK armazenada junto à `EncryptedMemberDEK` para suportar janela de rotação
- **Site KEK nunca cifra dados diretamente** — só cifra DEKs

### Member DEK (Data Encryption Key)

- **Aleatória, 256 bits, gerada com `crypto.getRandomValues` no cadastro do membro**
- Cifrada com Site KEK → `EncryptedMemberDEK` armazenada na tabela `members`
- DEK em claro **nunca é persistida** — só decifrada em memória quando necessário ler/gravar dado sensível do membro
- Não é derivável a partir de outros dados — destruir `EncryptedMemberDEK` torna a DEK irrecuperável

```typescript
async function createMemberDEK(siteKEK: CryptoKey): Promise<{
  encryptedDEK: Uint8Array;
  iv: Uint8Array;
  kekVersion: number;
}> {
  // 1. Generate random DEK
  const dek = crypto.getRandomValues(new Uint8Array(32)); // 256 bits

  // 2. Wrap DEK with Site KEK (AES-256-GCM key wrap)
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    siteKEK,
    dek
  );

  // 3. Zero the plaintext DEK from memory
  dek.fill(0);

  return {
    encryptedDEK: new Uint8Array(encrypted),
    iv,
    kekVersion: currentKEKVersion(),
  };
}

async function unwrapMemberDEK(
  siteKEK: CryptoKey,
  encryptedDEK: Uint8Array,
  iv: Uint8Array
): Promise<CryptoKey> {
  const dekRaw = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    siteKEK,
    encryptedDEK
  );

  return crypto.subtle.importKey(
    "raw",
    dekRaw,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}
```

---

## O Que é Cifrado

Todos os campos marcados como `encrypted` na tabela `members` e `medical_records`:

| Campo | Classificação LGPD | Algoritmo |
|---|---|---|
| `name` | Dado pessoal | AES-256-GCM |
| `dob` (data de nascimento) | Dado pessoal | AES-256-GCM |
| `address` | Dado pessoal | AES-256-GCM |
| `phone` | Dado pessoal | AES-256-GCM |
| `email` | Dado pessoal | AES-256-GCM |
| `medical_condition` | **Dado sensível** (Art. 5 II) | AES-256-GCM |
| `prescription_text` | **Dado sensível** | AES-256-GCM |
| `physician_notes` | **Dado sensível** | AES-256-GCM |
| `medical_record_pdf` (MinIO) | **Dado sensível** | AES-256-GCM (server-side MinIO) |

### Campos Não Cifrados (necessários para queries)

| Campo | Justificativa |
|---|---|
| `id` (ULID) | PK — necessário para JOINs |
| `cpf_hash` | Hash SHA-256 — apenas para deduplicação |
| `status` (ativo/inativo) | Necessário para filtros operacionais |
| `created_at` | Auditoria temporal |
| `association_id` | Multi-tenancy |

---

## CPF — Nunca em Claro

O CPF nunca é armazenado em texto claro. É transformado em hash unidirecional para permitir verificação de duplicidade sem expor o dado:

```typescript
function hashCPF(cpf: string, siteSalt: string): string {
  // Normalizar: remover pontos e traço
  const normalized = cpf.replace(/[.\-]/g, "").trim();

  // SHA-256(cpf_normalizado + site_salt)
  // site_salt é específico por tenant — mesmo CPF produz hashes diferentes em tenants diferentes
  return crypto
    .createHash("sha256")
    .update(normalized + siteSalt)
    .digest("hex");
}
```

**Para verificar duplicidade:** hash do CPF fornecido pelo novo membro é comparado com `members.cpf_hash` — sem decriptografar nada.

**Para verificação de identidade física:** o atendente verifica CPF apresentado pelo membro contra o hash em tempo real — o CPF nunca fica salvo.

---

## Crypto-Deletion — Art. 18 IV LGPD

O direito de eliminação (Art. 18 IV LGPD) é implementado via **crypto-deletion**: ao invés de apagar fisicamente o registro (o que quebraria referências de auditoria e chain of custody), a `EncryptedMemberDEK` é destruída. **Sem a DEK, os dados cifrados se tornam ruído computacionalmente irrecuperável** — e como a DEK é aleatória (não derivável), não há caminho de reconstrução.

```typescript
async function cryptoDeleteMember(memberId: string): Promise<void> {
  await db.transaction(async (tx) => {
    // 1. Destruir EncryptedMemberDEK — passo central do crypto-deletion
    //    Sem DEK não há decriptografia possível dos campos *_encrypted.
    await tx
      .update(members)
      .set({
        status: "crypto_deleted",
        crypto_deleted_at: new Date(),
        encrypted_member_dek: null,
        encrypted_member_dek_iv: null,
        encrypted_member_dek_kek_version: null,
        // Campos cifrados podem ser zerados também (defesa em profundidade),
        // mas a destruição da DEK já garante irrecuperabilidade.
        cpf_hash: null,  // eliminar rastreabilidade de duplicidade por CPF
      })
      .where(eq(members.id, memberId));

    // 2. Registrar no audit_log (imutável)
    await tx.insert(auditLog).values({
      table_name: "members",
      record_id: memberId,
      action: "CRYPTO_DELETE",
      new_data: { reason: "Art. 18 IV LGPD — solicitação do titular" },
      actor_id: currentUserId,
      actor_role: "dpo",
    });
  });

  // 3. Destruir objetos cifrados no MinIO (defesa em profundidade)
  await minio.deleteObjects(`members/${memberId}/medical_records/`);
}
```

**Resultado:** o registro `Member` permanece no banco com `status = crypto_deleted` (preserva integridade de chain of custody e audit log via referência ULID), mas todos os dados pessoais ficam irrecuperáveis:

- `EncryptedMemberDEK` foi destruída → DEK em claro não pode ser obtida
- DEK era **aleatória** → não pode ser re-derivada de `site_id + member_id` (diferente de PBKDF2 determinístico)
- Site KEK rotacionada periodicamente → mesmo que KEK antiga vaze no futuro, sem `EncryptedMemberDEK` não há DEK a decifrar

A criptografia se torna lixo computacionalmente irrecuperável — passa em auditoria LGPD.

---

## Obrigações LGPD para Dados Sensíveis

### Encarregado/DPO — Recomendação Conforme Porte

A LGPD (Art. 41) exige nomeação de Encarregado para organizações que processam dados pessoais. A **Resolução CD/ANPD nº 2/2022** dispensa agentes de tratamento de **pequeno porte** da obrigação formal — mas mantém a exigência de canal de comunicação com titulares.

Para associação de cannabis processando dados sensíveis de saúde, a recomendação prática:

1. **Pequeno porte (associação inicial, < ~500 membros):** canal formal com titulares obrigatório; encarregado formal é boa prática de governança, não exigência. O sistema fornece template do canal.
2. **Médio/grande porte:** nomear Encarregado formalmente (interno ou externo); publicar contato; registrar na ANPD quando aplicável.
3. **Em qualquer porte:** RIPD e base legal documentada são exigência efetiva, não dispensável.

A determinação de porte segue critérios da Resolução ANPD 2/2022 (faturamento, volume de tratamento, sensibilidade dos dados). Como dados de saúde são sensíveis, recomendamos avaliação jurídica caso a associação cresça acima de pequeno porte mesmo em estágio inicial.

Cf. [Premissas Regulatórias](/regulatory-assumptions/) — esta premissa está em **Prováveis**: encarregado recomendado para associação de cannabis mesmo em pequeno porte, sujeito a confirmação com advogado especializado em LGPD saúde.

### RIPD Antes de Iniciar Processamento

Relatório de Impacto à Proteção de Dados (RIPD) deve ser elaborado antes de iniciar o processamento de dados de saúde dos membros. O sistema fornece um template de RIPD baseado nas operações de processamento documentadas.

### Bases Legais para Processamento

| Operação | Base Legal |
|---|---|
| Cadastro de membro com condição médica | Art. 11 II a — consentimento explícito |
| Dispensação com prescrição médica | Art. 11 II f — tutela da saúde |
| Relatório SNGPC (ANVISA) | Art. 11 II b — cumprimento de obrigação legal |
| Auditoria interna | Art. 11 II b — exercício regular de direitos |

O consentimento para dados sensíveis (Art. 11 II a) deve ser:
- **Específico e destacado**: formulário separado, linguagem clara
- **Livre**: não condicionado à adesão
- **Revogável a qualquer momento** (gerando crypto-deletion)
- **Documentado**: timestamp + versão do texto aceito armazenados
