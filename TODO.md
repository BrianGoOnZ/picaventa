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

- **Cuando haya acceso a la impresora térmica física del cliente:**
  reemplazar el stub de `packages/shared/src/impresora.ts` +
  `apps/terminal/src/main/impresora.ts` por comandos ESC/POS reales vía
  `node-thermal-printer` (ya es dependencia instalada, sin usar todavía) y
  probar la apertura del cajón de dinero. El stub actual (con caída a
  `window.print()`) es la estrategia acordada para v1 — ya está enganchado a
  la UI real (botón "Imprimir" del ticket), así que conectar el hardware real
  después solo debería requerir tocar esos dos archivos, sin tocar el resto
  de la app. No hay urgencia hasta que el cliente tenga la impresora en mano.

- **RNF-01 (operación sin conexión) sin decisión explícita registrada.**
  El sistema ya no depende de internet ni de la nube para operar (arquitectura
  LAN cliente-servidor local) — en ese sentido RNF-01 ya se cumple. Lo que NO
  está resuelto es qué pasa si la LAN/router falla a media jornada: las cajas
  en modo Terminal necesitan conexión viva al Servidor para todo (no hay cola
  local ni sincronización posterior). Confirmar con el cliente si construir
  esa resiliencia (cola local + sincronización al reconectar) es necesaria
  para v1 o si se pospone a fase 2 — por ahora no está ni implementado ni
  descartado explícitamente.

- **RNF-02/RNF-03 (velocidad &lt;0.5s, 3,000 productos / 300 ventas diarias)
  nunca se midieron.** El diseño (índices, paginación) no debería impedirlo,
  pero no hay ninguna prueba de carga real que lo confirme. Vale la pena una
  prueba sintética antes de instalar en la tienda real, sobre todo si el
  catálogo del cliente se acerca a los 3,000 productos.
