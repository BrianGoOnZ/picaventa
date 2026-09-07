import type {
  ConfigLocal,
  DatosNegocio,
  ResultadoObtenerNegocio,
  ResultadoGuardarNegocio,
  ResultadoEstadoRespaldo,
  ResultadoRespaldoManual
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

export function obtenerEstadoRespaldo(config: ConfigLocal): Promise<ResultadoEstadoRespaldo> {
  const token = obtenerToken()
  if (!token) return Promise.resolve({ ok: false, error: 'No hay sesión activa' })

  return solicitarJson(`${obtenerUrlBase(config)}/negocio/respaldo`, {
    headers: { Authorization: `Bearer ${token}` }
  })
}

export function respaldarAhora(config: ConfigLocal): Promise<ResultadoRespaldoManual> {
  const token = obtenerToken()
  if (!token) return Promise.resolve({ ok: false, error: 'No hay sesión activa' })

  return solicitarJson(
    `${obtenerUrlBase(config)}/negocio/respaldo/ahora`,
    opcionesJson('POST', {}, token)
  )
}
