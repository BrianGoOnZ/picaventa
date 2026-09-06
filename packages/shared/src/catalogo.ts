import { z } from 'zod'

export const unidadMedidaValores = ['pieza', 'kg'] as const
export type UnidadMedida = (typeof unidadMedidaValores)[number]

export const datosCategoriaSchema = z.object({
  nombreCategoria: z.string().min(1)
})
export type DatosCategoria = z.infer<typeof datosCategoriaSchema>

export interface Categoria {
  idCategoria: number
  nombreCategoria: string
}

export const datosProductoSchema = z.object({
  nombreProducto: z.string().min(1),
  codigoBarras: z.string().optional(),
  precioCompra: z.number().nonnegative().optional(),
  precioVenta: z.number().nonnegative(),
  unidadMedida: z.enum(unidadMedidaValores),
  stockActual: z.number().nonnegative(),
  stockMinimo: z.number().nonnegative(),
  idCategoria: z.number().int().positive().optional()
})
export type DatosProducto = z.infer<typeof datosProductoSchema>

export interface Producto {
  idProducto: number
  nombreProducto: string
  codigoBarras?: string
  precioCompra?: number
  precioVenta: number
  unidadMedida: UnidadMedida
  stockActual: number
  stockMinimo: number
  idCategoria?: number
}

export interface FiltrosProductos {
  buscar?: string
  codigoBarras?: string
  stockBajo?: boolean
}

export type ResultadoOperacion = { ok: true } | { ok: false; error: string }

export type ResultadoListaCategorias =
  | { ok: true; categorias: Categoria[] }
  | { ok: false; error: string }
export type ResultadoCategoria = { ok: true; categoria: Categoria } | { ok: false; error: string }

export type ResultadoListaProductos =
  | { ok: true; productos: Producto[] }
  | { ok: false; error: string }
export type ResultadoProducto = { ok: true; producto: Producto } | { ok: false; error: string }
