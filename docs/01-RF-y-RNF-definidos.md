# Requisitos Funcionales y No Funcionales

### Requisitos Funcionales

#### 1. Módulo de Ventas (Point of Sale)

- **RF-01: Venta con código de barras** — El sistema permitirá el ingreso de productos mediante la lectura de códigos de barras, identificando el artículo y agregándolo automáticamente al carrito de compras para agilizar el proceso de cobro.
- **RF-02: Búsqueda rápida de productos** — El sistema contará con un buscador alfanumérico por nombre o categoría para localizar productos de forma rápida cuando no se cuente con el código de barras.
- **RF-03: Venta de productos a granel** — El sistema permitirá ingresar el peso de productos a granel (frutas, verduras, etc.) y calculará automáticamente el precio final basándose en el precio unitario por kilogramo configurado.
- **RF-04: Cálculo de cambio** — El sistema solicitará el monto de efectivo entregado por el cliente y calculará de forma automática el cambio exacto a devolver.
- **RF-05: Gestión de apartados o preventas temporales** — El sistema permitirá pausar o poner en "espera" una venta activa cuando al cliente le falte dinero, liberando temporalmente la caja y permitiendo recuperar el carrito exacto al regresar.
- **RF-06: Descuentos manuales o rebajas puntuales** — El sistema permitirá aplicar un descuento manual por monto o porcentaje sobre un producto o sobre el total de la venta.
- **RF-07: Impresión de ticket de venta** *(NUEVO)* — El sistema imprimirá automáticamente un ticket de venta al finalizar el cobro, incluyendo folio, fecha, hora, productos, cantidades, precios, total y método de pago.

#### 2. Módulo de Inventario y Productos

- **RF-08: Alta de productos** — El sistema permitirá registrar nuevos productos en el catálogo, definiendo nombre, precio de compra, precio de venta, código de barras, categoría y stock inicial.
- **RF-09: Gestión de categorías de producto** *(NUEVO)* — El sistema permitirá crear, editar y eliminar categorías de productos para mantener organizado el catálogo conforme este crezca.
- **RF-10: Gestión de mermas** — El sistema permitirá dar de baja productos del inventario indicando un motivo (caducidad, daño, etc.) para llevar un control estricto de las pérdidas financieras.
- **RF-11: Ajuste manual de inventario (conteo físico)** *(NUEVO)* — El sistema permitirá corregir manualmente el stock de un producto (sin clasificarlo como merma), registrando el motivo "ajuste por conteo físico" y el usuario responsable.
- **RF-12: Reporte de reabastecimiento** — El sistema permitirá consultar el inventario actual aplicando filtros de stock mínimo, para identificar qué productos requieren ser surtidos.
- **RF-13: Alertas de stock bajo** *(NUEVO)* — El sistema notificará de forma automática (en pantalla, al iniciar sesión o mediante indicador visual) cuando un producto cruce su nivel de stock mínimo, sin depender de que el usuario consulte el reporte manualmente.

#### 3. Módulo de Administración y Control

- **RF-14: Gestión de proveedores** — El sistema permitirá registrar, editar y consultar los datos de contacto de los proveedores (nombre, teléfono, correo).
- **RF-15: Gestión de usuarios y roles** — El sistema permitirá registrar cajeros y asignarles credenciales de acceso, identificando qué ventas realizó cada operador.
- **RF-16: Corte de caja**
    - **RF-16.1:** Generar un reporte de cierre de caja que totalice las ventas del turno o día.
    - **RF-16.2:** Desglosar el total de ventas según método de pago (efectivo, tarjeta, transferencia).
    - **RF-16.3:** Registrar un fondo inicial de efectivo para calcular el total esperado y detectar discrepancias (faltantes o sobrantes).
- **RF-17: Cancelaciones y devoluciones**
    - **RF-17.1:** Cancelar una venta en curso o eliminar un producto del carrito antes de finalizar el cobro (con autorización del administrador si es necesario).
    - **RF-17.2:** Procesar la devolución de un producto ya vendido, reintegrándolo al inventario y generando un ticket de reembolso/cambio.
- **RF-18: Registro de entradas de mercancía (Compras)** — El sistema permitirá registrar facturas o notas de remisión de proveedores, sumando cantidades al stock y actualizando opcionalmente el costo de compra.
- **RF-19: Control de salidas de efectivo (Gastos y Retiros)** — El sistema permitirá registrar retiros de dinero de la caja por conceptos ajenos a las ventas, para que no afecten el cálculo del corte de caja.
- **RF-20: Control de Cuentas por Cobrar (Fiados)** — El sistema permitirá registrar créditos a clientes frecuentes, abonos parciales y mostrar el saldo insoluto en tiempo real.
- **RF-21: Gestión de promociones y ofertas** — El sistema permitirá configurar reglas automáticas de descuento (2x1, precios por mayoreo, etc.) aplicables a productos específicos.
- **RF-22: Reportes de rentabilidad y estadísticas** — El sistema permitirá generar reportes históricos de ventas por periodo, identificando margen de ganancia real y productos con mayor rotación.

### Requisitos No Funcionales

#### 1. Rendimiento y Disponibilidad

- **RNF-01: Operación Offline (Resiliencia)** — El sistema principal de ventas operará localmente si se interrumpe la conexión; la sincronización con la nube se realizará automáticamente al restablecerse la red.
- **RNF-02: Velocidad de respuesta** — Las búsquedas por código de barras o buscador alfanumérico no deberán superar 0.5 segundos de respuesta.
- **RNF-03: Volumen esperado del sistema** — El sistema deberá soportar de forma fluida un catálogo de al menos 3,000 productos y al menos 300 transacciones diarias, sin degradación perceptible.

#### 2. Seguridad, Control de Acceso y Datos

- **RNF-04: Integridad de sesiones** — El sistema cerrará la sesión del cajero por inactividad o requerirá PIN/contraseña rápida para acciones críticas (cancelaciones, devoluciones, retiros).
- **RNF-05: Trazabilidad (Auditoría)** — Toda operación crítica (mermas, cancelaciones, edición de precios, ajustes de inventario, salidas de efectivo) se registrará en bitácora con fecha, hora y usuario responsable.
- **RNF-06: Respaldo y recuperación de datos** — El sistema generará respaldos automáticos locales (varias veces al día), con posibilidad de guardarlos en una carpeta sincronizada a la nube (OneDrive/Google Drive) y retención de **15 días** de histórico.

#### 3. Usabilidad y Compatibilidad

- **RNF-07: Interfaz intuitiva (UX/UI)** — La interfaz de ventas se operará principalmente mediante teclado o lector de códigos de barras, minimizando el uso del ratón.
- **RNF-08: Compatibilidad de hardware** — El software se integrará con lectores de códigos de barras USB/Bluetooth, impresoras térmicas de tickets y cajones de dinero automáticos.

---

## Alcance de la primera etapa (MVP para el cliente actual — 2 terminales)

Para este primer cliente, el alcance acordado incluye:

1. Punto de venta (RF-01 a RF-07)
2. Inventario en tiempo real (RF-08, RF-09, RF-12, RF-13)
3. Reportes de ventas y corte de caja (RF-16, RF-22 básico)
4. Registro de método de pago — **sin integración de pasarela de pago**, solo se registra si la venta fue en efectivo o tarjeta (usando la terminal bancaria que el cliente ya tiene)
5. Fiado / crédito a clientes (RF-20)
6. Usuarios y permisos por cajero (RF-15)

Quedan fuera de esta primera etapa (se pueden cotizar como fase 2 si el cliente lo pide más adelante):
- ~~Proveedores y compras (RF-14, RF-18)~~ — implementado.
- ~~Mermas y ajustes de inventario detallados (RF-10, RF-11)~~ — implementado.
- ~~Promociones (RF-21)~~ — implementado, con aplicación automática en el punto de venta.
- ~~Cancelaciones/devoluciones completas (RF-17)~~ — implementado.

Todo lo anterior quedó implementado y probado contra la base de datos real
antes de la entrega, adelantado respecto al alcance original de fase 1.
También se agregó, por seguridad y buenas prácticas no contempladas
originalmente en el MVP: respaldo automático diario de la base de datos
(RNF-06) y auditoría de cambios de precio de venta (RNF-05).
