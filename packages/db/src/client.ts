import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import type { ResultadoConexion } from '@picaventa/shared'
import * as schema from './schema.js'

export function crearConexion(postgresUrl: string) {
  const client = postgres(postgresUrl)
  return drizzle(client, { schema })
}

export async function probarConexionPostgres(postgresUrl: string): Promise<ResultadoConexion> {
  const client = postgres(postgresUrl, { connect_timeout: 5, max: 1 })
  try {
    await client`select 1`
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  } finally {
    await client.end({ timeout: 1 })
  }
}
