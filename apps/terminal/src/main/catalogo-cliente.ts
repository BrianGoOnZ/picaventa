import type {
  ConfigLocal,
  DatosCategoria,
  DatosEntradaInventario,
  DatosProducto,
  FiltrosProductos,
  ResultadoCategoria,
  ResultadoListaCategorias,
  ResultadoListaProductos,
  ResultadoOperacion,
  ResultadoProducto
} from '@picaventa/shared'
import { obtenerUrlBase, obtenerToken } from './sesion'
import { solicitarJson, opcionesJson } from './http-cliente'

function encabezadoAuth(): { Authorization: string } | undefined {
  const token = obtenerToken()
  return token ? { Authorization: `Bearer ${token}` } : undefined
}

export function listarCategorias(config: ConfigLocal): Promise<ResultadoListaCategorias> {
  const token = obtenerToken()
  if (!token) return Promise.resolve({ ok: false, error: 'No hay sesión activa' })
  return solicitarJson(`${obtenerUrlBase(config)}/categorias`, { headers: encabezadoAuth() })
}

export function crearCategoria(
  config: ConfigLocal,
  datos: DatosCategoria
): Promise<ResultadoCategoria> {
  const token = obtenerToken()
  if (!token) return Promise.resolve({ ok: false, error: 'No hay sesión activa' })
  return solicitarJson(`${obtenerUrlBase(config)}/categorias`, opcionesJson('POST', datos, token))
}

export function editarCategoria(
  config: ConfigLocal,
  id: number,
  datos: DatosCategoria
): Promise<ResultadoCategoria> {
  const token = obtenerToken()
  if (!token) return Promise.resolve({ ok: false, error: 'No hay sesión activa' })
  return solicitarJson(
    `${obtenerUrlBase(config)}/categorias/${id}`,
    opcionesJson('PUT', datos, token)
  )
}

export function eliminarCategoria(config: ConfigLocal, id: number): Promise<ResultadoOperacion> {
  const token = obtenerToken()
  if (!token) return Promise.resolve({ ok: false, error: 'No hay sesión activa' })
  return solicitarJson(`${obtenerUrlBase(config)}/categorias/${id}`, {
    method: 'DELETE',
    headers: encabezadoAuth()
  })
}

export function listarProductos(
  config: ConfigLocal,
  filtros: FiltrosProductos = {}
): Promise<ResultadoListaProductos> {
  const token = obtenerToken()
  if (!token) return Promise.resolve({ ok: false, error: 'No hay sesión activa' })

  const parametros = new URLSearchParams()
  if (filtros.buscar) parametros.set('buscar', filtros.buscar)
  if (filtros.codigoBarras) parametros.set('codigoBarras', filtros.codigoBarras)
  if (filtros.stockBajo) parametros.set('stockBajo', 'true')

  const query = parametros.toString()
  return solicitarJson(`${obtenerUrlBase(config)}/productos${query ? `?${query}` : ''}`, {
    headers: encabezadoAuth()
  })
}

export function crearProducto(
  config: ConfigLocal,
  datos: DatosProducto
): Promise<ResultadoProducto> {
  const token = obtenerToken()
  if (!token) return Promise.resolve({ ok: false, error: 'No hay sesión activa' })
  return solicitarJson(`${obtenerUrlBase(config)}/productos`, opcionesJson('POST', datos, token))
}

export function editarProducto(
  config: ConfigLocal,
  id: number,
  datos: DatosProducto
): Promise<ResultadoProducto> {
  const token = obtenerToken()
  if (!token) return Promise.resolve({ ok: false, error: 'No hay sesión activa' })
  return solicitarJson(
    `${obtenerUrlBase(config)}/productos/${id}`,
    opcionesJson('PUT', datos, token)
  )
}

export function eliminarProducto(config: ConfigLocal, id: number): Promise<ResultadoOperacion> {
  const token = obtenerToken()
  if (!token) return Promise.resolve({ ok: false, error: 'No hay sesión activa' })
  return solicitarJson(`${obtenerUrlBase(config)}/productos/${id}`, {
    method: 'DELETE',
    headers: encabezadoAuth()
  })
}

export function registrarEntradaInventario(
  config: ConfigLocal,
  id: number,
  datos: DatosEntradaInventario
): Promise<ResultadoProducto> {
  const token = obtenerToken()
  if (!token) return Promise.resolve({ ok: false, error: 'No hay sesión activa' })
  return solicitarJson(
    `${obtenerUrlBase(config)}/productos/${id}/entrada`,
    opcionesJson('POST', datos, token)
  )
}
