import { z } from 'zod'
import type { UnidadMedida } from './catalogo.js'

export const datosProveedorSchema = z.object({
  nombreProveedor: z.string().min(1),
  nombreEmpresa: z.string().optional(),
  telefonoProveedor: z.string().optional(),
  correoProveedor: z.string().optional()
})
export type DatosProveedor = z.infer<typeof datosProveedorSchema>

export interface Proveedor {
  idProveedor: number
  nombreProveedor: string
  nombreEmpresa?: string
  telefonoProveedor?: string
  correoProveedor?: string
}

export type ResultadoListaProveedores =
  | { ok: true; proveedores: Proveedor[] }
  | { ok: false; error: string }
export type ResultadoProveedor = { ok: true; proveedor: Proveedor } | { ok: false; error: string }

// RF-18: registrar una factura/nota de remisión de un proveedor — suma
// cantidades al stock de varios productos a la vez y, opcionalmente,
// actualiza su precio de compra al costo facturado.
export const lineaCompraSchema = z.object({
  idProducto: z.number().int().positive(),
  cantidad: z.number().positive(),
  costoUnitario: z.number().nonnegative()
})
export type LineaCompra = z.infer<typeof lineaCompraSchema>

export const datosCompraSchema = z.object({
  idProveedor: z.number().int().positive(),
  lineas: z.array(lineaCompraSchema).min(1),
  actualizarPrecioCompra: z.boolean().default(true)
})
export type DatosCompra = z.infer<typeof datosCompraSchema>

export interface LineaCompraDetalle {
  idProducto: number
  nombreProducto: string
  unidadMedida: UnidadMedida
  cantidadComprada: number
  costoUnitario: number
}

export interface Compra {
  idCompra: number
  fechaCompra: string
  idProveedor: number
  nombreProveedor: string
  idUsuario: number
  nombreUsuario: string
  total: number
}

export interface CompraDetallada {
  compra: Compra
  lineas: LineaCompraDetalle[]
}

export type ResultadoCrearCompra = { ok: true; idCompra: number } | { ok: false; error: string }
export type ResultadoListaCompras = { ok: true; compras: Compra[] } | { ok: false; error: string }
export type ResultadoCompraDetallada =
  | ({ ok: true } & CompraDetallada)
  | { ok: false; error: string }
