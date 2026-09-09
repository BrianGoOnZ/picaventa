import type { DatosNegocio } from './negocio.js'

// Integración con impresora térmica ESC/POS de tickets y cajón de dinero —
// ver apps/terminal/src/main/impresora.ts para el estado actual (todavía sin
// hardware conectado) y los pasos exactos para conectar una impresora real.
// El cajón de dinero casi siempre se abre con un pulso ESC/POS mandado por
// la misma conexión de la impresora, no por un dispositivo aparte.
export interface LineaTicketImpresion {
  nombreProducto: string
  cantidad: number
  unidadMedida: 'pieza' | 'kg'
  precioUnitario: number
  descuento: number
}

export interface DatosTicketImpresion {
  negocio: DatosNegocio | null
  folio: string
  fecha: string
  lineas: LineaTicketImpresion[]
  total: number
  metodoPago: string
  efectivoRecibido?: number
  clienteNombre?: string
}

export type ResultadoImpresionTicket = { ok: true } | { ok: false; error: string }
export type ResultadoAbrirCajon = { ok: true } | { ok: false; error: string }
