import type {
  ConfigLocal,
  DatosAbono,
  DatosCliente,
  ResultadoCliente,
  ResultadoListaClientes,
  ResultadoOperacion
} from '@picaventa/shared'
import { obtenerUrlBase, obtenerToken } from './sesion'
import { solicitarJson, opcionesJson } from './http-cliente'

function encabezadoAuth(): { Authorization: string } | undefined {
  const token = obtenerToken()
  return token ? { Authorization: `Bearer ${token}` } : undefined
}

export function listarClientes(config: ConfigLocal): Promise<ResultadoListaClientes> {
  const token = obtenerToken()
  if (!token) return Promise.resolve({ ok: false, error: 'No hay sesión activa' })
  return solicitarJson(`${obtenerUrlBase(config)}/clientes`, { headers: encabezadoAuth() })
}

export function crearCliente(config: ConfigLocal, datos: DatosCliente): Promise<ResultadoCliente> {
  const token = obtenerToken()
  if (!token) return Promise.resolve({ ok: false, error: 'No hay sesión activa' })
  return solicitarJson(`${obtenerUrlBase(config)}/clientes`, opcionesJson('POST', datos, token))
}

export function editarCliente(
  config: ConfigLocal,
  id: number,
  datos: DatosCliente
): Promise<ResultadoCliente> {
  const token = obtenerToken()
  if (!token) return Promise.resolve({ ok: false, error: 'No hay sesión activa' })
  return solicitarJson(
    `${obtenerUrlBase(config)}/clientes/${id}`,
    opcionesJson('PUT', datos, token)
  )
}

export function eliminarCliente(config: ConfigLocal, id: number): Promise<ResultadoOperacion> {
  const token = obtenerToken()
  if (!token) return Promise.resolve({ ok: false, error: 'No hay sesión activa' })
  return solicitarJson(`${obtenerUrlBase(config)}/clientes/${id}`, {
    method: 'DELETE',
    headers: encabezadoAuth()
  })
}

export function registrarAbono(
  config: ConfigLocal,
  id: number,
  datos: DatosAbono
): Promise<ResultadoCliente> {
  const token = obtenerToken()
  if (!token) return Promise.resolve({ ok: false, error: 'No hay sesión activa' })
  return solicitarJson(
    `${obtenerUrlBase(config)}/clientes/${id}/abonos`,
    opcionesJson('POST', datos, token)
  )
}
