---
title: "OSS Business Model"
description: "AGPL-3.0 + Dual-License via CLA — trust moat para dados de saúde em setor cinzento. Plausible como proxy ($3.5M ARR / 11 pessoas)."
---

## Por Que AGPL-3.0 + CLA

### A Lógica

Associações de cannabis operam em zona cinzenta regulatória. Seu maior risco operacional não é funcionalidade — é **perda de controle sobre dados sensíveis de saúde dos membros**. Um software que pode ser auditado publicamente transforma o argumento de venda:

> "Você pode ver cada linha de código que processa os dados dos seus membros. Nenhum SaaS consegue oferecer isso."

AGPL garante que qualquer versão derivada também seja auditável. CLA (Contributor License Agreement) é o instrumento que habilita dual-licensing para casos comerciais específicos — detalhado na seção abaixo.

### Por Que Não BUSL (Business Source License)

BUSL mata o argumento de auditabilidade:

- Código fonte disponível mas **não é open source** — restrições comerciais por 4 anos
- Advogado da associação não vai aprovar código com licença restritiva como base do sistema de saúde dos membros
- A principal vantagem competitiva do canna-br é precisamente ser auditável — BUSL destrói isso

### Por Que Não Open-Core

O buyer típico (associação NGO-like, sem fins lucrativos) não paga por features premium:

- Budget apertado — toda receita vai para o custo do produto cannabis
- Decisão coletiva — a diretoria não vai aprovar upgrade para "tier Enterprise"
- Compliance é obrigação legal, não feature diferenciadora — não há "Premium SNGPC"

Open-core funciona quando o buyer tem budget e incentivo para pagar mais. Associações de cannabis não têm esse perfil.

---

## Dual-License via CLA (modelo Metabase)

> _Sujeito a revisão jurídica antes de vigorar._

AGPL cobre uso direto e self-host — gratuito para sempre. A licença comercial é requerida nos três casos em que o AGPL, sozinho, não fecha o ciclo jurídico:

| Caso | Por que AGPL não basta | Licença requerida |
|---|---|---|
| Embutir o produto em outra solução sem publicar o código | AGPL exige publicação da obra derivada — se o integrador quer fechado, precisa de licença separada | Comercial |
| Oferecer como serviço gerenciado para terceiros (integrador parasita) | AGPL não proíbe hosting sem modificação — ver seção abaixo | Comercial |
| Integração via API com certeza jurídica de obra derivada | Zona cinzenta de acoplamento — CLA transfere risco ao comprador | Comercial |

**Instrumento:** o CLA já referenciado no projeto é exatamente o mecanismo. Ao assinar, o contribuidor concede licença ampla ao projeto, habilitando o titular a re-licenciar o código para os três casos acima sem violar AGPL. Não contradiz — complementa.

**Modelo copiado de:** Metabase (core AGPL + licença comercial para embedding/revenda). MySQL, Qt usam o mesmo padrão há décadas.

---

## Hosting Parasita — Risco Real

> _Sujeito a revisão jurídica antes de vigorar._

**AGPL protege de quem modifica e hospeda sem publicar. NÃO protege de quem hospeda sem modificar.**

O risco real do canna-br não é a AWS. É a **consultoria local** que pega o código, hospeda para 5 associações a R$ 500/mês e nunca contribui de volta — capturando valor sem pagar o custo da plataforma.

### Por Que Não Seguimos BSL/SSPL

Mongo, Redis e HashiCorp foram exatamente para BSL/SSPL por parasitas de hyperscaler. O problema: custos colaterais altos demais para o canna-br.

| Consequência | Impacto no canna-br |
|---|---|
| Fork comunitário imediato (OpenTofu, Valkey) | Pulveriza o trust moat antes de ter tração |
| Reconhecimento OSI perdido | ANVISA e parceiros de saúde auditam processo — licença non-OSI é eliminatório |
| Contribuidores recuam | Comunidade percebe mudança como captura, não proteção |
| Advogado da associação rejeita | Argumento de auditabilidade destruído na raiz |

**Solução escolhida:** AGPL + licença comercial obrigatória para hosting de terceiros via CLA. Protege do parasita local sem os custos de BSL.

---

## Fronteira AGPL vs Comercial

> **Não monetizar escondendo modificação do core AGPL. Monetizar operando, hospedando, suportando e conectando serviços externos.**

Modelo econômico completo em [Infraeconomics](/business/tokenomics/).

### Core AGPL

```text
cadastro de associação, pacientes/membros, prescrições/documentos, estoque, lotes,
seed-to-dispensation, dispensação, rastreabilidade, permissões/RBAC, logs operacionais,
LGPD básico, relatórios operacionais, SNGPC/integrador, APIs públicas, eventos de domínio,
conectores MCP básicos, exportação de dados, ledger técnico mínimo (se acoplado ao core)
```

### Comercial sem violar AGPL (serviço externo, não modificação fechada)

```text
hosting gerenciado, backups, observabilidade, suporte SLA, implantação, treinamento,
consultoria, risk engine, cobrança, conciliação financeira, liquidação fiat/USDT via parceiro,
marketplace de fornecedores, agentes MCP financeiro/compliance avançado, auditoria,
BI executivo, score proprietário, antifraude, motor de precificação, workflow de crédito
```

### Linha jurídica prática

```text
Modificação do core AGPL rodando via rede → publique o código correspondente.
Serviço separado consumindo API/eventos/MCP → pode ser comercial fechado (se não for obra derivada acoplada).
Operação/hospedagem/suporte/auditoria/treinamento → serviço comercial, não precisa abrir playbook interno.
```

Licença: [GNU AGPL-3.0](https://www.gnu.org/licenses/agpl-3.0.en.html).

---

## Trust Moat

O padrão de crescimento baseado em auditabilidade está validado em outros setores:

| Empresa | Argumento central | Resultado |
|---|---|---|
| **Bitwarden** | "Auditabilidade reduz risco pessoal do diretor" — cofre open source end-to-end | Cresceu sendo a alternativa ao LastPass após breach; ~$100M ARR |
| **Nextcloud** | "AGPL protege a associação **contra** o fornecedor (anti-refém)" — rejeita open-core explicitamente | €18M order intake 2023 sem tier proprietário |
| **ZITADEL** | Migrou Apache→AGPL 2025: clientes pagam por **transferência de risco** (SLA, SOC 2, proteção jurídica), não features | Framing quase idêntico ao canna-br |
| **Sentry** | ~90% dos usuários usam self-host grátis | Os 10% pagantes sustentam toda a plataforma |

Para dados de saúde em zona cinzenta regulatória, o trust moat é ainda mais forte:

- **Argumento Bitwarden aplicado:** a diretoria é pessoalmente responsável por um vazamento de dados dos membros. Um software auditável reduz esse risco pessoal — e é o argumento que fecha a venda com o presidente da associação, não com o TI.
- **Argumento Nextcloud aplicado:** o canna-br com AGPL garante à associação que, se o fornecedor mudar de estratégia ou fechar, o código existe e pode ser mantido pela comunidade. A associação nunca fica refém.

---

## Armadilha OpenMRS/Bahmni — Hard Limit Services

OpenMRS e Bahmni são sistemas OSS de saúde bem-sucedidos tecnicamente que foram capturados pelo modelo de professional services:

- Revenue veio majoritariamente de consultoria e customizações
- Equipe core se tornou basicamente uma consultoria disfarçada de produto
- Escalabilidade zero: crescimento de receita = crescimento linear de pessoas

**Hard limit canna-br: máximo 20% da receita de services.**

Qualquer serviço contratado (migração, treinamento, customização) deve ter um teto claro e um cronograma de eliminação (documentação, automação, self-service).

---

## Benchmarks de Eficiência

| Empresa | ARR | Equipe | ARR/Pessoa | Modelo | Lição |
|---|---|---|---|---|---|
| **Plausible** | $3.5M | 11 | ~$318k | AGPL + managed hosting | Proxy principal — mesmo modelo, nicho específico, bootstrap |
| **Bitwarden** | ~$100M | 148 | ~$675k | AGPL + freemium cloud | Trust moat em dados sensíveis escala muito além do nicho |
| **Sentry** | ~$200M+ | 500+ | ~$400k | AGPL + cloud (10% pagam pelo 90%) | Self-host grátis gera brand e funil |
| **Nextcloud** | ~$7M (€18M order intake) | 120 | ~$58k | 100% AGPL + suporte/SLA | Anti-lock-in como argumento de venda pra setor público e associações |
| **ZITADEL** | — | — | — | Apache→AGPL 2025 + cloud | "Transferência de risco" como produto, não feature |
| **Cannanas DE** | ~€7.2M est. | ~50 clubes | — | SaaS proprietário | Valida mercado; canna-br tem moat OSS que Cannanas não tem |

### Plausible como Proxy Principal

Plausible é o benchmark mais relevante porque:

1. **AGPL-3.0 + managed hosting** — exatamente o mesmo modelo de licença
2. **Bootstrap** — sem venture capital; crescimento sustentável
3. **Nicho específico** — não disputou frente a frente com GA; criou categoria (privacy-first analytics)
4. **~$318k ARR/pessoa** — eficiência que vem de produto, não services

**Limite do proxy:** mercado Plausible é global e homogêneo; canna-br é ICP local BR com regulação específica. $3–5M ARR com 8–12 pessoas é teto razoável no médio prazo antes de expandir país/nicho.

### Cannanas DE como Referência de Mercado

- ~600+ Social Cannabis Clubs registrados na Alemanha (lei abril 2024)
- Penetração estimada 30–40% = 180–240 clientes; pricing €199–499/mês → ARR ~€4.3M–7.2M
- SAM BR: 400+ associações mapeadas; ~315 endereçáveis

**O que Cannanas não tem:** código auditável, self-hosted, LGPD nativo, SNGPC nativo.

---

## Comparativo de Modelos de Licença

| Critério | AGPL puro (atual) | AGPL + Dual (adotado) | AGPL + Commons Clause | BSL/SSPL |
|---|---|---|---|---|
| Protege de fork que modifica | Sim | Sim | Sim | Sim |
| Protege de hosting sem modificação | **Não** | Depende do contrato comercial | Sim | Sim |
| Reconhecimento OSI / confiança | Sim | Sim | **Não** | **Não** |
| Contribuidores externos | Alta | Média | Baixa | Muito baixa |
| Risco de fork comunitário | Baixo | Baixo | Médio | **Alto** (ver Terraform→OpenTofu) |
| Fit nicho regulatório/saúde (ANVISA) | Alta | Alta | Média | **Eliminatório** |
