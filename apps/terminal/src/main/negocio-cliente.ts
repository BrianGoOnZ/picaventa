import type {
  ConfigLocal,
  DatosNegocio,
  ResultadoObtenerNegocio,
  ResultadoGuardarNegocio
} from '@picaventa/shared'
import { obtenerUrlBase, obtenerToken } from './sesion'
import { solicitarJson, opcionesJson } from './http-cliente'

export function obtenerNegocio(config: ConfigLocal): Promise<ResultadoObtenerNegocio> {
  const token = obtenerToken()
  if (!token) return Promise.resolve({ ok: false, error: 'No hay sesión activa' })

  return solicitarJson(`${obtenerUrlBase(config)}/negocio`, {
    headers: { Authorization: `Bearer ${token}` }
  })
}

export function guardarNegocio(
  config: ConfigLocal,
  datos: DatosNegocio
): Promise<ResultadoGuardarNegocio> {
  const token = obtenerToken()
  if (!token) return Promise.resolve({ ok: false, error: 'No hay sesión activa' })

  return solicitarJson(`${obtenerUrlBase(config)}/negocio`, opcionesJson('PUT', datos, token))
}
