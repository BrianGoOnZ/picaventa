import { Router, type Request } from 'express'
import { eq } from 'drizzle-orm'
import { configuracionNegocio, type crearConexion } from '@picaventa/db'
import { datosNegocioSchema, type DatosNegocio } from '@picaventa/shared'
import { verificarJwt, requiereAdministrador } from './auth.js'

type Db = ReturnType<typeof crearConexion>

function obtenerDb(req: Request): Db {
  return req.app.locals.db as Db
}

export function crearRutasNegocio(): Router {
  const router = Router()

  router.get('/', verificarJwt, async (req, res) => {
    const db = obtenerDb(req)
    const [fila] = await db.select().from(configuracionNegocio).limit(1)

    if (!fila) {
      res.json({ ok: true, negocio: null })
      return
    }

    const negocio: DatosNegocio = {
      nombreNegocio: fila.nombreNegocio,
      direccionNegocio: fila.direccionNegocio ?? undefined,
      telefonoNegocio: fila.telefonoNegocio ?? undefined,
      logoDatos: fila.logoDatos ?? undefined
    }
    res.json({ ok: true, negocio })
  })

  router.put('/', verificarJwt, requiereAdministrador, async (req, res) => {
    const datos = datosNegocioSchema.safeParse(req.body)
    if (!datos.success) {
      res.status(400).json({ ok: false, error: datos.error.issues[0]?.message ?? 'Datos inválidos' })
      return
    }

    const db = obtenerDb(req)
    const [existente] = await db
      .select({ id: configuracionNegocio.idConfiguracion })
      .from(configuracionNegocio)
      .limit(1)

    if (existente) {
      await db
        .update(configuracionNegocio)
        .set({ ...datos.data, fechaActualizacion: new Date() })
        .where(eq(configuracionNegocio.idConfiguracion, existente.id))
    } else {
      await db.insert(configuracionNegocio).values(datos.data)
    }

    res.json({ ok: true, negocio: datos.data })
  })

  return router
}
