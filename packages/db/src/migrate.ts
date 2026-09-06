import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

export async function aplicarMigraciones(postgresUrl: string): Promise<void> {
  const client = postgres(postgresUrl, { max: 1 })
  try {
    const db = drizzle(client)
    await migrate(db, { migrationsFolder: join(__dirname, '../migrations') })
  } finally {
    await client.end()
  }
}
