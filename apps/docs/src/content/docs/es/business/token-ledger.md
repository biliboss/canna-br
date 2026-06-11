---
title: "Token-Ledger v0.1"
description: "Token desde el día 1, especulación nunca; inversión solo regulada. Contabilidad programable interna en la v0.1 — producto financiero solo con estructura regulada."
---

> **El token-ledger nace en la v0.1 como contabilidad programable. La inversión tokenizada nace solo después, si y cuando exista estructura regulada. Token desde el día 1, especulación nunca; inversión solo regulada.**

Esta es la visión de negocio. Complementa [Infraeconomics](/es/business/tokenomics/): la asociación no lucra con cannabis ([RDC 1.014/2026, Anvisa](https://www.gov.br/anvisa/pt-br/assuntos/noticias-anvisa/2026/anvisa-publica-regras-para-producao-de-cannabis-medicinal)); la InfraCo monetiza la infraestructura alrededor. El ledger es la pieza que hace esa economía auditable desde el primer día.

## Dos dimensiones que no pueden mezclarse

La primera es **arquitectura**. La segunda es **producto financiero**. Confundir las dos es el error que mata proyectos de este tipo.

| Dimensión A — Ledger técnico (v0.1) | Dimensión B — Token de inversión (solo regulado) |
| --- | --- |
| Posición económica interna, permisionada | Activo ofrecido a terceros con expectativa de retorno |
| Unidad contable programable: saldo, cuota, garantía, reputación, voto | Cuentas por cobrar tokenizadas, pool de crédito, plantación con lucro, buyback |
| **Condiciones de seguridad:** interno; no ofrecido como inversión; sin promesa de rendimiento; sin mercado secundario libre; sin APY; sin distribución automática de lucro; respaldo contable claro | **Gatillos regulatorios:** [la CVM clasifica los criptoactivos como valores mobiliarios](https://www.gov.br/cvm/pt-br/acesso-a-informacao-cvm/perguntas-frequentes-da-cvm/criptoativos-quando-se-aplicam-as) por la sustancia económica, no por el nombre — incluyendo [tokens de cuentas por cobrar y renta fija](https://www.gov.br/cvm/pt-br/assuntos/noticias/2023/cvm-orienta-sobre-caracterizacao-de-tokens-de-recebiveis-e-de-tokens-de-renda-fixa-como-valores-mobiliarios) |
| Riesgo bajo relativo | Oferta pública, suitability, KYC/AML, custodia, [Resolución BCB 520 (VASP/SPSAV)](https://www.bcb.gov.br/estabilidadefinanceira/exibenormativo?numero=520&tipo=Resolu%C3%A7%C3%A3o+BCB) |

## Lo que el usuario ve en la v0.1

El usuario nunca ve "token", wallet, gas o chain. Ve lenguaje financiero simple.

| Función visible | Cómo mostrar | Backend | Condición de seguridad |
| --- | --- | --- | --- |
| Saldo interno | "Saldo disponible: R$ 1.200" | `CREDIT` | Solo para uso dentro de la red |
| Cuota de compra colectiva | "Tienes 3 cuotas en el pedido de julio" | `PURCHASE_ORDER_SHARE` | Derecho de compra/uso, no rendimiento |
| Reserva de insumo/equipo | "12h de equipo reservadas" | `EQUIPMENT_USAGE_RIGHT` | Derecho de uso, no participación en lucro |
| Garantía bloqueada | "Garantía bloqueada: R$ 3.000" | `ESCROW` | Solo caución/colateral |
| Reputación | "Nivel Oro" | `REPUTATION_SBT` | No transferible |
| Gobernanza operacional | "Vota en la próxima compra colectiva" | `GOVERNANCE_RIGHT` | Voto sobre operación, no lucro |
| Extracto | "Crédito usado / cuota creada / garantía liberada" | eventos del ledger | Sin expectativa de inversión |
| Ahorro generado | "Ahorraste R$ 740" | `SAVINGS_EVENT` | Ahorro, no rendimiento financiero |

**No puede aparecer en la v0.1:** comprar token para invertir, APY, rentabilidad proyectada, participación en intereses/cuentas por cobrar, token de plantación con retorno, token negociable, promesa de recompra, "gana con la valorización", "recibe dividendos". Buyback es un concepto interno futuro — fuera de la copy pública.

## Tipos de token

| Token | Función | Visible como | Status v0.1 |
| --- | --- | --- | --- |
| `CREDIT` | Saldo interno, transferible solo dentro de la red | "Saldo" | Activo |
| `PO_SHARE` | Cuota de compra colectiva | "Cuota/pedido" | Activo |
| `ESCROW` | Garantía bloqueada, no transferible | "Garantía" | Activo |
| `REPUTATION` | Reputación de la asociación, no transferible | "Nivel/score" | Activo |
| `GOVERNANCE` | Voto operacional, no financiero | "Votación" | Activo |
| `SAVINGS` | Ahorro generado — evento, no saldo rescatable | "Ahorro" | Activo |
| `FEE` | Tarifa de servicio de la InfraCo | Extracto | Activo |
| `LOAN_POOL_SHARE`, `RECEIVABLE_SHARE`, `YIELD_RIGHT`, `PLANTING_INVESTMENT_POSITION`, `BUYBACK_RIGHT`, `SECONDARY_MARKET_TOKEN` | Cualquier posición con retorno financiero | — | **Bloqueados hasta versión regulada** |

## Roadmap v0.1 → v0.8

Sin carrera hacia la v1.0: solo minors — cada minor entrega valor real y se construye sobre el anterior.

Vías independientes — este roadmap (producto/red) y el de la [capa de personas](/es/business/dao/) (v0.1 → v0.5) evolucionan en paralelo, sin sincronización de versiones.

| Versión | Entrega clave | Ingresos | Riesgo |
| --- | --- | --- | --- |
| **v0.1** | Token-ledger interno + OSS operacional: saldos, cuotas, garantías, reputación básica, extracto | Setup + hosting + soporte + compliance básico | safe |
| **v0.2** | Compras colectivas: pedido colectivo, cuotas, pago a proveedor, ahorro generado | Suscripción + fee de gestión de compras | safe |
| **v0.3** | Riesgo y cobranza: límite interno, score, cronograma, bloqueo, provisión simple | Risk fee + servicing fee + cobranza | safe |
| **v0.4** | InfraCo escalable: multi-tenant, SLA, agentes MCP, compliance pack, dashboards | MRR por asociación | safe |
| **v0.5** | Liquidación fiat/USDT **vía socio regulado** — nunca improvisar exchange/custodia | Fee de liquidación + conciliación | caution |
| **v0.6** | Reputación y gobernanza operacional: niveles, votaciones, presupuesto | Suscripción + módulos | safe |
| **v0.7** | Crédito estructurado cerrado: pools privados, suitability/KYC/KYB | Estructuración + reportes de riesgo | caution |
| **v0.8** | Token financiero regulado: cuentas por cobrar, pool, retorno, eventual mercado secundario | Estructuración + gestión + servicing | regulated |

## Estructura societaria mínima

v0.1 = **una única empresa: InfraCo Brasil LTDA** (tecnología y servicios). Sin FinanceCo, Foundation o AuditCo en el día 1.

| Objeto social — permitido | Objeto social — evitar |
| --- | --- |
| Desarrollo, licenciamiento y hosting de software; soporte; implantación; consultoría; integración; automatización; análisis de datos; capacitación; gestión operacional de compras colectivas | Intermediación financiera; custodia de criptoactivos; cambio de divisas; concesión de crédito; captación de recursos; administración de cartera; distribución de valores mobiliarios |

Las entidades futuras nacen por gatillo, no por anticipación:

```text
v0.1  InfraCo LTDA única           — software, hosting, suporte, ledger interno
v0.4  Parceiros externos           — auditoria terceirizada, jurídico
v0.5  FinanceCo ou parceiro regulado — liquidação fiat/USDT, crédito, recebíveis
v0.6  OSS Foundation (opcional)    — governança do OSS, contributors, grants
v0.7  AuditCo / auditor independente — prova de lastro, certificação
v0.8  Veículo regulado de investimento — pools, recebíveis, retorno financeiro
```

## Ejemplo: compra colectiva

10 asociaciones; pedido de R$ 100.000; la Asociación A participa con R$ 10.000; fee del 3%; descuento negociado del 12%.

| Frontend (Asociación A) | Ledger (backend) |
| --- | --- |
| Pedido colectivo #008 | `CreditIssued: R$ 10.000` |
| Tu cuota: R$ 10.000 | `PurchaseOrderShareIssued: R$ 10.000` |
| Tarifa de gestión: R$ 300 | `FeeCharged: R$ 300` |
| Ahorro estimado: R$ 1.200 | `SupplierPaymentReserved: R$ 9.700` |
| Status: esperando pago al proveedor | `SavingsRecorded: R$ 1.200` |

El usuario no compró una inversión. Compró una cuota operacional de compra colectiva.

## Ejemplo: reputación

La asociación paga a tiempo, mantiene trazabilidad, sin inconsistencias de stock. Frontend: **Nivel Oro** → límite mayor en compras, menor garantía exigida, prioridad en pedidos colectivos. Backend: `ReputationUpdated, score: 87, token_type: REPUTATION, transferability: non_transferable`. La reputación no puede venderse — reduce riesgo sin convertirse en activo financiero.

## Backlog v0.1 — 6 semanas

| Semana | Entrega |
| --- | --- |
| 1 | Fundación: InfraCo LTDA, contrato estándar, términos del ledger, política "el token no es inversión", boundaries [AGPL](https://www.gnu.org/licenses/agpl-3.0.en.html)/comercial |
| 2 | Ledger: tipos de token, idempotencia, proyección de saldos, extracto, checkpoint hash |
| 3 | Integración OSS: mapear eventos del core, outbox, posiciones económicas |
| 4 | Compras colectivas: pedido colectivo, `PO_SHARE`, reserva de saldo, fee, ahorro |
| 5 | Reputación/gobernanza: `REPUTATION` no transferible, votación simple, score por reglas |
| 6 | Compliance y piloto: KYB básico, [LGPD](https://www.gov.br/esporte/pt-br/acesso-a-informacao/lgpd)/acceso, auditoría de eventos, piloto 1–3 asociaciones, primeros cobros |

## Frase madre

> **Desde la v0.1, toda posición económica de la red nace como token interno en el backend. Pero ningún token se vende como inversión. El usuario ve saldo, cuotas, garantías, reputación, extracto y gobernanza operacional. La infraestructura monetiza software, soporte, compliance, compras, riesgo, cobranza y liquidación — mientras cualquier retorno financiero, cuenta por cobrar o pool queda bloqueado hasta que exista estructura regulada.**

## Stack

Implementación técnica (NATS JetStream + ledger engine + SurrealDB, según ADR-003) en [Token-Ledger (arquitectura)](/es/architecture/token-ledger/). Ver también [Infraeconomics](/es/business/tokenomics/) y [DAO & economía de contribución](/es/business/dao/).

---

> **Traducción automática v1** — versión en español generada por LLM, pulido humano en curso. Reporta errores a gabriel@devmagic.com.br.
