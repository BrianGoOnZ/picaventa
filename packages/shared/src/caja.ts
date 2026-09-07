import { z } from 'zod'

export const datosMovimientoCajaSchema = z.object({
  tipo: z.enum(['retiro', 'gasto']),
  monto: z.number().positive(),
  concepto: z.string().min(1),
  // PIN de quien esté logueado (RNF-04) — se reautentica a sí mismo, no
  // necesariamente un administrador, para que quede trazable quién sacó
  // el dinero de la caja.
  pin: z.string().regex(/^\d{4}$/, 'El PIN debe tener exactamente 4 dígitos')
})
export type DatosMovimientoCaja = z.infer<typeof datosMovimientoCajaSchema>

export const datosCorteCajaSchema = z.object({
  fondoInicial: z.number().nonnegative(),
  totalContadoSistema: z.number().nonnegative()
})
export type DatosCorteCaja = z.infer<typeof datosCorteCajaSchema>

export interface DesgloseMetodoPago {
  efectivo: number
  tarjeta: number
  fiado: number
}

export interface ResumenCorteCaja {
  fechaInicio: string
  fechaCorte: string
  fondoInicial: number
  ventasPorMetodo: DesgloseMetodoPago
  totalVendido: number
  totalRetirosGastos: number
  // fondoInicial + efectivo vendido − retiros/gastos. Tarjeta y fiado NO
  // entran aquí porque no meten efectivo físico a la caja.
  totalEsperado: number
  totalContadoSistema: number
  diferencia: number
}

export type ResultadoCorteCaja =
  | { ok: true; resumen: ResumenCorteCaja }
  | { ok: false; error: string }

export type ResultadoMovimientoCaja = { ok: true } | { ok: false; error: string }

export interface ProductoReporte {
  idProducto: number
  nombreProducto: string
  cantidad: number
  ingresos: number
  margenEstimado: number
}

export interface ReporteVentas {
  desde: string
  hasta: string
  totalVendido: number
  numeroVentas: number
  porMetodo: DesgloseMetodoPago
  productos: ProductoReporte[]
}

export type ResultadoReporteVentas =
  | { ok: true; reporte: ReporteVentas }
  | { ok: false; error: string }

export interface VentaPorDia {
  fecha: string
  total: number
}

export type ResultadoVentasPorDia =
  | { ok: true; dias: VentaPorDia[] }
  | { ok: false; error: string }

export interface VentaPorCajero {
  idUsuario: number
  nombreUsuario: string
  total: number
}

export type ResultadoVentasPorCajero =
  | { ok: true; cajeros: VentaPorCajero[] }
  | { ok: false; error: string }

export interface CorteCajaResumen {
  idCorte: number
  fechaCorte: string
  nombreUsuario: string
  fondoInicial: number
  totalVendido: number
  totalEsperado: number
  totalContadoSistema: number
  diferencia: number
}

export type ResultadoListaCortes =
  | { ok: true; cortes: CorteCajaResumen[] }
  | { ok: false; error: string }
