import { z } from 'zod'

// Respaldo automático diario de la base de datos (RNF-06) — solo corre en
// la instancia con rol de Servidor, la única que tiene la base de datos
// completa. Ver 03-Arquitectura-general.md, fila 11.
export interface EstadoRespaldo {
  fecha: string
  ok: boolean
  archivo?: string
  error?: string
}

export type ResultadoEstadoRespaldo =
  | { ok: true; disponible: boolean; ultimoEstado: EstadoRespaldo | null }
  | { ok: false; error: string }

export type ResultadoRespaldoManual =
  | { ok: true; estado: EstadoRespaldo }
  | { ok: false; error: string }

export interface InfoRespaldo {
  archivo: string
  fecha: string
  tamanoBytes: number
}

export type ResultadoListarRespaldos =
  | { ok: true; respaldos: InfoRespaldo[] }
  | { ok: false; error: string }

export type ResultadoRestaurarRespaldo = { ok: true } | { ok: false; error: string }

// Restaurar reemplaza TODA la base de datos actual por la del respaldo
// elegido — es destructivo e irreversible, así que exige el PIN de quien
// lo autoriza, igual que otras acciones críticas (ver datosResetearAccesoSchema).
export const datosRestaurarRespaldoSchema = z.object({
  archivo: z.string().min(1),
  pin: z.string().regex(/^\d{4}$/, 'El PIN debe tener exactamente 4 dígitos')
})
export type DatosRestaurarRespaldo = z.infer<typeof datosRestaurarRespaldoSchema>
