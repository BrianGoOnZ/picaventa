import { useEffect, useState, type KeyboardEvent } from 'react'
import type { DatosNegocio, Producto, UnidadMedida, VentaDetallada } from '@picaventa/shared'
import PantallaApartados from './PantallaApartados'
import TicketVenta, { type LineaTicket } from './TicketVenta'

interface LineaCarrito {
  idProducto: number
  nombreProducto: string
  unidadMedida: UnidadMedida
  precioVenta: number
  cantidad: number
  descuento: number
}

interface TicketPendiente {
  folio: string
  fecha: Date
  lineas: LineaTicket[]
  total: number
  metodoPago: string
  efectivoRecibido?: number
}

export default function PantallaVenta(): React.JSX.Element {
  const [vista, setVista] = useState<'venta' | 'apartados'>('venta')
  const [carrito, setCarrito] = useState<LineaCarrito[]>([])
  const [textoBusqueda, setTextoBusqueda] = useState('')
  const [resultados, setResultados] = useState<Producto[]>([])
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'tarjeta'>('efectivo')
  const [efectivoRecibido, setEfectivoRecibido] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [negocio, setNegocio] = useState<DatosNegocio | null>(null)
  const [ticket, setTicket] = useState<TicketPendiente | null>(null)

  useEffect(() => {
    void window.picaventa.obtenerNegocio().then((resultado) => {
      if (resultado.ok) setNegocio(resultado.negocio)
    })
  }, [])

  const total = carrito.reduce(
    (acumulado, linea) => acumulado + linea.cantidad * linea.precioVenta - linea.descuento,
    0
  )
  const efectivoNumero = Number(efectivoRecibido) || 0
  const cambio = metodoPago === 'efectivo' ? efectivoNumero - total : undefined

  function agregarAlCarrito(producto: Producto): void {
    setCarrito((actual) => {
      const existente = actual.find((l) => l.idProducto === producto.idProducto)
      if (existente) {
        return actual.map((l) =>
          l.idProducto === producto.idProducto ? { ...l, cantidad: l.cantidad + 1 } : l
        )
      }
      return [
        ...actual,
        {
          idProducto: producto.idProducto,
          nombreProducto: producto.nombreProducto,
          unidadMedida: producto.unidadMedida,
          precioVenta: producto.precioVenta,
          cantidad: 1,
          descuento: 0
        }
      ]
    })
    setTextoBusqueda('')
    setResultados([])
    setError('')
  }

  async function manejarBuscar(evento: KeyboardEvent<HTMLInputElement>): Promise<void> {
    if (evento.key !== 'Enter') return
    const texto = textoBusqueda.trim()
    if (!texto) return

    const porCodigo = await window.picaventa.listarProductos({ codigoBarras: texto })
    if (porCodigo.ok && porCodigo.productos.length === 1) {
      agregarAlCarrito(porCodigo.productos[0]!)
      return
    }

    const porNombre = await window.picaventa.listarProductos({ buscar: texto })
    if (porNombre.ok && porNombre.productos.length > 0) {
      setResultados(porNombre.productos)
      setError('')
    } else {
      setResultados([])
      setError('No se encontró ningún producto')
    }
  }

  function actualizarLinea(
    idProducto: number,
    campo: 'cantidad' | 'descuento',
    valor: number
  ): void {
    setCarrito((actual) =>
      actual.map((l) => (l.idProducto === idProducto ? { ...l, [campo]: valor } : l))
    )
  }

  function quitarLinea(idProducto: number): void {
    setCarrito((actual) => actual.filter((l) => l.idProducto !== idProducto))
  }

  function limpiarVenta(): void {
    setCarrito([])
    setEfectivoRecibido('')
    setMetodoPago('efectivo')
    setError('')
  }

  async function manejarCobrar(): Promise<void> {
    if (carrito.length === 0) return
    if (metodoPago === 'efectivo' && efectivoNumero < total) {
      setError('El efectivo recibido es menor al total')
      return
    }

    setEnviando(true)
    setError('')

    const resultado = await window.picaventa.crearVenta({
      lineas: carrito.map((l) => ({
        idProducto: l.idProducto,
        cantidad: l.cantidad,
        descuento: l.descuento
      })),
      metodoPago,
      estado: 'activa'
    })

    if (resultado.ok) {
      setTicket({
        folio: resultado.folio,
        fecha: new Date(),
        lineas: carrito.map((l) => ({
          nombreProducto: l.nombreProducto,
          cantidad: l.cantidad,
          unidadMedida: l.unidadMedida,
          precioUnitario: l.precioVenta,
          descuento: l.descuento
        })),
        total: resultado.total,
        metodoPago,
        efectivoRecibido: metodoPago === 'efectivo' ? efectivoNumero : undefined
      })
      limpiarVenta()
    } else {
      setError(resultado.error)
    }
    setEnviando(false)
  }

  async function manejarPausar(): Promise<void> {
    if (carrito.length === 0) return
    setEnviando(true)
    setError('')

    const resultado = await window.picaventa.crearVenta({
      lineas: carrito.map((l) => ({
        idProducto: l.idProducto,
        cantidad: l.cantidad,
        descuento: l.descuento
      })),
      metodoPago,
      estado: 'pausada'
    })

    if (resultado.ok) {
      limpiarVenta()
    } else {
      setError(resultado.error)
    }
    setEnviando(false)
  }

  function manejarReanudar(detalle: VentaDetallada): void {
    setCarrito(
      detalle.lineas.map((l) => ({
        idProducto: l.idProducto,
        nombreProducto: l.nombreProducto,
        unidadMedida: l.unidadMedida,
        precioVenta: l.precioUnitarioVenta,
        cantidad: l.cantidadVendida,
        descuento: l.descuentoAplicado
      }))
    )
    setVista('venta')
  }

  if (vista === 'apartados') {
    return (
      <PantallaApartados
        onVolver={() => setVista('venta')}
        onReanudar={manejarReanudar}
      />
    )
  }

  if (ticket) {
    return (
      <TicketVenta
        negocio={negocio}
        folio={ticket.folio}
        fecha={ticket.fecha}
        lineas={ticket.lineas}
        total={ticket.total}
        metodoPago={ticket.metodoPago}
        efectivoRecibido={ticket.efectivoRecibido}
        onCerrar={() => setTicket(null)}
      />
    )
  }

  return (
    <div className="flex h-full flex-col bg-neutral-100 p-6">
      <div className="mb-4 flex items-center gap-3">
        <input
          type="text"
          autoFocus
          placeholder="Código de barras o nombre del producto..."
          value={textoBusqueda}
          onChange={(evento) => setTextoBusqueda(evento.target.value)}
          onKeyDown={(evento) => void manejarBuscar(evento)}
          className="flex-1 rounded-md border border-neutral-300 px-4 py-3 text-base"
        />
        <button
          type="button"
          onClick={() => setVista('apartados')}
          className="rounded-md border border-neutral-300 px-4 py-3 text-sm"
        >
          Apartados
        </button>
      </div>

      {resultados.length > 0 && (
        <div className="mb-4 rounded-md border border-neutral-200 bg-white">
          {resultados.map((producto) => (
            <button
              key={producto.idProducto}
              type="button"
              onClick={() => agregarAlCarrito(producto)}
              className="block w-full border-b border-neutral-100 px-4 py-2 text-left text-sm last:border-0 hover:bg-neutral-50"
            >
              {producto.nombreProducto} — ${producto.precioVenta.toFixed(2)}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto rounded-lg border border-neutral-200 bg-white">
        {carrito.length === 0 ? (
          <p className="p-6 text-center text-sm text-neutral-500">El carrito está vacío</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-200 text-left text-xs uppercase text-neutral-500">
              <tr>
                <th className="px-4 py-2">Producto</th>
                <th className="px-4 py-2">Cantidad</th>
                <th className="px-4 py-2">Descuento</th>
                <th className="px-4 py-2 text-right">Subtotal</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {carrito.map((linea) => (
                <tr key={linea.idProducto} className="border-b border-neutral-100">
                  <td className="px-4 py-2">
                    {linea.nombreProducto}
                    <div className="text-xs text-neutral-500">
                      ${linea.precioVenta.toFixed(2)} / {linea.unidadMedida}
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      min="0"
                      step={linea.unidadMedida === 'kg' ? '0.001' : '1'}
                      value={linea.cantidad}
                      onChange={(evento) =>
                        actualizarLinea(linea.idProducto, 'cantidad', Number(evento.target.value))
                      }
                      className="w-24 rounded-md border border-neutral-300 px-2 py-1"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={linea.descuento}
                      onChange={(evento) =>
                        actualizarLinea(linea.idProducto, 'descuento', Number(evento.target.value))
                      }
                      className="w-24 rounded-md border border-neutral-300 px-2 py-1"
                    />
                  </td>
                  <td className="px-4 py-2 text-right">
                    ${(linea.cantidad * linea.precioVenta - linea.descuento).toFixed(2)}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => quitarLinea(linea.idProducto)}
                      className="text-xs text-red-600 underline"
                    >
                      Quitar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-4 flex items-end justify-between gap-6 rounded-lg border border-neutral-200 bg-white p-4">
        <div className="flex items-end gap-4">
          <label className="text-sm font-medium text-neutral-700">
            Método de pago
            <select
              value={metodoPago}
              onChange={(evento) => setMetodoPago(evento.target.value as 'efectivo' | 'tarjeta')}
              className="mt-1 block rounded-md border border-neutral-300 px-3 py-2 text-sm"
            >
              <option value="efectivo">Efectivo</option>
              <option value="tarjeta">Tarjeta</option>
            </select>
          </label>
          {metodoPago === 'efectivo' && (
            <label className="text-sm font-medium text-neutral-700">
              Recibido
              <input
                type="number"
                min="0"
                step="0.01"
                value={efectivoRecibido}
                onChange={(evento) => setEfectivoRecibido(evento.target.value)}
                className="mt-1 block w-32 rounded-md border border-neutral-300 px-3 py-2 text-sm"
              />
            </label>
          )}
          {metodoPago === 'efectivo' && cambio !== undefined && (
            <p className="pb-2 text-sm text-neutral-700">
              Cambio: <span className="font-semibold">${cambio >= 0 ? cambio.toFixed(2) : '—'}</span>
            </p>
          )}
        </div>

        <div className="text-right">
          <p className="text-2xl font-bold text-neutral-900">${total.toFixed(2)}</p>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              disabled={enviando || carrito.length === 0}
              onClick={() => void manejarPausar()}
              className="rounded-md border border-neutral-300 px-4 py-2 text-sm disabled:opacity-50"
            >
              Pausar
            </button>
            <button
              type="button"
              disabled={enviando || carrito.length === 0}
              onClick={() => void manejarCobrar()}
              className="rounded-md bg-neutral-900 px-6 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {enviando ? 'Procesando...' : 'Cobrar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
