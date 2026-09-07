import { Router, type Request } from 'express'
import { eq, and, lte, gte, inArray } from 'drizzle-orm'
import { promocion, productoPromocion, type crearConexion } from '@picaventa/db'
import { datosPromocionSchema, tipoDescuentoValores, type TipoDescuentoPromocion } from '@picaventa/shared'
import { verificarJwt, requiereAdministrador } from './auth.js'

type Db = ReturnType<typeof crearConexion>

function obtenerDb(req: Request): Db {
  return req.app.locals.db as Db
}

function esTipoDescuentoValido(valor: string): valor is TipoDescuentoPromocion {
  return (tipoDescuentoValores as readonly string[]).includes(valor)
}

async function idsProductosDePromocion(db: Db, idPromocion: number): Promise<number[]> {
  const filas = await db
    .select({ idProducto: productoPromocion.idProducto })
    .from(productoPromocion)
    .where(eq(productoPromocion.idPromocion, idPromocion))
  return filas.map((f) => f.idProducto)
}

function filaAPromocion(fila: typeof promocion.$inferSelect, idsProductos: number[]) {
  const tipoPromocion = esTipoDescuentoValido(fila.tipoPromocion) ? fila.tipoPromocion : 'porcentaje'
  return {
    idPromocion: fila.idPromocion,
    nombrePromocion: fila.nombrePromocion,
    tipoPromocion,
    valorDescuento: fila.valorDescuento != null ? Number(fila.valorDescuento) : undefined,
    activa: fila.activa,
    descripcionPromocion: fila.descripcionPromocion ?? undefined,
    fechaInicioPromocion: fila.fechaInicioPromocion,
    fechaFinPromocion: fila.fechaFinPromocion,
    idCategoria: fila.idCategoria ?? undefined,
    idsProductos
  }
}

export function crearRutasPromociones(): Router {
  const router = Router()

  router.get('/', verificarJwt, requiereAdministrador, async (req, res) => {
    const db = obtenerDb(req)
    const filas = await db.select().from(promocion)
    const promociones = await Promise.all(
      filas.map(async (fila) => filaAPromocion(fila, await idsProductosDePromocion(db, fila.idPromocion)))
    )
    res.json({ ok: true, promociones })
  })

  // Sin requiereAdministrador: el punto de venta la necesita para todo
  // cajero, y no expone nada sensible (son promociones ya públicas de cara
  // al cliente, no información de ganancias/márgenes).
  router.get('/activas', verificarJwt, async (req, res) => {
    const db = obtenerDb(req)
    const hoy = new Date().toISOString().slice(0, 10)

    const filas = await db
      .select()
      .from(promocion)
      .where(
        and(eq(promocion.activa, true), lte(promocion.fechaInicioPromocion, hoy), gte(promocion.fechaFinPromocion, hoy))
      )

    if (filas.length === 0) {
      res.json({ ok: true, promociones: [] })
      return
    }

    const relaciones = await db
      .select()
      .from(productoPromocion)
      .where(
        inArray(
          productoPromocion.idPromocion,
          filas.map((f) => f.idPromocion)
        )
      )
    const idsPorPromocion = new Map<number, number[]>()
    for (const rel of relaciones) {
      const actual = idsPorPromocion.get(rel.idPromocion) ?? []
      actual.push(rel.idProducto)
      idsPorPromocion.set(rel.idPromocion, actual)
    }

    res.json({
      ok: true,
      promociones: filas.map((fila) => filaAPromocion(fila, idsPorPromocion.get(fila.idPromocion) ?? []))
    })
  })

  router.post('/', verificarJwt, requiereAdministrador, async (req, res) => {
    const datos = datosPromocionSchema.safeParse(req.body)
    if (!datos.success) {
      res.status(400).json({ ok: false, error: datos.error.issues[0]?.message ?? 'Datos inválidos' })
      return
    }

    const db = obtenerDb(req)
    const idPromocion = await db.transaction(async (tx) => {
      const [fila] = await tx
        .insert(promocion)
        .values({
          nombrePromocion: datos.data.nombrePromocion,
          tipoPromocion: datos.data.tipoPromocion,
          valorDescuento: datos.data.valorDescuento?.toString(),
          descripcionPromocion: datos.data.descripcionPromocion,
          fechaInicioPromocion: datos.data.fechaInicioPromocion,
          fechaFinPromocion: datos.data.fechaFinPromocion,
          idCategoria: datos.data.idCategoria,
          activa: datos.data.activa
        })
        .returning()
      if (!fila) throw new Error('No se pudo crear la promoción')

      for (const idProducto of datos.data.idsProductos) {
        await tx.insert(productoPromocion).values({ idPromocion: fila.idPromocion, idProducto })
      }
      return fila.idPromocion
    })

    const [filaFinal] = await db.select().from(promocion).where(eq(promocion.idPromocion, idPromocion))
    res
      .status(201)
      .json({ ok: true, promocion: filaAPromocion(filaFinal!, datos.data.idsProductos) })
  })

  router.put('/:id', verificarJwt, requiereAdministrador, async (req, res) => {
    const datos = datosPromocionSchema.safeParse(req.body)
    if (!datos.success) {
      res.status(400).json({ ok: false, error: datos.error.issues[0]?.message ?? 'Datos inválidos' })
      return
    }

    const id = Number(req.params.id)
    const db = obtenerDb(req)

    try {
      await db.transaction(async (tx) => {
        const [fila] = await tx
          .update(promocion)
          .set({
            nombrePromocion: datos.data.nombrePromocion,
            tipoPromocion: datos.data.tipoPromocion,
            valorDescuento: datos.data.valorDescuento?.toString(),
            descripcionPromocion: datos.data.descripcionPromocion,
            fechaInicioPromocion: datos.data.fechaInicioPromocion,
            fechaFinPromocion: datos.data.fechaFinPromocion,
            idCategoria: datos.data.idCategoria,
            activa: datos.data.activa
          })
          .where(eq(promocion.idPromocion, id))
          .returning()
        if (!fila) throw new Error('Promoción no encontrada')

        await tx.delete(productoPromocion).where(eq(productoPromocion.idPromocion, id))
        for (const idProducto of datos.data.idsProductos) {
          await tx.insert(productoPromocion).values({ idPromocion: id, idProducto })
        }
      })

      const [filaFinal] = await db.select().from(promocion).where(eq(promocion.idPromocion, id))
      res.json({ ok: true, promocion: filaAPromocion(filaFinal!, datos.data.idsProductos) })
    } catch (err) {
      res.status(404).json({ ok: false, error: err instanceof Error ? err.message : String(err) })
    }
  })

  router.delete('/:id', verificarJwt, requiereAdministrador, async (req, res) => {
    const id = Number(req.params.id)
    const db = obtenerDb(req)
    await db.delete(productoPromocion).where(eq(productoPromocion.idPromocion, id))
    await db.delete(promocion).where(eq(promocion.idPromocion, id))
    res.json({ ok: true })
  })

  return router
}
