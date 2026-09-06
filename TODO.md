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

- **Revisar `sandbox: false` en el preload de `apps/terminal`.** Fue necesario
  porque el preload importa `@picaventa/shared` (que depende de `zod`), y el
  sandbox por defecto de Electron no permite requerir paquetes npm ahí.
  `contextIsolation` sigue activo (protección más relevante), pero antes de
  producción vale la pena evaluar si conviene separar del preload los tipos
  que dependen de zod (dejando solo los canales IPC como strings planos) para
  poder reactivar el sandbox.

- **Empaquetado: `packages/db/migrations` no sobrevive a electron-builder.**
  `aplicarMigraciones` ahora recibe la carpeta de migraciones como parámetro
  explícito porque `import.meta.url` deja de servir una vez empaquetado por
  electron-vite (apunta al bundle, no al código fuente). En dev, `apps/terminal`
  la resuelve con `app.getAppPath() + '../../packages/db/migrations'`, que
  funciona porque el monorepo está completo en disco — pero un build final de
  electron-builder no incluye `packages/db/migrations` en esa ruta relativa.
  Antes de generar el instalador real: copiar `migrations/` como recurso
  extra (`extraResources` en `electron-builder.yml`) y leer desde
  `process.resourcesPath` en producción en vez de la ruta relativa al monorepo.

- **Impresión ESC/POS real y cajón de dinero (RNF-08) sin probar con hardware.**
  El ticket (RF-07) se implementó con `window.print()` de Electron (dialogo
  nativo de Windows) en vez de comandos ESC/POS crudos vía
  `node-thermal-printer` — funciona con cualquier impresora que tenga driver
  de Windows instalado, pero no se pudo validar contra una impresora térmica
  física real. La apertura automática del cajón de dinero si necesita
  comandos ESC/POS reales (no algo que el diálogo de impresión de Windows
  pueda hacer) — implementar y probar con el hardware real del cliente antes
  de entregar el sistema.
