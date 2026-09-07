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

// Auditoría persistente de entradas de inventario (quién cargó qué, cuánto y
// cuándo) — a diferencia del historial de sesión de la pantalla de Entradas
// de mercancía, esto sobrevive a cerrar la app y es consultable por un
// administrador en cualquier momento.
export interface EntradaInventarioHistorial {
  idEntrada: number
  idProducto: number
  nombreProducto: string
  unidadMedida: UnidadMedida
  idUsuario: number
  nombreUsuario: string
  cantidad: number
  stockAnterior: number
  stockNuevo: number
  fechaEntrada: string
}

export type ResultadoHistorialEntradas =
  | { ok: true; entradas: EntradaInventarioHistorial[] }
  | { ok: false; error: string }

// Auditoría de cambios de precio de venta (RNF-05): quién cambió el precio
// de qué producto, de cuánto a cuánto y cuándo. Solo se registra cuando el
// precio de venta realmente cambia al editar el producto.
export interface CambioPrecioHistorial {
  idHistoricoPrecio: number
  idProducto: number
  nombreProducto: string
  precioAnterior: number
  precioNuevo: number
  idUsuario: number
  nombreUsuario: string
  fechaCambio: string
}

export type ResultadoHistorialPrecios =
  | { ok: true; cambios: CambioPrecioHistorial[] }
  | { ok: false; error: string }

export type ResultadoOperacion = { ok: true } | { ok: false; error: string }

export type ResultadoListaCategorias =
  | { ok: true; categorias: Categoria[] }
  | { ok: false; error: string }
export type ResultadoCategoria = { ok: true; categoria: Categoria } | { ok: false; error: string }

export type ResultadoListaProductos =
  | { ok: true; productos: Producto[] }
  | { ok: false; error: string }
export type ResultadoProducto = { ok: true; producto: Producto } | { ok: false; error: string }
