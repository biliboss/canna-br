---
title: "RDC 1.014/2026 na prática: o que muda para associações de cannabis"
date: 2026-06-10
excerpt: "A RDC 1.014/2026 entrou em vigor em 4 de agosto de 2026 e criou o primeiro regime administrativo formal para associações de pacientes no Brasil. O que muda operacionalmente — e o que precisa estar no lugar antes da fiscalização chegar."
authors: gabriel
tags:
  - regulação
  - rdc-1014
  - anvisa
  - compliance
  - associações
---

> **Aviso legal:** este post é informativo e não substitui orientação jurídica. Cada associação tem uma situação específica. Consulte advogado especializado antes de tomar decisões com base neste conteúdo.

Por quase vinte anos, associações de cannabis medicinal no Brasil operaram sob um regime jurídico improvisado: Habeas Corpus coletivo concedido pelo judiciário local, renovado periodicamente, sem uniformidade nacional e sem fiscalização administrativa clara.

Isso mudou com a RDC 1.014/2026.

## O que é a RDC 1.014

A Resolução da Diretoria Colegiada 1.014/2026 da ANVISA criou o primeiro "sandbox regulatório" formal para associações de pacientes de cannabis medicinal no Brasil. Vigência: 4 de agosto de 2026.

O que ela faz, na prática:

- Cria um regime de **autorização administrativa** para associações aprovadas no sandbox
- Transfere a **fiscalização primária do judiciário para a ANVISA**
- Estabelece um conjunto de **obrigações operacionais** que as associações precisam cumprir para manter a autorização

Antes da RDC, a proteção era judicial — cada associação negociava seu HC com o judiciário local. Com a RDC, existe um caminho administrativo, mas ele vem com requisitos concretos.

## O que fica igual

Associações que não solicitarem o sandbox continuam no regime anterior: HC coletivo, risco penal sobre diretores, fiscalização indireta. A RDC não revoga o regime anterior — ela cria uma alternativa. Para quem está no sandbox, a lógica muda completamente.

Também não muda o seguinte: cannabis continua sendo substância controlada. A regulação autoriza operação dentro de regras específicas; não descriminaliza em sentido amplo.

## O que muda para quem entra no sandbox

**Fiscalização direta.** A ANVISA passa a ser a autoridade fiscalizadora. Isso significa visitas de inspeção, auditorias documentais e a possibilidade de suspensão ou cassação da autorização por não conformidade.

**Proibições absolutas que precisam estar no sistema:**

| Proibição | O que significa operacionalmente |
|---|---|
| Comercialização vedada | Nenhuma transação financeira pelo produto cannabis em si |
| Só para membros cadastrados | Dispensação restrita ao quadro associativo ativo |
| Sem fins lucrativos | Toda receita vai para operação e pesquisa; proibida distribuição de resultado |
| Publicidade proibida | Sem material de divulgação de produtos ou serviços |

**Rastreabilidade obrigatória.** A RDC exige que toda dispensação, transferência e evento de produto seja registrado e verificável. Isso inclui a cadeia completa: de onde veio o insumo, qual lote, qual COA (Certificate of Analysis), quem recebeu, em qual quantidade, com base em qual prescrição vigente.

**SNGPC.** O Sistema Nacional de Gerenciamento de Produtos Controlados — hoje usado por farmácias para registrar dispensação de substâncias controladas — passa a ser requisito para associações no sandbox. As associações precisam enviar registros periódicos de dispensação no formato ANVISA.

**RBAC com segregação de funções.** A RDC implica que diferentes papéis dentro da associação (diretor, responsável técnico farmacêutico, cultivador, dispensador) precisam estar claramente definidos no sistema, com log de quem fez o quê. Não basta separar na prática — precisa estar no registro.

**LGPD aplicada a dados sensíveis de saúde.** Dados dos membros (diagnóstico, prescrição, dosagem, histórico de uso) são dados sensíveis nos termos da LGPD (Art. 5 II). Isso exige: consentimento explícito, controle de acesso restrito, possibilidade de exclusão efetiva (Art. 18 IV), e — para quem usa sistema externo — contratos de processamento com o fornecedor.

## Por que planilha não resolve mais

Associações que operam com Google Sheets, WhatsApp e planilhas paralelas estão em risco crescente por uma razão simples: esses sistemas não produzem trilha de auditoria verificável.

Quando o fiscal ANVISA pede o histórico de dispensações do lote LT-001, a resposta não pode ser "deixa eu procurar nos registros". Precisa ser: aqui está o evento com timestamp, hash, responsável, quantidade, vinculo à prescrição do paciente, dedução do estoque correspondente.

Planilha não tem idempotência. Pode ser editada retroativamente. Não tem hash de verificação. Não tem RBAC. Em auditoria, a ausência dessas propriedades é um problema que nenhuma justificativa resolve.

## O que precisa estar no lugar

Para uma associação que quer entrar no sandbox ou se preparar para a fiscalização administrativa, o checklist operacional mínimo é:

- **Cadastro de membros** com consentimento LGPD documentado, dados de saúde segregados
- **Rastreabilidade de lotes** desde o insumo até a dispensação final
- **Registro de dispensações** com vinculo a prescrição vigente, quantidade, lote, dispensador
- **Controle de cotas** — cada membro tem um limite prescrito; o sistema precisa validar isso antes de registrar a dispensação
- **SNGPC** — capacidade de gerar e enviar relatórios no formato ANVISA
- **Audit trail imutável** — histórico que não pode ser editado retroativamente
- **RBAC** — cada usuário só faz o que seu papel permite; tudo logado

Isso é exatamente o que o canna-br entrega, construído com a RDC como referência desde o início.

## Responsabilidade pessoal dos diretores

Um ponto que não aparece no texto da resolução mas que qualquer advogado especializado vai mencionar: a RDC não elimina a responsabilidade pessoal dos diretores da associação.

Em caso de vazamento de dados de saúde dos membros, a LGPD impõe responsabilidade civil e, em alguns casos, criminal. Em caso de irregularidade operacional grave, o HC coletivo pode ser contestado. A autorização administrativa do sandbox não é escudo para qualquer tipo de irregularidade.

Usar um sistema que pode ser auditado publicamente — onde o código que processa os dados dos membros é aberto e verificável — é uma forma concreta de reduzir esse risco pessoal. A diretoria pode mostrar, para qualquer advogado ou auditor, exatamente o que o sistema faz com os dados.

## O que o canna-br está construindo agora

O sistema está em v0.1.0 com 154 testes passando. Os módulos de dispensação, rastreabilidade de lotes e controle de cotas estão implementados. O SNGPC está em mock — o schema XSD específico para associações ainda não foi publicado pela ANVISA, mas a arquitetura está pronta para integração quando o documento sair.

O piloto está sendo estruturado com associações que queiram construir esse padrão desde o início — não adaptar um sistema genérico depois que a fiscalização chegar.

Se sua associação está avaliando como se preparar para o novo regime regulatório, [entre em contato](mailto:gabriel@devmagic.com.br) ou veja a documentação técnica de compliance em [/build/compliance/](/build/compliance/).
