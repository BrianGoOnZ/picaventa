import { z } from 'zod'

// RF-21: tipos de descuento realmente calculables. `tipoPromocion` en la
// base de datos sigue siendo texto libre (para no requerir una migración si
// mañana se necesita un tipo nuevo) pero la aplicación solo reconoce estos.
export const tipoDescuentoValores = ['porcentaje', 'montoFijo', 'dosPorUno'] as const
export type TipoDescuentoPromocion = (typeof tipoDescuentoValores)[number]

export const datosPromocionSchema = z
  .object({
    nombrePromocion: z.string().min(1),
    tipoPromocion: z.enum(tipoDescuentoValores),
    // Requerido para 'porcentaje' (0-100) y 'montoFijo' (por unidad); no
    // aplica a 'dosPorUno', que se calcula solo de la cantidad.
    valorDescuento: z.number().positive().optional(),
    descripcionPromocion: z.string().optional(),
    fechaInicioPromocion: z.string().min(1),
    fechaFinPromocion: z.string().min(1),
    idCategoria: z.number().int().positive().optional(),
    idsProductos: z.array(z.number().int().positive()).default([]),
    activa: z.boolean().default(true)
  })
  .refine((datos) => datos.tipoPromocion === 'dosPorUno' || datos.valorDescuento !== undefined, {
    message: 'Debes indicar el valor del descuento',
    path: ['valorDescuento']
  })
export type DatosPromocion = z.infer<typeof datosPromocionSchema>

export interface Promocion {
  idPromocion: number
  nombrePromocion: string
  tipoPromocion: TipoDescuentoPromocion
  valorDescuento?: number
  activa: boolean
  descripcionPromocion?: string
  fechaInicioPromocion: string
  fechaFinPromocion: string
  idCategoria?: number
  idsProductos: number[]
}

export type ResultadoListaPromociones =
  | { ok: true; promociones: Promocion[] }
  | { ok: false; error: string }
export type ResultadoPromocion = { ok: true; promocion: Promocion } | { ok: false; error: string }

// Versión reducida para el punto de venta — el cajero nunca ve la gestión
// completa de promociones, solo el resultado ya calculado en el carrito.
export interface PromocionActiva {
  idPromocion: number
  nombrePromocion: string
  tipoPromocion: TipoDescuentoPromocion
  valorDescuento?: number
  idCategoria?: number
  idsProductos: number[]
}
export type ResultadoPromocionesActivas =
  | { ok: true; promociones: PromocionActiva[] }
  | { ok: false; error: string }

// Descuento TOTAL (no por unidad) para una línea del carrito, dada su
// cantidad y precio de venta unitario. Se usa tanto al armar el carrito en
// el punto de venta como, potencialmente, para mostrarle al admin una vista
// previa de la promoción al configurarla.
export function calcularDescuentoPromocion(
  promocion: Pick<PromocionActiva, 'tipoPromocion' | 'valorDescuento'>,
  precioVenta: number,
  cantidad: number
): number {
  switch (promocion.tipoPromocion) {
    case 'porcentaje':
      return precioVenta * cantidad * ((promocion.valorDescuento ?? 0) / 100)
    case 'montoFijo':
      return Math.min(promocion.valorDescuento ?? 0, precioVenta) * cantidad
    case 'dosPorUno':
      return Math.floor(cantidad / 2) * precioVenta
    default:
      return 0
  }
}

export function promocionAplicaAProducto(
  promocion: PromocionActiva,
  idProducto: number,
  idCategoria: number | undefined
): boolean {
  if (promocion.idsProductos.includes(idProducto)) return true
  if (promocion.idCategoria !== undefined && promocion.idCategoria === idCategoria) return true
  return false
}
