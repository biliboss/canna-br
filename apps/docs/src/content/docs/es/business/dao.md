---
title: "DAO y Economía de Contribución"
description: "Gobernanza sociocrática + Contribution Ledger (CONTRIB = US$ 1 de referencia contable). Trabajo tokenizado desde el día 1, sin promesa de inversión."
---

> El proyecto es un **proyecto-DAO con capa operacional/comercial** — no una empresa que tiene comunidad. Existen **dos economías**: la del producto/red (asociaciones, hosting, compliance, ledger económico) y la de la **construcción del proyecto** (contribuidores, roles, círculos, gobernanza). El trabajo y la contribución se convierten en **posiciones tokenizadas desde el día 1** — sin convertirse nunca en promesa pública de inversión.

Lo que esto resuelve: justicia entre early contributors, memoria económica del esfuerzo, gobernanza clara y base transparente para compensación futura. Lo que esto no es: promesa de enriquecimiento, token especulativo, gobernanza plutocrática, voluntariado invisible o caos informal.

## Principios Constitucionales

Constitución Operacional corta, pública y versionada:

```text
1.  Transparência radical por padrão
2.  Tensão gera evolução
3.  Consentimento > consenso
4.  Autoridade vem de papel e domínio, não de cargo informal
5.  Círculos governam domínios claros
6.  Double-linking entre círculos
7.  Contribuição registrada publicamente
8.  Token registra esforço, não promete liquidez imediata
9.  Caixa real remunera pessoas reais
10. O core é open source; o valor vem da execução
11. Quem assume responsabilidade deve ter autonomia compatível
12. Todo poder deve deixar trilha auditável
```

> **El token es memoria contable del esfuerzo; la gobernanza es sociocrática; la remuneración futura es consecuencia de caja real, no de narrativa.**

## Estructura Sociocrática

El círculo-raíz (Stewardship) custodia el propósito, los principios, la asignación macro y la creación/extinción de círculos. Seis círculos iniciales, con roles explícitos incluso con poca gente — 1 persona puede ocupar 3-4 roles; lo que importa es la **claridad de sombreros**:

```text
General/Stewardship
├── Product & OSS Core ......... Core Maintainer, Release Steward, MCP Architect
├── Economic Infra ............. Ledger Steward, Risk Steward, Pricing Steward
├── Community & Growth ......... Onboarding Steward, Community Facilitator, Partnership Steward
├── Compliance & Trust ......... Privacy Steward, Audit Trail Steward, Policy Steward
└── Treasury & Operations ...... Treasury Steward, Compensation Steward, Vendor Steward
```

Double-linking: cada círculo tiene un **Lead Link** (lleva las prioridades del círculo padre al hijo) y un **Rep Link** (lleva las tensiones del hijo al padre). Evita la centralización.

Son roles, no cargos. Cada rol declara nombre, propósito, dominio, accountabilities, círculo, holder actual y mandato de revisión. La autoridad viene del rol y del dominio — nunca de un cargo informal.

## Flujo Tensión → Acción

```text
Tensão percebida → registro → triage no círculo →
  operacional? → resolve no papel existente
  governança?  → proposta → esclarecimento → reação → consentimento
    objeção válida? → integra → repete consentimento
    sem objeção    → adota → atualiza papéis/políticas → executa → revisão
```

La pregunta nunca es "¿todo el mundo está de acuerdo?". Es: **"¿existe una objeción fundamentada que muestre daño o regresión?"** Acelera mucho.

## Contribution Ledger

Toda contribución relevante se convierte en un registro público auditable: quién, círculo/rol, entrega, evidencia, valor de referencia, revisor, estado.

**`CONTRIB` = 1 unidad = US$ 1 de referencia contable.**

CONTRIB es unidad de **medida de esfuerzo reconocido** — como una hora o un story point. La referencia en USD existe solo para comparabilidad contable. La conversión en pago es **discrecional**: depende de caja real y política vigente — nunca automática, nunca pasivo exigible, nunca stablecoin.

| Significa | NO significa |
|---|---|
| Memoria económica auditable | Derecho líquido y exigible de retiro inmediato |
| Base para compensación futura cuando haya caja | Rendimiento o yield |
| Alineación entre early contributors | Valor mobiliario automático |
| Transparencia sobre quién construyó qué | Promesa pública de retorno |

Fórmula:

```text
Valor (USD ref) = Base Rate da função × Tempo ou Escopo
                  × Mult. qualidade × Mult. prioridade × Mult. risco
```

Ejemplo: Product Architect, US$ 100/h × 20h × 1,0 × 1,0 × 1,0 = **US$ 2.000 → 2.000 CONTRIB**.

Dos modos, ambos usados: **horas** para roles continuos/leadership; **bounties** por alcance para entregas puntuales (ej.: issue US$ 300, feature US$ 1.000, borrador de compliance policy US$ 500).

## Tokens de la Capa de Personas

| Token | Función | ¿Transferible? | ¿Visible? |
|---|---|---|---|
| `CONTRIB` | registro de contribución con referencia USD | no | sí |
| `ROLE_BADGE` | marca la posesión de un rol | no | sí |
| `REPUTATION` | reputación histórica y confiabilidad | no | sí |
| `GOV_RIGHT` | derecho a participar en ciertos procesos | restringido | sí |
| `COMP_CLAIM` | posición de compensación futura (opcional) | no/restringido | interno |

v0.1 usa los cuatro primeros. CONTRIB resuelve el 80% del problema por sí solo.

## Proceso de Mint

Nunca auto-mint irrestricto:

```text
Contributor registra entrega + evidência → Reviewer revisa escopo/qualidade
→ propõe valor USD ref → círculo valida por consentimento leve
→ mint CONTRIB → publica no dashboard auditável
```

Reglas anti-abuso:

```text
1.  ninguém aprova sozinho a própria contribuição acima de threshold
2.  toda contribuição precisa de evidência
3.  vínculo obrigatório com tensão, tarefa, bounty ou papel
4.  rate card público
5.  mudanças no rate card exigem governança
6.  disputa aberta por janela curta
7.  auditoria periódica do ledger
8.  contribuições fundadoras separadas das operacionais
9.  governança não é só token-weighted
10. contribuição passada não substitui responsabilidade presente
```

## Transparencia Radical

El dashboard público es la pieza cultural más importante. Muestra personas y roles (quién, qué rol, círculo, desde cuándo), gobernanza (tensiones abiertas, propuestas, objeciones integradas, decisiones), contribuciones (quién, cuánto reconocido en USD ref, evidencia, revisor) y economía interna (total de CONTRIB emitido, distribución por círculo y persona, caja real, compensaciones pagadas y pendientes). Quien quiera auditar, audita — sin pedir permiso.

## Ciclo de Vida del Contribuidor

```text
Observador → Contribuidor ocasional → Contribuidor reconhecido
→ Role holder → Circle member → Steward / Lead / Rep
```

El avance es por contribución demostrada con evidencia, comportamiento alineado, confiabilidad y capacidad de asumir accountabilities — no por antigüedad ni proximidad.

Las disputas tienen 3 vías: **contribución** ("fui subvalorado" → revisor → círculo → compensation steward), **rol/dominio** ("¿quién decide esto?" → gobernanza del círculo → general circle) y **relacional** (trust steward → proceso restaurativo).

## Anti-Plutocracia

> **NO hacer "1 token = 1 voto" como regla principal.** Demasiado pronto, eso se convierte en plutocracia contable.

La gobernanza viene de 3 fuentes: **rol actual** (autoridad operacional en el dominio), **círculo** (decisiones por consentimiento) y **contribution ledger** (reputación, legitimidad, historial).

El token pesa en: elegibilidad para roles, prioridad en retrocompensación, legitimacy score, peso auxiliar en decisiones presupuestarias. Evitar: comprar poder político, gobernanza puramente financiera, whales internos, voto irrestricto por acumulación histórica.

## Tipos de Decisión

```text
A. Operacionais    → papel responsável (ferramenta, bug, aprovar PR no domínio)
B. Táticas         → círculo (prioridades do mês, backlog, divisão de papéis)
C. Governança      → consentimento formal (papel, política, rate card, regra de mint)
D. Constitucionais → processo mais forte (princípios, compensação, relação InfraCo↔DAO)
```

## Remuneración

Tres etapas, según la caja real:

| Etapa | Estado | Qué sucede |
|---|---|---|
| 1 | Sin caja | Registro público; pequeños gastos reembolsados; ninguna promesa automática |
| 2 | Caja inicial | Compensación activa para roles críticos + retrocompensación parcial vía ledger |
| 3 | Caja saludable | Salario/retainer para roles clave + retrocompensación recurrente + bounty/contributor pool |

Waterfall de personas — nada se salta etapas:

```text
Receita real → Caixa →
1. Custos operacionais mínimos
2. Infra / cloud / ferramentas
3. Compliance / jurídico / contábil
4. Reserva prudencial
5. Compensação ativa de papéis críticos
6. Retrocompensação de contribuições históricas
7. Bounty / contributor pool
8. Crescimento / reinvestimento
9. Token treasury / mecanismos futuros
```

Retrocompensación proporcional al CONTRIB acumulado elegible. Ejemplo: pool de US$ 10.000; total elegible 50.000 CONTRIB; quien tiene 8.000 CONTRIB recibe 16% → **US$ 1.600**.

## Lenguaje Seguro

Siempre **"valor de referencia contable en USD"** — nunca "el token vale un dólar" ni "convertible automáticamente". La [CVM](https://www.gov.br/cvm/pt-br/acesso-a-informacao-cvm/perguntas-frequentes-da-cvm/criptoativos-quando-se-aplicam-as) mira la sustancia económica del activo, no el nombre — y la sustancia del CONTRIB es registro de esfuerzo, no promesa de retorno.

```text
- o projeto reconhece contribuição em unidades internas
- cada unidade = US$ 1 de referência contábil
- a referência serve para memória econômica, comparação e eventual compensação futura
- o registro não implica resgate imediato nem garantido
- compensação depende de política vigente e caixa real
```

## DAO vs Wrapper Legal

> **Social y operacionalmente, el proyecto es una DAO. Jurídicamente, una LTDA ejecuta**: firma, paga, recibe, contabiliza y aplica la retrocompensación conforme a la política que la DAO decidió.

## Tecnologías de Referencia

| Tecnología | Qué es | Uso aquí |
|---|---|---|
| [Hats Protocol](https://www.hatsprotocol.xyz/) | Roles/credenciales como tokens ERC-1155 en árbol; cada "hat" otorga permisos revocables por el rol padre | Mapea casi literalmente círculos anidados + double-linking. v0.1 **espeja la lógica off-chain**, como datos en el propio sistema |
| [Safe](https://safe.global/) | Multisig battle-tested, estándar de mercado para tesorería DAO | Tesorería futura on-chain, cuando exista |
| Coordinape / SourceCred | Mecánica de allocation circles para reconocimiento de contribución | **Inspiración de mecánica solamente** — Coordinape fue descontinuado (2021–2025); no construir encima |

Migración on-chain (Hats + Safe) solo cuando tenga sentido. La capa de abstracción del [Token-Ledger](/es/architecture/token-ledger/) (NATS JetStream + ledger engine + SurrealDB, ADR-003) permite cambiar el ledger interno por blockchain sin cambiar la experiencia.

## Roadmap de la Capa de Personas

Vías independientes — el roadmap del [producto](/es/business/token-ledger/) (v0.1 → v0.8) y el de la capa de personas (v0.1 → v0.5) evolucionan en paralelo, sin sincronización de versiones.

Sin carrera hacia la v1.0: solo minors — cada minor entrega valor real y se construye sobre el anterior.

| Versión | Entrega |
|---|---|
| v0.1 | Constitución + círculos iniciales + roles + rate card público + tensiones + mint CONTRIB + dashboard básico |
| v0.2 | Gobernanza formal: consentimiento, elecciones, double-linking, política de objeción |
| v0.3 | REPUTATION, elegibilidad, rotación de roles, score de confiabilidad |
| v0.4 | Compensación con caja: compensation pool, retrocompensación, retainer, presupuesto por círculo |
| v0.5 | Integración total: los círculos gestionan presupuestos reales; dashboard unificado producto+gobernanza+tesorería |

## Recomendación Central

> **El token de la capa de personas es un ledger moral-económico de contribución, no un activo especulativo. La gobernanza es role-based, circle-based y consent-based — el token entra como memoria y legitimidad, nunca como tiranía numérica.**

## Relacionado

- [Tokenomics](/es/business/tokenomics/) — economía del producto/red
- [Token-Ledger v0.1](/es/business/token-ledger/) — posiciones económicas internas sin promesa de retorno
- [Token-Ledger (arquitectura)](/es/architecture/token-ledger/) — NATS JetStream + ledger engine + SurrealDB

---

> **Traducción automática v1** — versión en español generada por LLM, pulido humano en curso. Reporta errores a gabriel@devmagic.com.br.
