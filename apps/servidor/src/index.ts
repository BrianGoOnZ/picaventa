import 'dotenv/config'
import { iniciarServidor } from './server.js'

const postgresUrl = process.env.DATABASE_URL
if (!postgresUrl) {
  throw new Error('Falta la variable de entorno DATABASE_URL')
}

const puerto = process.env.PORT ? Number(process.env.PORT) : undefined

iniciarServidor({ postgresUrl, puerto }).then((servidor) => {
  console.log(`[picaventa] servidor escuchando en el puerto ${servidor.puerto}`)
})
