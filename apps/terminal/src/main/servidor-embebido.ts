import { app } from 'electron'
import { join } from 'node:path'
import { iniciarServidor, type ServidorActivo } from '@picaventa/servidor'

let servidorActivo: ServidorActivo | null = null

export async function arrancarServidorEmbebido(
  postgresUrl: string,
  jwtSecret: string,
  puerto?: number
): Promise<ServidorActivo> {
  if (servidorActivo) return servidorActivo
  servidorActivo = await iniciarServidor({
    postgresUrl,
    jwtSecret,
    puerto,
    // RNF-06: solo la instancia que corre el servidor embebido tiene la
    // base de datos completa, así que solo aquí tiene sentido programar el
    // respaldo automático diario.
    carpetaRespaldos: join(app.getPath('userData'), 'respaldos')
  })
  return servidorActivo
}

export async function detenerServidorEmbebido(): Promise<void> {
  if (!servidorActivo) return
  await servidorActivo.cerrar()
  servidorActivo = null
}
