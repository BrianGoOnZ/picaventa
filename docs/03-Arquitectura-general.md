# Arquitectura General

Modelo cliente-servidor en red local (LAN): una PC actúa como servidor con la base de datos real; las demás cajas son clientes ligeros que se conectan a ella por el mismo router que ya tiene la tienda. Solo el servidor respalda datos a la nube.

```
[Caja 1: Electron App - Servidor + BD] ──┐
                                           ├── LAN (router existente) ── Respaldo a la nube
[Caja 2: Electron App - Cliente]     ─────┘
```

## Stack completo

| # | Tecnología | Dónde corre | Por qué |
|---|---|---|---|
| 1 | PostgreSQL | Base de datos central, en la PC servidor | Motor cliente-servidor diseñado para múltiples escrituras simultáneas — necesario porque 2+ cajeros venden a la vez y deben ver el mismo stock en tiempo real. SQLite no soporta esto de forma segura |
| 2 | Node.js + Express (o Fastify) | Servidor central que corre en la PC servidor | Punto único que recibe peticiones de todas las cajas, aplica la lógica de negocio (RF-01 a RF-22) y habla con Postgres |
| 3 | Socket.io (WebSockets) | Comunicación en tiempo real servidor ↔ cajas | Cuando una caja vende el último producto, las demás se enteran al instante (sin refrescar) — clave para RF-13 (alertas de stock) y RF-05 (apartados) |
| 4 | TypeScript | Lenguaje en todo el proyecto (servidor y clientes) | Tipado seguro alineado a tu DER; evita errores de cálculo en dinero/inventario; define el "contrato" de datos entre cliente y servidor |
| 5 | Electron | Empaquetar cada caja como app de escritorio instalable | Cada caja es un .exe local que corre como cliente ligero, con acceso directo a su hardware (impresora, lector, cajón) |
| 6 | React + TailwindCSS | Interfaz de cada caja | UI reactiva para el carrito de venta, operable principalmente por teclado (RNF-07) |
| 7 | Drizzle ORM (o Prisma) | Traducir tu DER a tablas y queries tipadas en Postgres | Tipado fuerte en las consultas, evita SQL manual propenso a errores |
| 8 | electron-builder | Generar el instalador de cada terminal (servidor y clientes) | Empaqueta la app en .exe/.msi para Windows |
| 9 | node-thermal-printer / escpos | Imprimir tickets (RF-07) y abrir cajón de dinero | Corre en cada caja (no en el servidor), porque cada una tiene su propia impresora conectada por USB |
| 10 | bcrypt + JWT | Login de cajeros y manejo de sesiones (RF-15, RNF-04) | Cada caja autentica a su cajero contra el servidor central; JWT maneja la sesión de forma segura entre cliente y servidor |
| 11 | node-cron + pg_dump | Respaldo automático diario (RNF-06) | Corre solo en el servidor, ya que es el único con la base de datos completa |
| 12 | Supabase Storage / Google Drive API / S3 | Subir el respaldo cuando haya internet | Cumple la sincronización segura de RNF-06; solo el servidor necesita esta conexión externa |

## Consideraciones de red (sin costo extra)

- Ambas PCs se conectan al router que ya tiene la tienda (el del proveedor de internet) — no se necesita comprar switch ni router adicional.
- Cable Ethernet para la PC servidor (siempre encendida) recomendado; WiFi al mismo router es válido para la caja secundaria.
- IP fija en la PC servidor para que la(s) caja(s) siempre la encuentren.
- Plan de contingencia si se cae la red local: modo "cobro manual" temporal mientras se restablece la conexión.

## Nota sobre referencias externas de código

Durante la etapa de diseño se revisó el proyecto open source **Store-POS** (github.com/tngoman/Store-POS) únicamente como referencia de arquitectura (su patrón de "modo servidor / modo terminal" en una app Electron+LAN). El repositorio no cuenta con un archivo de licencia (LICENSE), por lo que **no se debe copiar código de ese proyecto bajo ninguna circunstancia** — todo el código de este proyecto se escribe desde cero.
