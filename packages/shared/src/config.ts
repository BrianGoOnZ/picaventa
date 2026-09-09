import { z } from 'zod'

export const PUERTO_SERVIDOR_DEFECTO = 3000

export const configServidorSchema = z.object({
  modo: z.literal('servidor'),
  postgresUrl: z.string().min(1),
  puerto: z.number().int().positive().default(PUERTO_SERVIDOR_DEFECTO),
  // Generado una sola vez al configurar el servidor; firma los JWT de sesión.
  jwtSecret: z.string().min(1),
  // Si no se define, se usa join(app.getPath('userData'), 'respaldos') — ver
  // servidor-embebido.ts. Elegir aquí una carpeta sincronizada por OneDrive o
  // Google Drive respalda también a la nube sin que la app sepa nada de eso:
  // para la app sigue siendo solo una carpeta local.
  carpetaRespaldos: z.string().optional()
})

export const configTerminalSchema = z.object({
  modo: z.literal('terminal'),
  serverHost: z.string().min(1),
  serverPort: z.number().int().positive()
})

export const configLocalSchema = z.discriminatedUnion('modo', [
  configServidorSchema,
  configTerminalSchema
])

export type ConfigServidor = z.infer<typeof configServidorSchema>
export type ConfigTerminal = z.infer<typeof configTerminalSchema>
export type ConfigLocal = z.infer<typeof configLocalSchema>

export interface RespuestaHealth {
  ok: true
}

export type ResultadoConexion = { ok: true } | { ok: false; error: string }

// carpeta === null cuando el administrador cierra el diálogo sin elegir nada
// (no es un error, simplemente no cambió su decisión).
export type ResultadoElegirCarpetaRespaldos =
  | { ok: true; carpeta: string | null }
  | { ok: false; error: string }

// El admin solo escribe la contraseña del superusuario 'postgres' (la que ya
// conoce de instalar Postgres) — la app genera y guarda su propia contraseña
// dedicada para el rol 'picaventa', vía aprovisionarBaseDatos().
export interface DatosConfigurarServidor {
  host: string
  puerto: number
  passwordSuperusuario: string
}
