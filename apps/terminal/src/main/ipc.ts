import { app, ipcMain } from 'electron'
import { networkInterfaces } from 'node:os'
import { randomBytes } from 'node:crypto'
import { join } from 'node:path'
import {
  CANALES_IPC,
  PUERTO_SERVIDOR_DEFECTO,
  probarConexionServidorRemoto,
  type ConfigLocal,
  type CredencialesLogin,
  type DatosCrearUsuario,
  type DatosNuevoUsuario,
  type ResultadoAuth,
  type ResultadoConexion,
  type ResultadoCrearUsuario,
  type ResultadoListaUsuarios,
  type ResultadoReautenticacion,
  type RespuestaEstadoAuth,
  type SesionUsuario
} from '@picaventa/shared'
import { probarConexionPostgres, aplicarMigraciones } from '@picaventa/db'
import { obtenerConfig, guardarConfig, borrarConfig } from './config-store'
import { arrancarServidorEmbebido } from './servidor-embebido'
import {
  obtenerEstadoInicial,
  crearPrimerUsuario,
  login,
  reautenticar,
  cerrarSesionRemota,
  listarUsuarios,
  crearUsuario
} from './auth-cliente'
import { obtenerSesion } from './sesion'

// aplicarMigraciones no puede ubicar packages/db/migrations por sí solo una
// vez empaquetado por electron-vite (import.meta.url apunta al bundle, no al
// código fuente). app.getAppPath() sí sobrevive al empaquetado.
// TODO: en un build empaquetado (electron-builder) esta ruta relativa al
// monorepo ya no existirá — hay que copiar migrations/ como recurso del
// instalador y leer desde process.resourcesPath en ese caso.
function obtenerCarpetaMigraciones(): string {
  return join(app.getAppPath(), '../../packages/db/migrations')
}

function obtenerIpLocal(): string | null {
  const interfaces = networkInterfaces()
  for (const nombre of Object.keys(interfaces)) {
    for (const iface of interfaces[nombre] ?? []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address
      }
    }
  }
  return null
}

export function registrarManejadoresIpc(): void {
  ipcMain.handle(CANALES_IPC.obtenerConfig, (): ConfigLocal | null => obtenerConfig())

  ipcMain.handle(CANALES_IPC.borrarConfig, (): void => borrarConfig())

  ipcMain.handle(CANALES_IPC.obtenerIpLocal, (): string | null => obtenerIpLocal())

  ipcMain.handle(
    CANALES_IPC.verificarServidor,
    (_evento, host: string, puerto: number): Promise<ResultadoConexion> =>
      probarConexionServidorRemoto(host, puerto)
  )

  ipcMain.handle(
    CANALES_IPC.configurarServidor,
    async (_evento, postgresUrl: string): Promise<ResultadoConexion> => {
      const prueba = await probarConexionPostgres(postgresUrl)
      if (!prueba.ok) return prueba

      const jwtSecret = randomBytes(32).toString('hex')

      try {
        await aplicarMigraciones(postgresUrl, obtenerCarpetaMigraciones())
        await arrancarServidorEmbebido(postgresUrl, jwtSecret, PUERTO_SERVIDOR_DEFECTO)
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) }
      }

      guardarConfig({
        modo: 'servidor',
        postgresUrl,
        jwtSecret,
        puerto: PUERTO_SERVIDOR_DEFECTO
      })
      return { ok: true }
    }
  )

  ipcMain.handle(
    CANALES_IPC.configurarTerminal,
    async (_evento, host: string, puerto: number): Promise<ResultadoConexion> => {
      const resultado = await probarConexionServidorRemoto(host, puerto)
      if (!resultado.ok) return resultado

      guardarConfig({ modo: 'terminal', serverHost: host, serverPort: puerto })
      return { ok: true }
    }
  )

  ipcMain.handle(
    CANALES_IPC.iniciarServidorDesdeConfig,
    async (): Promise<ResultadoConexion> => {
      const config = obtenerConfig()
      if (!config || config.modo !== 'servidor') {
        return { ok: false, error: 'No hay una configuración de servidor guardada' }
      }

      const prueba = await probarConexionPostgres(config.postgresUrl)
      if (!prueba.ok) return prueba

      try {
        await arrancarServidorEmbebido(config.postgresUrl, config.jwtSecret, config.puerto)
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) }
      }
      return { ok: true }
    }
  )

  ipcMain.handle(CANALES_IPC.authEstadoInicial, (): Promise<RespuestaEstadoAuth> => {
    const config = obtenerConfig()
    if (!config) return Promise.resolve({ hayUsuarios: false })
    return obtenerEstadoInicial(config)
  })

  ipcMain.handle(
    CANALES_IPC.authCrearPrimerUsuario,
    (_evento, datos: DatosNuevoUsuario): Promise<ResultadoAuth> => {
      const config = obtenerConfig()
      if (!config) return Promise.resolve({ ok: false, error: 'No hay configuración guardada' })
      return crearPrimerUsuario(config, datos)
    }
  )

  ipcMain.handle(
    CANALES_IPC.authLogin,
    (_evento, credenciales: CredencialesLogin): Promise<ResultadoAuth> => {
      const config = obtenerConfig()
      if (!config) return Promise.resolve({ ok: false, error: 'No hay configuración guardada' })
      return login(config, credenciales)
    }
  )

  ipcMain.handle(CANALES_IPC.authCerrarSesion, (): void => cerrarSesionRemota())

  ipcMain.handle(CANALES_IPC.authSesionActual, (): SesionUsuario | null => obtenerSesion())

  ipcMain.handle(
    CANALES_IPC.authReautenticar,
    (_evento, pin: string): Promise<ResultadoReautenticacion> => {
      const config = obtenerConfig()
      if (!config) return Promise.resolve({ ok: false, error: 'No hay configuración guardada' })
      return reautenticar(config, pin)
    }
  )

  ipcMain.handle(CANALES_IPC.authListarUsuarios, (): Promise<ResultadoListaUsuarios> => {
    const config = obtenerConfig()
    if (!config) return Promise.resolve({ ok: false, error: 'No hay configuración guardada' })
    return listarUsuarios(config)
  })

  ipcMain.handle(
    CANALES_IPC.authCrearUsuario,
    (_evento, datos: DatosCrearUsuario): Promise<ResultadoCrearUsuario> => {
      const config = obtenerConfig()
      if (!config) return Promise.resolve({ ok: false, error: 'No hay configuración guardada' })
      return crearUsuario(config, datos)
    }
  )
}
