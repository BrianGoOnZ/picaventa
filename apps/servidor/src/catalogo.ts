import { Router, type Request } from 'express'
import { eq, lte, ilike, and, count, desc, sql, type SQL } from 'drizzle-orm'
import {
  categoria,
  producto,
  entradaInventario,
  historicoPrecio,
  usuarios,
  type crearConexion
} from '@picaventa/db'
import {
  datosCategoriaSchema,
  datosEntradaInventarioSchema,
  datosProductoSchema,
  PALETA_COLORES_CATEGORIA,
  type PayloadJwt,
  type Producto
} from '@picaventa/shared'
import { verificarJwt, requiereAdministrador, requierePermiso } from './auth.js'

type Db = ReturnType<typeof crearConexion>
type RequestAutenticado = Request & { usuarioToken?: PayloadJwt }

function obtenerDb(req: Request): Db {
  return req.app.locals.db as Db
}

function codigoError(err: unknown): string | undefined {
  const errorTipado = err as { code?: string; cause?: { code?: string } }
  return errorTipado.cause?.code ?? errorTipado.code
}

function filaAProducto(fila: typeof producto.$inferSelect): Producto {
  return {
    idProducto: fila.idProducto,
    nombreProducto: fila.nombreProducto,
    codigoBarras: fila.codigoBarras ?? undefined,
    precioCompra: fila.precioCompra != null ? Number(fila.precioCompra) : undefined,
    precioVenta: Number(fila.precioVenta),
    unidadMedida: fila.unidadMedida,
    stockActual: Number(fila.stockActual),
    stockMinimo: Number(fila.stockMinimo),
    idCategoria: fila.idCategoria ?? undefined,
    imagenDatos: fila.imagenDatos ?? undefined
  }
}

export function crearRutasCatalogo(): Router {
  const router = Router()

  // --- Categorías ---

  router.get('/categorias', verificarJwt, async (req, res) => {
    const db = obtenerDb(req)
    const filas = await db.select().from(categoria)
    res.json({ ok: true, categorias: filas })
  })

  router.post('/categorias', verificarJwt, requierePermiso('crearCategorias'), async (req, res) => {
    const datos = datosCategoriaSchema.safeParse(req.body)
    if (!datos.success) {
      res.status(400).json({ ok: false, error: datos.error.issues[0]?.message ?? 'Datos inválidos' })
      return
    }

    const db = obtenerDb(req)
    let colorCategoria = datos.data.colorCategoria
    if (!colorCategoria) {
      const [fila] = await db.select({ total: count() }).from(categoria)
      colorCategoria = PALETA_COLORES_CATEGORIA[(fila?.total ?? 0) % PALETA_COLORES_CATEGORIA.length]
    }

    const [fila] = await db
      .insert(categoria)
      .values({ nombreCategoria: datos.data.nombreCategoria, colorCategoria })
      .returning()
    if (!fila) {
      res.status(500).json({ ok: false, error: 'No se pudo crear la categoría' })
      return
    }
    res.status(201).json({ ok: true, categoria: fila })
  })

  router.put('/categorias/:id', verificarJwt, requiereAdministrador, async (req, res) => {
    const datos = datosCategoriaSchema.safeParse(req.body)
    if (!datos.success) {
      res.status(400).json({ ok: false, error: datos.error.issues[0]?.message ?? 'Datos inválidos' })
      return
    }

    const id = Number(req.params.id)
    const db = obtenerDb(req)
    const [fila] = await db
      .update(categoria)
      .set(datos.data)
      .where(eq(categoria.idCategoria, id))
      .returning()

    if (!fila) {
      res.status(404).json({ ok: false, error: 'Categoría no encontrada' })
      return
    }
    res.json({ ok: true, categoria: fila })
  })

  router.delete(
    '/categorias/:id',
    verificarJwt,
    requierePermiso('eliminarCategorias'),
    async (req, res) => {
      const id = Number(req.params.id)
      const db = obtenerDb(req)

      try {
        await db.delete(categoria).where(eq(categoria.idCategoria, id))
        res.json({ ok: true })
      } catch (err) {
        if (codigoError(err) === '23503') {
          res
            .status(409)
            .json({ ok: false, error: 'No se puede eliminar: hay productos en esta categoría' })
          return
        }
        res.status(500).json({ ok: false, error: err instanceof Error ? err.message : String(err) })
      }
    }
  )

  // --- Productos ---

  router.get('/productos', verificarJwt, async (req, res) => {
    const db = obtenerDb(req)
    const condiciones: SQL[] = []

    const buscar = req.query.buscar
    if (typeof buscar === 'string' && buscar.length > 0) {
      condiciones.push(ilike(producto.nombreProducto, `%${buscar}%`))
    }

    const codigoBarras = req.query.codigoBarras
    if (typeof codigoBarras === 'string' && codigoBarras.length > 0) {
      condiciones.push(eq(producto.codigoBarras, codigoBarras))
    }

    if (req.query.stockBajo === 'true') {
      condiciones.push(lte(producto.stockActual, producto.stockMinimo))
    }

    const filas = await db
      .select()
      .from(producto)
      .where(condiciones.length > 0 ? and(...condiciones) : undefined)

    res.json({ ok: true, productos: filas.map(filaAProducto) })
  })

  router.post('/productos', verificarJwt, requierePermiso('crearProductos'), async (req, res) => {
    const datos = datosProductoSchema.safeParse(req.body)
    if (!datos.success) {
      res.status(400).json({ ok: false, error: datos.error.issues[0]?.message ?? 'Datos inválidos' })
      return
    }

    const db = obtenerDb(req)
    try {
      const [fila] = await db
        .insert(producto)
        .values({
          nombreProducto: datos.data.nombreProducto,
          codigoBarras: datos.data.codigoBarras,
          precioCompra: datos.data.precioCompra?.toString(),
          precioVenta: datos.data.precioVenta.toString(),
          unidadMedida: datos.data.unidadMedida,
          stockActual: datos.data.stockActual.toString(),
          stockMinimo: datos.data.stockMinimo.toString(),
          idCategoria: datos.data.idCategoria,
          imagenDatos: datos.data.imagenDatos
        })
        .returning()

      if (!fila) {
        res.status(500).json({ ok: false, error: 'No se pudo crear el producto' })
        return
      }
      res.status(201).json({ ok: true, producto: filaAProducto(fila) })
    } catch (err) {
      if (codigoError(err) === '23505') {
        res.status(409).json({ ok: false, error: 'Ya existe un producto con ese código de barras' })
        return
      }
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : String(err) })
    }
  })

  router.put('/productos/:id', verificarJwt, requiereAdministrador, async (req, res) => {
    const datos = datosProductoSchema.safeParse(req.body)
    if (!datos.success) {
      res.status(400).json({ ok: false, error: datos.error.issues[0]?.message ?? 'Datos inválidos' })
      return
    }

    const id = Number(req.params.id)
    const db = obtenerDb(req)
    const payload = (req as RequestAutenticado).usuarioToken as PayloadJwt

    try {
      const [existente] = await db.select().from(producto).where(eq(producto.idProducto, id))
      if (!existente) {
        res.status(404).json({ ok: false, error: 'Producto no encontrado' })
        return
      }

      const [fila] = await db
        .update(producto)
        .set({
          nombreProducto: datos.data.nombreProducto,
          codigoBarras: datos.data.codigoBarras,
          precioCompra: datos.data.precioCompra?.toString(),
          precioVenta: datos.data.precioVenta.toString(),
          unidadMedida: datos.data.unidadMedida,
          stockActual: datos.data.stockActual.toString(),
          stockMinimo: datos.data.stockMinimo.toString(),
          idCategoria: datos.data.idCategoria,
          imagenDatos: datos.data.imagenDatos
        })
        .where(eq(producto.idProducto, id))
        .returning()

      if (!fila) {
        res.status(404).json({ ok: false, error: 'Producto no encontrado' })
        return
      }

      // RNF-05: trazabilidad de cambios de precio de venta — solo se
      // registra cuando el precio realmente cambió, no en cada edición.
      const precioAnterior = Number(existente.precioVenta)
      if (precioAnterior !== datos.data.precioVenta) {
        await db.insert(historicoPrecio).values({
          idProducto: id,
          precioAnterior: precioAnterior.toString(),
          precioNuevo: datos.data.precioVenta.toString(),
          idUsuario: payload.idUsuario
        })
      }

      res.json({ ok: true, producto: filaAProducto(fila) })
    } catch (err) {
      if (codigoError(err) === '23505') {
        res.status(409).json({ ok: false, error: 'Ya existe un producto con ese código de barras' })
        return
      }
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : String(err) })
    }
  })

  // Entrada rápida de mercancía: escanear el producto y sumar la cantidad
  // recibida al stock actual, sin tener que abrir el formulario completo de
  // edición ni volver a escribir el resto de los datos del producto. Cada
  // entrada queda registrada en entrada_inventario para la auditoría de
  // "quién cargó qué" (ver GET /productos/entradas/historial).
  router.post(
    '/productos/:id/entrada',
    verificarJwt,
    requierePermiso('cargarInventario'),
    async (req, res) => {
      const datos = datosEntradaInventarioSchema.safeParse(req.body)
      if (!datos.success) {
        res.status(400).json({ ok: false, error: datos.error.issues[0]?.message ?? 'Datos inválidos' })
        return
      }

      const id = Number(req.params.id)
      const db = obtenerDb(req)
      const payload = (req as RequestAutenticado).usuarioToken as PayloadJwt

      const [fila] = await db
        .update(producto)
        .set({ stockActual: sql`${producto.stockActual} + ${datos.data.cantidad.toString()}` })
        .where(eq(producto.idProducto, id))
        .returning()

      if (!fila) {
        res.status(404).json({ ok: false, error: 'Producto no encontrado' })
        return
      }

      const resultado = filaAProducto(fila)
      // stockAnterior se deriva del stock nuevo menos esta misma cantidad en
      // vez de leerlo con un SELECT aparte: matemáticamente exacto para esta
      // entrada sin importar si hubo otra actualización concurrente entre
      // medio, y evita una condición de carrera de "leer, luego escribir".
      await db.insert(entradaInventario).values({
        idProducto: id,
        idUsuario: payload.idUsuario,
        cantidad: datos.data.cantidad.toString(),
        stockAnterior: (resultado.stockActual - datos.data.cantidad).toString(),
        stockNuevo: resultado.stockActual.toString()
      })

      res.json({ ok: true, producto: resultado })
    }
  )

  router.get('/productos/entradas/historial', verificarJwt, requiereAdministrador, async (req, res) => {
    const db = obtenerDb(req)
    const filas = await db
      .select({
        idEntrada: entradaInventario.idEntrada,
        idProducto: entradaInventario.idProducto,
        nombreProducto: producto.nombreProducto,
        unidadMedida: producto.unidadMedida,
        idUsuario: entradaInventario.idUsuario,
        nombreUsuario: usuarios.nombreUsuario,
        cantidad: entradaInventario.cantidad,
        stockAnterior: entradaInventario.stockAnterior,
        stockNuevo: entradaInventario.stockNuevo,
        fechaEntrada: entradaInventario.fechaEntrada
      })
      .from(entradaInventario)
      .innerJoin(producto, eq(entradaInventario.idProducto, producto.idProducto))
      .innerJoin(usuarios, eq(entradaInventario.idUsuario, usuarios.idUsuario))
      .orderBy(desc(entradaInventario.fechaEntrada))
      .limit(300)

    res.json({
      ok: true,
      entradas: filas.map((fila) => ({
        ...fila,
        cantidad: Number(fila.cantidad),
        stockAnterior: Number(fila.stockAnterior),
        stockNuevo: Number(fila.stockNuevo),
        fechaEntrada: fila.fechaEntrada.toISOString()
      }))
    })
  })

  router.get('/productos/historial-precios', verificarJwt, requiereAdministrador, async (req, res) => {
    const db = obtenerDb(req)
    const filas = await db
      .select({
        idHistoricoPrecio: historicoPrecio.idHistoricoPrecio,
        idProducto: historicoPrecio.idProducto,
        nombreProducto: producto.nombreProducto,
        precioAnterior: historicoPrecio.precioAnterior,
        precioNuevo: historicoPrecio.precioNuevo,
        idUsuario: historicoPrecio.idUsuario,
        nombreUsuario: usuarios.nombreUsuario,
        fechaCambio: historicoPrecio.fechaCambio
      })
      .from(historicoPrecio)
      .innerJoin(producto, eq(historicoPrecio.idProducto, producto.idProducto))
      .innerJoin(usuarios, eq(historicoPrecio.idUsuario, usuarios.idUsuario))
      .orderBy(desc(historicoPrecio.fechaCambio))
      .limit(300)

    res.json({
      ok: true,
      cambios: filas.map((fila) => ({
        ...fila,
        precioAnterior: Number(fila.precioAnterior),
        precioNuevo: Number(fila.precioNuevo),
        fechaCambio: fila.fechaCambio.toISOString()
      }))
    })
  })

  router.delete(
    '/productos/:id',
    verificarJwt,
    requierePermiso('eliminarProductos'),
    async (req, res) => {
      const id = Number(req.params.id)
      const db = obtenerDb(req)

      try {
        await db.delete(producto).where(eq(producto.idProducto, id))
        res.json({ ok: true })
      } catch (err) {
        if (codigoError(err) === '23503') {
          res
            .status(409)
            .json({ ok: false, error: 'No se puede eliminar: el producto tiene movimientos asociados' })
          return
        }
        res.status(500).json({ ok: false, error: err instanceof Error ? err.message : String(err) })
      }
    }
  )

  return router
}
