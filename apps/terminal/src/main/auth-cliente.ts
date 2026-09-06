import type {
  ConfigLocal,
  CredencialesLogin,
  DatosCrearUsuario,
  DatosNuevoUsuario,
  RespuestaEstadoAuth,
  ResultadoAuth,
  ResultadoCrearUsuario,
  ResultadoListaUsuarios,
  ResultadoLogin,
  ResultadoReautenticacion
} from '@picaventa/shared'
import { obtenerUrlBase, guardarSesion, borrarSesion, obtenerToken } from './sesion'

async function solicitarJson<T>(url: string, opciones?: RequestInit): Promise<T> {
  const respuesta = await fetch(url, opciones)
  return (await respuesta.json()) as T
}

function opcionesJson(cuerpo: unknown, token?: string): RequestInit {
  return {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(cuerpo)
  }
}

export function obtenerEstadoInicial(config: ConfigLocal): Promise<RespuestaEstadoAuth> {
  return solicitarJson(`${obtenerUrlBase(config)}/auth/estado`)
}

export async function crearPrimerUsuario(
  config: ConfigLocal,
  datos: DatosNuevoUsuario
): Promise<ResultadoAuth> {
  const resultado = await solicitarJson<ResultadoLogin>(
    `${obtenerUrlBase(config)}/auth/primer-usuario`,
    opcionesJson(datos)
  )
  if (!resultado.ok) return resultado
  guardarSesion(resultado.token, resultado.sesion)
  return { ok: true, sesion: resultado.sesion }
}

export async function login(
  config: ConfigLocal,
  credenciales: CredencialesLogin
): Promise<ResultadoAuth> {
  const resultado = await solicitarJson<ResultadoLogin>(
    `${obtenerUrlBase(config)}/auth/login`,
    opcionesJson(credenciales)
  )
  if (!resultado.ok) return resultado
  guardarSesion(resultado.token, resultado.sesion)
  return { ok: true, sesion: resultado.sesion }
}

export function reautenticar(config: ConfigLocal, pin: string): Promise<ResultadoReautenticacion> {
  const token = obtenerToken()
  if (!token) return Promise.resolve({ ok: false, error: 'No hay sesión activa' })

  return solicitarJson(
    `${obtenerUrlBase(config)}/auth/reautenticar`,
    opcionesJson({ pin }, token)
  )
}

export function cerrarSesionRemota(): void {
  borrarSesion()
}

export function listarUsuarios(config: ConfigLocal): Promise<ResultadoListaUsuarios> {
  const token = obtenerToken()
  if (!token) return Promise.resolve({ ok: false, error: 'No hay sesión activa' })

  return solicitarJson(`${obtenerUrlBase(config)}/auth/usuarios`, {
    headers: { Authorization: `Bearer ${token}` }
  })
}

export function crearUsuario(
  config: ConfigLocal,
  datos: DatosCrearUsuario
): Promise<ResultadoCrearUsuario> {
  const token = obtenerToken()
  if (!token) return Promise.resolve({ ok: false, error: 'No hay sesión activa' })

  return solicitarJson(`${obtenerUrlBase(config)}/auth/usuarios`, opcionesJson(datos, token))
}
