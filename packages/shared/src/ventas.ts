import { z } from 'zod'
import type { UnidadMedida } from './catalogo.js'

export const lineaCarritoSchema = z.object({
  idProducto: z.number().int().positive(),
  cantidad: z.number().positive(),
  descuento: z.number().nonnegative().default(0)
})
export type LineaCarrito = z.infer<typeof lineaCarritoSchema>

export const datosCrearVentaSchema = z
  .object({
    lineas: z.array(lineaCarritoSchema).min(1),
    metodoPago: z.string().min(1),
    estado: z.enum(['activa', 'pausada']).default('activa'),
    idCliente: z.number().int().positive().optional()
  })
  .refine((datos) => datos.metodoPago !== 'fiado' || datos.idCliente !== undefined, {
    message: 'Debe seleccionar un cliente para vender a fiado',
    path: ['idCliente']
  })
export type DatosCrearVenta = z.infer<typeof datosCrearVentaSchema>

export type EstadoVenta = 'activa' | 'pausada' | 'cancelada'

export interface FiltrosVentas {
  estado?: EstadoVenta
  desde?: string
  hasta?: string
}

// RNF-04: cancelar una venta ya cobrada o procesar una devolución exige el
// PIN del administrador que lo autoriza, igual que un retiro de caja.
export const datosCancelarVentaSchema = z.object({
  pin: z.string().regex(/^\d{4}$/, 'El PIN debe tener exactamente 4 dígitos')
})
export type DatosCancelarVenta = z.infer<typeof datosCancelarVentaSchema>

// 'cambio' es un valor legado (devoluciones registradas con el flujo
// anterior) que ya no se ofrece al capturar una devolución nueva, pero se
// conserva en el tipo para poder seguir leyendo/mostrando esas filas viejas.
export const tipoResolucionValores = ['reembolso', 'cambio', 'reposicion'] as const
export type TipoResolucion = (typeof tipoResolucionValores)[number]

// Lo único que el nuevo formulario de devoluciones deja elegir. "Cambiar
// por otro producto" no es un tercer valor de tipoResolucion: se modela
// como un 'reembolso' del producto original + productoCambio con el
// producto nuevo, para que el dinero cuadre solo (ver ventas.ts servidor).
export const tipoResolucionNuevoValores = ['reembolso', 'reposicion'] as const

export const productoCambioSchema = z.object({
  idProducto: z.number().int().positive(),
  cantidad: z.number().positive()
})
export type ProductoCambio = z.infer<typeof productoCambioSchema>

export const datosDevolucionSchema = z
  .object({
    idProducto: z.number().int().positive(),
    cantidad: z.number().positive(),
    motivo: z.string().min(1),
    tipoResolucion: z.enum(tipoResolucionNuevoValores),
    // Solo tiene sentido junto con tipoResolucion 'reembolso': el producto
    // que el cliente se lleva a cambio del que está devolviendo.
    productoCambio: productoCambioSchema.optional(),
    pin: z.string().regex(/^\d{4}$/, 'El PIN debe tener exactamente 4 dígitos')
  })
  .refine((datos) => !datos.productoCambio || datos.tipoResolucion === 'reembolso', {
    message: 'Un cambio por otro producto se procesa junto con un reembolso del producto original',
    path: ['productoCambio']
  })
export type DatosDevolucion = z.infer<typeof datosDevolucionSchema>

export interface Devolucion {
  idDevolucion: number
  idVenta: number
  idProducto: number
  nombreProducto: string
  cantidadDevuelta: number
  motivoDevolucion: string
  tipoResolucion: TipoResolucion
  montoReembolsado: number
  idVentaCambio?: number
  folioVentaCambio?: string
  idUsuario: number
  nombreUsuario: string
  fechaDevolucion: string
}

export interface Venta {
  idVenta: number
  folioVenta: string
  fechaVenta: string
  total: number
  metodoPago: string
  estadoVenta: EstadoVenta
  idCliente?: number
  idUsuario: number
}

export interface LineaVentaDetalle {
  idProducto: number
  nombreProducto: string
  unidadMedida: UnidadMedida
  cantidadVendida: number
  precioUnitarioVenta: number
  descuentoAplicado: number
}

export interface VentaDetallada {
  venta: Venta
  lineas: LineaVentaDetalle[]
}

export type ResultadoCrearVenta =
  | { ok: true; idVenta: number; folio: string; total: number }
  | { ok: false; error: string }

export type ResultadoListaVentas = { ok: true; ventas: Venta[] } | { ok: false; error: string }

export type ResultadoVentaDetallada =
  | { ok: true; venta: Venta; lineas: LineaVentaDetalle[] }
  | { ok: false; error: string }

export type ResultadoCancelarVenta = { ok: true; venta: Venta } | { ok: false; error: string }

export type ResultadoDevolucion =
  | {
      ok: true
      devolucion: Devolucion
      stockNuevo: number
      // Presente solo cuando la devolución incluyó productoCambio: la
      // venta nueva que se generó por el producto de reemplazo.
      ventaCambio?: { idVenta: number; folio: string; total: number }
    }
  | { ok: false; error: string }

export type ResultadoListaDevoluciones =
  | { ok: true; devoluciones: Devolucion[] }
  | { ok: false; error: string }
