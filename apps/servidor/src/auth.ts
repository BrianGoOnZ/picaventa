import { Router, type Request, type RequestHandler } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { eq, count } from 'drizzle-orm'
import { usuarios, type crearConexion } from '@picaventa/db'
import {
  credencialesLoginSchema,
  datosActualizarPermisosSchema,
  datosCrearUsuarioSchema,
  datosNuevoUsuarioSchema,
  datosReautenticacionSchema,
  HORAS_EXPIRACION_JWT,
  type PayloadJwt,
  type Permiso,
  type SesionUsuario
} from '@picaventa/shared'

type Db = ReturnType<typeof crearConexion>
// Evita una augmentación global de Express.Request: al empaquetarse este
// módulo dentro de apps/terminal (el proceso main lo importa vía
// @picaventa/servidor), un .d.ts ambiental de este paquete no es visible
// para el typecheck de ese otro proyecto. Un tipo local + cast es suficiente.
type RequestAutenticado = Request & { usuarioToken?: PayloadJwt }

const RONDAS_SAL = 10

function obtenerDb(req: Request): Db {
  return req.app.locals.db as Db
}

function obtenerJwtSecret(req: Request): string {
  return req.app.locals.jwtSecret as string
}

function firmarToken(sesion: SesionUsuario, jwtSecret: string): string {
  return jwt.sign(sesion, jwtSecret, { expiresIn: `${HORAS_EXPIRACION_JWT}h` })
}

export const verificarJwt: RequestHandler = (req, res, next) => {
  const encabezado = req.headers.authorization
  const token = encabezado?.startsWith('Bearer ') ? encabezado.slice('Bearer '.length) : null

  if (!token) {
    res.status(401).json({ ok: false, error: 'Falta autenticación' })
    return
  }

  try {
    ;(req as RequestAutenticado).usuarioToken = jwt.verify(token, obtenerJwtSecret(req)) as PayloadJwt
    next()
  } catch {
    res.status(401).json({ ok: false, error: 'Sesión inválida o expirada' })
  }
}

export const requiereAdministrador: RequestHandler = (req, res, next) => {
  const payload = (req as RequestAutenticado).usuarioToken
  if (payload?.rolUsuario !== 'administrador') {
    res.status(403).json({ ok: false, error: 'Se requiere rol de administrador' })
    return
  }
  next()
}

// Un administrador siempre pasa (tiene todos los permisos implícitamente);
// un cajero solo si el permiso puntual le fue otorgado al crear su usuario.
// Nunca se usa para nada relacionado con ganancias/márgenes/reportes
// financieros — eso siempre se protege con requiereAdministrador.
export function requierePermiso(permiso: Permiso): RequestHandler {
  return (req, res, next) => {
    const payload = (req as RequestAutenticado).usuarioToken
    if (payload?.rolUsuario === 'administrador' || payload?.permisos?.includes(permiso)) {
      next()
      return
    }
    res.status(403).json({ ok: false, error: 'No tienes permiso para realizar esta acción' })
  }
}

export function crearRutasAuth(): Router {
  const router = Router()

  router.get('/estado', async (req, res) => {
    const db = obtenerDb(req)
    const [fila] = await db.select({ total: count() }).from(usuarios)
    res.json({ hayUsuarios: (fila?.total ?? 0) > 0 })
  })

  router.post('/primer-usuario', async (req, res) => {
    const db = obtenerDb(req)
    const [fila] = await db.select({ total: count() }).from(usuarios)
    if ((fila?.total ?? 0) > 0) {
      res.status(409).json({ ok: false, error: 'Ya existe al menos un usuario' })
      return
    }

    const datos = datosNuevoUsuarioSchema.safeParse(req.body)
    if (!datos.success) {
      res.status(400).json({ ok: false, error: datos.error.issues[0]?.message ?? 'Datos inválidos' })
      return
    }

    const passwordHash = await bcrypt.hash(datos.data.password, RONDAS_SAL)
    const pinHash = await bcrypt.hash(datos.data.pin, RONDAS_SAL)

    const [usuario] = await db
      .insert(usuarios)
      .values({
        nombreUsuario: datos.data.nombre,
        correoUsuario: datos.data.correo,
        passwordHash,
        pinHash,
        rolUsuario: 'administrador'
      })
      .returning()

    if (!usuario) {
      res.status(500).json({ ok: false, error: 'No se pudo crear el usuario' })
      return
    }

    const sesion: SesionUsuario = {
      idUsuario: usuario.idUsuario,
      nombreUsuario: usuario.nombreUsuario,
      rolUsuario: usuario.rolUsuario,
      permisos: (usuario.permisos ?? []) as Permiso[]
    }
    res.status(201).json({ ok: true, sesion, token: firmarToken(sesion, obtenerJwtSecret(req)) })
  })

  router.post('/login', async (req, res) => {
    const datos = credencialesLoginSchema.safeParse(req.body)
    if (!datos.success) {
      res.status(400).json({ ok: false, error: 'Datos inválidos' })
      return
    }

    const db = obtenerDb(req)
    const [usuario] = await db
      .select()
      .from(usuarios)
      .where(eq(usuarios.correoUsuario, datos.data.correo))

    if (!usuario || !(await bcrypt.compare(datos.data.password, usuario.passwordHash))) {
      res.status(401).json({ ok: false, error: 'Correo o contraseña incorrectos' })
      return
    }

    const sesion: SesionUsuario = {
      idUsuario: usuario.idUsuario,
      nombreUsuario: usuario.nombreUsuario,
      rolUsuario: usuario.rolUsuario,
      permisos: (usuario.permisos ?? []) as Permiso[]
    }
    res.json({ ok: true, sesion, token: firmarToken(sesion, obtenerJwtSecret(req)) })
  })

  router.post('/reautenticar', verificarJwt, async (req, res) => {
    const datos = datosReautenticacionSchema.safeParse(req.body)
    if (!datos.success) {
      res.status(400).json({ ok: false, error: 'PIN inválido' })
      return
    }

    const payload = (req as RequestAutenticado).usuarioToken as PayloadJwt
    const db = obtenerDb(req)
    const [usuario] = await db
      .select()
      .from(usuarios)
      .where(eq(usuarios.idUsuario, payload.idUsuario))

    if (!usuario || !(await bcrypt.compare(datos.data.pin, usuario.pinHash))) {
      res.status(401).json({ ok: false, error: 'PIN incorrecto' })
      return
    }

    res.json({ ok: true })
  })

  router.get('/usuarios', verificarJwt, requiereAdministrador, async (req, res) => {
    const db = obtenerDb(req)
    const filas = await db
      .select({
        idUsuario: usuarios.idUsuario,
        nombreUsuario: usuarios.nombreUsuario,
        correoUsuario: usuarios.correoUsuario,
        rolUsuario: usuarios.rolUsuario,
        permisos: usuarios.permisos
      })
      .from(usuarios)
    res.json({ ok: true, usuarios: filas })
  })

  router.post('/usuarios', verificarJwt, requiereAdministrador, async (req, res) => {
    const datos = datosCrearUsuarioSchema.safeParse(req.body)
    if (!datos.success) {
      res.status(400).json({ ok: false, error: datos.error.issues[0]?.message ?? 'Datos inválidos' })
      return
    }

    const db = obtenerDb(req)
    const passwordHash = await bcrypt.hash(datos.data.password, RONDAS_SAL)
    const pinHash = await bcrypt.hash(datos.data.pin, RONDAS_SAL)

    let usuario
    try {
      ;[usuario] = await db
        .insert(usuarios)
        .values({
          nombreUsuario: datos.data.nombre,
          correoUsuario: datos.data.correo,
          passwordHash,
          pinHash,
          rolUsuario: datos.data.rol,
          // Los permisos solo tienen efecto para un cajero (un administrador
          // ya tiene todo implícitamente vía tienePermiso()), pero se
          // guardan igual si vinieran marcados por error en el formulario.
          permisos: datos.data.rol === 'cajero' ? datos.data.permisos : []
        })
        .returning()
    } catch (err) {
      // drizzle-orm envuelve el error real del driver en DrizzleQueryError,
      // dejando el código SQLSTATE original (ej. 23505 = unique_violation)
      // en .cause, no en el objeto de nivel superior.
      const errorTipado = err as { code?: string; cause?: { code?: string } }
      const codigo = errorTipado.cause?.code ?? errorTipado.code
      if (codigo === '23505') {
        res.status(409).json({ ok: false, error: 'Ya existe un usuario con ese correo' })
      } else {
        res.status(500).json({ ok: false, error: err instanceof Error ? err.message : String(err) })
      }
      return
    }

    if (!usuario) {
      res.status(500).json({ ok: false, error: 'No se pudo crear el usuario' })
      return
    }

    res.status(201).json({
      ok: true,
      usuario: {
        idUsuario: usuario.idUsuario,
        nombreUsuario: usuario.nombreUsuario,
        correoUsuario: usuario.correoUsuario,
        rolUsuario: usuario.rolUsuario,
        permisos: (usuario.permisos ?? []) as Permiso[]
      }
    })
  })

  // Un administrador puede agregar o quitar permisos de un cajero ya
  // existente en cualquier momento (no solo al crearlo). No aplica a un
  // administrador: ya tiene todo implícitamente vía tienePermiso().
  router.put(
    '/usuarios/:id/permisos',
    verificarJwt,
    requiereAdministrador,
    async (req, res) => {
      const datos = datosActualizarPermisosSchema.safeParse(req.body)
      if (!datos.success) {
        res.status(400).json({ ok: false, error: datos.error.issues[0]?.message ?? 'Datos inválidos' })
        return
      }

      const id = Number(req.params.id)
      const db = obtenerDb(req)
      const [existente] = await db.select().from(usuarios).where(eq(usuarios.idUsuario, id))

      if (!existente) {
        res.status(404).json({ ok: false, error: 'Usuario no encontrado' })
        return
      }
      if (existente.rolUsuario !== 'cajero') {
        res.status(400).json({ ok: false, error: 'Los permisos solo aplican a usuarios con rol de cajero' })
        return
      }

      const [usuario] = await db
        .update(usuarios)
        .set({ permisos: datos.data.permisos })
        .where(eq(usuarios.idUsuario, id))
        .returning()

      if (!usuario) {
        res.status(500).json({ ok: false, error: 'No se pudieron actualizar los permisos' })
        return
      }

      res.json({
        ok: true,
        usuario: {
          idUsuario: usuario.idUsuario,
          nombreUsuario: usuario.nombreUsuario,
          correoUsuario: usuario.correoUsuario,
          rolUsuario: usuario.rolUsuario,
          permisos: (usuario.permisos ?? []) as Permiso[]
        }
      })
    }
  )

  return router
}
