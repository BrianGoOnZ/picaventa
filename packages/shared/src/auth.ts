import { z } from 'zod'

export const MINUTOS_INACTIVIDAD_DEFECTO = 5
export const HORAS_EXPIRACION_JWT = 12

export const rolUsuarioValores = ['administrador', 'cajero'] as const
export type RolUsuario = (typeof rolUsuarioValores)[number]

// Permisos granulares que un administrador puede otorgar a un cajero al
// crear su usuario. Deliberadamente NO incluye nada relacionado con ver
// ganancias/márgenes/reportes financieros — eso queda excluido de este
// catálogo a propósito y siempre depende únicamente de rolUsuario ===
// 'administrador' (ver PantallaDashboardAdmin y PantallaReportes), nunca de
// un permiso otorgable.
export const PERMISOS_DISPONIBLES = [
  'cargarInventario',
  'crearProductos',
  'eliminarProductos',
  'crearCategorias',
  'eliminarCategorias',
  'crearClientes',
  'eliminarClientes'
] as const
export type Permiso = (typeof PERMISOS_DISPONIBLES)[number]

export const ETIQUETAS_PERMISOS: Record<Permiso, string> = {
  cargarInventario: 'Cargar inventario (entradas de mercancía)',
  crearProductos: 'Registrar productos nuevos',
  eliminarProductos: 'Eliminar productos',
  crearCategorias: 'Crear categorías',
  eliminarCategorias: 'Eliminar categorías',
  crearClientes: 'Registrar clientes',
  eliminarClientes: 'Eliminar clientes'
}

// Un administrador tiene implícitamente todos los permisos; un cajero solo
// los que se le hayan otorgado explícitamente al crear su usuario.
export function tienePermiso(
  sesion: { rolUsuario: RolUsuario; permisos?: Permiso[] } | null | undefined,
  permiso: Permiso
): boolean {
  if (!sesion) return false
  return sesion.rolUsuario === 'administrador' || (sesion.permisos ?? []).includes(permiso)
}

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

export const datosCrearUsuarioSchema = datosNuevoUsuarioSchema.extend({
  rol: z.enum(rolUsuarioValores),
  permisos: z.array(z.enum(PERMISOS_DISPONIBLES)).default([])
})

// Para cuando un administrador ajusta los permisos de un cajero ya
// existente (agregar o quitar), sin tocar el resto de sus datos.
export const datosActualizarPermisosSchema = z.object({
  permisos: z.array(z.enum(PERMISOS_DISPONIBLES))
})

export type CredencialesLogin = z.infer<typeof credencialesLoginSchema>
export type DatosNuevoUsuario = z.infer<typeof datosNuevoUsuarioSchema>
export type DatosReautenticacion = z.infer<typeof datosReautenticacionSchema>
export type DatosCrearUsuario = z.infer<typeof datosCrearUsuarioSchema>
export type DatosActualizarPermisos = z.infer<typeof datosActualizarPermisosSchema>

export interface RespuestaEstadoAuth {
  hayUsuarios: boolean
}

export interface SesionUsuario {
  idUsuario: number
  nombreUsuario: string
  rolUsuario: RolUsuario
  permisos: Permiso[]
}

export interface UsuarioResumen {
  idUsuario: number
  nombreUsuario: string
  correoUsuario: string
  rolUsuario: RolUsuario
  permisos: Permiso[]
}

export interface PayloadJwt {
  idUsuario: number
  nombreUsuario: string
  rolUsuario: RolUsuario
  permisos: Permiso[]
  // Agregado automáticamente por jsonwebtoken al firmar — usado como inicio
  // de turno para el corte de caja (RF-16): desde el login hasta "cerrar
  // turno", nunca lo asignamos nosotros mismos.
  iat?: number
}

export type ResultadoLogin =
  | { ok: true; sesion: SesionUsuario; token: string }
  | { ok: false; error: string }

export type ResultadoAuth = { ok: true; sesion: SesionUsuario } | { ok: false; error: string }

export type ResultadoReautenticacion = { ok: true } | { ok: false; error: string }

export type ResultadoListaUsuarios =
  | { ok: true; usuarios: UsuarioResumen[] }
  | { ok: false; error: string }

export type ResultadoCrearUsuario =
  | { ok: true; usuario: UsuarioResumen }
  | { ok: false; error: string }

export type ResultadoActualizarPermisos =
  | { ok: true; usuario: UsuarioResumen }
  | { ok: false; error: string }
