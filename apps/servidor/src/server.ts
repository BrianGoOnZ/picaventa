import express from 'express'
import { createServer } from 'node:http'
import { Server as ServidorSocket } from 'socket.io'
import { PUERTO_SERVIDOR_DEFECTO } from '@picaventa/shared'
import { crearConexion } from '@picaventa/db'

export interface OpcionesServidor {
  postgresUrl: string
  puerto?: number
}

export interface ServidorActivo {
  puerto: number
  cerrar: () => Promise<void>
}

export async function iniciarServidor(opciones: OpcionesServidor): Promise<ServidorActivo> {
  const puerto = opciones.puerto ?? PUERTO_SERVIDOR_DEFECTO
  const db = crearConexion(opciones.postgresUrl)

  const app = express()
  app.locals.db = db

  const httpServer = createServer(app)
  const io = new ServidorSocket(httpServer)

  app.get('/health', (_req, res) => {
    res.json({ ok: true })
  })

  await new Promise<void>((resolve) => httpServer.listen(puerto, resolve))

  return {
    puerto,
    cerrar: () =>
      new Promise<void>((resolve, reject) => {
        io.close()
        httpServer.close((err) => (err ? reject(err) : resolve()))
      })
  }
}
