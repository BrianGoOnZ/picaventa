import { Router, type Request } from 'express'
import { eq } from 'drizzle-orm'
import { cliente, abono, type crearConexion } from '@picaventa/db'
import { datosClienteSchema, datosAbonoSchema, type PayloadJwt } from '@picaventa/shared'
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

function filaACliente(fila: typeof cliente.$inferSelect) {
  return {
    idCliente: fila.idCliente,
    nombreCliente: fila.nombreCliente,
    telefonoCliente: fila.telefonoCliente ?? undefined,
    limiteCredito: Number(fila.limiteCredito),
    saldoActual: Number(fila.saldoActual),
    pendienteRevision: fila.pendienteRevision
  }
}

export function crearRutasClientes(): Router {
  const router = Router()

  router.get('/', verificarJwt, async (req, res) => {
    const db = obtenerDb(req)
    const filas = await db.select().from(cliente)
    res.json({ ok: true, clientes: filas.map(filaACliente) })
  })

  router.post('/', verificarJwt, requierePermiso('crearClientes'), async (req, res) => {
    const datos = datosClienteSchema.safeParse(req.body)
    if (!datos.success) {
      res.status(400).json({ ok: false, error: datos.error.issues[0]?.message ?? 'Datos inválidos' })
      return
    }

    const payload = (req as RequestAutenticado).usuarioToken
    // Un cajero puede dar de alta un cliente a media venta a fiado, sin
    // esperar a un administrador; queda marcado para revisión posterior.
    const pendienteRevision = payload?.rolUsuario !== 'administrador'

    const db = obtenerDb(req)
    const [fila] = await db
      .insert(cliente)
      .values({
        nombreCliente: datos.data.nombreCliente,
        telefonoCliente: datos.data.telefonoCliente,
        limiteCredito: datos.data.limiteCredito.toString(),
        pendienteRevision
      })
      .returning()

    if (!fila) {
      res.status(500).json({ ok: false, error: 'No se pudo crear el cliente' })
      return
    }
    res.status(201).json({ ok: true, cliente: filaACliente(fila) })
  })

  router.put('/:id', verificarJwt, requiereAdministrador, async (req, res) => {
    const datos = datosClienteSchema.safeParse(req.body)
    if (!datos.success) {
      res.status(400).json({ ok: false, error: datos.error.issues[0]?.message ?? 'Datos inválidos' })
      return
    }

    const id = Number(req.params.id)
    const db = obtenerDb(req)
    const [fila] = await db
      .update(cliente)
      .set({
        nombreCliente: datos.data.nombreCliente,
        telefonoCliente: datos.data.telefonoCliente,
        limiteCredito: datos.data.limiteCredito.toString(),
        // Un administrador editando el cliente lo da por revisado.
        pendienteRevision: false
      })
      .where(eq(cliente.idCliente, id))
      .returning()

    if (!fila) {
      res.status(404).json({ ok: false, error: 'Cliente no encontrado' })
      return
    }
    res.json({ ok: true, cliente: filaACliente(fila) })
  })

  router.delete('/:id', verificarJwt, requiereAdministrador, async (req, res) => {
    const id = Number(req.params.id)
    const db = obtenerDb(req)

    try {
      await db.delete(cliente).where(eq(cliente.idCliente, id))
      res.json({ ok: true })
    } catch (err) {
      if (codigoError(err) === '23503') {
        res.status(409).json({
          ok: false,
          error: 'No se puede eliminar: el cliente tiene ventas o abonos registrados'
        })
        return
      }
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : String(err) })
    }
  })

  router.post('/:id/abonos', verificarJwt, async (req, res) => {
    const datos = datosAbonoSchema.safeParse(req.body)
    if (!datos.success) {
      res.status(400).json({ ok: false, error: datos.error.issues[0]?.message ?? 'Datos inválidos' })
      return
    }

    const id = Number(req.params.id)
    const db = obtenerDb(req)

    try {
      const actualizado = await db.transaction(async (tx) => {
        const [existente] = await tx.select().from(cliente).where(eq(cliente.idCliente, id))
        if (!existente) throw new Error('Cliente no encontrado')

        await tx.insert(abono).values({
          montoAbono: datos.data.monto.toString(),
          idCliente: id
        })

        const nuevoSaldo = Number(existente.saldoActual) - datos.data.monto
        const [fila] = await tx
          .update(cliente)
          .set({ saldoActual: nuevoSaldo.toString() })
          .where(eq(cliente.idCliente, id))
          .returning()

        return fila
      })

      if (!actualizado) {
        res.status(404).json({ ok: false, error: 'Cliente no encontrado' })
        return
      }
      res.json({ ok: true, cliente: filaACliente(actualizado) })
    } catch (err) {
      res.status(400).json({ ok: false, error: err instanceof Error ? err.message : String(err) })
    }
  })

  return router
}
