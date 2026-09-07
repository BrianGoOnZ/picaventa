import type {
  ConfigLocal,
  DatosCompra,
  DatosProveedor,
  ResultadoCompraDetallada,
  ResultadoCrearCompra,
  ResultadoListaCompras,
  ResultadoListaProveedores,
  ResultadoOperacion,
  ResultadoProveedor
} from '@picaventa/shared'
import { obtenerUrlBase, obtenerToken } from './sesion'
import { solicitarJson, opcionesJson } from './http-cliente'

function encabezadoAuth(): { Authorization: string } | undefined {
  const token = obtenerToken()
  return token ? { Authorization: `Bearer ${token}` } : undefined
}

export function listarProveedores(config: ConfigLocal): Promise<ResultadoListaProveedores> {
  const token = obtenerToken()
  if (!token) return Promise.resolve({ ok: false, error: 'No hay sesión activa' })
  return solicitarJson(`${obtenerUrlBase(config)}/proveedores`, { headers: encabezadoAuth() })
}

export function crearProveedor(
  config: ConfigLocal,
  datos: DatosProveedor
): Promise<ResultadoProveedor> {
  const token = obtenerToken()
  if (!token) return Promise.resolve({ ok: false, error: 'No hay sesión activa' })
  return solicitarJson(`${obtenerUrlBase(config)}/proveedores`, opcionesJson('POST', datos, token))
}

export function editarProveedor(
  config: ConfigLocal,
  id: number,
  datos: DatosProveedor
): Promise<ResultadoProveedor> {
  const token = obtenerToken()
  if (!token) return Promise.resolve({ ok: false, error: 'No hay sesión activa' })
  return solicitarJson(`${obtenerUrlBase(config)}/proveedores/${id}`, opcionesJson('PUT', datos, token))
}

export function eliminarProveedor(config: ConfigLocal, id: number): Promise<ResultadoOperacion> {
  const token = obtenerToken()
  if (!token) return Promise.resolve({ ok: false, error: 'No hay sesión activa' })
  return solicitarJson(`${obtenerUrlBase(config)}/proveedores/${id}`, {
    method: 'DELETE',
    headers: encabezadoAuth()
  })
}

export function crearCompra(config: ConfigLocal, datos: DatosCompra): Promise<ResultadoCrearCompra> {
  const token = obtenerToken()
  if (!token) return Promise.resolve({ ok: false, error: 'No hay sesión activa' })
  return solicitarJson(`${obtenerUrlBase(config)}/compras`, opcionesJson('POST', datos, token))
}

export function listarCompras(config: ConfigLocal): Promise<ResultadoListaCompras> {
  const token = obtenerToken()
  if (!token) return Promise.resolve({ ok: false, error: 'No hay sesión activa' })
  return solicitarJson(`${obtenerUrlBase(config)}/compras`, { headers: encabezadoAuth() })
}

export function obtenerCompra(config: ConfigLocal, id: number): Promise<ResultadoCompraDetallada> {
  const token = obtenerToken()
  if (!token) return Promise.resolve({ ok: false, error: 'No hay sesión activa' })
  return solicitarJson(`${obtenerUrlBase(config)}/compras/${id}`, { headers: encabezadoAuth() })
}
