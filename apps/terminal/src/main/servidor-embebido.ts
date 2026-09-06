import { iniciarServidor, type ServidorActivo } from '@picaventa/servidor'

let servidorActivo: ServidorActivo | null = null

export async function arrancarServidorEmbebido(
  postgresUrl: string,
  jwtSecret: string,
  puerto?: number
): Promise<ServidorActivo> {
  if (servidorActivo) return servidorActivo
  servidorActivo = await iniciarServidor({ postgresUrl, jwtSecret, puerto })
  return servidorActivo
}

export async function detenerServidorEmbebido(): Promise<void> {
  if (!servidorActivo) return
  await servidorActivo.cerrar()
  servidorActivo = null
}
