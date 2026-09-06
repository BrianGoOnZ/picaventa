import { ipcMain } from 'electron'
import { networkInterfaces } from 'node:os'
import {
  CANALES_IPC,
  PUERTO_SERVIDOR_DEFECTO,
  probarConexionServidorRemoto,
  type ConfigLocal,
  type ResultadoConexion
} from '@picaventa/shared'
import { probarConexionPostgres, aplicarMigraciones } from '@picaventa/db'
import { obtenerConfig, guardarConfig, borrarConfig } from './config-store'
import { arrancarServidorEmbebido } from './servidor-embebido'

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

      try {
        await aplicarMigraciones(postgresUrl)
        await arrancarServidorEmbebido(postgresUrl, PUERTO_SERVIDOR_DEFECTO)
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) }
      }

      guardarConfig({ modo: 'servidor', postgresUrl, puerto: PUERTO_SERVIDOR_DEFECTO })
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
        await arrancarServidorEmbebido(config.postgresUrl, config.puerto)
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) }
      }
      return { ok: true }
    }
  )
}
