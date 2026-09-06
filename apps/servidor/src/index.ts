import 'dotenv/config'
import { iniciarServidor } from './server.js'

const postgresUrl = process.env.DATABASE_URL
if (!postgresUrl) {
  throw new Error('Falta la variable de entorno DATABASE_URL')
}

const jwtSecret = process.env.JWT_SECRET
if (!jwtSecret) {
  throw new Error('Falta la variable de entorno JWT_SECRET')
}

const puerto = process.env.PORT ? Number(process.env.PORT) : undefined

iniciarServidor({ postgresUrl, jwtSecret, puerto }).then((servidor) => {
  console.log(`[picaventa] servidor escuchando en el puerto ${servidor.puerto}`)
})
