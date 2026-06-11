---
title: "Como modelamos um ledger sem especulação usando Event Sourcing"
date: 2026-06-10
excerpt: "O token-ledger do canna-br não é cripto e não é fintech. É contabilidade programável construída sobre event sourcing — para que toda posição econômica de uma associação seja auditável desde o primeiro evento."
authors: gabriel
tags:
  - arquitetura
  - event-sourcing
  - ledger
  - oss
---

O canna-br precisava de um ledger desde o primeiro dia. Não por moda, não por ser "web3" — mas porque o problema que o sistema resolve exige rastreabilidade contábil imutável por obrigação legal.

Quando a ANVISA fiscaliza uma associação de cannabis medicinal, ela quer saber: quem recebeu o quê, quando, de qual lote, com base em qual prescrição, com saldo disponível no momento da dispensação. Isso não é relatório gerencial. É trilha de auditoria que precisa sobreviver a questionamento judicial.

A resposta óbvia seria um banco de dados relacional com tabelas de saldo. O problema é que tabelas de saldo mutáveis não respondem a uma pergunta simples: *o que aconteceu para o saldo chegar aqui?* Você pode ter o número certo e não ter a história. Em ambiente regulatório, a história é o que importa.

## O padrão

A solução é Event Sourcing: em vez de salvar o estado atual, você salva cada fato que aconteceu. O estado é derivado. A história é imutável.

No canna-br, cada operação emite um ou mais eventos de domínio. Uma dispensação gera `DispensationRecorded` e `LotQuantityDeducted` — dois fatos atômicos, imutáveis, com timestamp e metadados. Nenhum UPDATE em tabela de saldo. Nenhuma linha desaparece. A projeção (o saldo que você vê na tela) é computada a partir do stream de eventos, e pode ser recomputada a qualquer momento para auditoria.

O engine de eventos é o NATS JetStream, configurado como append-only com retenção ilimitada (`LimitsPolicy` sem `MaxAge`). Duas armadilhas que aprendemos cedo:

- `InterestPolicy` apaga mensagens sem consumer ativo — destrói o histórico exatamente quando você precisa dele
- `WorkQueuePolicy` apaga no primeiro ack — idem

A configuração correta é `LimitsPolicy` sem teto. O histórico nunca some.

## Por que não blockchain

A pergunta inevitável é: se você quer imutabilidade, por que não blockchain?

A resposta está em quatro eixos:

**Implementação.** Blockchain permissionada exige governança de nós, gestão de chaves, protocolo de consenso. Isso não está na capacidade operacional de uma associação de pacientes com três voluntários.

**LGPD.** Dados de saúde em cadeia pública — ou mesmo permissionada compartilhada — criam problema sério de conformidade. O RGPD europeu já tem decisões sobre isso; a tendência LGPD aponta na mesma direção. Crypto-deletion (Art. 18 IV LGPD) em blockchain é tecnicamente inviável sem arquitetura específica.

**Superfície regulatória.** "Blockchain" no contexto de cannabis no Brasil é lido como "cripto" por qualquer interlocutor regulatório. Isso cria ruído que não ajuda.

**Custo-benefício.** O que a blockchain oferece (imutabilidade, auditoria distribuída) o event log local já oferece com menos complexidade. A diferença é o componente de *confiança distribuída* — relevante quando há múltiplas partes não confiáveis. Internamente a uma associação, esse requisito não existe.

## A camada econômica

Event sourcing resolve o *histórico operacional*. Mas associações precisam também de *posições econômicas*: saldo interno, cotas de compra coletiva, garantias, governança.

Para isso existe o token-ledger — mas a palavra "token" aqui é técnica, não comercial. O que o usuário vê é "saldo", "cota", "garantia", "nível". O backend usa tipos contábeis (`CREDIT`, `PO_SHARE`, `ESCROW`, `REPUTATION_SBT`, `GOVERNANCE_RIGHT`) para manter as regras de transferibilidade, idempotência e segregação corretas.

A lógica de dupla-entrada (débito, crédito, saldo que nunca fica negativo) é delegada a um engine de ledger pronto — TigerBeetle ou Formance. Não se reimplementa contabilidade de dupla-entrada. As armadilhas são conhecidas: idempotência em falha parcial, atomicidade cross-conta, overflow de ponto flutuante. Esses problemas já foram resolvidos por quem construiu esses engines.

## O que o auditor vê

Quando a fiscalização chega, o sistema pode reproduzir o estado da associação em qualquer ponto no tempo. Cada dispensação tem um hash de checkpoint que vincula o evento ao snapshot do ledger naquele momento. O auditor pode verificar que nenhum evento foi retroativamente modificado.

Isso não é feature de UX. É o produto. O sistema existe para tornar a operação de uma associação verificável por uma autoridade externa.

## Arquitetura em camadas

```
Core AGPL (Emmett — TypeScript)
    ↓ Domain Events
NATS JetStream — log imutável, fonte da verdade
    ↓
Token-Ledger Service (TigerBeetle ou Formance)
    ↓
Projeções SurrealDB — saldo, cotas, extrato
    ↓
Projection API → Interface
```

O frontend nunca acessa o JetStream diretamente. O usuário nunca vê evento bruto. A interface consome projeções — leituras desnormalizadas construídas para display. Quando a projeção está errada, você reprocessa o stream. O stream nunca muda.

## O que fica travado intencionalmente

O ledger da v0.1 não tem tipos financeiros. `LOAN_POOL_SHARE`, `RECEIVABLE_SHARE`, `YIELD_RIGHT`, `PLANTING_INVESTMENT_POSITION` — todos bloqueados. Não porque a arquitetura não suporte, mas porque produto financeiro exige estrutura regulada que ainda não existe. CVM classifica criptoativos como valores mobiliários pela substância econômica, não pelo nome. Errar aqui não é bug técnico.

A arquitetura foi desenhada para que essa barreira seja um controle, não uma limitação acidental. Cada tipo econômico tem um flag `regulated_flag` e regras de transferibilidade explícitas. Nada sai bloqueado por esquecimento; sai bloqueado por decisão.

---

A documentação técnica completa está em [Token-Ledger (arquitetura)](/architecture/token-ledger/) e [Token-Ledger v0.1](/business/token-ledger/).

Se você quer construir essa infraestrutura junto ou conectar sua associação como piloto, [entre em contato](mailto:gabriel@devmagic.com.br). O projeto é aberto, AGPL-3.0, e o código está em construção pública.
