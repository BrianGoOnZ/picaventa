import type {
  ConfigLocal,
  DatosCancelarVenta,
  DatosCrearVenta,
  DatosDevolucion,
  FiltrosVentas,
  ResultadoCancelarVenta,
  ResultadoCrearVenta,
  ResultadoDevolucion,
  ResultadoListaDevoluciones,
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
  filtros: FiltrosVentas = {}
): Promise<ResultadoListaVentas> {
  const token = obtenerToken()
  if (!token) return Promise.resolve({ ok: false, error: 'No hay sesión activa' })

  const parametros = new URLSearchParams()
  if (filtros.estado) parametros.set('estado', filtros.estado)
  if (filtros.desde) parametros.set('desde', filtros.desde)
  if (filtros.hasta) parametros.set('hasta', filtros.hasta)

  const query = parametros.toString()
  return solicitarJson(`${obtenerUrlBase(config)}/ventas${query ? `?${query}` : ''}`, {
    headers: encabezadoAuth()
  })
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

export function cancelarVentaActiva(
  config: ConfigLocal,
  id: number,
  datos: DatosCancelarVenta
): Promise<ResultadoCancelarVenta> {
  const token = obtenerToken()
  if (!token) return Promise.resolve({ ok: false, error: 'No hay sesión activa' })
  return solicitarJson(
    `${obtenerUrlBase(config)}/ventas/${id}/cancelar`,
    opcionesJson('POST', datos, token)
  )
}

export function registrarDevolucion(
  config: ConfigLocal,
  id: number,
  datos: DatosDevolucion
): Promise<ResultadoDevolucion> {
  const token = obtenerToken()
  if (!token) return Promise.resolve({ ok: false, error: 'No hay sesión activa' })
  return solicitarJson(
    `${obtenerUrlBase(config)}/ventas/${id}/devoluciones`,
    opcionesJson('POST', datos, token)
  )
}

export function listarDevoluciones(
  config: ConfigLocal,
  id: number
): Promise<ResultadoListaDevoluciones> {
  const token = obtenerToken()
  if (!token) return Promise.resolve({ ok: false, error: 'No hay sesión activa' })
  return solicitarJson(`${obtenerUrlBase(config)}/ventas/${id}/devoluciones`, {
    headers: encabezadoAuth()
  })
}
