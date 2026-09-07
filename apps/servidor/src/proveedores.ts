import { Router, type Request } from 'express'
import { eq, desc, inArray, sql } from 'drizzle-orm'
import {
  proveedor,
  compra,
  detalleCompra,
  producto,
  usuarios,
  type crearConexion
} from '@picaventa/db'
import { datosProveedorSchema, datosCompraSchema, type PayloadJwt } from '@picaventa/shared'
import { verificarJwt, requiereAdministrador } from './auth.js'

type Db = ReturnType<typeof crearConexion>
type RequestAutenticado = Request & { usuarioToken?: PayloadJwt }

function obtenerDb(req: Request): Db {
  return req.app.locals.db as Db
}

function codigoError(err: unknown): string | undefined {
  const errorTipado = err as { code?: string; cause?: { code?: string } }
  return errorTipado.cause?.code ?? errorTipado.code
}

function filaAProveedor(fila: typeof proveedor.$inferSelect) {
  return {
    idProveedor: fila.idProveedor,
    nombreProveedor: fila.nombreProveedor,
    nombreEmpresa: fila.nombreEmpresa ?? undefined,
    telefonoProveedor: fila.telefonoProveedor ?? undefined,
    correoProveedor: fila.correoProveedor ?? undefined
  }
}

export function crearRutasProveedores(): Router {
  const router = Router()

  // --- Proveedores (RF-14) ---

  router.get('/proveedores', verificarJwt, requiereAdministrador, async (req, res) => {
    const db = obtenerDb(req)
    const filas = await db.select().from(proveedor)
    res.json({ ok: true, proveedores: filas.map(filaAProveedor) })
  })

  router.post('/proveedores', verificarJwt, requiereAdministrador, async (req, res) => {
    const datos = datosProveedorSchema.safeParse(req.body)
    if (!datos.success) {
      res.status(400).json({ ok: false, error: datos.error.issues[0]?.message ?? 'Datos inválidos' })
      return
    }
    const db = obtenerDb(req)
    const [fila] = await db.insert(proveedor).values(datos.data).returning()
    if (!fila) {
      res.status(500).json({ ok: false, error: 'No se pudo crear el proveedor' })
      return
    }
    res.status(201).json({ ok: true, proveedor: filaAProveedor(fila) })
  })

  router.put('/proveedores/:id', verificarJwt, requiereAdministrador, async (req, res) => {
    const datos = datosProveedorSchema.safeParse(req.body)
    if (!datos.success) {
      res.status(400).json({ ok: false, error: datos.error.issues[0]?.message ?? 'Datos inválidos' })
      return
    }
    const id = Number(req.params.id)
    const db = obtenerDb(req)
    const [fila] = await db
      .update(proveedor)
      .set(datos.data)
      .where(eq(proveedor.idProveedor, id))
      .returning()
    if (!fila) {
      res.status(404).json({ ok: false, error: 'Proveedor no encontrado' })
      return
    }
    res.json({ ok: true, proveedor: filaAProveedor(fila) })
  })

  router.delete('/proveedores/:id', verificarJwt, requiereAdministrador, async (req, res) => {
    const id = Number(req.params.id)
    const db = obtenerDb(req)
    try {
      await db.delete(proveedor).where(eq(proveedor.idProveedor, id))
      res.json({ ok: true })
    } catch (err) {
      if (codigoError(err) === '23503') {
        res
          .status(409)
          .json({ ok: false, error: 'No se puede eliminar: el proveedor tiene compras registradas' })
        return
      }
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : String(err) })
    }
  })

  // --- Compras (RF-18) ---

  router.post('/compras', verificarJwt, requiereAdministrador, async (req, res) => {
    const datos = datosCompraSchema.safeParse(req.body)
    if (!datos.success) {
      res.status(400).json({ ok: false, error: datos.error.issues[0]?.message ?? 'Datos inválidos' })
      return
    }

    const payload = (req as RequestAutenticado).usuarioToken as PayloadJwt
    const db = obtenerDb(req)

    try {
      const idCompra = await db.transaction(async (tx) => {
        const [nuevaCompra] = await tx
          .insert(compra)
          .values({ idProveedor: datos.data.idProveedor, idUsuario: payload.idUsuario })
          .returning()
        if (!nuevaCompra) throw new Error('No se pudo registrar la compra')

        for (const linea of datos.data.lineas) {
          await tx.insert(detalleCompra).values({
            idCompra: nuevaCompra.idCompra,
            idProducto: linea.idProducto,
            cantidadComprada: linea.cantidad.toString(),
            costoUnitario: linea.costoUnitario.toString()
          })

          if (datos.data.actualizarPrecioCompra) {
            await tx
              .update(producto)
              .set({
                stockActual: sqlStockMasCantidad(linea.cantidad),
                precioCompra: linea.costoUnitario.toString()
              })
              .where(eq(producto.idProducto, linea.idProducto))
          } else {
            await tx
              .update(producto)
              .set({ stockActual: sqlStockMasCantidad(linea.cantidad) })
              .where(eq(producto.idProducto, linea.idProducto))
          }
        }

        return nuevaCompra.idCompra
      })

      res.status(201).json({ ok: true, idCompra })
    } catch (err) {
      res.status(400).json({ ok: false, error: err instanceof Error ? err.message : String(err) })
    }
  })

  router.get('/compras', verificarJwt, requiereAdministrador, async (req, res) => {
    const db = obtenerDb(req)

    const filas = await db
      .select({
        idCompra: compra.idCompra,
        fechaCompra: compra.fechaCompra,
        idProveedor: compra.idProveedor,
        nombreProveedor: proveedor.nombreProveedor,
        idUsuario: compra.idUsuario,
        nombreUsuario: usuarios.nombreUsuario
      })
      .from(compra)
      .innerJoin(proveedor, eq(compra.idProveedor, proveedor.idProveedor))
      .innerJoin(usuarios, eq(compra.idUsuario, usuarios.idUsuario))
      .orderBy(desc(compra.fechaCompra))
      .limit(300)

    if (filas.length === 0) {
      res.json({ ok: true, compras: [] })
      return
    }

    const totales = await db
      .select({
        idCompra: detalleCompra.idCompra,
        cantidad: detalleCompra.cantidadComprada,
        costo: detalleCompra.costoUnitario
      })
      .from(detalleCompra)
      .where(
        inArray(
          detalleCompra.idCompra,
          filas.map((f) => f.idCompra)
        )
      )

    const totalPorCompra = new Map<number, number>()
    for (const t of totales) {
      const acumulado = totalPorCompra.get(t.idCompra) ?? 0
      totalPorCompra.set(t.idCompra, acumulado + Number(t.cantidad) * Number(t.costo))
    }

    res.json({
      ok: true,
      compras: filas.map((fila) => ({
        ...fila,
        fechaCompra: fila.fechaCompra.toISOString(),
        total: totalPorCompra.get(fila.idCompra) ?? 0
      }))
    })
  })

  router.get('/compras/:id', verificarJwt, requiereAdministrador, async (req, res) => {
    const id = Number(req.params.id)
    const db = obtenerDb(req)

    const [cabecera] = await db
      .select({
        idCompra: compra.idCompra,
        fechaCompra: compra.fechaCompra,
        idProveedor: compra.idProveedor,
        nombreProveedor: proveedor.nombreProveedor,
        idUsuario: compra.idUsuario,
        nombreUsuario: usuarios.nombreUsuario
      })
      .from(compra)
      .innerJoin(proveedor, eq(compra.idProveedor, proveedor.idProveedor))
      .innerJoin(usuarios, eq(compra.idUsuario, usuarios.idUsuario))
      .where(eq(compra.idCompra, id))

    if (!cabecera) {
      res.status(404).json({ ok: false, error: 'Compra no encontrada' })
      return
    }

    const lineas = await db
      .select({
        idProducto: detalleCompra.idProducto,
        nombreProducto: producto.nombreProducto,
        unidadMedida: producto.unidadMedida,
        cantidadComprada: detalleCompra.cantidadComprada,
        costoUnitario: detalleCompra.costoUnitario
      })
      .from(detalleCompra)
      .innerJoin(producto, eq(detalleCompra.idProducto, producto.idProducto))
      .where(eq(detalleCompra.idCompra, id))

    const lineasMapeadas = lineas.map((l) => ({
      ...l,
      cantidadComprada: Number(l.cantidadComprada),
      costoUnitario: Number(l.costoUnitario)
    }))
    const total = lineasMapeadas.reduce((acc, l) => acc + l.cantidadComprada * l.costoUnitario, 0)

    res.json({
      ok: true,
      compra: { ...cabecera, fechaCompra: cabecera.fechaCompra.toISOString(), total },
      lineas: lineasMapeadas
    })
  })

  return router
}

// El incremento debe ser atómico (basado en el valor actual en la base de
// datos, no en un valor leído antes), igual que en catalogo.ts.
function sqlStockMasCantidad(cantidad: number) {
  return sql`${producto.stockActual} + ${cantidad.toString()}`
}
