import { Router, type Request } from 'express'
import bcrypt from 'bcrypt'
import { eq, and, gte, lte, sql, type SQL } from 'drizzle-orm'
import { inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import {
  venta,
  contiene,
  producto,
  cliente,
  devolucion,
  movimientoCaja,
  merma,
  usuarios,
  type crearConexion
} from '@picaventa/db'
import {
  datosCrearVentaSchema,
  datosCancelarVentaSchema,
  datosDevolucionSchema,
  type EstadoVenta,
  type PayloadJwt
} from '@picaventa/shared'
import { verificarJwt, requiereAdministrador, requierePermiso } from './auth.js'

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

  // RF-17.2: procesar la devolución de un producto ya vendido. Un solo
  // formulario resuelve los tres escenarios reales de una tienda:
  //  - 'reposicion': el producto estaba dañado/vencido — se repone con uno
  //    igual, sin mover dinero. El que se devuelve NO regresa al stock
  //    vendible (nunca llegó a estar en condiciones de venderse de nuevo).
  //  - 'reembolso': el cliente ya no lo quiere — regresa al stock, se le
  //    regresa su dinero (se descuenta del saldo si fue fiado, o se
  //    registra un retiro de caja automático si fue efectivo, para que el
  //    corte de caja cuadre solo sin que el cajero tenga que acordarse).
  //  - 'reembolso' + productoCambio: cambia por otro producto — se procesa
  //    como el reembolso de arriba y, en la misma operación, se registra
  //    una venta nueva por el producto de reemplazo. Como el reembolso ya
  //    resta el valor original y la venta nueva ya suma el valor nuevo, la
  //    diferencia de precio queda correcta sola, sin contar dos veces la
  //    venta original.
  router.post('/:id/devoluciones', verificarJwt, requierePermiso('procesarDevoluciones'), async (req, res) => {
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

        const [productoOriginal] = await tx
          .select()
          .from(producto)
          .where(eq(producto.idProducto, datos.data.idProducto))
        if (!productoOriginal) throw new Error('Producto no encontrado')

        // El descuento de la línea se prorratea entre las unidades vendidas
        // para calcular cuánto corresponde reembolsar por las que se
        // devuelven, en vez de reembolsar el precio de lista completo.
        const precioNetoUnitario =
          (cantidadVendida * Number(linea.precioUnitarioVenta) - Number(linea.descuentoAplicado)) /
          cantidadVendida
        const montoReembolso =
          datos.data.tipoResolucion === 'reembolso' ? datos.data.cantidad * precioNetoUnitario : 0

        let productoActualizado: typeof producto.$inferSelect | undefined
        if (datos.data.tipoResolucion === 'reposicion') {
          const stockNuevo = Number(productoOriginal.stockActual) - datos.data.cantidad
          if (stockNuevo < 0) {
            throw new Error('No hay suficiente stock disponible para reponer este producto')
          }
          ;[productoActualizado] = await tx
            .update(producto)
            .set({ stockActual: stockNuevo.toString() })
            .where(eq(producto.idProducto, datos.data.idProducto))
            .returning()

          // El producto devuelto no regresa a la venta (se da por dañado o
          // descartado) — es exactamente una merma, así que se registra ahí
          // también para que el reporte de mermas la refleje sin que el
          // administrador tenga que capturarla dos veces a mano.
          await tx.insert(merma).values({
            idProducto: datos.data.idProducto,
            tipoMerma: 'merma',
            motivoMerma: `Devolución (${ventaFila.folioVenta}): ${datos.data.motivo}`,
            cantidadMerma: datos.data.cantidad.toString(),
            idUsuario: payload.idUsuario
          })
        } else {
          ;[productoActualizado] = await tx
            .update(producto)
            .set({ stockActual: sql`${producto.stockActual} + ${datos.data.cantidad.toString()}` })
            .where(eq(producto.idProducto, datos.data.idProducto))
            .returning()
        }
        if (!productoActualizado) throw new Error('No se pudo actualizar el stock')

        if (montoReembolso > 0) {
          if (ventaFila.metodoPago === 'fiado' && ventaFila.idCliente) {
            await tx
              .update(cliente)
              .set({ saldoActual: sql`${cliente.saldoActual} - ${montoReembolso.toString()}` })
              .where(eq(cliente.idCliente, ventaFila.idCliente))
          } else if (ventaFila.metodoPago === 'efectivo') {
            // Para que el corte de caja no salga "faltante" sin explicación:
            // el dinero que sale físicamente de la caja por un reembolso se
            // registra como un retiro automático, igual que si el cajero lo
            // hubiera capturado a mano.
            await tx.insert(movimientoCaja).values({
              tipoMovimiento: 'retiro',
              montoMovimiento: montoReembolso.toString(),
              conceptoMovimiento: `Reembolso venta ${ventaFila.folioVenta}`,
              idUsuario: payload.idUsuario
            })
          }
          // Tarjeta: el reembolso se procesa en la terminal bancaria, no
          // mueve efectivo de esta caja — no requiere ningún movimiento aquí.
        }

        let ventaCambio: { idVenta: number; folio: string; total: number } | undefined
        if (datos.data.productoCambio) {
          const idProductoNuevo = datos.data.productoCambio.idProducto
          const cantidadNueva = datos.data.productoCambio.cantidad

          const [productoNuevo] = await tx
            .select()
            .from(producto)
            .where(eq(producto.idProducto, idProductoNuevo))
          if (!productoNuevo) throw new Error('El producto de reemplazo no existe')
          if (Number(productoNuevo.stockActual) < cantidadNueva) {
            throw new Error(`Stock insuficiente de "${productoNuevo.nombreProducto}" para el cambio`)
          }

          const totalCambio = Number(productoNuevo.precioVenta) * cantidadNueva

          if (ventaFila.metodoPago === 'fiado' && ventaFila.idCliente) {
            const [clienteFila] = await tx
              .select()
              .from(cliente)
              .where(eq(cliente.idCliente, ventaFila.idCliente))
            if (!clienteFila) throw new Error('Cliente no encontrado')
            const saldoTrasReembolso = Number(clienteFila.saldoActual) - montoReembolso
            if (saldoTrasReembolso + totalCambio > Number(clienteFila.limiteCredito)) {
              throw new Error(
                `El producto de reemplazo excede el límite de crédito del cliente ($${Number(clienteFila.limiteCredito).toFixed(2)})`
              )
            }
            await tx
              .update(cliente)
              .set({ saldoActual: (saldoTrasReembolso + totalCambio).toString() })
              .where(eq(cliente.idCliente, ventaFila.idCliente))
          }

          const [ventaNueva] = await tx
            .insert(venta)
            .values({
              folioVenta: `TEMP-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              total: totalCambio.toString(),
              metodoPago: ventaFila.metodoPago,
              estadoVenta: 'activa',
              idCliente: ventaFila.idCliente,
              idUsuario: payload.idUsuario
            })
            .returning()
          if (!ventaNueva) throw new Error('No se pudo registrar la venta del producto de reemplazo')

          const folioCambio = `V-${String(ventaNueva.idVenta).padStart(6, '0')}`
          await tx.update(venta).set({ folioVenta: folioCambio }).where(eq(venta.idVenta, ventaNueva.idVenta))

          await tx.insert(contiene).values({
            idVenta: ventaNueva.idVenta,
            idProducto: idProductoNuevo,
            cantidadVendida: cantidadNueva.toString(),
            precioUnitarioVenta: productoNuevo.precioVenta,
            descuentoAplicado: '0'
          })

          await tx
            .update(producto)
            .set({ stockActual: sql`${producto.stockActual} - ${cantidadNueva.toString()}` })
            .where(eq(producto.idProducto, idProductoNuevo))

          ventaCambio = { idVenta: ventaNueva.idVenta, folio: folioCambio, total: totalCambio }
        }

        const [devolucionFila] = await tx
          .insert(devolucion)
          .values({
            idVenta: id,
            idProducto: datos.data.idProducto,
            cantidadDevuelta: datos.data.cantidad.toString(),
            motivoDevolucion: datos.data.motivo,
            tipoResolucion: datos.data.tipoResolucion,
            montoReembolsado: montoReembolso.toString(),
            idVentaCambio: ventaCambio?.idVenta,
            idUsuario: payload.idUsuario
          })
          .returning()

        if (!devolucionFila) throw new Error('No se pudo registrar la devolución')
        return {
          devolucionFila,
          nombreProducto: productoActualizado.nombreProducto,
          stockNuevo: Number(productoActualizado.stockActual),
          ventaCambio
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
          montoReembolsado: Number(resultado.devolucionFila.montoReembolsado),
          idVentaCambio: resultado.devolucionFila.idVentaCambio ?? undefined,
          folioVentaCambio: resultado.ventaCambio?.folio,
          idUsuario: resultado.devolucionFila.idUsuario,
          nombreUsuario: usuario.nombreUsuario,
          fechaDevolucion: resultado.devolucionFila.fechaDevolucion.toISOString()
        },
        stockNuevo: resultado.stockNuevo,
        ventaCambio: resultado.ventaCambio
      })
    } catch (err) {
      res.status(400).json({ ok: false, error: err instanceof Error ? err.message : String(err) })
    }
  })

  router.get('/:id/devoluciones', verificarJwt, requierePermiso('procesarDevoluciones'), async (req, res) => {
    const id = Number(req.params.id)
    const db = obtenerDb(req)
    const ventaCambioAlias = alias(venta, 'venta_cambio')

    const filas = await db
      .select({
        idDevolucion: devolucion.idDevolucion,
        idVenta: devolucion.idVenta,
        idProducto: devolucion.idProducto,
        nombreProducto: producto.nombreProducto,
        cantidadDevuelta: devolucion.cantidadDevuelta,
        motivoDevolucion: devolucion.motivoDevolucion,
        tipoResolucion: devolucion.tipoResolucion,
        montoReembolsado: devolucion.montoReembolsado,
        idVentaCambio: devolucion.idVentaCambio,
        folioVentaCambio: ventaCambioAlias.folioVenta,
        idUsuario: devolucion.idUsuario,
        nombreUsuario: usuarios.nombreUsuario,
        fechaDevolucion: devolucion.fechaDevolucion
      })
      .from(devolucion)
      .innerJoin(producto, eq(devolucion.idProducto, producto.idProducto))
      .innerJoin(usuarios, eq(devolucion.idUsuario, usuarios.idUsuario))
      .leftJoin(ventaCambioAlias, eq(devolucion.idVentaCambio, ventaCambioAlias.idVenta))
      .where(eq(devolucion.idVenta, id))
      .orderBy(devolucion.fechaDevolucion)

    res.json({
      ok: true,
      devoluciones: filas.map((fila) => ({
        ...fila,
        cantidadDevuelta: Number(fila.cantidadDevuelta),
        montoReembolsado: Number(fila.montoReembolsado),
        idVentaCambio: fila.idVentaCambio ?? undefined,
        folioVentaCambio: fila.folioVentaCambio ?? undefined,
        fechaDevolucion: fila.fechaDevolucion.toISOString()
      }))
    })
  })

  return router
}
