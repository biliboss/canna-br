---
title: "Por qué AGPL y no MIT para infraestructura de compliance"
date: 2026-06-10
excerpt: "Elegir una licencia OSS no es una decisión técnica — es una decisión de negocio y de confianza. Para infraestructura que procesa datos sensibles de salud en un sector regulado, AGPL-3.0 es la única elección que cierra el argumento comercial más fuerte que tiene canna-br."
authors: gabriel
tags:
  - oss
  - licença
  - agpl
  - contribuição
  - arquitetura
---

Todo proyecto OSS enfrenta la misma conversación en algún momento: "¿por qué no MIT? es más simple, más adoptado, menos polémico."

Para la mayoría de los proyectos, MIT es una elección razonable. Para canna-br, sería un error que destruiría el argumento de venta más fuerte del producto.

Este post explica la lógica de la licencia — para contribuidores, para asociaciones que van a ejecutar el sistema, y para quienes piensan en hacer un fork.

## El argumento central

Las asociaciones de cannabis medicinal operan en zona gris regulatoria. El mayor riesgo operacional que carga una directiva no es funcional — es la **pérdida de control sobre los datos sensibles de salud de los socios**.

Un sistema cerrado, aunque auditado por terceros, no ofrece garantía verificable. La directiva necesita confiar en la palabra del proveedor. Si el proveedor cambia de dueño, cambia de política, quiebra o es presionado por alguna autoridad — la asociación no tiene visibilidad.

AGPL-3.0 transforma ese argumento en un diferencial concreto:

> "Puedes ver cada línea de código que procesa los datos de tus socios. Cualquier abogado de la asociación puede revisarlo. Cualquier contribuidor puede auditarlo. Ningún SaaS cerrado puede ofrecer eso."

Ese argumento solo funciona con AGPL. Con MIT, funciona en teoría pero no en la práctica — porque MIT permite que cualquier fork cierre el código y lo opere como SaaS propietario, sin obligación de publicar las modificaciones.

## El límite del AGPL: hosting parásito

AGPL protege de quien **modifica y hospeda sin publicar el código**. No protege de quien hospeda sin modificar.

El riesgo real de canna-br no es un hyperscaler. Es la consultoría local que toma el código, lo hospeda para cinco asociaciones a R$ 500/mes y nunca contribuye de vuelta — capturando valor sin pagar el costo de la plataforma. Ese caso está fuera del alcance de protección del AGPL puro.

Por eso adoptamos el modelo Metabase: **AGPL + licencia comercial obligatoria vía CLA** para los casos de hosting gestionado por terceros, embedding en soluciones cerradas e integraciones con certeza jurídica de obra derivada. El CLA es el instrumento que cierra ese ciclo sin renunciar al reconocimiento OSI ni al trust moat de auditabilidad. Detalles en [Modelo OSS](/es/business/oss-model/).

> _Sujeto a revisión jurídica antes de entrar en vigor._

## Por qué no BUSL

Business Source License es la alternativa favorita de proyectos que quieren "parecer OSS" sin serlo.

BUSL hace el código disponible con restricciones comerciales por un período (generalmente 4 años), luego convierte a una licencia más permisiva. El problema es que los abogados de una asociación no van a aprobar código con licencia restrictiva como base del sistema de salud de sus socios. "Disponible pero no open source" es la peor posición posible: se pierden los beneficios de auditabilidad real sin ganar ninguna protección regulatoria.

Si el argumento comercial central es la auditabilidad, BUSL lo destruye.

## Por qué no Open-Core

Open-core (núcleo gratuito, features premium de pago) funciona cuando el comprador tiene presupuesto e incentivo para pagar por funcionalidades adicionales.

El perfil de las asociaciones de cannabis brasileñas no tiene ese patrón:

- Presupuesto ajustado — todos los ingresos van al costo operativo del producto cannabis
- Decisión colectiva — la directiva no va a aprobar un upgrade a "tier Enterprise" en reunión
- El compliance es obligación legal, no feature diferenciadora — no existe "Premium SNGPC" ni "LGPD Pro"

Open-core funciona con un comprador corporativo que tiene línea de aprobación de software y presupuesto dedicado. Una asociación civil sin fines de lucro no es ese perfil.

## La frontera AGPL/Comercial en la práctica

AGPL-3.0 + CLA (Contributor License Agreement) es el modelo que permite que canna-br tenga un negocio sostenible sin violar la lógica OSS.

La frontera funciona así:

**Core AGPL — todo lo que es el producto:**
- Registro de asociación, socios, prescripciones
- Trazabilidad seed-to-dispensación
- Dispensación, control de cuotas, inventario
- RBAC, logs operacionales
- LGPD básico, SNGPC, informes
- APIs públicas, eventos de dominio, conectores MCP básicos
- Ledger técnico interno

**Comercial (servicio externo, no modificación cerrada):**
- Hosting gestionado, backups, observabilidad, SLA
- Soporte e implementación
- Motor de riesgo, cobro, conciliación financiera
- Auditoría especializada, BI ejecutivo
- Marketplace de proveedores
- Agentes MCP financiero/compliance avanzado

La línea jurídica es clara: la modificación del core AGPL que corre vía red exige la publicación del código correspondiente. Un servicio separado que consume API o eventos puede ser comercial cerrado. Operación, hospedaje, soporte y auditoría son servicios — no necesitan abrir el playbook interno.

Eso significa que la InfraCo puede cobrar por managed hosting, soporte y servicios complementarios sin violar AGPL. El código core sigue abierto. Cualquier asociación puede hacer self-hosting sin pagar nada más allá de la infraestructura.

## Lo que permite el CLA

El CLA (Contributor License Agreement) es el mecanismo que permite el dual-licensing. Cuando contribuyes a canna-br y firmas el CLA, mantienes tu copyright — pero concedes a la InfraCo el derecho de usar tu contribución en contextos comerciales (como el managed hosting).

Es el mismo modelo de Plausible, Bitwarden y GitLab CE. No es inusual, pero debe estar explícito antes de cualquier contribución.

**Lo que el CLA no permite:** cerrar el código core. La InfraCo no puede tomar contribuciones de la comunidad y distribuirlas en versión propietaria sin publicar el fuente.

## Trust moat en datos sensibles

El patrón de crecimiento basado en auditabilidad está validado en otros sectores:

- **Bitwarden** creció como alternativa auditable a LastPass. El cofre de contraseñas es exactamente el perfil de "datos sensibles donde la confianza no puede prometerse, solo demostrarse"
- **GitLab** construyó crecimiento enterprise con "puedes ver todo, incluido el código de GitLab"
- **Sentry** tiene ~90% de los usuarios en self-host gratuito — el modelo de negocio funciona porque la confianza generada por la transparencia convierte cuando la escala crece

Para datos de salud en zona gris regulatoria, el trust moat es aún más fuerte. La directiva de la asociación es **personalmente responsable** por una filtración de datos de salud. Usar un sistema auditable públicamente reduce ese riesgo personal de forma demostrable.

## Una trampa clásica: el modelo de professional services

OpenMRS y Bahmni son sistemas OSS de salud exitosos técnicamente que fueron capturados por el modelo de consultoría:

- Los ingresos provinieron mayoritariamente de implementación y customizaciones
- El equipo core se convirtió básicamente en consultoría disfrazada de producto
- Escalabilidad nula: crecimiento de ingresos = crecimiento lineal de personas

canna-br tiene un límite explícito: máximo 20% de los ingresos de services. Cualquier servicio contratado (migración, capacitación, customización) tiene un cronograma de eliminación vía documentación y automatización.

Si el modelo de negocio depende de mantener al cliente dependiente de servicios, AGPL no resuelve nada — el software puede ser abierto pero el conocimiento operativo queda encerrado. El modelo correcto es: el cliente crece en autonomía a lo largo del tiempo, y la InfraCo crece en escala, no en horas.

## Cómo contribuir

El repositorio está en estructuración (organización dedicada prevista para v0.3, jul/2026). Mientras tanto, el desarrollo ocurre en repositorio de trabajo abierto.

Para contribuir:
1. Lee los ADRs antes de proponer cambios de arquitectura — las decisiones técnicas tienen contexto regulatorio que no es obvio
2. Cualquier contribución al core debe respetar AGPL-3.0
3. El CLA será presentado antes del merge — es necesario para que funcione el modelo de negocio
4. Los issues abiertos aparecen en el [roadmap público](/es/roadmap/)

Si quieres discutir la licencia, el modelo de negocio o cómo canna-br puede encajar en un proyecto que tengas, [escribe directamente](mailto:gabriel@devmagic.com.br).

Y si tu asociación quiere ser parte del piloto — usar el sistema desde el inicio y ayudar a moldear el producto —, [lee sobre el piloto](/es/open/seed-associations/) y ponte en contacto.

---

> **Traducción automática v1** — versión en español generada por LLM, pulido humano en curso. Reporta errores a gabriel@devmagic.com.br.
