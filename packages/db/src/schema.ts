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
import { sql } from 'drizzle-orm'

// Enums de valores fijos del sistema (no configurables por el negocio,
// a diferencia de categorías de producto o tipos de promoción).
export const unidadMedidaEnum = pgEnum('unidad_medida', ['pieza', 'kg'])
export const rolUsuarioEnum = pgEnum('rol_usuario', ['administrador', 'cajero'])
export const tipoMermaEnum = pgEnum('tipo_merma', ['merma', 'ajuste'])
export const estadoVentaEnum = pgEnum('estado_venta', ['activa', 'pausada', 'cancelada'])
// 'cambio' queda como valor legado (devoluciones ya registradas antes de
// este cambio de flujo) — el nuevo formulario de devoluciones ya no lo
// ofrece, ver datosDevolucionSchema en @picaventa/shared.
export const tipoResolucionEnum = pgEnum('tipo_resolucion', ['reembolso', 'cambio', 'reposicion'])
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
  fechaCompra: timestamp('fecha_compra', { withTimezone: true }).notNull().defaultNow(),
  idProveedor: integer('id_proveedor')
    .notNull()
    .references(() => proveedor.idProveedor),
  idUsuario: integer('id_usuario')
    .notNull()
    .references(() => usuarios.idUsuario)
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

// Auditoría persistente de "Entradas de mercancía" (RF nuevo, no en el DER
// original): quién cargó qué inventario, cuánto y cuándo, con el stock antes
// y después de esa entrada — separado de `merma` porque una entrada suma
// stock por mercancía recibida, no lo ajusta ni lo da de baja.
export const entradaInventario = pgTable('entrada_inventario', {
  idEntrada: serial('id_entrada').primaryKey(),
  idProducto: integer('id_producto')
    .notNull()
    .references(() => producto.idProducto),
  idUsuario: integer('id_usuario')
    .notNull()
    .references(() => usuarios.idUsuario),
  cantidad: cantidad('cantidad').notNull(),
  stockAnterior: cantidad('stock_anterior').notNull(),
  stockNuevo: cantidad('stock_nuevo').notNull(),
  fechaEntrada: timestamp('fecha_entrada', { withTimezone: true }).notNull().defaultNow()
})

export const merma = pgTable('merma', {
  idMerma: serial('id_merma').primaryKey(),
  motivoMerma: text('motivo_merma').notNull(),
  tipoMerma: tipoMermaEnum('tipo_merma').notNull(),
  // Para 'merma' siempre es la cantidad perdida (positiva). Para 'ajuste'
  // (conteo físico) es la diferencia con signo entre el conteo real y el
  // stock que el sistema tenía antes (puede ser positiva o negativa).
  cantidadMerma: cantidad('cantidad_merma').notNull(),
  idProducto: integer('id_producto')
    .notNull()
    .references(() => producto.idProducto),
  idUsuario: integer('id_usuario')
    .notNull()
    .references(() => usuarios.idUsuario),
  fechaMerma: timestamp('fecha_merma', { withTimezone: true }).notNull().defaultNow()
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
  // Solo se genera para administradores (ver auth.ts) — un cajero que
  // olvida su acceso siempre lo puede resolver un administrador desde
  // Usuarios; el código de recuperación existe para el caso extremo de que
  // el único administrador se quede sin poder entrar y no haya nadie más
  // que le restablezca el acceso. Se muestra una sola vez al crear la
  // cuenta (texto plano, nunca se vuelve a mostrar) y aquí solo se guarda
  // su hash, igual que la contraseña y el PIN.
  codigoRecuperacionHash: text('codigo_recuperacion_hash'),
  rolUsuario: rolUsuarioEnum('rol_usuario').notNull(),
  // Solo relevante para rolUsuario = 'cajero': un administrador tiene todos
  // los permisos implícitamente (ver tienePermiso() en @picaventa/shared).
  // Nunca incluye nada relacionado con ver ganancias/márgenes — eso siempre
  // depende de rolUsuario, nunca de esta lista.
  permisos: text('permisos')
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  fechaIngreso: date('fecha_ingreso').notNull().defaultNow()
})

export const cliente = pgTable('cliente', {
  idCliente: serial('id_cliente').primaryKey(),
  nombreCliente: text('nombre_cliente').notNull(),
  telefonoCliente: text('telefono_cliente'),
  // Domicilio, señas particulares u otra referencia para identificar al
  // cliente cuando el nombre solo no basta — sobre todo útil para el
  // administrador cuando revisa un cliente que dio de alta un cajero.
  notaCliente: text('nota_cliente'),
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
  // Cuánto se restó de los ingresos reportados por esta devolución (0 para
  // 'reposicion', que no mueve dinero). Se guarda explícito en vez de
  // recalcularse después porque el precio del producto puede cambiar con
  // el tiempo — el reporte debe reflejar el monto real del momento.
  montoReembolsado: dinero('monto_reembolsado').notNull().default('0'),
  // Si esta devolución fue parte de un "cambio por otro producto", aquí
  // queda la venta nueva que se generó por el producto de reemplazo.
  idVentaCambio: integer('id_venta_cambio').references(() => venta.idVenta),
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
  totalContadoSistema: dinero('total_contado_sistema').notNull(),
  // total_esperado y diferencia sí se guardan (a diferencia de la nota
  // original en 04-Base-de-datos-V1.md que proponía calcularlos solo al
  // momento del corte): el inicio del turno se deriva del iat del JWT, que
  // no persiste en ningún lado, así que sin estas columnas un corte pasado
  // no se puede volver a mostrar en un historial (dashboard, auditoría).
  totalVendido: dinero('total_vendido').notNull(),
  totalEsperado: dinero('total_esperado').notNull(),
  diferencia: dinero('diferencia').notNull(),
  idUsuario: integer('id_usuario')
    .notNull()
    .references(() => usuarios.idUsuario)
})

export const promocion = pgTable('promocion', {
  idPromocion: serial('id_promocion').primaryKey(),
  nombrePromocion: text('nombre_promocion').notNull(),
  // Texto libre (no enum): RF-21 dice "2x1, precios por mayoreo, etc." — el
  // catálogo de tipos de promoción puede crecer sin requerir una migración.
  // La aplicación valida que sea uno de los valores calculables conocidos
  // (ver PERMISOS/tipoDescuentoValores en @picaventa/shared).
  tipoPromocion: text('tipo_promocion').notNull(),
  // Solo aplica a 'porcentaje' (0-100) y 'montoFijo' (por unidad); 'dosPorUno'
  // no lo usa, el descuento se calcula solo de la cantidad.
  valorDescuento: dinero('valor_descuento'),
  // Permite desactivar una promoción sin borrar su historial de uso.
  activa: boolean('activa').notNull().default(true),
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
