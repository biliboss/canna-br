# canna-br — Brand Tone & Voice Guide

**Internal document. This guide informs all public copy. Philosophy sources are named here for team reference only — never in public pages.**

---

## North Star (brand essence)

> "O sistema que torna sagrado o que cuida — rastreabilidade como ritual, transparência como gnose, comunidade como cura."

This phrase is never printed on public pages. It is the test every sentence must pass: does this copy treat the act of caring for a patient as something worthy of full attention, full honesty, full record?

---

## Voice Attributes

### 1. Reverente sobre cuidado
Behind every dispensation record is a patient. Every lot is someone's medicine. The system exists to honour that chain — not just manage it. Copy never reduces patients to data entries or calls them "usuários finais."

**Do:** "Cada dispensação tem um rosto, um lote, uma responsável. O registro preserva os três."
**Don't:** "Processe suas dispensações de forma eficiente."

---

### 2. Radicalmente transparente — como princípio moral, não como feature
Transparency is not a selling point. It is the reason the system was built. The canna-br refuses to operate in the dark because the communities it serves have been in the dark too long. Say this directly. The association, the patient, the regulator: everyone sees the same record.

**Do:** "Não pedimos confiança no escuro. O código está aberto, o roadmap está aqui, e o estado atual — incluindo o que ainda não existe — está documentado."
**Don't:** "Nossa solução é 100% transparente e auditável."

---

### 3. Preciso sem ser frio
The audience includes compliance officers, pharmacists, and directors reading under pressure. Be specific. Name the regulation (RDC 1.014/2026). Name the gap (SNGPC mock, not yet real). Don't round up claims or soften hard facts with adjectives. But precision should feel like respect, not bureaucratic distance.

**Do:** "SNGPC em desenvolvimento — mock atual, aguarda XSD definitivo da ANVISA."
**Don't:** "Integração SNGPC disponível em breve, com conformidade total garantida."

---

### 4. Comunitário, não transacional
Associations are communities of care, not SaaS customers. Members are patients and neighbours — not "usuários" or "clientes." The word "membro" is load-bearing. The system belongs to the association; the association belongs to the people it cares for.

**Do:** "Membros, não clientes. Associação, não plataforma."
**Don't:** "Seus clientes terão acesso a um portal self-service."

---

### 5. Sóbrio, mas humano
This is healthcare infrastructure for a stigmatised sector. The tone is measured — never exclamation-mark enthusiastic, never startup-hype. But measured does not mean cold. Empathy shows through specificity: naming the real problem ("a diretora passou o fim de semana montando uma planilha para a fiscalização") carries more warmth than adjectives.

**Do:** "A prestação de contas deixa de depender da memória de quem estava lá."
**Don't:** "Revolucione a gestão da sua associação com nossa plataforma inovadora!"

---

### 6. Honesto sobre limites — sempre
v0.1.0 is a working foundation, not a finished product. The copy must say this without apologising for it. Honesty about current state is itself a trust signal. Never use version labels beyond v0.1.0 in marketing copy.

**Do:** "Pré-piloto. Zero associações em operação. Dito isso, a fundação técnica está pronta e os primeiros cinco pilotos começam em 2026."
**Don't:** "Plataforma completa, pronta para escalar."

---

### 7. Fluente, sem atrito
Sentences should feel like someone who knows this world well explaining it to someone else who does. No jargon walls. No passive voice accumulation. One idea per sentence when the stakes are high. Natural technical vocabulary (cadeia de custódia, Responsável Técnico, RDC) is fine — it signals expertise, not gatekeeping.

**Do:** "Da cultura ao lote, do lote à dispensação, da dispensação ao membro: a cadeia inteira rastreável, a qualquer hora."
**Don't:** "Nossa solução end-to-end habilita stakeholders a alavancarem visibilidade cross-funcional."

---

## Vocabulary

### PREFERIR
- cuidado, cuidar
- comunidade, membros, associação
- rastreável, rastreabilidade
- à vista (not "visível" — stronger, more physical)
- remédio, medicamento (never "produto")
- dispensação, dispensador
- trilha (audit trail — warm word, not "log")
- cadeia de custódia
- responsável, responsabilidade
- fundação, piloto, evolução
- confiança, honesto, honestidade

### EVITAR
| Evitar | Por quê |
|---|---|
| cliente, usuário final | transactional; the community model is distinct |
| produto, plataforma, solução | SaaS-hype framing |
| revolucionário, inovador | startup cliché; damages credibility with compliance audience |
| 100% garantido, completo | overclaims current state |
| rendimento, retorno, investimento | compliance-critical — zero financial language |
| SaaS, cloud-native, best-in-class | tech-vendor vocabulary |
| qualquer jargão místico | gnose, alquimia, soma, sefirot, hermético, tikkun — never in public pages |
| "em breve" sem data | vague; give a version or an explicit "em desenvolvimento" |

---

## Before / After — Real Lines from Marketing Pages

### Hero — index.astro

**Before:**
> "O sistema que organiza o cuidado que a associação já presta."

**After:**
> "O sistema que torna visível o cuidado que a associação já presta."

*Rationale: "organiza" reads like a productivity tool. "torna visível" connects to the transparency-as-light thread — the work already exists; the system illuminates it.*

---

### Lede — index.astro section 2

**Before:**
> "O dia a dia da associação vive espalhado entre cadernos, grupos de mensagem e abas paralelas — cada uma com sua versão da verdade. Quando alguém precisa da foto completa, ela não existe."

**After:**
> "O dia a dia da associação vive espalhado entre cadernos, grupos de mensagem e abas paralelas. Cada uma com sua versão. Quando alguém precisa da foto completa para tomar uma decisão — ou para uma fiscalização — ela não existe."

*Rationale: adds "para uma fiscalização" — the real, high-stakes consequence. Makes the pain concrete and sector-specific.*

---

### Hero — transparencia.astro

**Before:**
> "Software aberto, evolução pública e indicadores visíveis."

**After:**
> "Tudo aberto: código, roadmap, decisões, estado atual."

*Rationale: three abstract nouns → four concrete specifics. Mirrors the radical transparency principle: enumerate rather than summarise.*

---

### Section intro — transparencia.astro "Por que transparência?"

**Before:**
> "O canna-br não tem investidores. Não tem métricas de crescimento para esconder. Tudo que existe — código, roadmap, decisões, releases, estado atual — está documentado aqui e atualizável por qualquer pessoa."

**After:**
> "Não pedimos confiança sem evidências. O canna-br não tem investidores, não tem métricas de crescimento para esconder, e não tem código proprietário trancado em servidor privado. Tudo que existe — código, roadmap, decisões, releases, estado atual — está documentado aqui e atualizável por qualquer pessoa."

*Rationale: opens with a moral claim ("não pedimos confiança sem evidências") before the enumeration. Stronger trust signal for the compliance/director audience.*

---

### Hero — associacoes.astro

**Before:**
> "Menos improviso operacional. Mais controle, transparência e continuidade."

**After:**
> "A operação da associação, sem depender da memória de quem está lá."

*Rationale: the original is a features list. The new version names the specific, visceral fear of key-person dependency — what compliance officers and directors actually lose sleep over.*

---

## Extension Notes

- For **compliance.astro**: open with the regulatory anchor ("RDC 1.014/2026 estabelece..."), not with a product description. The compliance audience wants to see the law first, the software second.
- For **piloto.astro**: the current hero is already strong ("isso não é uma venda, é um convite"). Keep it. Elevate the "o que é o piloto" section intro to name the co-creation relationship more explicitly.
- When writing blog posts or social content, the first test is always: "Does this treat the patient's medicine as worthy of full attention?" If not, rewrite.

---

*Last updated: 2026-06-11*
*Internal only. Do not publish this file or link to it from any public page.*
