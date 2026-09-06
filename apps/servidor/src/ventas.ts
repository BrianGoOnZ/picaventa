import { Router, type Request } from 'express'
import { eq, inArray } from 'drizzle-orm'
import { venta, contiene, producto, type crearConexion } from '@picaventa/db'
import { datosCrearVentaSchema, type EstadoVenta, type PayloadJwt } from '@picaventa/shared'
import { verificarJwt } from './auth.js'

type Db = ReturnType<typeof crearConexion>
type RequestAutenticado = Request & { usuarioToken?: PayloadJwt }

function obtenerDb(req: Request): Db {
  return req.app.locals.db as Db
}

function filaAVenta(fila: typeof venta.$inferSelect) {
  return {
    idVenta: fila.idVenta,
    folioVenta: fila.folioVenta,
    fechaVenta: fila.fechaVenta,
    total: Number(fila.total),
    metodoPago: fila.metodoPago,
    estadoVenta: fila.estadoVenta,
    idUsuario: fila.idUsuario
  }
}

export function crearRutasVentas(): Router {
  const router = Router()

  router.get('/', verificarJwt, async (req, res) => {
    const db = obtenerDb(req)
    const estado = req.query.estado

    const filas =
      typeof estado === 'string'
        ? await db.select().from(venta).where(eq(venta.estadoVenta, estado as EstadoVenta))
        : await db.select().from(venta)

    res.json({ ok: true, ventas: filas.map(filaAVenta) })
  })

  router.get('/:id', verificarJwt, async (req, res) => {
    const id = Number(req.params.id)
    const db = obtenerDb(req)

    const [cabecera] = await db.select().from(venta).where(eq(venta.idVenta, id))
    if (!cabecera) {
      res.status(404).json({ ok: false, error: 'Venta no encontrada' })
      return
    }

    const lineas = await db
      .select({
        idProducto: contiene.idProducto,
        cantidadVendida: contiene.cantidadVendida,
        precioUnitarioVenta: contiene.precioUnitarioVenta,
        descuentoAplicado: contiene.descuentoAplicado,
        nombreProducto: producto.nombreProducto,
        unidadMedida: producto.unidadMedida
      })
      .from(contiene)
      .innerJoin(producto, eq(contiene.idProducto, producto.idProducto))
      .where(eq(contiene.idVenta, id))

    res.json({
      ok: true,
      venta: filaAVenta(cabecera),
      lineas: lineas.map((l) => ({
        ...l,
        cantidadVendida: Number(l.cantidadVendida),
        precioUnitarioVenta: Number(l.precioUnitarioVenta),
        descuentoAplicado: Number(l.descuentoAplicado)
      }))
    })
  })

  router.post('/', verificarJwt, async (req, res) => {
    const datos = datosCrearVentaSchema.safeParse(req.body)
    if (!datos.success) {
      res.status(400).json({ ok: false, error: datos.error.issues[0]?.message ?? 'Datos inválidos' })
      return
    }

    const payload = (req as RequestAutenticado).usuarioToken
    if (!payload) {
      res.status(401).json({ ok: false, error: 'Sesión inválida' })
      return
    }

    const db = obtenerDb(req)

    try {
      const resultado = await db.transaction(async (tx) => {
        const ids = datos.data.lineas.map((l) => l.idProducto)
        const productos = await tx.select().from(producto).where(inArray(producto.idProducto, ids))
        const mapaProductos = new Map(productos.map((p) => [p.idProducto, p]))

        let total = 0
        for (const linea of datos.data.lineas) {
          const p = mapaProductos.get(linea.idProducto)
          if (!p) throw new Error(`Producto ${linea.idProducto} no encontrado`)
          if (datos.data.estado === 'activa' && Number(p.stockActual) < linea.cantidad) {
            throw new Error(`Stock insuficiente para "${p.nombreProducto}"`)
          }
          total += Number(p.precioVenta) * linea.cantidad - linea.descuento
        }

        const [nuevaVenta] = await tx
          .insert(venta)
          .values({
            folioVenta: `TEMP-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            total: total.toString(),
            metodoPago: datos.data.metodoPago,
            estadoVenta: datos.data.estado,
            idUsuario: payload.idUsuario
          })
          .returning()

        if (!nuevaVenta) throw new Error('No se pudo crear la venta')

        const folio = `V-${String(nuevaVenta.idVenta).padStart(6, '0')}`
        await tx
          .update(venta)
          .set({ folioVenta: folio })
          .where(eq(venta.idVenta, nuevaVenta.idVenta))

        for (const linea of datos.data.lineas) {
          const p = mapaProductos.get(linea.idProducto)
          if (!p) continue

          await tx.insert(contiene).values({
            idVenta: nuevaVenta.idVenta,
            idProducto: linea.idProducto,
            cantidadVendida: linea.cantidad.toString(),
            precioUnitarioVenta: p.precioVenta,
            descuentoAplicado: linea.descuento.toString()
          })

          if (datos.data.estado === 'activa') {
            await tx
              .update(producto)
              .set({ stockActual: (Number(p.stockActual) - linea.cantidad).toString() })
              .where(eq(producto.idProducto, linea.idProducto))
          }
        }

        return { idVenta: nuevaVenta.idVenta, folio, total }
      })

      res.status(201).json({ ok: true, ...resultado })
    } catch (err) {
      res.status(400).json({ ok: false, error: err instanceof Error ? err.message : String(err) })
    }
  })

  router.delete('/:id', verificarJwt, async (req, res) => {
    const id = Number(req.params.id)
    const db = obtenerDb(req)

    const [fila] = await db.select().from(venta).where(eq(venta.idVenta, id))
    if (!fila) {
      res.status(404).json({ ok: false, error: 'Venta no encontrada' })
      return
    }
    if (fila.estadoVenta !== 'pausada') {
      res.status(400).json({ ok: false, error: 'Solo se pueden cancelar ventas pausadas' })
      return
    }

    await db.delete(contiene).where(eq(contiene.idVenta, id))
    await db.delete(venta).where(eq(venta.idVenta, id))
    res.json({ ok: true })
  })

  return router
}
