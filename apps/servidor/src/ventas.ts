import { Router, type Request } from 'express'
import bcrypt from 'bcrypt'
import { eq, and, gte, lte, sql, type SQL } from 'drizzle-orm'
import { inArray } from 'drizzle-orm'
import { venta, contiene, producto, cliente, devolucion, usuarios, type crearConexion } from '@picaventa/db'
import {
  datosCrearVentaSchema,
  datosCancelarVentaSchema,
  datosDevolucionSchema,
  type EstadoVenta,
  type PayloadJwt
} from '@picaventa/shared'
import { verificarJwt, requiereAdministrador } from './auth.js'

type Db = ReturnType<typeof crearConexion>
type RequestAutenticado = Request & { usuarioToken?: PayloadJwt }

function obtenerDb(req: Request): Db {
  return req.app.locals.db as Db
}

// Interpreta "YYYY-MM-DD" como fecha LOCAL (la del día que el admin ve en el
// selector), no como UTC — new Date('YYYY-MM-DD') se interpreta como UTC
// medianoche, y mezclarlo con .setHours() (que opera en hora local) corta
// el rango en un punto equivocado del día. Ver también caja.ts/claveFechaLocal.
function fechaLocalDesdeCadena(cadena: string, finDelDia: boolean): Date {
  const [anio, mes, dia] = cadena.split('-').map(Number)
  return finDelDia
    ? new Date(anio, mes - 1, dia, 23, 59, 59, 999)
    : new Date(anio, mes - 1, dia, 0, 0, 0, 0)
}

function filaAVenta(fila: typeof venta.$inferSelect) {
  return {
    idVenta: fila.idVenta,
    folioVenta: fila.folioVenta,
    fechaVenta: fila.fechaVenta,
    total: Number(fila.total),
    metodoPago: fila.metodoPago,
    estadoVenta: fila.estadoVenta,
    idCliente: fila.idCliente ?? undefined,
    idUsuario: fila.idUsuario
  }
}

export function crearRutasVentas(): Router {
  const router = Router()

  router.get('/', verificarJwt, async (req, res) => {
    const db = obtenerDb(req)
    const { estado, desde, hasta } = req.query

    const condiciones: SQL[] = []
    if (typeof estado === 'string') condiciones.push(eq(venta.estadoVenta, estado as EstadoVenta))
    if (typeof desde === 'string') {
      condiciones.push(gte(venta.fechaVenta, fechaLocalDesdeCadena(desde, false)))
    }
    if (typeof hasta === 'string') {
      condiciones.push(lte(venta.fechaVenta, fechaLocalDesdeCadena(hasta, true)))
    }

    const filas = await db
      .select()
      .from(venta)
      .where(condiciones.length > 0 ? and(...condiciones) : undefined)

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

        let clienteFiado: typeof cliente.$inferSelect | undefined
        if (datos.data.metodoPago === 'fiado') {
          const idCliente = datos.data.idCliente as number
          const [fila] = await tx.select().from(cliente).where(eq(cliente.idCliente, idCliente))
          if (!fila) throw new Error('Cliente no encontrado')
          // Se permite exceder el límite una sola vez: si YA está sobre su
          // límite de una venta anterior, se bloquea hasta que regularice.
          if (Number(fila.saldoActual) > Number(fila.limiteCredito)) {
            throw new Error(
              `Este cliente ya excede su límite de crédito ($${Number(fila.saldoActual).toFixed(2)} de $${Number(fila.limiteCredito).toFixed(2)}) — debe abonar antes de poder comprar a fiado de nuevo.`
            )
          }
          clienteFiado = fila
        }

        const [nuevaVenta] = await tx
          .insert(venta)
          .values({
            folioVenta: `TEMP-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            total: total.toString(),
            metodoPago: datos.data.metodoPago,
            estadoVenta: datos.data.estado,
            idCliente: datos.data.idCliente,
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

        if (datos.data.estado === 'activa' && clienteFiado) {
          await tx
            .update(cliente)
            .set({ saldoActual: (Number(clienteFiado.saldoActual) + total).toString() })
            .where(eq(cliente.idCliente, clienteFiado.idCliente))
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

  // RNF-04: cancelar una venta ya cobrada exige el PIN de quien autoriza,
  // igual que un retiro de caja — y solo un administrador puede hacerlo
  // (RF-17.1: "con autorización del administrador").
  router.post('/:id/cancelar', verificarJwt, requiereAdministrador, async (req, res) => {
    const datos = datosCancelarVentaSchema.safeParse(req.body)
    if (!datos.success) {
      res.status(400).json({ ok: false, error: datos.error.issues[0]?.message ?? 'Datos inválidos' })
      return
    }

    const payload = (req as RequestAutenticado).usuarioToken as PayloadJwt
    const id = Number(req.params.id)
    const db = obtenerDb(req)

    const [usuario] = await db.select().from(usuarios).where(eq(usuarios.idUsuario, payload.idUsuario))
    if (!usuario || !(await bcrypt.compare(datos.data.pin, usuario.pinHash))) {
      res.status(401).json({ ok: false, error: 'PIN incorrecto' })
      return
    }

    try {
      const resultado = await db.transaction(async (tx) => {
        const [ventaFila] = await tx.select().from(venta).where(eq(venta.idVenta, id))
        if (!ventaFila) throw new Error('Venta no encontrada')
        if (ventaFila.estadoVenta !== 'activa') {
          throw new Error('Solo se puede cancelar una venta activa (ya cobrada)')
        }

        const lineas = await tx.select().from(contiene).where(eq(contiene.idVenta, id))
        for (const linea of lineas) {
          await tx
            .update(producto)
            .set({ stockActual: sql`${producto.stockActual} + ${linea.cantidadVendida}` })
            .where(eq(producto.idProducto, linea.idProducto))
        }

        if (ventaFila.metodoPago === 'fiado' && ventaFila.idCliente) {
          await tx
            .update(cliente)
            .set({ saldoActual: sql`${cliente.saldoActual} - ${ventaFila.total}` })
            .where(eq(cliente.idCliente, ventaFila.idCliente))
        }

        const [actualizada] = await tx
          .update(venta)
          .set({ estadoVenta: 'cancelada' })
          .where(eq(venta.idVenta, id))
          .returning()

        return actualizada
      })

      if (!resultado) throw new Error('No se pudo cancelar la venta')
      res.json({ ok: true, venta: filaAVenta(resultado) })
    } catch (err) {
      res.status(400).json({ ok: false, error: err instanceof Error ? err.message : String(err) })
    }
  })

  // RF-17.2: procesar la devolución de un producto ya vendido, reintegrando
  // el inventario. Si la venta original fue a fiado y se resuelve como
  // reembolso, también se descuenta del saldo insoluto del cliente.
  router.post('/:id/devoluciones', verificarJwt, requiereAdministrador, async (req, res) => {
    const datos = datosDevolucionSchema.safeParse(req.body)
    if (!datos.success) {
      res.status(400).json({ ok: false, error: datos.error.issues[0]?.message ?? 'Datos inválidos' })
      return
    }

    const payload = (req as RequestAutenticado).usuarioToken as PayloadJwt
    const id = Number(req.params.id)
    const db = obtenerDb(req)

    const [usuario] = await db.select().from(usuarios).where(eq(usuarios.idUsuario, payload.idUsuario))
    if (!usuario || !(await bcrypt.compare(datos.data.pin, usuario.pinHash))) {
      res.status(401).json({ ok: false, error: 'PIN incorrecto' })
      return
    }

    try {
      const resultado = await db.transaction(async (tx) => {
        const [ventaFila] = await tx.select().from(venta).where(eq(venta.idVenta, id))
        if (!ventaFila) throw new Error('Venta no encontrada')
        if (ventaFila.estadoVenta !== 'activa') {
          throw new Error('Solo se pueden procesar devoluciones de una venta activa')
        }

        const [linea] = await tx
          .select()
          .from(contiene)
          .where(and(eq(contiene.idVenta, id), eq(contiene.idProducto, datos.data.idProducto)))
        if (!linea) throw new Error('Ese producto no forma parte de esta venta')

        const yaDevueltas = await tx
          .select({ cantidad: devolucion.cantidadDevuelta })
          .from(devolucion)
          .where(and(eq(devolucion.idVenta, id), eq(devolucion.idProducto, datos.data.idProducto)))
        const totalYaDevuelto = yaDevueltas.reduce((acumulado, d) => acumulado + Number(d.cantidad), 0)

        const cantidadVendida = Number(linea.cantidadVendida)
        if (totalYaDevuelto + datos.data.cantidad > cantidadVendida) {
          throw new Error(
            `Solo quedan ${cantidadVendida - totalYaDevuelto} unidad(es) disponibles para devolver de esta línea`
          )
        }

        // El descuento de la línea se prorratea entre las unidades vendidas
        // para calcular cuánto corresponde reembolsar por las que se
        // devuelven, en vez de reembolsar el precio de lista completo.
        const precioNetoUnitario =
          (cantidadVendida * Number(linea.precioUnitarioVenta) - Number(linea.descuentoAplicado)) /
          cantidadVendida
        const montoReembolso =
          datos.data.tipoResolucion === 'reembolso' ? datos.data.cantidad * precioNetoUnitario : 0

        const [productoActualizado] = await tx
          .update(producto)
          .set({ stockActual: sql`${producto.stockActual} + ${datos.data.cantidad.toString()}` })
          .where(eq(producto.idProducto, datos.data.idProducto))
          .returning()

        if (montoReembolso > 0 && ventaFila.metodoPago === 'fiado' && ventaFila.idCliente) {
          await tx
            .update(cliente)
            .set({ saldoActual: sql`${cliente.saldoActual} - ${montoReembolso.toString()}` })
            .where(eq(cliente.idCliente, ventaFila.idCliente))
        }

        const [devolucionFila] = await tx
          .insert(devolucion)
          .values({
            idVenta: id,
            idProducto: datos.data.idProducto,
            cantidadDevuelta: datos.data.cantidad.toString(),
            motivoDevolucion: datos.data.motivo,
            tipoResolucion: datos.data.tipoResolucion,
            idUsuario: payload.idUsuario
          })
          .returning()

        if (!devolucionFila || !productoActualizado) throw new Error('No se pudo registrar la devolución')
        return {
          devolucionFila,
          nombreProducto: productoActualizado.nombreProducto,
          stockNuevo: Number(productoActualizado.stockActual)
        }
      })

      res.status(201).json({
        ok: true,
        devolucion: {
          idDevolucion: resultado.devolucionFila.idDevolucion,
          idVenta: resultado.devolucionFila.idVenta,
          idProducto: resultado.devolucionFila.idProducto,
          nombreProducto: resultado.nombreProducto,
          cantidadDevuelta: Number(resultado.devolucionFila.cantidadDevuelta),
          motivoDevolucion: resultado.devolucionFila.motivoDevolucion,
          tipoResolucion: resultado.devolucionFila.tipoResolucion,
          idUsuario: resultado.devolucionFila.idUsuario,
          nombreUsuario: usuario.nombreUsuario,
          fechaDevolucion: resultado.devolucionFila.fechaDevolucion.toISOString()
        },
        stockNuevo: resultado.stockNuevo
      })
    } catch (err) {
      res.status(400).json({ ok: false, error: err instanceof Error ? err.message : String(err) })
    }
  })

  router.get('/:id/devoluciones', verificarJwt, requiereAdministrador, async (req, res) => {
    const id = Number(req.params.id)
    const db = obtenerDb(req)

    const filas = await db
      .select({
        idDevolucion: devolucion.idDevolucion,
        idVenta: devolucion.idVenta,
        idProducto: devolucion.idProducto,
        nombreProducto: producto.nombreProducto,
        cantidadDevuelta: devolucion.cantidadDevuelta,
        motivoDevolucion: devolucion.motivoDevolucion,
        tipoResolucion: devolucion.tipoResolucion,
        idUsuario: devolucion.idUsuario,
        nombreUsuario: usuarios.nombreUsuario,
        fechaDevolucion: devolucion.fechaDevolucion
      })
      .from(devolucion)
      .innerJoin(producto, eq(devolucion.idProducto, producto.idProducto))
      .innerJoin(usuarios, eq(devolucion.idUsuario, usuarios.idUsuario))
      .where(eq(devolucion.idVenta, id))
      .orderBy(devolucion.fechaDevolucion)

    res.json({
      ok: true,
      devoluciones: filas.map((fila) => ({
        ...fila,
        cantidadDevuelta: Number(fila.cantidadDevuelta),
        fechaDevolucion: fila.fechaDevolucion.toISOString()
      }))
    })
  })

  return router
}
