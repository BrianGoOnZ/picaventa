# Pendientes

- **Revisar vulnerabilidades de `drizzle-kit` antes de producción.** `npm audit`
  reporta 4 vulnerabilidades "moderate" en una dependencia transitiva
  (`@esbuild-kit/core-utils` → esbuild, usada por `drizzle-kit`). Es dev-only
  (herramienta de migraciones, no corre en producción), por lo que se dejó
  sin resolver por ahora — el fix automático forzaría un downgrade grande de
  `drizzle-kit`. Revisar si ya existe una versión que lo resuelva sin
  downgrade antes de entregar el sistema al cliente.
