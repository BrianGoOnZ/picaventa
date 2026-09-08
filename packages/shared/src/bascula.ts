// Integración con báscula física para productos a granel (kg) — ver
// apps/terminal/src/main/bascula.ts para el estado actual (todavía sin
// hardware conectado) y los pasos exactos para conectar una báscula real.
export interface LecturaBascula {
  peso: number
  estable: boolean
}

export type ResultadoLecturaBascula = ({ ok: true } & LecturaBascula) | { ok: false; error: string }
