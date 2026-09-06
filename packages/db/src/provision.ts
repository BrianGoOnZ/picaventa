import postgres from 'postgres'

/**
 * Crea (o reutiliza) el rol y la base de datos dedicados de la app,
 * conectándose una sola vez como superusuario. El admin nunca necesita saber
 * ni volver a escribir la contraseña generada para el rol `picaventa` — se
 * genera aquí y el llamador la guarda en la config local.
 *
 * Idempotente: si el rol ya existe, solo actualiza su contraseña (para que
 * el llamador siempre sepa la contraseña vigente); si la base de datos ya
 * existe, no la toca (nunca se borran datos reales).
 */
export async function aprovisionarBaseDatos(
  urlSuperusuario: string,
  passwordRol: string
): Promise<void> {
  const sql = postgres(urlSuperusuario, { max: 1, connect_timeout: 10 })

  try {
    const [rolExistente] = await sql`SELECT 1 FROM pg_roles WHERE rolname = 'picaventa'`

    if (rolExistente) {
      await sql.unsafe(`ALTER ROLE picaventa WITH PASSWORD '${passwordRol}'`)
    } else {
      await sql.unsafe(
        `CREATE ROLE picaventa WITH LOGIN PASSWORD '${passwordRol}' CREATEDB`
      )
    }

    const [dbExistente] = await sql`SELECT 1 FROM pg_database WHERE datname = 'picaventa'`
    if (!dbExistente) {
      await sql.unsafe('CREATE DATABASE picaventa OWNER picaventa')
    }
  } finally {
    await sql.end()
  }
}
