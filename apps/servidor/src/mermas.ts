import { Router, type Request } from 'express'
import { eq, desc } from 'drizzle-orm'
import { merma, producto, usuarios, type crearConexion } from '@picaventa/db'
import { datosMermaSchema, type PayloadJwt } from '@picaventa/shared'
import { verificarJwt, requiereAdministrador } from './auth.js'

type Db = ReturnType<typeof crearConexion>
type RequestAutenticado = Request & { usuarioToken?: PayloadJwt }

function obtenerDb(req: Request): Db {
  return req.app.locals.db as Db
}

export function crearRutasMermas(): Router {
  const router = Router()

  // RF-10 (merma) y RF-11 (ajuste por conteo físico) comparten este mismo
  // endpoint: 'merma' resta `cantidad` del stock; 'ajuste' fija el stock al
  // valor contado físicamente (`cantidad` aquí es el conteo, no un delta).
  router.post('/productos/:id/merma', verificarJwt, requiereAdministrador, async (req, res) => {
    const datos = datosMermaSchema.safeParse({ ...req.body, idProducto: Number(req.params.id) })
    if (!datos.success) {
      res.status(400).json({ ok: false, error: datos.error.issues[0]?.message ?? 'Datos inválidos' })
      return
    }

    const payload = (req as RequestAutenticado).usuarioToken as PayloadJwt
    const db = obtenerDb(req)

    try {
      const resultado = await db.transaction(async (tx) => {
        const [existente] = await tx.select().from(producto).where(eq(producto.idProducto, datos.data.idProducto))
        if (!existente) throw new Error('Producto no encontrado')

        const stockAnterior = Number(existente.stockActual)
        let stockNuevo: number
        let cantidadConSigno: number

        if (datos.data.tipoMerma === 'merma') {
          if (datos.data.cantidad > stockAnterior) {
            throw new Error(
              `No puedes dar de baja ${datos.data.cantidad} — solo hay ${stockAnterior} en stock`
            )
          }
          stockNuevo = stockAnterior - datos.data.cantidad
          cantidadConSigno = datos.data.cantidad
        } else {
          stockNuevo = datos.data.cantidad
          cantidadConSigno = stockNuevo - stockAnterior
        }

        await tx
          .update(producto)
          .set({ stockActual: stockNuevo.toString() })
          .where(eq(producto.idProducto, datos.data.idProducto))

        await tx.insert(merma).values({
          idProducto: datos.data.idProducto,
          tipoMerma: datos.data.tipoMerma,
          motivoMerma: datos.data.motivo,
          cantidadMerma: cantidadConSigno.toString(),
          idUsuario: payload.idUsuario
        })

        return { stockAnterior, stockNuevo }
      })

      res.status(201).json({ ok: true, ...resultado })
    } catch (err) {
      res.status(400).json({ ok: false, error: err instanceof Error ? err.message : String(err) })
    }
  })

  router.get('/productos/mermas/historial', verificarJwt, requiereAdministrador, async (req, res) => {
    const db = obtenerDb(req)
    const filas = await db
      .select({
        idMerma: merma.idMerma,
        idProducto: merma.idProducto,
        nombreProducto: producto.nombreProducto,
        unidadMedida: producto.unidadMedida,
        tipoMerma: merma.tipoMerma,
        motivoMerma: merma.motivoMerma,
        cantidadMerma: merma.cantidadMerma,
        idUsuario: merma.idUsuario,
        nombreUsuario: usuarios.nombreUsuario,
        fechaMerma: merma.fechaMerma
      })
      .from(merma)
      .innerJoin(producto, eq(merma.idProducto, producto.idProducto))
      .innerJoin(usuarios, eq(merma.idUsuario, usuarios.idUsuario))
      .orderBy(desc(merma.fechaMerma))
      .limit(300)

    res.json({
      ok: true,
      mermas: filas.map((fila) => ({
        ...fila,
        cantidadMerma: Number(fila.cantidadMerma),
        fechaMerma: fila.fechaMerma.toISOString()
      }))
    })
  })

  return router
}
