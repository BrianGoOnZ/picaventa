import type { ResultadoConexion } from './config.js'

export async function probarConexionServidorRemoto(
  host: string,
  puerto: number,
  timeoutMs = 5000
): Promise<ResultadoConexion> {
  const controlador = new AbortController()
  const temporizador = setTimeout(() => controlador.abort(), timeoutMs)

  try {
    const respuesta = await fetch(`http://${host}:${puerto}/health`, {
      signal: controlador.signal
    })
    if (!respuesta.ok) {
      return { ok: false, error: `El servidor respondió con estado ${respuesta.status}` }
    }
    return { ok: true }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return { ok: false, error: 'Tiempo de espera agotado, el servidor no respondió' }
    }
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  } finally {
    clearTimeout(temporizador)
  }
}
