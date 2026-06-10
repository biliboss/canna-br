---
title: "OSS Business Model"
description: "AGPL-3.0 + CLA — trust moat para dados de saúde em setor cinzento. Plausible como proxy ($3.1M ARR / 8 pessoas)."
---

## Por Que AGPL-3.0 + CLA

### A Lógica

Associações de cannabis operam em zona cinzenta regulatória. Seu maior risco operacional não é funcionalidade — é **perda de controle sobre dados sensíveis de saúde dos membros**. Um software que pode ser auditado publicamente transforma o argumento de venda:

> "Você pode ver cada linha de código que processa os dados dos seus membros. Nenhum SaaS consegue oferecer isso."

AGPL garante que qualquer versão derivada também seja auditável. CLA (Contributor License Agreement) permite dual-licensing para o managed hosting pago.

### Por Que Não BUSL (Business Source License)

BUSL mata o argumento de auditabilidade:

- Código fonte disponível mas **não é open source** — restrições comerciais por 4 anos
- Advogado da associação não vai aprovar código com licença restritiva como base do sistema de saúde dos membros
- A principal vantagem competitiva do canna-oss é precisamente ser auditável — BUSL destrói isso

### Por Que Não Open-Core

O buyer típico (associação NGO-like, sem fins lucrativos) não paga por features premium:

- Budget apertado — toda receita vai para o custo do produto cannabis
- Decisão coletiva — a diretoria não vai aprovar upgrade para "tier Enterprise"
- Compliance é obrigação legal, não feature diferenciadora — não há "Premium SNGPC"

Open-core funciona quando o buyer tem budget e incentivo para pagar mais. Associações de cannabis não têm esse perfil.

---

## Trust Moat

O padrão de crescimento baseado em auditabilidade está validado em outros setores:

| Empresa | Lógica | Resultado |
|---|---|---|
| Bitwarden | Cofre de senhas auditável end-to-end | Cresceu sendo a alternativa ao LastPass auditável |
| GitLab | "Você pode ver tudo, inclusive o código do GitLab" | Enterprise via transparência radical |
| Sentry | ~90% dos usuários usam self-host grátis | Freemium que converte quando crescem |

Para dados de saúde em zona cinzenta regulatória, o trust moat é ainda mais forte: **a diretoria é pessoalmente responsável por um vazamento**. Um software que pode ser auditado reduz esse risco pessoal.

---

## Armadilha OpenMRS/Bahmni — Hard Limit Services

OpenMRS e Bahmni são sistemas OSS de saúde bem-sucedidos tecnicamente que foram capturados pelo modelo de professional services:

- Revenue veio majoritariamente de consultoria e customizações
- Equipe core se tornou basicamente uma consultoria disfarçada de produto
- Escalabilidade zero: crescimento de receita = crescimento linear de pessoas

**Hard limit canna-oss: máximo 20% da receita de services.**

Qualquer serviço contratado (migração, treinamento, customização) deve ter um teto claro e um cronograma de eliminação (documentação, automação, self-service).

---

## Case Studies

| Empresa | ARR | Equipe | ARR/Pessoa | Modelo | Lição |
|---|---|---|---|---|---|
| **Plausible** | $3.1M | 8 pessoas | $387k | AGPL + managed hosting | Proxy de viabilidade para canna-oss |
| **Sentry** | ~$200M | ~700 pessoas | ~$285k | OSS + SaaS (70/30 hosted) | 90% self-host grátis ainda gera brand |
| **GitLab** | ~$600M | ~2.000 pessoas | ~$300k | Buyer-based open-core | Open-core funciona com buyer corporativo |
| **Bitwarden** | ~$100M est. | ~200 pessoas | ~$500k | AGPL + cloud | Trust moat em dados sensíveis |
| **Cannanas DE** | ~€7.2M est. | ~50 clubes | — | SaaS proprietário | Mercado DE valida modelo; canna-oss tem moat OSS |

### Plausible como Proxy Principal

Plausible é o benchmark mais relevante para canna-oss porque:

1. **AGPL-3.0 + managed hosting** — exatamente o mesmo modelo de licença
2. **8 pessoas** — prova que o modelo é viável com equipe pequena
3. **$387k ARR por pessoa** — eficiência que vem de managed hosting como produto, não services
4. **Nicho específico** — não competiu com Google Analytics head-on; criou uma categoria (privacy-first analytics)
5. **Bootstrap** — sem venture capital, crescimento sustentável

### Cannanas DE como Referência de Mercado

Cannanas (Alemanha) é o SaaS dominante no mercado alemão pós-legalização. Estimativa:

- ~600+ Social Cannabis Clubs registrados na Alemanha (lei de abril 2024)
- Penetração estimada ~30-40% com Cannanas = 180–240 clientes
- Pricing: €199–499/mês por clube
- ARR estimado: €4.3M–7.2M

**O que Cannanas prova:** existe disposição a pagar por software de gestão para cannabis clubs. Mercado brasileiro será maior (associações HC + sandbox ANVISA = potencial 400+ associações).

**O que Cannanas não tem que canna-oss tem:** código auditável, self-hosted, LGPD nativo, SNGPC nativo.
