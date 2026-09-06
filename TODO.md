# Pendientes

- **Revisar vulnerabilidades de `drizzle-kit` antes de producción.** `npm audit`
  reporta 4 vulnerabilidades "moderate" en una dependencia transitiva
  (`@esbuild-kit/core-utils` → esbuild, usada por `drizzle-kit`). Es dev-only
  (herramienta de migraciones, no corre en producción), por lo que se dejó
  sin resolver por ahora — el fix automático forzaría un downgrade grande de
  `drizzle-kit`. Revisar si ya existe una versión que lo resuelva sin
  downgrade antes de entregar el sistema al cliente.

- **Fase 2: descubrimiento automático del servidor en la caja Terminal.**
  El MVP usa solo IP manual + botón "probar conexión" (ver módulo de modo
  servidor/terminal). Explorar mDNS/broadcast en la LAN para que la caja
  Terminal encuentre al servidor sin que el admin tenga que teclear la IP,
  si el cliente lo pide más adelante. Riesgo conocido: algunos routers
  bloquean tráfico multicast, por lo que tendría que quedar como opción
  complementaria, no reemplazo de la IP manual.
