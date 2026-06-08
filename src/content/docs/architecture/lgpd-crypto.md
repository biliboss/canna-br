---
title: "LGPD — Modelo de Criptografia"
description: "AES-256-GCM por membro, crypto-deletion Art. 18 IV, CPF hash — dados de saúde protegidos na camada de dados."
---

## Hierarquia de Chaves

A proteção criptográfica opera em três camadas, com derivação determinística que permite crypto-deletion sem precisar apagar registros físicos:

```
Master Key (HashiCorp Vault / env cifrado)
  └── Site Key (rotação trimestral, por tenant)
        └── Member Key = PBKDF2(site_key + member.id + salt)
              └── AES-256-GCM(dado sensível, member_key)
```

### Master Key

- Armazenada em HashiCorp Vault (self-hosted) ou variável de ambiente cifrada no deploy Kamal
- Nunca aparece no banco de dados
- Rotação: anual ou após incidente de segurança

### Site Key

- Derivada da Master Key + `site_id`
- Rotação trimestral (jan / abr / jul / out)
- Após rotação: re-criptografar Member Keys com nova Site Key (job background BullMQ)
- Versão da Site Key armazenada junto ao dado cifrado para suportar decriptografia durante janela de rotação

### Member Key

Derivada deterministicamente — não é armazenada:

```typescript
async function deriveMemberKey(
  siteKey: Uint8Array,
  memberId: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    "raw",
    siteKey,
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: new TextEncoder().encode(memberId + Buffer.from(salt).toString("hex")),
      iterations: 310_000,  // NIST SP 800-132 recomendação 2023
      hash: "SHA-256",
    },
    material,
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

O direito de eliminação (Art. 18 IV LGPD) é implementado via **crypto-deletion**: ao invés de apagar fisicamente o registro (o que quebraria referências de auditoria e chain of custody), a Member Key é destruída.

```typescript
async function cryptoDeleteMember(memberId: string): Promise<void> {
  // 1. Revogar acesso imediato
  await db.transaction(async (tx) => {
    await tx
      .update(members)
      .set({
        status: "crypto_deleted",
        crypto_deleted_at: new Date(),
        // Sobrescrever campos cifrados com lixo irrecuperável
        name_encrypted: null,
        dob_encrypted: null,
        address_encrypted: null,
        phone_encrypted: null,
        email_encrypted: null,
        cpf_hash: null,  // eliminar rastreabilidade do CPF
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

  // 3. Destruir objetos cifrados no MinIO
  await minio.deleteObjects(
    `members/${memberId}/medical_records/`
  );

  // 4. Invalidar Member Key no Vault (se Vault for usado)
  await vault.delete(`secret/member-keys/${memberId}`);
}
```

**Resultado:** o registro existe no banco (preserva integridade da chain of custody e auditoria), mas todos os dados pessoais são irrecuperáveis. A Member Key não existe mais — a criptografia se torna lixo computacionalmente irrecuperável.

---

## Obrigações LGPD para Dados Sensíveis

### DPO Obrigatório

Art. 41 LGPD: organizações que processam dados sensíveis em larga escala devem nomear um Encarregado (DPO). A associação deve:

1. Nomear DPO formalmente (pode ser interno)
2. Publicar contato do DPO no site da associação
3. Registrar DPO na ANPD quando o cadastro for aberto

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
