import { z } from 'zod'

export const datosClienteSchema = z.object({
  nombreCliente: z.string().min(1),
  telefonoCliente: z.string().optional(),
  limiteCredito: z.number().nonnegative()
})
export type DatosCliente = z.infer<typeof datosClienteSchema>

export interface Cliente {
  idCliente: number
  nombreCliente: string
  telefonoCliente?: string
  limiteCredito: number
  saldoActual: number
}

export const datosAbonoSchema = z.object({
  monto: z.number().positive()
})
export type DatosAbono = z.infer<typeof datosAbonoSchema>

export type ResultadoListaClientes =
  | { ok: true; clientes: Cliente[] }
  | { ok: false; error: string }

export type ResultadoCliente = { ok: true; cliente: Cliente } | { ok: false; error: string }
