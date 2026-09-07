import { z } from 'zod'

export const unidadMedidaValores = ['pieza', 'kg'] as const
export type UnidadMedida = (typeof unidadMedidaValores)[number]

// Rotación de colores de categoría (tarjetas de Punto de Venta sin foto
// propia) — earthy, distintos de los colores de estado reservados.
export const PALETA_COLORES_CATEGORIA = [
  '#7C5B45',
  '#6B7A4F',
  '#8C6A2E',
  '#8E5B4E',
  '#4F7A78',
  '#9C6B8E',
  '#5B6B7A',
  '#3F6B52'
] as const

export const IMAGEN_PRODUCTO_MAX_BYTES = 200 * 1024

export const datosCategoriaSchema = z.object({
  nombreCategoria: z.string().min(1),
  colorCategoria: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Color inválido')
    .optional()
})
export type DatosCategoria = z.infer<typeof datosCategoriaSchema>

export interface Categoria {
  idCategoria: number
  nombreCategoria: string
  colorCategoria: string
}

export const datosProductoSchema = z.object({
  nombreProducto: z.string().min(1),
  codigoBarras: z.string().optional(),
  precioCompra: z.number().nonnegative().optional(),
  precioVenta: z.number().nonnegative(),
  unidadMedida: z.enum(unidadMedidaValores),
  stockActual: z.number().nonnegative(),
  stockMinimo: z.number().nonnegative(),
  idCategoria: z.number().int().positive().optional(),
  // base64 (data URI) de una foto miniatura del producto — mismo patrón que
  // el logo del negocio, embebida directamente en Postgres.
  imagenDatos: z.string().max(IMAGEN_PRODUCTO_MAX_BYTES * 2).optional()
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
  imagenDatos?: string
}

export interface FiltrosProductos {
  buscar?: string
  codigoBarras?: string
  stockBajo?: boolean
}

export const datosEntradaInventarioSchema = z.object({
  cantidad: z.number().positive()
})
export type DatosEntradaInventario = z.infer<typeof datosEntradaInventarioSchema>

export type ResultadoOperacion = { ok: true } | { ok: false; error: string }

export type ResultadoListaCategorias =
  | { ok: true; categorias: Categoria[] }
  | { ok: false; error: string }
export type ResultadoCategoria = { ok: true; categoria: Categoria } | { ok: false; error: string }

export type ResultadoListaProductos =
  | { ok: true; productos: Producto[] }
  | { ok: false; error: string }
export type ResultadoProducto = { ok: true; producto: Producto } | { ok: false; error: string }
