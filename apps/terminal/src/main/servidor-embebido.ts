import { app } from 'electron'
import { join } from 'node:path'
import { iniciarServidor, type ServidorActivo } from '@picaventa/servidor'

let servidorActivo: ServidorActivo | null = null

export function obtenerCarpetaRespaldosDefecto(): string {
  return join(app.getPath('userData'), 'respaldos')
}

export async function arrancarServidorEmbebido(
  postgresUrl: string,
  jwtSecret: string,
  puerto?: number,
  carpetaRespaldos?: string
): Promise<ServidorActivo> {
  if (servidorActivo) return servidorActivo
  servidorActivo = await iniciarServidor({
    postgresUrl,
    jwtSecret,
    puerto,
    // RNF-06: solo la instancia que corre el servidor embebido tiene la
    // base de datos completa, así que solo aquí tiene sentido programar el
    // respaldo automático diario. Si el administrador eligió una carpeta
    // propia (Ajustes del negocio), se usa esa; si no, la de siempre.
    carpetaRespaldos: carpetaRespaldos ?? obtenerCarpetaRespaldosDefecto()
  })
  return servidorActivo
}

// Aplica de inmediato un cambio de carpeta de respaldos sin reiniciar la app
// (ver src/main/ipc.ts, respaldosElegirCarpeta/respaldosRestablecerCarpeta) —
// no-op si el servidor embebido no está corriendo en este momento.
export function actualizarCarpetaRespaldosEmbebido(carpeta: string): void {
  servidorActivo?.actualizarCarpetaRespaldos(carpeta)
}

export async function detenerServidorEmbebido(): Promise<void> {
  if (!servidorActivo) return
  await servidorActivo.cerrar()
  servidorActivo = null
}
