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
