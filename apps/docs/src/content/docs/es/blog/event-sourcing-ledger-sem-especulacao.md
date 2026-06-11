---
title: "Cómo modelamos un ledger sin especulación usando Event Sourcing"
date: 2026-06-10
excerpt: "El token-ledger de canna-br no es cripto ni fintech. Es contabilidad programable construida sobre event sourcing — para que toda posición económica de una asociación sea auditable desde el primer evento."
authors: gabriel
tags:
  - arquitetura
  - event-sourcing
  - ledger
  - oss
---

canna-br necesitaba un ledger desde el primer día. No por moda, no por ser "web3" — sino porque el problema que el sistema resuelve exige trazabilidad contable inmutable por obligación legal.

Cuando la ANVISA fiscaliza una asociación de cannabis medicinal, quiere saber: quién recibió qué, cuándo, de qué lote, con base en qué prescripción, con saldo disponible en el momento de la dispensación. Eso no es un informe gerencial. Es una pista de auditoría que necesita sobrevivir a un cuestionamiento judicial.

La respuesta obvia sería una base de datos relacional con tablas de saldo. El problema es que las tablas de saldo mutables no responden a una pregunta simple: *¿qué ocurrió para que el saldo llegara aquí?* Puedes tener el número correcto pero no tener la historia. En entorno regulatorio, la historia es lo que importa.

## El patrón

La solución es Event Sourcing: en lugar de guardar el estado actual, guardas cada hecho que ocurrió. El estado se deriva. La historia es inmutable.

En canna-br, cada operación emite uno o más eventos de dominio. Una dispensación genera `DispensationRecorded` y `LotQuantityDeducted` — dos hechos atómicos, inmutables, con timestamp y metadatos. Sin UPDATE en tabla de saldo. Sin filas que desaparezcan. La proyección (el saldo que ves en pantalla) se computa a partir del stream de eventos y puede recomputarse en cualquier momento para auditoría.

El motor de eventos es NATS JetStream, configurado como append-only con retención ilimitada (`LimitsPolicy` sin `MaxAge`). Dos trampas que aprendimos temprano:

- `InterestPolicy` borra mensajes sin consumer activo — destruye el historial exactamente cuando lo necesitas
- `WorkQueuePolicy` borra en el primer ack — ídem

La configuración correcta es `LimitsPolicy` sin techo. El historial nunca desaparece.

## Por qué no blockchain

La pregunta inevitable es: si quieres inmutabilidad, ¿por qué no blockchain?

La respuesta está en cuatro ejes:

**Implementación.** Blockchain permisionada exige gobernanza de nodos, gestión de claves, protocolo de consenso. Eso está fuera de la capacidad operativa de una asociación de pacientes con tres voluntarios.

**LGPD.** Datos de salud en cadena pública — o incluso permisionada compartida — crean un problema serio de conformidad. El RGPD europeo ya tiene resoluciones al respecto; la tendencia de la LGPD apunta en la misma dirección. La crypto-deletion (Art. 18 IV LGPD) en blockchain es técnicamente inviable sin una arquitectura específica.

**Superficie regulatoria.** "Blockchain" en el contexto del cannabis en Brasil es leído como "cripto" por cualquier interlocutor regulatorio. Eso genera ruido que no ayuda.

**Costo-beneficio.** Lo que ofrece blockchain (inmutabilidad, auditoría distribuida) ya lo ofrece el event log local con menos complejidad. La diferencia es el componente de *confianza distribuida* — relevante cuando hay múltiples partes no confiables. Internamente en una asociación, ese requisito no existe.

## La capa económica

Event sourcing resuelve el *historial operacional*. Pero las asociaciones también necesitan *posiciones económicas*: saldo interno, cuotas de compra colectiva, garantías, gobernanza.

Para eso existe el token-ledger — pero la palabra "token" aquí es técnica, no comercial. Lo que el usuario ve es "saldo", "cuota", "garantía", "nivel". El backend usa tipos contables (`CREDIT`, `PO_SHARE`, `ESCROW`, `REPUTATION_SBT`, `GOVERNANCE_RIGHT`) para mantener correctas las reglas de transferibilidad, idempotencia y segregación.

La lógica de partida doble (débito, crédito, saldo que nunca queda negativo) se delega a un motor de ledger ya probado — TigerBeetle o Formance. No se reimplementa la contabilidad de partida doble. Las trampas son conocidas: idempotencia ante fallo parcial, atomicidad cross-cuenta, overflow de punto flotante. Esos problemas ya fueron resueltos por quienes construyeron esos motores.

## Lo que ve el auditor

Cuando llega la fiscalización, el sistema puede reproducir el estado de la asociación en cualquier punto en el tiempo. Cada dispensación tiene un hash de checkpoint que vincula el evento al snapshot del ledger en ese momento. El auditor puede verificar que ningún evento fue modificado retroactivamente.

Eso no es una feature de UX. Es el producto. El sistema existe para hacer que la operación de una asociación sea verificable por una autoridad externa.

## Arquitectura en capas

```
Core AGPL (Emmett — TypeScript)
    ↓ Domain Events
NATS JetStream — log inmutable, fuente de verdad
    ↓
Token-Ledger Service (TigerBeetle ou Formance)
    ↓
Proyecciones SurrealDB — saldo, cuotas, extracto
    ↓
Projection API → Interfaz
```

El frontend nunca accede a JetStream directamente. El usuario nunca ve un evento bruto. La interfaz consume proyecciones — lecturas desnormalizadas construidas para display. Cuando la proyección está equivocada, se reprocesa el stream. El stream nunca cambia.

## Lo que queda bloqueado intencionalmente

El ledger de v0.1 no tiene tipos financieros. `LOAN_POOL_SHARE`, `RECEIVABLE_SHARE`, `YIELD_RIGHT`, `PLANTING_INVESTMENT_POSITION` — todos bloqueados. No porque la arquitectura no lo soporte, sino porque un producto financiero exige una estructura regulada que todavía no existe. La CVM clasifica los criptoactivos como valores mobiliarios por su sustancia económica, no por su nombre. Equivocarse aquí no es un bug técnico.

La arquitectura fue diseñada para que esa barrera sea un control, no una limitación accidental. Cada tipo económico tiene un flag `regulated_flag` y reglas de transferibilidad explícitas. Nada queda bloqueado por olvido; queda bloqueado por decisión.

---

La documentación técnica completa está en [Token-Ledger (arquitectura)](/es/architecture/token-ledger/) y [Token-Ledger v0.1](/es/business/token-ledger/).

Si quieres construir esta infraestructura junto o conectar tu asociación como piloto, [ponte en contacto](mailto:gabriel@devmagic.com.br). El proyecto es abierto, AGPL-3.0, y el código está en construcción pública.

---

> **Traducción automática v1** — versión en español generada por LLM, pulido humano en curso. Reporta errores a gabriel@devmagic.com.br.
