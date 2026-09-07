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
