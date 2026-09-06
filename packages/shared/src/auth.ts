import { z } from 'zod'

export const MINUTOS_INACTIVIDAD_DEFECTO = 5
export const HORAS_EXPIRACION_JWT = 12

export const rolUsuarioValores = ['administrador', 'cajero'] as const
export type RolUsuario = (typeof rolUsuarioValores)[number]

export const credencialesLoginSchema = z.object({
  correo: z.string().min(1),
  password: z.string().min(1)
})

export const datosNuevoUsuarioSchema = z.object({
  nombre: z.string().min(1),
  correo: z.string().email(),
  password: z.string().min(8),
  pin: z.string().regex(/^\d{4}$/, 'El PIN debe tener exactamente 4 dígitos')
})

export const datosReautenticacionSchema = z.object({
  pin: z.string().regex(/^\d{4}$/, 'El PIN debe tener exactamente 4 dígitos')
})

export type CredencialesLogin = z.infer<typeof credencialesLoginSchema>
export type DatosNuevoUsuario = z.infer<typeof datosNuevoUsuarioSchema>
export type DatosReautenticacion = z.infer<typeof datosReautenticacionSchema>

export interface RespuestaEstadoAuth {
  hayUsuarios: boolean
}

export interface SesionUsuario {
  idUsuario: number
  nombreUsuario: string
  rolUsuario: RolUsuario
}

export interface PayloadJwt {
  idUsuario: number
  nombreUsuario: string
  rolUsuario: RolUsuario
}

export type ResultadoLogin =
  | { ok: true; sesion: SesionUsuario; token: string }
  | { ok: false; error: string }

export type ResultadoAuth = { ok: true; sesion: SesionUsuario } | { ok: false; error: string }

export type ResultadoReautenticacion = { ok: true } | { ok: false; error: string }
