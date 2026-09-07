import type {
  ConfigLocal,
  DatosPromocion,
  ResultadoListaPromociones,
  ResultadoOperacion,
  ResultadoPromocion,
  ResultadoPromocionesActivas
} from '@picaventa/shared'
import { obtenerUrlBase, obtenerToken } from './sesion'
import { solicitarJson, opcionesJson } from './http-cliente'

function encabezadoAuth(): { Authorization: string } | undefined {
  const token = obtenerToken()
  return token ? { Authorization: `Bearer ${token}` } : undefined
}

export function listarPromociones(config: ConfigLocal): Promise<ResultadoListaPromociones> {
  const token = obtenerToken()
  if (!token) return Promise.resolve({ ok: false, error: 'No hay sesión activa' })
  return solicitarJson(`${obtenerUrlBase(config)}/promociones`, { headers: encabezadoAuth() })
}

export function listarPromocionesActivas(config: ConfigLocal): Promise<ResultadoPromocionesActivas> {
  const token = obtenerToken()
  if (!token) return Promise.resolve({ ok: false, error: 'No hay sesión activa' })
  return solicitarJson(`${obtenerUrlBase(config)}/promociones/activas`, { headers: encabezadoAuth() })
}

export function crearPromocion(
  config: ConfigLocal,
  datos: DatosPromocion
): Promise<ResultadoPromocion> {
  const token = obtenerToken()
  if (!token) return Promise.resolve({ ok: false, error: 'No hay sesión activa' })
  return solicitarJson(`${obtenerUrlBase(config)}/promociones`, opcionesJson('POST', datos, token))
}

export function editarPromocion(
  config: ConfigLocal,
  id: number,
  datos: DatosPromocion
): Promise<ResultadoPromocion> {
  const token = obtenerToken()
  if (!token) return Promise.resolve({ ok: false, error: 'No hay sesión activa' })
  return solicitarJson(`${obtenerUrlBase(config)}/promociones/${id}`, opcionesJson('PUT', datos, token))
}

export function eliminarPromocion(config: ConfigLocal, id: number): Promise<ResultadoOperacion> {
  const token = obtenerToken()
  if (!token) return Promise.resolve({ ok: false, error: 'No hay sesión activa' })
  return solicitarJson(`${obtenerUrlBase(config)}/promociones/${id}`, {
    method: 'DELETE',
    headers: encabezadoAuth()
  })
}
