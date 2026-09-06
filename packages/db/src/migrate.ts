import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

export async function aplicarMigraciones(
  postgresUrl: string,
  // Ruta explícita opcional: cuando este módulo se empaqueta dentro de otro
  // proyecto (ej. apps/terminal vía electron-vite), import.meta.url apunta al
  // archivo del bundle, no a este archivo fuente, así que la ruta relativa
  // por defecto deja de ser válida. El llamador debe pasar una ruta absoluta
  // resuelta de forma que sobreviva al empaquetado (ej. app.getAppPath()).
  migrationsFolder: string = join(__dirname, '../migrations')
): Promise<void> {
  const client = postgres(postgresUrl, { max: 1 })
  try {
    const db = drizzle(client)
    await migrate(db, { migrationsFolder })
  } finally {
    await client.end()
  }
}
