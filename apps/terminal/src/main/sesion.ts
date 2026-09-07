import type { ConfigLocal, SesionUsuario } from '@picaventa/shared'

interface SesionActiva {
  token: string
  sesion: SesionUsuario
  fondoInicial: number | null
}

let sesionActiva: SesionActiva | null = null

export function guardarSesion(token: string, sesion: SesionUsuario): void {
  sesionActiva = { token, sesion, fondoInicial: null }
}

export function obtenerSesion(): SesionUsuario | null {
  return sesionActiva?.sesion ?? null
}

export function obtenerToken(): string | null {
  return sesionActiva?.token ?? null
}

export function guardarFondoInicial(monto: number): void {
  if (sesionActiva) sesionActiva.fondoInicial = monto
}

export function obtenerFondoInicial(): number | null {
  return sesionActiva?.fondoInicial ?? null
}

export function borrarSesion(): void {
  sesionActiva = null
}

export function obtenerUrlBase(config: ConfigLocal): string {
  return config.modo === 'servidor'
    ? `http://localhost:${config.puerto}`
    : `http://${config.serverHost}:${config.serverPort}`
}
