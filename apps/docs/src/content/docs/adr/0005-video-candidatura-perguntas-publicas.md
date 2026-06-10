---
title: "ADR-005 — Vídeo Candidatura + Perguntas Públicas"
description: "2 modos de vídeo: candidatura privada (Modo 1) + Q&A público moderado (Modo 2). Substitui form longo + cria FAQ viva como inbound engine."
---

# ADR-005 — Vídeo Candidatura + Perguntas Públicas

| Campo | Valor |
|---|---|
| Status | **Proposed** (2026-06-09) |
| Data | 2026-06-09 |
| Versao | v0.1 |
| Substitui | — |
| Relacionado | [ADR-002 — MCP-First Surface](/adr/0002-mcp-first-surface/), [ADR-003 — Stack Pivot](/adr/0003-stack-pivot-nats-surreal-dbos/), [ADR-004 — Simulacao VPS](/adr/0004-simulation-vps/) |

---

## Contexto

### Form longo = baixa conversão

O processo atual de candidatura de associações piloto exige formulário longo (nome da associação, CNPJ, número de membros-pacientes, RT farmacêutico, histórico clínico coletivo, motivação). Esse formato cria atrito desnecessário para diretores e RTs que estão explorando o canna-br pela primeira vez: eles precisam transmitir contexto rico, mas o form os força a escrever, estruturar e revisar antes de ter confiança no projeto.

A hipótese central: **vídeo até 5 minutos entrega mais sinal de qualidade de candidatura do que qualquer form**, porque capta presença, clareza de propósito e adequação cultural da liderança da associação — dimensões que texto não captura.

### Áudio bruto público é inadequado

Uma variante de Q&A por áudio foi avaliada e descartada. Áudio sem vídeo perde presença de comunicação. Players de áudio têm UX inconsistente entre browsers (especialmente iOS). Vídeo tem handler universal (HTML5 `<video>`) e permite ao espectador avaliar credibilidade do respondente — relevante para associações avaliando adoção.

### Dois jobs distintos, dois modos

A revisão PM+UX identificou que existem dois jobs de usuário completamente distintos sendo servidos:

1. **Job de candidatura** (Diretoria/RT de associação): transmitir intenção, contexto e liderança para Gabriel, de forma privada, sem pressão de exposição pública.
2. **Job de pergunta pública** (visitante curioso): tirar dúvida específica sobre canna-br, com expectativa de resposta visible e indexável que beneficia outros visitantes com a mesma dúvida.

Misturar esses dois jobs em um único mecanismo seria erro de design. A separação é arquitetural: privacidade-por-default no Modo 1, consent-gated no Modo 2.

### Flywheel de FAQ pública

Cada pergunta pública respondida em vídeo gera uma landing page indexável com transcrição limpa. Essas páginas acumulam ao longo do tempo e funcionam como SEO long-tail para buscas como "como funciona cannabis terapêutica associação" ou "farmacêutico responsável técnico cannabis ANVISA". O flywheel: pergunta → resposta pública → confiança → mais candidaturas piloto → mais feedback → produto melhor.

---

## Decisão

Implementar dois modos de vídeo independentes com privacidade, moderação e publicação diferenciadas.

### Modo 1 — Candidatura Piloto (Privado)

**Captura:** Browser MediaRecorder API (getUserMedia constraints: video 1280x720, audio mono 48kHz, codec VP8/Opus ou H.264). Duração máxima 5 minutos com countdown visível. Preview local antes de confirmar upload.

**Privacidade default:** Privado por construção. Sem opção de tornar público. Sem indexação. Sem URL pública. Sem listagem. Nem Gabriel expõe o vídeo a terceiros sem consentimento explícito da associação.

**Moderação flow:** Gabriel é o único receptor. Não há fila de moderação — o vídeo chega, Gabriel ouve, responde diretamente via email ou WhatsApp com próximos passos. Fluxo de aprovação ou rejeição é pessoal e assíncrono.

**Storage:** Bucket privado (MinIO já existente na VPS `62.171.145.76` via Langfuse stack, ou Cloudflare R2 free tier). Upload via signed POST gerado server-side — credenciais nunca expostas ao cliente. Filename: UUID v4 opaco, sem metadados no nome.

**Publicação:** Nenhuma. Este modo nunca produz página pública.

### Modo 2 — Perguntas Públicas (Consent-Gated)

**Captura:** Browser MediaRecorder API, duração máxima 3 minutos. Acompanhado de: (a) checkbox "Li e aceito a política de privacidade" com link, (b) checkbox "Consinto com a publicação da minha pergunta e resposta no site canna-br", (c) campo textarea opcional "Resuma sua pergunta em 1 frase" (usado como H1 da página publicada).

**Privacidade default:** Privado até aprovação explícita de Gabriel. Consent duplo obrigatório — sem ele, upload é bloqueado client-side e server-side.

**Moderação flow:** Fila no SurrealDB. CLI `bun scripts/perguntas-mod.ts list|approve|reject|publish <id>`. Gabriel ouve o vídeo, escreve resumo de 3 bullets, edita o texto de resumo de pergunta se necessário, grava vídeo de resposta via mesma UI (autenticada), executa `publish <id>`. O sistema gera MDX e faz commit na content collection.

**Storage:** Bucket separado (prefixo `perguntas/`) com ACL público somente após publish. Antes do publish, acesso apenas via signed URL temporária (para Gabriel moderar).

**Publicação:** Página `/open/perguntas/<slug>` gerada a partir de MDX na content collection `perguntas/`. O slug é derivado do texto de resumo (kebab-case, normalizado). A página inclui transcrição da pergunta, player de vídeo pergunta, 3 bullets de resumo da pergunta, transcrição da resposta, player de vídeo resposta, 3 bullets de resumo da resposta, e CTA "Sua associação quer entrar no piloto?" apontando para `/open/seed-associations/`.

---

## Tabela Comparativa Modo 1 × Modo 2

| Aspecto | Modo 1 — Candidatura | Modo 2 — Perguntas Públicas |
|---|---|---|
| Audiência | Diretoria/RT de associação interessada | Visitante curioso (qualquer pessoa) |
| Duração máxima | 5 min | 3 min |
| Privacidade | Privado por default, sem opção pública | Público por consent opt-in obrigatório |
| Resposta | Email/WhatsApp Gabriel direto, privado | Vídeo resposta Gabriel publicado junto |
| Indexável | NUNCA | SIM (SEO + sitemap) |
| Moderação | Gabriel só ouve (não modera, é privado) | Gabriel modera (approve/reject/edit-resumo) |
| Output | Inbox notification + reply pessoal | Página `/open/perguntas/<slug>` + índice |
| Entry point | `/open/aplicar-video/` | `/open/perguntas/nova/` |
| Consentimento | Não necessário (privado por natureza) | Double-confirm obrigatório |
| Transcrição | Opcional, só para Gabriel | Obrigatória, publicada com edição |

---

## Arquitetura (Planning)

```
Modo 1: Candidatura
─────────────────────────────────────────────────────────────────────
Browser (getUserMedia)
  │ MediaRecorder → Blob
  ▼
POST /api/video/presigned-url (mode=candidatura)
  │ server gera signed POST para MinIO/R2
  ▼
Browser → MinIO/R2 bucket-privado/UUID.webm
  │
  ▼
POST /api/video/notify (metadata: duration, browser, timestamp)
  │
  ├─► SurrealDB: INSERT video_submission {mode:candidatura, status:received, ...}
  └─► Resend email → gabriel@devmagic.com.br (link signed URL)

Modo 2: Perguntas Públicas
─────────────────────────────────────────────────────────────────────
Browser (getUserMedia + consent checkboxes)
  │ MediaRecorder → Blob + resumo texto + consent flags
  ▼
POST /api/video/presigned-url (mode=pergunta, consent_confirmed=true)
  │
  ▼
Browser → MinIO/R2 bucket-perguntas/UUID.webm (ACL privado até publish)
  │
  ├─► SurrealDB: INSERT video_submission {mode:pergunta, status:pending_moderation, ...}
  ├─► Groq Whisper API async: transcrição pt-BR → UPDATE video_submission.transcript
  └─► Resend email → gabriel@devmagic.com.br (link moderação)

Moderação (Gabriel CLI)
─────────────────────────────────────────────────────────────────────
bun scripts/perguntas-mod.ts list pending
  │ lista SurrealDB video_submission WHERE status = 'pending_moderation'
  ▼
bun scripts/perguntas-mod.ts review <id>
  │ abre signed URL temporária para preview local
  ▼
Gabriel: edita resumo 3 bullets + grava vídeo resposta via UI autenticada
  │
  ▼
bun scripts/perguntas-mod.ts publish <id>
  ├─► UPDATE video_submission {status:published, slug:..., published_at:...}
  ├─► MinIO/R2 ACL → público para ambos vídeos
  ├─► Gera apps/docs/src/content/docs/open/perguntas/<slug>.mdx
  ├─► git add + git commit + git push
  └─► Astro rebuild (CI/CD ou manual `pnpm build`)
```

### Schema SurrealDB

```sql
DEFINE TABLE video_submission SCHEMAFULL;

DEFINE FIELD id            ON video_submission TYPE string;
DEFINE FIELD mode          ON video_submission TYPE string;  -- candidatura | pergunta
DEFINE FIELD status        ON video_submission TYPE string;  -- received | pending_moderation | approved | rejected | published
DEFINE FIELD recorded_at   ON video_submission TYPE datetime;
DEFINE FIELD file_url      ON video_submission TYPE string;  -- bucket path opaco
DEFINE FIELD transcript    ON video_submission TYPE option<string>;
DEFINE FIELD consent_public ON video_submission TYPE bool DEFAULT false;
DEFINE FIELD resumo_pergunta ON video_submission TYPE option<string>;
DEFINE FIELD resumo_bullets  ON video_submission TYPE option<array>;
DEFINE FIELD moderator_notes ON video_submission TYPE option<string>;
DEFINE FIELD response_id   ON video_submission TYPE option<string>;  -- FK para vídeo resposta
DEFINE FIELD slug          ON video_submission TYPE option<string>;
DEFINE FIELD published_at  ON video_submission TYPE option<datetime>;
```

### Componentes Planejados

| Workspace | Responsabilidade |
|---|---|
| `@canna/video-capture` | Browser MediaRecorder wrapper — permission request, countdown, preview, retake |
| `@canna/video-upload` | Signed POST helper — presigned URL, multipart, progress, retry |
| `@canna/perguntas-mod` | CLI scripts — list/review/approve/reject/publish |
| `apps/docs` content collection `perguntas/` | MDX gerado pelo publish pipeline |
| `apps/api` `/api/video/*` | Presigned URL endpoint, notify endpoint, moderação REST |

---

## Privacidade e LGPD

- **Modo 1 = dados pessoais sensíveis por construção.** Vídeo de candidatura pode conter dados de saúde (histórico da associação, menção a pacientes). NUNCA público. Bucket privado sem exceção. TTL de armazenamento: 18 meses após resposta final, com destruição auditável.
- **Modo 2 = consent obrigatório double-confirm.** Dois checkboxes independentes antes de habilitar botão de upload: (a) política de privacidade lida e aceita, (b) consent de publicação explícito. Formulação dos textos revisada por Gabriel antes do deploy. Sem dark patterns (pre-check, soft opt-out).
- **Direito ao apagamento Art. 18 IV LGPD:** qualquer autor de pergunta pública pode solicitar remoção. Fluxo: email para gabriel@devmagic.com.br → Gabriel executa `bun scripts/perguntas-mod.ts delete <id>` → vídeo removido do bucket, MDX removido da content collection, transcript destruída no SurrealDB (crypto-deletion via DEK destruction, cf. [Compliance & Crypto](/build/compliance/)). Prazo: 72h úteis.
- **Sem cookies de tracking.** Sem analytics de terceiros (PostHog, GA) nas páginas de pergunta pública. Logs de acesso apenas server-side (nginx) com retenção 30 dias.

---

## PM — Outcomes Esperados

### Hipóteses de conversão

- **Modo 1:** ↑20-40% conversão de candidatura comparado ao form longo. Hipótese baseada em padrão observado em YC application (vídeo Founder substitui forma escrita longa). Medição: taxa de aplicações completas submetidas ÷ visits à página `/open/aplicar-video/` vs histórico do form.
- **Modo 2:** 5-10 perguntas por mês nos primeiros 3 meses, acumulando 15-30 landing pages SEO ao final do trimestre. Cada página indexável com slug temático e transcrição em texto.

### Flywheel esperado

```
Candidatura vídeo → Gabriel responde (personalizado) → associação entra no piloto
     ↑                                                           │
     └── Confiança aumenta ←── FAQ pública indexada ←── Pergunta aprovada
```

### Métricas a acompanhar

| Métrica | Como medir |
|---|---|
| form-completion-rate vs video-record-rate | SurrealDB: started ÷ submitted |
| Tempo médio entre submit e publish | `published_at - recorded_at` |
| Click-through CTA "entrar no piloto" das páginas de pergunta | Nginx log filter por referrer |
| Taxa de aprovação na moderação | approved ÷ (approved + rejected) |

---

## UX — Flows

### Flow A — Candidatura (Modo 1)

```
/open/seed-associations/
  [CTA] "Prefere falar em vídeo? Clique aqui"
         │
         ▼
/open/aplicar-video/
  ┌─────────────────────────────────────────┐
  │  Título: "Apresente sua associação"      │
  │  Subtítulo: "Até 5 minutos. Privado."   │
  │                                         │
  │  [Permitir câmera e microfone]          │
  │       ↓ (após permission grant)         │
  │  Preview stream + [● Gravar]            │
  │       ↓ (gravando)                      │
  │  Countdown 05:00 → 00:00 + [■ Parar]   │
  │       ↓                                 │
  │  Preview vídeo gravado                  │
  │  [↺ Regravar]  [✓ Enviar]              │
  └─────────────────────────────────────────┘
         │
         ▼ (upload + notify)
/open/aplicar-video/obrigado/
  "Recebemos seu vídeo. Retorno em até 5 dias úteis por email."
  "Nenhuma outra pessoa além de Gabriel terá acesso ao vídeo."
```

### Flow B — Pergunta Pública (Modo 2)

```
/open/perguntas/
  [CTA] "Tenho uma pergunta" → /open/perguntas/nova/
         │
         ▼
/open/perguntas/nova/
  ┌─────────────────────────────────────────┐
  │  "Grave sua pergunta. Até 3 minutos."   │
  │                                         │
  │  [input] "Resuma em 1 frase (opcional)" │
  │                                         │
  │  [Permitir câmera e microfone]          │
  │       ↓                                 │
  │  Preview + [● Gravar] + Countdown       │
  │       ↓                                 │
  │  Preview + [↺ Regravar]                 │
  │                                         │
  │  [ ] Li e aceito a política de          │
  │      privacidade (link)                 │
  │  [ ] Consinto que minha pergunta e      │
  │      a resposta sejam publicadas em     │
  │      canna-br.fonsecagabriel.com.br    │
  │                                         │
  │  [Enviar] (disabled até ambos checked)  │
  └─────────────────────────────────────────┘
         │
         ▼
/open/perguntas/nova/obrigado/
  "Pergunta recebida. Será revisada antes de qualquer publicação."
  "Prazo estimado de resposta: até 10 dias úteis."
```

### Flow C — Moderação Gabriel (CLI + UI)

```
$ bun scripts/perguntas-mod.ts list pending
  ID        MODO      DATA         RESUMO
  abc123    pergunta  2026-06-10   "O que é SNGPC e..."
  def456    pergunta  2026-06-11   (sem resumo)

$ bun scripts/perguntas-mod.ts review abc123
  → abre signed URL no browser (expira em 1h)
  → Gabriel assiste ao vídeo
  → Gabriel edita resumo e 3 bullets no CLI ou no arquivo gerado

  [Gabriel grava vídeo resposta via UI autenticada em /admin/perguntas/abc123/resposta/]

$ bun scripts/perguntas-mod.ts publish abc123
  → valida response_id preenchido
  → gera apps/docs/src/content/docs/open/perguntas/o-que-e-sngpc.mdx
  → git add + commit + push
  → Astro rebuilda
  ✓ Publicado em /open/perguntas/o-que-e-sngpc/

$ bun scripts/perguntas-mod.ts reject def456 "off-topic"
  → UPDATE status = rejected, moderator_notes = "off-topic"
  → vídeo permanece no bucket privado (TTL 30 dias) e depois é destruído
```

---

## Riscos Ranqueados

### HIGH — Responsabilidade legal por conteúdo de vídeo

Alguém pode gravar conteúdo ilegal (ameaça, promessa terapêutica enganosa, exposição de pacientes identificáveis sem consentimento, material protegido por direito autoral). O sistema publica esse conteúdo em nome do canna-br.

**Mitigação:**
- ToS explícito assinado (checkbox lido) antes de qualquer gravação no Modo 2
- Gabriel revisa 100% dos vídeos antes de qualquer publicação — zero auto-publish
- Log auditável de approve/reject com timestamp e moderator_notes para cada submissão
- Direito ao apagamento implementado com TTL e crypto-deletion
- Aviso na UI de gravação: "Ao gravar, você confirma que possui direitos sobre o conteúdo e que ele não viola a legislação brasileira"

### MEDIUM — Custo de storage com escala

Vídeo de 5 minutos 720p webm ≈ 50-80 MB. 100 candidaturas = 5-8 GB. 500 perguntas públicas (respostas incluídas) = 25-40 GB.

**Mitigação:**
- MinIO já existe na VPS `62.171.145.76` (Langfuse stack inclui MinIO). Headroom disponível depende de disco provisionado (ADR-004 define nova VPS com disco configurável).
- Cloudflare R2 free tier: 10 GB storage, 1 milhão de operações classe A — suficiente para fase seed.
- Vídeos Modo 1 com TTL 18 meses + auto-delete após resposta final liberam espaço continuamente.
- Limite explícito de submissions por IP/dia no server (rate limiting): previne abuso de armazenamento.

### LOW — Accuracy da transcrição Whisper pt-BR

Whisper large-v3 via Groq reporta WER < 10% para pt-BR em gravações claras. Gravações com ruído ambiente, sotaque regional marcado ou terminologia técnica (SNGPC, BSPO, RDC) podem ter WER 15-25%.

**Mitigação:**
- Groq Whisper free tier (10h/dia) — sem custo para fase seed.
- Gabriel revisa e edita transcrição obrigatoriamente antes de executar `publish`. Transcrição gerada automaticamente é ponto de partida, não resultado final.
- UI de gravação inclui dica: "Grave em ambiente silencioso, a ~30cm do microfone."

---

## Done-When

1. MediaRecorder UI funciona em Chrome 120+, Firefox 121+, Safari 17+ em macOS, iOS 17+, Android 14+ — testado com câmera e microfone de dispositivos reais.
2. Upload via signed POST gerado server-side — credenciais MinIO/R2 nunca aparecem em network requests do browser.
3. Pipeline Whisper transcrição assíncrona — não bloqueia o usuário (submit retorna imediatamente, transcrição chega via webhook ou polling SurrealDB).
4. CLI `bun scripts/perguntas-mod.ts` com 3 verbos funcionais: `list [pending|all]`, `approve <id>`, `reject <id> [motivo]`, `publish <id>`.
5. Astro content collection `perguntas/` auto-rebuild triggerable: push commit gerado pelo `publish` dispara CI/CD ou rebuild manual documentado.
6. Email notify Gabriel < 30s após submit (Resend ou SMTP) com link para review.

---

## Alternativa Considerada e Descartada

**Loom embed + Calendly call:** Candidato grava no Loom, envia link por formulário. Gabriel recebe e marca Calendly call se interessado.

Descartada por:
- Lock-in em ferramenta proprietária (Loom pricing muda, export é pago)
- Perde coerência OSS do projeto — canna-br não depende de SaaS proprietário para fluxo crítico de onboarding
- Sem SEO: Loom embeds não são indexáveis com transcrição
- Sem moderação programática: não há CLI para approve/publish, é tudo manual fora do sistema

---

## Referências

- [ADR-002 — MCP-First Surface](/adr/0002-mcp-first-surface/) — feature compatível; sem admin Next.js; UI de moderação como MCP App ou página autenticada
- [ADR-003 — Stack Pivot NATS + SurrealDB + DBOS](/adr/0003-stack-pivot-nats-surreal-dbos/) — SurrealDB é o store para `video_submission`
- [ADR-004 — Simulacao em VPS Dedicada](/adr/0004-simulation-vps/) — nova VPS onde esta feature roda; MinIO/R2 storage na mesma infra
- [Compliance & Crypto](/build/compliance/) — crypto-deletion Art. 18 IV aplicável ao Modo 1 e ao delete de Modo 2
- Feedback interno: `_memory/feedback-ship-only-tested.md` — nunca declarar "shipped" até validação end-to-end real
