import 'dotenv/config'
import express from 'express'
import { createServer } from 'node:http'
import { Server } from 'socket.io'

const app = express()
const httpServer = createServer(app)
new Server(httpServer)

app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

const port = process.env.PORT ? Number(process.env.PORT) : 3000

httpServer.listen(port, () => {
  console.log(`[picaventa] servidor escuchando en el puerto ${port}`)
})
