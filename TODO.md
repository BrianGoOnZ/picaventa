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

- **🔴 BLOQUEANTE PARA PRODUCCIÓN — impresión de tickets es un placeholder
  temporal, NO la implementación final.** `03-Arquitectura-general.md`
  definió `node-thermal-printer`/`escpos` (comandos ESC/POS reales) como la
  solución — eso sigue siendo lo que hay que construir. Lo que existe hoy
  (`window.print()`, el diálogo nativo de impresión de Windows) es un
  sustituto que permite demostrar y probar el flujo completo de venta sin
  tener la impresora térmica física en este entorno de desarrollo, pero
  **no es una alternativa aceptable para la entrega real**:
  - No abre el cajón de dinero automáticamente (RNF-08) — eso requiere
    comandos ESC/POS reales enviados directo a la impresora, algo que un
    diálogo de impresión de Windows no puede hacer.
  - No corta el papel automáticamente ni usa el formato angosto real de
    una impresora térmica (58/80mm) — depende del driver genérico de
    Windows que tenga instalado esa impresora, si es que lo tiene.
  - Un ticket real de tienda no debería mostrar un diálogo de impresión
    de Windows en cada venta — debe imprimirse directo, sin intervención.
  - **Antes de instalar el sistema en la tienda real**: conseguir acceso a
    la impresora térmica física del cliente, reemplazar `window.print()`
    por comandos ESC/POS vía `node-thermal-printer` (ya es dependencia
    instalada, sin usar todavía), y probar apertura de cajón de dinero.
    No marcar este pendiente como resuelto hasta probarlo contra hardware
    real.
