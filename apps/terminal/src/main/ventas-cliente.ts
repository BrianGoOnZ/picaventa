import type {
  ConfigLocal,
  DatosCrearVenta,
  ResultadoCrearVenta,
  ResultadoListaVentas,
  ResultadoOperacion,
  ResultadoVentaDetallada
} from '@picaventa/shared'
import { obtenerUrlBase, obtenerToken } from './sesion'
import { solicitarJson, opcionesJson } from './http-cliente'

function encabezadoAuth(): { Authorization: string } | undefined {
  const token = obtenerToken()
  return token ? { Authorization: `Bearer ${token}` } : undefined
}

export function crearVenta(
  config: ConfigLocal,
  datos: DatosCrearVenta
): Promise<ResultadoCrearVenta> {
  const token = obtenerToken()
  if (!token) return Promise.resolve({ ok: false, error: 'No hay sesión activa' })
  return solicitarJson(`${obtenerUrlBase(config)}/ventas`, opcionesJson('POST', datos, token))
}

export function listarVentas(
  config: ConfigLocal,
  estado?: string
): Promise<ResultadoListaVentas> {
  const token = obtenerToken()
  if (!token) return Promise.resolve({ ok: false, error: 'No hay sesión activa' })
  const query = estado ? `?estado=${encodeURIComponent(estado)}` : ''
  return solicitarJson(`${obtenerUrlBase(config)}/ventas${query}`, { headers: encabezadoAuth() })
}

export function obtenerVenta(config: ConfigLocal, id: number): Promise<ResultadoVentaDetallada> {
  const token = obtenerToken()
  if (!token) return Promise.resolve({ ok: false, error: 'No hay sesión activa' })
  return solicitarJson(`${obtenerUrlBase(config)}/ventas/${id}`, { headers: encabezadoAuth() })
}

export function cancelarVentaPausada(
  config: ConfigLocal,
  id: number
): Promise<ResultadoOperacion> {
  const token = obtenerToken()
  if (!token) return Promise.resolve({ ok: false, error: 'No hay sesión activa' })
  return solicitarJson(`${obtenerUrlBase(config)}/ventas/${id}`, {
    method: 'DELETE',
    headers: encabezadoAuth()
  })
}
