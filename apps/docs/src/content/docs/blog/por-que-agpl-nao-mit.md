---
title: "Por que AGPL e não MIT para infraestrutura de compliance"
date: 2026-06-10
excerpt: "Escolher uma licença OSS não é decisão técnica — é decisão de negócio e de confiança. Para infraestrutura que processa dados sensíveis de saúde em setor regulado, AGPL-3.0 é a única escolha que fecha o argumento comercial mais forte que o canna-br tem."
authors: gabriel
tags:
  - oss
  - licença
  - agpl
  - contribuição
  - arquitetura
---

Todo projeto OSS enfrenta a mesma conversa em algum momento: "por que não MIT? é mais simples, mais adotado, menos polêmico."

Para a maioria dos projetos, MIT é uma escolha razoável. Para o canna-br, seria um erro que destrói o argumento de venda mais forte do produto.

Este post explica a lógica da licença — para contribuidores, para associações que vão rodar o sistema, e para quem pensa em fazer fork.

## O argumento central

Associações de cannabis medicinal operam em zona cinzenta regulatória. O maior risco operacional que uma diretoria carrega não é funcional — é **perda de controle sobre dados sensíveis de saúde dos membros**.

Um sistema fechado, mesmo que auditado por terceiros, não oferece garantia verificável. A diretoria precisa confiar na palavra do fornecedor. Se o fornecedor muda de dono, muda de política, vai à falência ou é pressionado por alguma autoridade — a associação não tem visibilidade.

AGPL-3.0 transforma esse argumento em diferencial concreto:

> "Você pode ver cada linha de código que processa os dados dos seus membros. Qualquer advogado da associação pode revisar. Qualquer contribuidor pode auditar. Nenhum SaaS fechado consegue oferecer isso."

Esse argumento só funciona com AGPL. Com MIT, funciona na teoria mas não na prática — porque MIT permite que qualquer fork feche o código e rode como SaaS proprietário, sem obrigação de publicar modificações.

## O limite do AGPL: hosting parasita

AGPL protege de quem **modifica e hospeda sem publicar o código**. Não protege de quem hospeda sem modificar.

O risco real do canna-br não é um hyperscaler. É a consultoria local que pega o código, hospeda para cinco associações a R$ 500/mês e nunca contribui de volta — capturando valor sem pagar o custo da plataforma. Esse caso está fora do escopo de proteção do AGPL puro.

Por isso adotamos o modelo Metabase: **AGPL + licença comercial obrigatória via CLA** para os casos de hosting gerenciado de terceiros, embedding em soluções fechadas e integrações com certeza jurídica de obra derivada. O CLA é o instrumento que fecha esse ciclo sem abrir mão do reconhecimento OSI nem do trust moat de auditabilidade. Detalhes em [Modelo OSS](/business/oss-model/).

> _Sujeito a revisão jurídica antes de vigorar._

## Por que não BUSL

Business Source License é a alternativa favorita de projetos que querem "parecer OSS" sem ser OSS.

BUSL torna o código disponível com restrições comerciais por um período (geralmente 4 anos), depois converte para licença mais permissiva. O problema é que advogados de associação não vão aprovar código com licença restritiva como base do sistema de saúde dos membros. "Disponível mas não open source" é a pior posição possível: perde os benefícios de auditabilidade real sem ganhar nenhuma proteção regulatória.

Se o argumento comercial central é auditabilidade, BUSL o destrói.

## Por que não Open-Core

Open-core (núcleo gratuito, features premium pagas) funciona quando o comprador tem budget e incentivo para pagar por funcionalidades adicionais.

O perfil das associações de cannabis brasileiras não tem esse padrão:

- Budget apertado — toda receita vai para custo operacional do produto cannabis
- Decisão coletiva — a diretoria não vai aprovar upgrade para "tier Enterprise" em reunião
- Compliance é obrigação legal, não feature diferenciadora — não existe "Premium SNGPC" ou "LGPD Pro"

Open-core funciona com buyer corporativo que tem linha de aprovação de software e budget dedicado. Associação civil sem fins lucrativos não é esse perfil.

## A fronteira AGPL/Comercial na prática

AGPL-3.0 + CLA (Contributor License Agreement) é o modelo que permite que o canna-br tenha um negócio sustentável sem violar a lógica OSS.

A fronteira funciona assim:

**Core AGPL — tudo que é o produto:**
- Cadastro de associação, membros, prescrições
- Rastreabilidade seed-to-dispensação
- Dispensação, controle de cotas, estoque
- RBAC, logs operacionais
- LGPD básico, SNGPC, relatórios
- APIs públicas, eventos de domínio, conectores MCP básicos
- Ledger técnico interno

**Comercial (serviço externo, não modificação fechada):**
- Hosting gerenciado, backups, observabilidade, SLA
- Suporte e implantação
- Risk engine, cobrança, conciliação financeira
- Auditoria especializada, BI executivo
- Marketplace de fornecedores
- Agentes MCP financeiro/compliance avançado

A linha jurídica é clara: modificação do core AGPL rodando via rede exige publicação do código correspondente. Serviço separado que consome API ou eventos pode ser comercial fechado. Operação, hospedagem, suporte e auditoria são serviços — não precisam abrir playbook interno.

Isso significa que a InfraCo pode cobrar por managed hosting, suporte e serviços complementares sem violar AGPL. O código core continua aberto. Qualquer associação pode self-hospedar sem pagar nada além de infraestrutura.

## O que o CLA permite

CLA (Contributor License Agreement) é o mecanismo que permite dual-licensing. Quando você contribui para o canna-br e assina o CLA, você mantém seu copyright — mas concede à InfraCo o direito de usar sua contribuição em contextos comerciais (como o managed hosting).

Isso é o mesmo modelo do Plausible, Bitwarden e GitLab CE. Não é incomum, mas precisa estar explícito antes de qualquer contribuição.

**O que o CLA não permite:** fechar o código core. A InfraCo não pode pegar contribuições da comunidade e distribuí-las em versão proprietária sem publicar o fonte.

## Trust moat em dados sensíveis

O padrão de crescimento baseado em auditabilidade está validado em outros setores:

- **Bitwarden** cresceu como alternativa auditável ao LastPass. Cofre de senhas é exatamente o perfil de "dados sensíveis onde confiança não pode ser prometida, só demonstrada"
- **GitLab** construiu crescimento enterprise com "você pode ver tudo, inclusive o código do GitLab"
- **Sentry** tem ~90% dos usuários em self-host gratuito — o modelo de negócio funciona porque a confiança gerada pela transparência converte quando a escala cresce

Para dados de saúde em zona cinzenta regulatória, o trust moat é mais forte ainda. A diretoria da associação é **pessoalmente responsável** por um vazamento de dados de saúde. Usar um sistema auditável reduz esse risco pessoal de forma demonstrável.

## Uma armadilha clássica: o modelo professional services

OpenMRS e Bahmni são sistemas OSS de saúde bem-sucedidos tecnicamente que foram capturados pelo modelo de consultoria:

- Revenue veio majoritariamente de implementação e customizações
- A equipe core virou basicamente consultoria disfarçada de produto
- Escalabilidade zero: crescimento de receita = crescimento linear de pessoas

O canna-br tem um hard limit explícito: máximo 20% da receita de services. Qualquer serviço contratado (migração, treinamento, customização) tem um cronograma de eliminação via documentação e automação.

Se o modelo de negócio depende de manter o cliente dependente de serviços, AGPL não resolve nada — o software pode ser aberto mas o conhecimento operacional fica trancado. O modelo certo é: o cliente cresce em autonomia ao longo do tempo, e a InfraCo cresce em escala, não em horas.

## Como contribuir

O repositório está em estruturação (organização dedicada prevista para v0.3, jul/2026). Enquanto isso, o desenvolvimento acontece em repositório de trabalho aberto.

Para contribuir:
1. Leia os ADRs antes de propor mudanças de arquitetura — as decisões técnicas têm contexto regulatório que não é óbvio
2. Qualquer contribuição ao core precisa respeitar AGPL-3.0
3. O CLA será apresentado antes do merge — é necessário para o modelo de negócio funcionar
4. Issues abertas aparecem no [roadmap público](/roadmap/)

Se você quer discutir a licença, o modelo de negócio ou como o canna-br pode se encaixar num projeto que você tem, [escreve direto](mailto:gabriel@devmagic.com.br).

E se sua associação quer fazer parte do piloto — usar o sistema desde o início e ajudar a moldar o produto —, [leia sobre o piloto](/open/seed-associations/) e entre em contato.
