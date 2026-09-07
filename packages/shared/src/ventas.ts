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

export const tipoResolucionValores = ['reembolso', 'cambio'] as const
export type TipoResolucion = (typeof tipoResolucionValores)[number]

export const datosDevolucionSchema = z.object({
  idProducto: z.number().int().positive(),
  cantidad: z.number().positive(),
  motivo: z.string().min(1),
  tipoResolucion: z.enum(tipoResolucionValores),
  pin: z.string().regex(/^\d{4}$/, 'El PIN debe tener exactamente 4 dígitos')
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
  | { ok: true; devolucion: Devolucion; stockNuevo: number }
  | { ok: false; error: string }

export type ResultadoListaDevoluciones =
  | { ok: true; devoluciones: Devolucion[] }
  | { ok: false; error: string }
