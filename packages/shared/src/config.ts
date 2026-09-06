import { z } from 'zod'

export const PUERTO_SERVIDOR_DEFECTO = 3000

export const configServidorSchema = z.object({
  modo: z.literal('servidor'),
  postgresUrl: z.string().min(1),
  puerto: z.number().int().positive().default(PUERTO_SERVIDOR_DEFECTO)
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
