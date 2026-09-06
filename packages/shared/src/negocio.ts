import { z } from 'zod'

export const LOGO_MAX_BYTES = 500 * 1024

export const datosNegocioSchema = z.object({
  nombreNegocio: z.string().min(1),
  direccionNegocio: z.string().optional(),
  telefonoNegocio: z.string().optional(),
  // base64 (data URI) del logo, embebido directamente — servidor y cajas no
  // comparten sistema de archivos, solo Postgres. ~1.4x el tamaño en bytes
  // del límite de subida, más margen para el prefijo "data:image/...;base64,".
  logoDatos: z.string().max(LOGO_MAX_BYTES * 2).optional()
})

export type DatosNegocio = z.infer<typeof datosNegocioSchema>

export type ResultadoObtenerNegocio =
  | { ok: true; negocio: DatosNegocio | null }
  | { ok: false; error: string }

export type ResultadoGuardarNegocio =
  | { ok: true; negocio: DatosNegocio }
  | { ok: false; error: string }
