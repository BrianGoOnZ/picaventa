import { Router, type Request } from 'express'
import bcrypt from 'bcrypt'
import { eq, and, gte, lte, desc } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import {
  venta,
  contiene,
  producto,
  devolucion,
  movimientoCaja,
  corteCaja,
  usuarios,
  type crearConexion
} from '@picaventa/db'
import {
  datosMovimientoCajaSchema,
  datosCorteCajaSchema,
  type DesgloseMetodoPago,
  type PayloadJwt
} from '@picaventa/shared'
import { verificarJwt, requiereAdministrador } from './auth.js'

type Db = ReturnType<typeof crearConexion>
type RequestAutenticado = Request & { usuarioToken?: PayloadJwt }

function obtenerDb(req: Request): Db {
  return req.app.locals.db as Db
}

function desgloseVacio(): DesgloseMetodoPago {
  return { efectivo: 0, tarjeta: 0, fiado: 0 }
}

function sumarAlDesglose(desglose: DesgloseMetodoPago, metodoPago: string, monto: number): void {
  if (metodoPago === 'efectivo' || metodoPago === 'tarjeta' || metodoPago === 'fiado') {
    desglose[metodoPago] += monto
  }
}

export function crearRutasCaja(): Router {
  const router = Router()

  router.post('/movimientos', verificarJwt, async (req, res) => {
    const datos = datosMovimientoCajaSchema.safeParse(req.body)
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
    const [usuario] = await db
      .select()
      .from(usuarios)
      .where(eq(usuarios.idUsuario, payload.idUsuario))

    if (!usuario || !(await bcrypt.compare(datos.data.pin, usuario.pinHash))) {
      res.status(401).json({ ok: false, error: 'PIN incorrecto' })
      return
    }

    await db.insert(movimientoCaja).values({
      tipoMovimiento: datos.data.tipo,
      montoMovimiento: datos.data.monto.toString(),
      conceptoMovimiento: datos.data.concepto,
      idUsuario: payload.idUsuario
    })

    res.status(201).json({ ok: true })
  })

  // Detalle de los retiros/gastos del turno abierto (incluye los retiros
  // automáticos que genera un reembolso en efectivo) — para que se pueda
  // revisar de dónde sale cada peso antes de confirmar el corte, no solo
  // ver el total. Mismo criterio de "turno" que usa /cerrar-turno: desde el
  // login (iat del JWT) hasta ahora.
  router.get('/movimientos-turno', verificarJwt, async (req, res) => {
    const payload = (req as RequestAutenticado).usuarioToken
    if (!payload || !payload.iat) {
      res.status(401).json({ ok: false, error: 'Sesión inválida' })
      return
    }

    const inicioTurno = new Date(payload.iat * 1000)
    const db = obtenerDb(req)

    const filas = await db
      .select()
      .from(movimientoCaja)
      .where(and(eq(movimientoCaja.idUsuario, payload.idUsuario), gte(movimientoCaja.fechaMovimiento, inicioTurno)))
      .orderBy(desc(movimientoCaja.fechaMovimiento))

    res.json({
      ok: true,
      movimientos: filas.map((f) => ({
        idMovimiento: f.idMovimiento,
        tipoMovimiento: f.tipoMovimiento,
        montoMovimiento: Number(f.montoMovimiento),
        conceptoMovimiento: f.conceptoMovimiento,
        fechaMovimiento: f.fechaMovimiento.toISOString()
      }))
    })
  })

  router.post('/cerrar-turno', verificarJwt, async (req, res) => {
    const datos = datosCorteCajaSchema.safeParse(req.body)
    if (!datos.success) {
      res.status(400).json({ ok: false, error: datos.error.issues[0]?.message ?? 'Datos inválidos' })
      return
    }

    const payload = (req as RequestAutenticado).usuarioToken
    if (!payload || !payload.iat) {
      res.status(401).json({ ok: false, error: 'Sesión inválida' })
      return
    }

    const inicioTurno = new Date(payload.iat * 1000)
    const db = obtenerDb(req)

    const ventasTurno = await db
      .select()
      .from(venta)
      .where(
        and(
          eq(venta.idUsuario, payload.idUsuario),
          gte(venta.fechaVenta, inicioTurno),
          eq(venta.estadoVenta, 'activa')
        )
      )

    const ventasPorMetodo = desgloseVacio()
    for (const v of ventasTurno) {
      sumarAlDesglose(ventasPorMetodo, v.metodoPago, Number(v.total))
    }
    const totalVendido = ventasPorMetodo.efectivo + ventasPorMetodo.tarjeta + ventasPorMetodo.fiado

    const movimientos = await db
      .select()
      .from(movimientoCaja)
      .where(
        and(
          eq(movimientoCaja.idUsuario, payload.idUsuario),
          gte(movimientoCaja.fechaMovimiento, inicioTurno)
        )
      )
    const totalRetirosGastos = movimientos.reduce(
      (acumulado, m) => acumulado + Number(m.montoMovimiento),
      0
    )

    const totalEsperado = datos.data.fondoInicial + ventasPorMetodo.efectivo - totalRetirosGastos
    const diferencia = datos.data.totalContadoSistema - totalEsperado

    const [fila] = await db
      .insert(corteCaja)
      .values({
        fondoInicial: datos.data.fondoInicial.toString(),
        totalContadoSistema: datos.data.totalContadoSistema.toString(),
        totalVendido: totalVendido.toString(),
        totalEsperado: totalEsperado.toString(),
        diferencia: diferencia.toString(),
        idUsuario: payload.idUsuario
      })
      .returning()

    if (!fila) {
      res.status(500).json({ ok: false, error: 'No se pudo generar el corte' })
      return
    }

    res.status(201).json({
      ok: true,
      resumen: {
        fechaInicio: inicioTurno.toISOString(),
        fechaCorte: fila.fechaCorte,
        fondoInicial: datos.data.fondoInicial,
        ventasPorMetodo,
        totalVendido,
        totalRetirosGastos,
        totalEsperado,
        totalContadoSistema: datos.data.totalContadoSistema,
        diferencia
      }
    })
  })

  router.get('/reportes/ventas', verificarJwt, requiereAdministrador, async (req, res) => {
    const desde = req.query.desde ? new Date(String(req.query.desde)) : new Date(0)
    const hasta = req.query.hasta ? new Date(String(req.query.hasta)) : new Date()

    const db = obtenerDb(req)
    const condicionPeriodo = and(
      gte(venta.fechaVenta, desde),
      lte(venta.fechaVenta, hasta),
      eq(venta.estadoVenta, 'activa')
    )

    const ventasPeriodo = await db.select().from(venta).where(condicionPeriodo)
    const porMetodo = desgloseVacio()
    let totalVendido = 0
    for (const v of ventasPeriodo) {
      totalVendido += Number(v.total)
      sumarAlDesglose(porMetodo, v.metodoPago, Number(v.total))
    }

    const lineas = await db
      .select({
        idProducto: contiene.idProducto,
        nombreProducto: producto.nombreProducto,
        precioCompra: producto.precioCompra,
        cantidadVendida: contiene.cantidadVendida,
        precioUnitarioVenta: contiene.precioUnitarioVenta,
        descuentoAplicado: contiene.descuentoAplicado
      })
      .from(contiene)
      .innerJoin(producto, eq(contiene.idProducto, producto.idProducto))
      .innerJoin(venta, eq(contiene.idVenta, venta.idVenta))
      .where(condicionPeriodo)

    const porProducto = new Map<
      number,
      { nombreProducto: string; cantidad: number; ingresos: number; costoEstimado: number }
    >()
    for (const l of lineas) {
      const acumulado = porProducto.get(l.idProducto) ?? {
        nombreProducto: l.nombreProducto,
        cantidad: 0,
        ingresos: 0,
        costoEstimado: 0
      }
      const cantidad = Number(l.cantidadVendida)
      acumulado.cantidad += cantidad
      acumulado.ingresos += Number(l.precioUnitarioVenta) * cantidad - Number(l.descuentoAplicado)
      acumulado.costoEstimado += (l.precioCompra ? Number(l.precioCompra) : 0) * cantidad
      porProducto.set(l.idProducto, acumulado)
    }

    // Un reembolso (con o sin cambio por otro producto) no anula la venta
    // original — solo queda un registro aparte en `devolucion` — así que sin
    // esto una venta devuelta se seguiría contando de más en los reportes.
    // Se resta por la fecha en que se procesó la devolución, no la de la
    // venta original, para no alterar un periodo que ya se reportó antes.
    // 'reposicion' no resta nada: el cliente sí se quedó con un producto
    // funcionando, no hubo reembolso de dinero.
    const condicionDevoluciones = and(
      gte(devolucion.fechaDevolucion, desde),
      lte(devolucion.fechaDevolucion, hasta),
      eq(devolucion.tipoResolucion, 'reembolso')
    )
    const devolucionesPeriodo = await db
      .select({
        idProducto: devolucion.idProducto,
        cantidadDevuelta: devolucion.cantidadDevuelta,
        montoReembolsado: devolucion.montoReembolsado,
        metodoPago: venta.metodoPago,
        precioCompra: producto.precioCompra
      })
      .from(devolucion)
      .innerJoin(venta, eq(devolucion.idVenta, venta.idVenta))
      .innerJoin(producto, eq(devolucion.idProducto, producto.idProducto))
      .where(condicionDevoluciones)

    for (const d of devolucionesPeriodo) {
      const monto = Number(d.montoReembolsado)
      totalVendido -= monto
      sumarAlDesglose(porMetodo, d.metodoPago, -monto)

      const acumulado = porProducto.get(d.idProducto)
      if (acumulado) {
        const cantidad = Number(d.cantidadDevuelta)
        acumulado.cantidad -= cantidad
        acumulado.ingresos -= monto
        acumulado.costoEstimado -= (d.precioCompra ? Number(d.precioCompra) : 0) * cantidad
      }
    }

    const productos = [...porProducto.entries()]
      .map(([idProducto, datos]) => ({
        idProducto,
        nombreProducto: datos.nombreProducto,
        cantidad: datos.cantidad,
        ingresos: datos.ingresos,
        margenEstimado: datos.ingresos - datos.costoEstimado
      }))
      .sort((a, b) => b.cantidad - a.cantidad)

    res.json({
      ok: true,
      reporte: {
        desde: desde.toISOString(),
        hasta: hasta.toISOString(),
        totalVendido,
        numeroVentas: ventasPeriodo.length,
        porMetodo,
        productos
      }
    })
  })

  router.get('/reportes/ventas-por-dia', verificarJwt, requiereAdministrador, async (req, res) => {
    const dias = Math.min(Math.max(Number(req.query.dias) || 7, 1), 90)
    const hoy = new Date()
    hoy.setHours(23, 59, 59, 999)
    const desde = new Date(hoy)
    desde.setDate(desde.getDate() - (dias - 1))
    desde.setHours(0, 0, 0, 0)

    const db = obtenerDb(req)
    const ventasPeriodo = await db
      .select()
      .from(venta)
      .where(and(gte(venta.fechaVenta, desde), lte(venta.fechaVenta, hoy), eq(venta.estadoVenta, 'activa')))

    // Se agrupa por fecha LOCAL (no UTC): el rango de arriba también está
    // en hora local, y con un huso como UTC-6 una venta de la tarde/noche ya
    // cae en el día UTC siguiente — agrupar por UTC la perdía silenciosamente
    // del día al que en realidad pertenece para quien vende.
    function claveFechaLocal(fecha: Date): string {
      const anio = fecha.getFullYear()
      const mes = String(fecha.getMonth() + 1).padStart(2, '0')
      const dia = String(fecha.getDate()).padStart(2, '0')
      return `${anio}-${mes}-${dia}`
    }

    const totalesPorFecha = new Map<string, number>()
    for (const v of ventasPeriodo) {
      const clave = claveFechaLocal(v.fechaVenta)
      totalesPorFecha.set(clave, (totalesPorFecha.get(clave) ?? 0) + Number(v.total))
    }

    const diasResultado: { fecha: string; total: number }[] = []
    for (let i = 0; i < dias; i++) {
      const fecha = new Date(desde)
      fecha.setDate(fecha.getDate() + i)
      const clave = claveFechaLocal(fecha)
      diasResultado.push({ fecha: clave, total: totalesPorFecha.get(clave) ?? 0 })
    }

    res.json({ ok: true, dias: diasResultado })
  })

  router.get('/reportes/ventas-por-cajero', verificarJwt, requiereAdministrador, async (req, res) => {
    const desde = req.query.desde ? new Date(String(req.query.desde)) : new Date(0)
    const hasta = req.query.hasta ? new Date(String(req.query.hasta)) : new Date()

    const db = obtenerDb(req)
    const filas = await db
      .select({
        idUsuario: venta.idUsuario,
        nombreUsuario: usuarios.nombreUsuario,
        total: venta.total
      })
      .from(venta)
      .innerJoin(usuarios, eq(venta.idUsuario, usuarios.idUsuario))
      .where(and(gte(venta.fechaVenta, desde), lte(venta.fechaVenta, hasta), eq(venta.estadoVenta, 'activa')))

    const porCajero = new Map<number, { nombreUsuario: string; total: number }>()
    for (const f of filas) {
      const acumulado = porCajero.get(f.idUsuario) ?? { nombreUsuario: f.nombreUsuario, total: 0 }
      acumulado.total += Number(f.total)
      porCajero.set(f.idUsuario, acumulado)
    }

    const cajeros = [...porCajero.entries()]
      .map(([idUsuario, datos]) => ({ idUsuario, nombreUsuario: datos.nombreUsuario, total: datos.total }))
      .sort((a, b) => b.total - a.total)

    res.json({ ok: true, cajeros })
  })

  // Historial de devoluciones del periodo — para que un administrador pueda
  // revisar qué se hizo y por qué sin tener que abrir venta por venta. Se
  // filtra por la fecha en que se procesó la devolución, no la de la venta
  // original (misma lógica que la resta en /reportes/ventas).
  router.get('/reportes/devoluciones', verificarJwt, requiereAdministrador, async (req, res) => {
    const desde = req.query.desde ? new Date(String(req.query.desde)) : new Date(0)
    const hasta = req.query.hasta ? new Date(String(req.query.hasta)) : new Date()

    const db = obtenerDb(req)
    const ventaCambioAlias = alias(venta, 'venta_cambio')

    const filas = await db
      .select({
        idDevolucion: devolucion.idDevolucion,
        idVenta: devolucion.idVenta,
        folioVenta: venta.folioVenta,
        idProducto: devolucion.idProducto,
        nombreProducto: producto.nombreProducto,
        cantidadDevuelta: devolucion.cantidadDevuelta,
        motivoDevolucion: devolucion.motivoDevolucion,
        tipoResolucion: devolucion.tipoResolucion,
        montoReembolsado: devolucion.montoReembolsado,
        idVentaCambio: devolucion.idVentaCambio,
        folioVentaCambio: ventaCambioAlias.folioVenta,
        nombreUsuario: usuarios.nombreUsuario,
        fechaDevolucion: devolucion.fechaDevolucion
      })
      .from(devolucion)
      .innerJoin(venta, eq(devolucion.idVenta, venta.idVenta))
      .innerJoin(producto, eq(devolucion.idProducto, producto.idProducto))
      .innerJoin(usuarios, eq(devolucion.idUsuario, usuarios.idUsuario))
      .leftJoin(ventaCambioAlias, eq(devolucion.idVentaCambio, ventaCambioAlias.idVenta))
      .where(and(gte(devolucion.fechaDevolucion, desde), lte(devolucion.fechaDevolucion, hasta)))
      .orderBy(desc(devolucion.fechaDevolucion))

    res.json({
      ok: true,
      devoluciones: filas.map((f) => ({
        ...f,
        cantidadDevuelta: Number(f.cantidadDevuelta),
        montoReembolsado: Number(f.montoReembolsado),
        idVentaCambio: f.idVentaCambio ?? undefined,
        folioVentaCambio: f.folioVentaCambio ?? undefined,
        fechaDevolucion: f.fechaDevolucion.toISOString()
      }))
    })
  })

  router.get('/cortes', verificarJwt, requiereAdministrador, async (req, res) => {
    const limite = Math.min(Math.max(Number(req.query.limite) || 10, 1), 100)

    const db = obtenerDb(req)
    const filas = await db
      .select({
        idCorte: corteCaja.idCorte,
        fechaCorte: corteCaja.fechaCorte,
        nombreUsuario: usuarios.nombreUsuario,
        fondoInicial: corteCaja.fondoInicial,
        totalVendido: corteCaja.totalVendido,
        totalEsperado: corteCaja.totalEsperado,
        totalContadoSistema: corteCaja.totalContadoSistema,
        diferencia: corteCaja.diferencia
      })
      .from(corteCaja)
      .innerJoin(usuarios, eq(corteCaja.idUsuario, usuarios.idUsuario))
      .orderBy(desc(corteCaja.fechaCorte))
      .limit(limite)

    res.json({
      ok: true,
      cortes: filas.map((f) => ({
        idCorte: f.idCorte,
        fechaCorte: f.fechaCorte.toISOString(),
        nombreUsuario: f.nombreUsuario,
        fondoInicial: Number(f.fondoInicial),
        totalVendido: Number(f.totalVendido),
        totalEsperado: Number(f.totalEsperado),
        totalContadoSistema: Number(f.totalContadoSistema),
        diferencia: Number(f.diferencia)
      }))
    })
  })

  return router
}
