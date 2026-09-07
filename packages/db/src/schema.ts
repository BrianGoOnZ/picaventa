import {
  pgTable,
  pgEnum,
  serial,
  text,
  integer,
  numeric,
  boolean,
  date,
  timestamp,
  primaryKey
} from 'drizzle-orm/pg-core'

// Enums de valores fijos del sistema (no configurables por el negocio,
// a diferencia de categorías de producto o tipos de promoción).
export const unidadMedidaEnum = pgEnum('unidad_medida', ['pieza', 'kg'])
export const rolUsuarioEnum = pgEnum('rol_usuario', ['administrador', 'cajero'])
export const tipoMermaEnum = pgEnum('tipo_merma', ['merma', 'ajuste'])
export const estadoVentaEnum = pgEnum('estado_venta', ['activa', 'pausada', 'cancelada'])
export const tipoResolucionEnum = pgEnum('tipo_resolucion', ['reembolso', 'cambio'])
export const tipoMovimientoEnum = pgEnum('tipo_movimiento', ['retiro', 'gasto'])

const dinero = (nombre: string) => numeric(nombre, { precision: 12, scale: 2 })
const cantidad = (nombre: string) => numeric(nombre, { precision: 12, scale: 3 })

export const categoria = pgTable('categoria', {
  idCategoria: serial('id_categoria').primaryKey(),
  nombreCategoria: text('nombre_categoria').notNull(),
  // Color de fondo para las tarjetas de Punto de Venta cuando el producto
  // no tiene foto propia — se asigna uno por rotación al crear la
  // categoría, y el administrador lo puede cambiar después.
  colorCategoria: text('color_categoria').notNull().default('#7C5B45')
})

export const producto = pgTable('producto', {
  idProducto: serial('id_producto').primaryKey(),
  nombreProducto: text('nombre_producto').notNull(),
  codigoBarras: text('codigo_barras').unique(),
  precioCompra: dinero('precio_compra'),
  precioVenta: dinero('precio_venta').notNull(),
  unidadMedida: unidadMedidaEnum('unidad_medida').notNull().default('pieza'),
  stockActual: cantidad('stock_actual').notNull().default('0'),
  stockMinimo: cantidad('stock_minimo').notNull().default('0'),
  idCategoria: integer('id_categoria').references(() => categoria.idCategoria),
  // Igual que el logo del negocio: imagen embebida en base64, no una ruta
  // de archivo (servidor y cajas no comparten sistema de archivos).
  imagenDatos: text('imagen_datos')
})

export const proveedor = pgTable('proveedor', {
  idProveedor: serial('id_proveedor').primaryKey(),
  nombreProveedor: text('nombre_proveedor').notNull(),
  nombreEmpresa: text('nombre_empresa'),
  telefonoProveedor: text('telefono_proveedor'),
  correoProveedor: text('correo_proveedor')
})

export const compra = pgTable('compra', {
  idCompra: serial('id_compra').primaryKey(),
  fechaCompra: date('fecha_compra').notNull().defaultNow(),
  idProveedor: integer('id_proveedor')
    .notNull()
    .references(() => proveedor.idProveedor)
})

export const detalleCompra = pgTable(
  'detalle_compra',
  {
    idCompra: integer('id_compra')
      .notNull()
      .references(() => compra.idCompra),
    idProducto: integer('id_producto')
      .notNull()
      .references(() => producto.idProducto),
    cantidadComprada: cantidad('cantidad_comprada').notNull(),
    costoUnitario: dinero('costo_unitario').notNull()
  },
  (tabla) => [primaryKey({ columns: [tabla.idCompra, tabla.idProducto] })]
)

export const merma = pgTable('merma', {
  idMerma: serial('id_merma').primaryKey(),
  motivoMerma: text('motivo_merma').notNull(),
  tipoMerma: tipoMermaEnum('tipo_merma').notNull(),
  cantidadMerma: cantidad('cantidad_merma').notNull(),
  idProducto: integer('id_producto')
    .notNull()
    .references(() => producto.idProducto),
  idUsuario: integer('id_usuario')
    .notNull()
    .references(() => usuarios.idUsuario)
})

export const usuarios = pgTable('usuarios', {
  idUsuario: serial('id_usuario').primaryKey(),
  nombreUsuario: text('nombre_usuario').notNull(),
  correoUsuario: text('correo_usuario').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  // PIN numérico corto (hash aparte), para desbloqueo por inactividad y
  // confirmaciones rápidas de acciones críticas (RNF-04) sin retipear la
  // contraseña completa cada vez.
  pinHash: text('pin_hash').notNull(),
  rolUsuario: rolUsuarioEnum('rol_usuario').notNull(),
  fechaIngreso: date('fecha_ingreso').notNull().defaultNow()
})

export const cliente = pgTable('cliente', {
  idCliente: serial('id_cliente').primaryKey(),
  nombreCliente: text('nombre_cliente').notNull(),
  telefonoCliente: text('telefono_cliente'),
  limiteCredito: dinero('limite_credito').notNull().default('0'),
  // No está en 04-Base-de-datos-V1.md pero sí en 02-DER.md; RF-20 exige
  // mostrar el saldo insoluto en tiempo real, así que se incluye como
  // contador mantenido por la aplicación (ver nota en el resumen del commit).
  saldoActual: dinero('saldo_actual').notNull().default('0'),
  // Un cajero puede dar de alta un cliente a media venta a fiado (sin
  // esperar a un administrador), pero queda marcado para que el
  // administrador lo revise después. Un administrador que edita el
  // cliente lo da por revisado.
  pendienteRevision: boolean('pendiente_revision').notNull().default(false)
})

export const abono = pgTable('abono', {
  idAbono: serial('id_abono').primaryKey(),
  montoAbono: dinero('monto_abono').notNull(),
  fechaAbono: timestamp('fecha_abono', { withTimezone: true }).notNull().defaultNow(),
  idCliente: integer('id_cliente')
    .notNull()
    .references(() => cliente.idCliente)
})

export const venta = pgTable('venta', {
  idVenta: serial('id_venta').primaryKey(),
  folioVenta: text('folio_venta').notNull().unique(),
  fechaVenta: timestamp('fecha_venta', { withTimezone: true }).notNull().defaultNow(),
  // Tampoco está en 04-Base-de-datos-V1.md pero sí en 02-DER.md; sin este
  // campo no se puede calcular el corte de caja (RF-16) ni los reportes
  // de rentabilidad (RF-22).
  total: dinero('total').notNull(),
  // Texto libre (no enum): el MVP restringe a "efectivo"/"tarjeta", pero
  // RF-16.2 ya menciona "transferencia" — se valida en la capa de
  // aplicación en vez de fijarlo en la base de datos.
  metodoPago: text('metodo_pago').notNull(),
  estadoVenta: estadoVentaEnum('estado_venta').notNull().default('activa'),
  idCliente: integer('id_cliente').references(() => cliente.idCliente),
  idUsuario: integer('id_usuario')
    .notNull()
    .references(() => usuarios.idUsuario)
})

export const contiene = pgTable(
  'contiene',
  {
    idVenta: integer('id_venta')
      .notNull()
      .references(() => venta.idVenta),
    idProducto: integer('id_producto')
      .notNull()
      .references(() => producto.idProducto),
    cantidadVendida: cantidad('cantidad_vendida').notNull(),
    precioUnitarioVenta: dinero('precio_unitario_venta').notNull(),
    descuentoAplicado: dinero('descuento_aplicado').notNull().default('0')
  },
  (tabla) => [primaryKey({ columns: [tabla.idVenta, tabla.idProducto] })]
)

export const devolucion = pgTable('devolucion', {
  idDevolucion: serial('id_devolucion').primaryKey(),
  idVenta: integer('id_venta')
    .notNull()
    .references(() => venta.idVenta),
  idProducto: integer('id_producto')
    .notNull()
    .references(() => producto.idProducto),
  cantidadDevuelta: cantidad('cantidad_devuelta').notNull(),
  motivoDevolucion: text('motivo_devolucion').notNull(),
  tipoResolucion: tipoResolucionEnum('tipo_resolucion').notNull(),
  idUsuario: integer('id_usuario')
    .notNull()
    .references(() => usuarios.idUsuario),
  fechaDevolucion: timestamp('fecha_devolucion', { withTimezone: true }).notNull().defaultNow()
})

export const movimientoCaja = pgTable('movimiento_caja', {
  idMovimiento: serial('id_movimiento').primaryKey(),
  tipoMovimiento: tipoMovimientoEnum('tipo_movimiento').notNull(),
  montoMovimiento: dinero('monto_movimiento').notNull(),
  conceptoMovimiento: text('concepto_movimiento').notNull(),
  fechaMovimiento: timestamp('fecha_movimiento', { withTimezone: true }).notNull().defaultNow(),
  idUsuario: integer('id_usuario')
    .notNull()
    .references(() => usuarios.idUsuario)
})

export const corteCaja = pgTable('corte_caja', {
  idCorte: serial('id_corte').primaryKey(),
  fechaCorte: timestamp('fecha_corte', { withTimezone: true }).notNull().defaultNow(),
  fondoInicial: dinero('fondo_inicial').notNull(),
  // total_esperado y diferencia (de 02-DER.md) no se guardan: se calculan a
  // partir de fondo_inicial + ventas del turno en el módulo de corte de caja,
  // siguiendo la simplificación de 04-Base-de-datos-V1.md.
  totalContadoSistema: dinero('total_contado_sistema').notNull(),
  idUsuario: integer('id_usuario')
    .notNull()
    .references(() => usuarios.idUsuario)
})

export const promocion = pgTable('promocion', {
  idPromocion: serial('id_promocion').primaryKey(),
  nombrePromocion: text('nombre_promocion').notNull(),
  // Texto libre (no enum): RF-21 dice "2x1, precios por mayoreo, etc." — el
  // catálogo de tipos de promoción puede crecer sin requerir una migración.
  tipoPromocion: text('tipo_promocion').notNull(),
  descripcionPromocion: text('descripcion_promocion'),
  fechaInicioPromocion: date('fecha_inicio_promocion').notNull(),
  fechaFinPromocion: date('fecha_fin_promocion').notNull(),
  idCategoria: integer('id_categoria').references(() => categoria.idCategoria)
})

export const productoPromocion = pgTable(
  'producto_promocion',
  {
    idProducto: integer('id_producto')
      .notNull()
      .references(() => producto.idProducto),
    idPromocion: integer('id_promocion')
      .notNull()
      .references(() => promocion.idPromocion)
  },
  (tabla) => [primaryKey({ columns: [tabla.idProducto, tabla.idPromocion] })]
)

export const historicoPrecio = pgTable('historico_precio', {
  idHistoricoPrecio: serial('id_historico_precio').primaryKey(),
  idProducto: integer('id_producto')
    .notNull()
    .references(() => producto.idProducto),
  precioAnterior: dinero('precio_anterior').notNull(),
  precioNuevo: dinero('precio_nuevo').notNull(),
  fechaCambio: timestamp('fecha_cambio', { withTimezone: true }).notNull().defaultNow(),
  idUsuario: integer('id_usuario')
    .notNull()
    .references(() => usuarios.idUsuario)
})

// Tabla nueva (no estaba en el DER original): datos del negocio para el
// ticket y la interfaz, configurables desde Ajustes — nunca hardcodeados
// en el código, para que el sistema sirva a cualquier tipo de negocio.
// Se espera una sola fila en esta tabla por instalación.
export const configuracionNegocio = pgTable('configuracion_negocio', {
  idConfiguracion: serial('id_configuracion').primaryKey(),
  nombreNegocio: text('nombre_negocio').notNull(),
  direccionNegocio: text('direccion_negocio'),
  telefonoNegocio: text('telefono_negocio'),
  // Imagen del logo embebida directamente (base64), no una ruta de archivo:
  // servidor y cajas no comparten sistema de archivos, solo Postgres.
  logoDatos: text('logo_datos'),
  fechaActualizacion: timestamp('fecha_actualizacion', { withTimezone: true }).notNull().defaultNow()
})
