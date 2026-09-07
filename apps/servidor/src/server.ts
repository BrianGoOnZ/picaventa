import express from 'express'
import { createServer } from 'node:http'
import { Server as ServidorSocket } from 'socket.io'
import { PUERTO_SERVIDOR_DEFECTO } from '@picaventa/shared'
import { crearConexion } from '@picaventa/db'
import { crearRutasAuth } from './auth.js'
import { crearRutasNegocio } from './negocio.js'
import { crearRutasCatalogo } from './catalogo.js'
import { crearRutasVentas } from './ventas.js'
import { crearRutasClientes } from './clientes.js'

export interface OpcionesServidor {
  postgresUrl: string
  jwtSecret: string
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
  app.locals.jwtSecret = opciones.jwtSecret
  // limit por encima del default (100kb): el logo del negocio viaja como
  // base64 embebido en el body JSON
  app.use(express.json({ limit: '2mb' }))

  const httpServer = createServer(app)
  const io = new ServidorSocket(httpServer)

  app.get('/health', (_req, res) => {
    res.json({ ok: true })
  })

  app.use('/auth', crearRutasAuth())
  app.use('/negocio', crearRutasNegocio())
  app.use(crearRutasCatalogo())
  app.use('/ventas', crearRutasVentas())
  app.use('/clientes', crearRutasClientes())

  await new Promise<void>((resolve) => httpServer.listen(puerto, resolve))

  return {
    puerto,
    cerrar: async () => {
      io.close()
      await new Promise<void>((resolve, reject) => {
        httpServer.close((err) => (err ? reject(err) : resolve()))
      })
      await db.$client.end()
    }
  }
}
