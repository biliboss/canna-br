---
title: "SNGPC — Integração Técnica"
description: "Sistema Nacional de Gerenciamento de Produtos Controlados: API REST, XSDs, homologação, fluxo de envio."
---

## O Que É o SNGPC

O **Sistema Nacional de Gerenciamento de Produtos Controlados** é o banco de dados federal que registra todas as dispensações de substâncias sujeitas a controle especial no Brasil, conforme a **Portaria SVS/MS 344/98**.

Farmácias, hospitais e — sob a RDC 1.014/2026 — associações de pacientes são obrigados a reportar ao SNGPC cada dispensação de substâncias das listas C1, C5 e afins.

---

## API REST Nova

| Atributo | Detalhe |
|---|---|
| Base URL | `sngpc-api.anvisa.gov.br` |
| Documentação | `/swagger/index.html` |
| Autenticação (nova API) | Token JWT |
| Autenticação (legado) | Certificado ICP-Brasil A1/A3 |
| Protocolo legado | SOAP — **deprecated**, sem prazo de desligamento publicado |

A nova API REST ainda coexiste com o SOAP legado. Recomendamos implementar contra a REST e manter um adapter SOAP como fallback enquanto a migração não é consolidada.

---

## 3 XSDs Públicos

Os schemas XML publicados pela ANVISA definem o contrato de envio:

| XSD | Propósito |
|---|---|
| `sngpc.xsd` | Schema raiz — estrutura geral do documento de envio |
| `sngpcSimpleTypes.xsd` | Tipos primitivos reutilizáveis (CNPJs, datas, códigos) |
| `sngpcOperacoes.xsd` | Operações específicas: entrada, saída, balanço |

**Atenção**: os XSDs publicados são a versão para farmácias. O schema específico para associações de pacientes (sandbox RDC 1.014) **ainda não foi publicado** (Jun 2026).

---

## Processo de Homologação (5 Passos)

```
1. Credenciamento
   └─ Portal SNGPC com CNPJ da associação + documentação de RT
         ↓
2. Certificado ICP-Brasil
   └─ A1 (software) ou A3 (token físico) — emitido por AC credenciada
         ↓
3. Testes Sandbox SNGPC
   └─ Ambiente isolado com dados fictícios
         ↓
4. Validação de Envios Fictícios
   └─ Confirmação de aceitação dos XMLs pela ANVISA
         ↓
5. Autorização Produção
   └─ Credencial de produção emitida — envios reais começam
```

---

## Campos do XML (Referência Farmácia)

Os campos obrigatórios no XML de dispensação (versão farmácia, como referência):

| Campo | Tipo | Exemplo |
|---|---|---|
| CNPJ do estabelecimento | String | `00.000.000/0001-00` |
| Produto (DCB + concentração) | String | `CANABIDIOL 200mg/mL` |
| Número do lote | String | `LOT-2026-001` |
| Quantidade dispensada | Decimal | `30.000` (mL ou g) |
| Número da receita | String | `REC-SP-2026-12345` |
| CPF/nome do paciente | String | Conforme LGPD |

---

## Gaps para o Sandbox de Associações

Os campos extras **prováveis** para associações (não confirmados pela ANVISA):

| Campo Extra | Justificativa |
|---|---|
| Concentração THC/CBD (%) | Exigida pelo Plano de Controle de Qualidade |
| Código da planta matriz | Rastreabilidade seed-to-dispensação |
| Hash do COA (Certificado de Análise) | Integridade do laudo laboratorial |
| ID interno do membro (anonimizado) | Rastreabilidade sem exposição de CPF em claro |

---

## Fluxo de Envio no Sistema

```
DispensationRecorded (evento de domínio)
  └─ SngpcXmlBuilder
        └─ valida contra XSD local
              └─ BullMQ (fila persistente)
                    └─ ANVISA REST API
                          ├─ 200 OK → marca como enviado
                          └─ erro → retry 3× com backoff exponencial
                                        └─ dead-letter queue → alerta operador
```

Princípios do fluxo:
- **Idempotência**: cada dispensação tem UUID estável — reenvio não duplica no SNGPC
- **Resiliência**: fila BullMQ garante entrega even após queda de rede
- **Auditoria**: log imutável de cada tentativa de envio e resposta da API
