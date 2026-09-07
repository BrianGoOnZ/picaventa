import { z } from 'zod'
import type { UnidadMedida } from './catalogo.js'

export const tipoMermaValores = ['merma', 'ajuste'] as const
export type TipoMerma = (typeof tipoMermaValores)[number]

// RF-10/RF-11 combinados en un solo formulario: para 'merma', `cantidad` es
// lo que se perdió (siempre positivo, se resta del stock). Para 'ajuste'
// (conteo físico), `cantidad` es el stock físico contado — no una
// diferencia — el servidor calcula y guarda la diferencia con signo.
export const datosMermaSchema = z.object({
  idProducto: z.number().int().positive(),
  tipoMerma: z.enum(tipoMermaValores),
  motivo: z.string().min(1),
  cantidad: z.number().nonnegative()
})
export type DatosMerma = z.infer<typeof datosMermaSchema>

export interface MermaHistorial {
  idMerma: number
  idProducto: number
  nombreProducto: string
  unidadMedida: UnidadMedida
  tipoMerma: TipoMerma
  motivoMerma: string
  cantidadMerma: number
  idUsuario: number
  nombreUsuario: string
  fechaMerma: string
}

export type ResultadoRegistrarMerma =
  | { ok: true; stockAnterior: number; stockNuevo: number }
  | { ok: false; error: string }

export type ResultadoHistorialMermas =
  | { ok: true; mermas: MermaHistorial[] }
  | { ok: false; error: string }
