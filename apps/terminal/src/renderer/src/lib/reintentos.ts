import type { ResultadoConexion } from '@picaventa/shared'

const INTENTOS = 5
const ESPERA_MS = 2000

function esperar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function reintentar(
  intentar: () => Promise<ResultadoConexion>
): Promise<ResultadoConexion> {
  let ultimoError = 'No se pudo conectar'

  for (let i = 0; i < INTENTOS; i++) {
    const resultado = await intentar()
    if (resultado.ok) return resultado
    ultimoError = resultado.error
    if (i < INTENTOS - 1) await esperar(ESPERA_MS)
  }

  return { ok: false, error: ultimoError }
}
