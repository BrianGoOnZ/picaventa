import { useEffect, useRef } from 'react'
import type { DatosNegocio } from '@picaventa/shared'
import { formatoMoneda } from '../lib/formato'

export interface LineaTicket {
  nombreProducto: string
  cantidad: number
  unidadMedida: 'pieza' | 'kg'
  precioUnitario: number
  descuento: number
}

interface Props {
  negocio: DatosNegocio | null
  folio: string
  fecha: Date
  lineas: LineaTicket[]
  total: number
  metodoPago: string
  efectivoRecibido?: number
  clienteNombre?: string
  onCerrar: () => void
}

const NOMBRES_METODO_PAGO: Record<string, string> = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  fiado: 'Fiado'
}

export default function TicketVenta({
  negocio,
  folio,
  fecha,
  lineas,
  total,
  metodoPago,
  efectivoRecibido,
  clienteNombre,
  onCerrar
}: Props): React.JSX.Element {
  const cambio = efectivoRecibido !== undefined ? efectivoRecibido - total : undefined
  const cajonAbiertoRef = useRef(false)

  useEffect(() => {
    // El cajón de dinero se abre solo al completarse una venta en efectivo,
    // igual que en cualquier POS — hoy no hay impresora/cajón conectados,
    // así que esto simplemente falla en silencio (ver main/impresora.ts).
    if (metodoPago === 'efectivo' && !cajonAbiertoRef.current) {
      cajonAbiertoRef.current = true
      void window.picaventa.abrirCajonDinero()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function manejarImprimir(): Promise<void> {
    const resultado = await window.picaventa.imprimirTicketTermico({
      negocio,
      folio,
      fecha: fecha.toISOString(),
      lineas,
      total,
      metodoPago,
      efectivoRecibido,
      clienteNombre
    })
    // Sin impresora térmica conectada todavía, siempre cae aquí — se usa el
    // diálogo de impresión del sistema (ver main/impresora.ts).
    if (!resultado.ok) window.print()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/80 p-8">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .ticket-imprimible, .ticket-imprimible * { visibility: visible; }
          .ticket-imprimible { position: absolute; top: 0; left: 0; width: 100%; }
        }
      `}</style>
      <div className="flex max-h-full w-full max-w-sm flex-col rounded-lg bg-white shadow-lg">
        <div className="ticket-imprimible overflow-y-auto p-6 font-mono text-xs text-neutral-900">
          {negocio?.logoDatos && (
            <img src={negocio.logoDatos} alt="" className="mx-auto mb-2 h-16 w-auto" />
          )}
          <p className="text-center text-sm font-bold">{negocio?.nombreNegocio ?? 'PicaVenta'}</p>
          {negocio?.direccionNegocio && (
            <p className="text-center">{negocio.direccionNegocio}</p>
          )}
          {negocio?.telefonoNegocio && <p className="text-center">{negocio.telefonoNegocio}</p>}
          <div className="my-2 border-t border-dashed border-neutral-400" />
          <p>Folio: {folio}</p>
          <p>Fecha: {fecha.toLocaleString('es-MX')}</p>
          <div className="my-2 border-t border-dashed border-neutral-400" />
          {lineas.map((linea, indice) => (
            <div key={indice} className="mb-1">
              <p>{linea.nombreProducto}</p>
              <div className="flex justify-between">
                <span>
                  {linea.cantidad} {linea.unidadMedida} x {formatoMoneda(linea.precioUnitario)}
                  {linea.descuento > 0 ? ` (−${formatoMoneda(linea.descuento)})` : ''}
                </span>
                <span>
                  {formatoMoneda(linea.cantidad * linea.precioUnitario - linea.descuento)}
                </span>
              </div>
            </div>
          ))}
          <div className="my-2 border-t border-dashed border-neutral-400" />
          <div className="flex justify-between text-sm font-bold">
            <span>TOTAL</span>
            <span>{formatoMoneda(total)}</span>
          </div>
          <p className="mt-1">Método de pago: {NOMBRES_METODO_PAGO[metodoPago] ?? metodoPago}</p>
          {clienteNombre && <p>Cliente: {clienteNombre}</p>}
          {efectivoRecibido !== undefined && (
            <>
              <p>Recibido: {formatoMoneda(efectivoRecibido)}</p>
              <p>Cambio: {formatoMoneda(cambio ?? 0)}</p>
            </>
          )}
          <p className="mt-3 text-center">¡Gracias por su compra!</p>
        </div>
        <div className="flex gap-2 border-t border-neutral-200 p-4">
          <button
            type="button"
            onClick={onCerrar}
            className="flex-1 rounded-md border border-neutral-300 px-4 py-2 text-sm"
          >
            Nueva venta
          </button>
          <button
            type="button"
            onClick={() => void manejarImprimir()}
            className="flex-1 rounded-md bg-cobre hover:bg-cobre-oscuro px-4 py-2 text-sm font-semibold text-white"
          >
            Imprimir
          </button>
        </div>
      </div>
    </div>
  )
}
