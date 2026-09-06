import type { DatosNegocio } from '@picaventa/shared'

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
  onCerrar: () => void
}

export default function TicketVenta({
  negocio,
  folio,
  fecha,
  lineas,
  total,
  metodoPago,
  efectivoRecibido,
  onCerrar
}: Props): React.JSX.Element {
  const cambio = efectivoRecibido !== undefined ? efectivoRecibido - total : undefined

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
                  {linea.cantidad} {linea.unidadMedida} x ${linea.precioUnitario.toFixed(2)}
                  {linea.descuento > 0 ? ` (−$${linea.descuento.toFixed(2)})` : ''}
                </span>
                <span>
                  $
                  {(linea.cantidad * linea.precioUnitario - linea.descuento).toFixed(2)}
                </span>
              </div>
            </div>
          ))}
          <div className="my-2 border-t border-dashed border-neutral-400" />
          <div className="flex justify-between text-sm font-bold">
            <span>TOTAL</span>
            <span>${total.toFixed(2)}</span>
          </div>
          <p className="mt-1">
            Método de pago: {metodoPago === 'efectivo' ? 'Efectivo' : 'Tarjeta'}
          </p>
          {efectivoRecibido !== undefined && (
            <>
              <p>Recibido: ${efectivoRecibido.toFixed(2)}</p>
              <p>Cambio: ${cambio?.toFixed(2)}</p>
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
            onClick={() => window.print()}
            className="flex-1 rounded-md bg-neutral-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Imprimir
          </button>
        </div>
      </div>
    </div>
  )
}
