import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import type { Producto } from '@picaventa/shared'
import { useToast } from '../lib/ToastContext'

interface EntradaHistorial {
  id: number
  nombreProducto: string
  unidadMedida: Producto['unidadMedida']
  cantidadAgregada: number
  nuevoTotal: number
  hora: string
}

let siguienteIdHistorial = 1

export default function PantallaEntradaInventario(): React.JSX.Element {
  const [codigo, setCodigo] = useState('')
  const [resultados, setResultados] = useState<Producto[]>([])
  const [productoEncontrado, setProductoEncontrado] = useState<Producto | null>(null)
  const [cantidad, setCantidad] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [historial, setHistorial] = useState<EntradaHistorial[]>([])
  const { mostrarToast } = useToast()
  const inputCodigoRef = useRef<HTMLInputElement>(null)
  const inputCantidadRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputCodigoRef.current?.focus()
  }, [])

  function seleccionarProducto(producto: Producto): void {
    setProductoEncontrado(producto)
    setResultados([])
    setCodigo('')
    setError('')
    setTimeout(() => inputCantidadRef.current?.focus(), 0)
  }

  async function manejarBuscar(evento: KeyboardEvent<HTMLInputElement>): Promise<void> {
    if (evento.key !== 'Enter') return
    const texto = codigo.trim()
    if (!texto) return

    const porCodigo = await window.picaventa.listarProductos({ codigoBarras: texto })
    if (porCodigo.ok && porCodigo.productos.length === 1) {
      seleccionarProducto(porCodigo.productos[0]!)
      return
    }

    const porNombre = await window.picaventa.listarProductos({ buscar: texto })
    if (porNombre.ok && porNombre.productos.length === 1) {
      seleccionarProducto(porNombre.productos[0]!)
    } else if (porNombre.ok && porNombre.productos.length > 1) {
      setResultados(porNombre.productos)
      setError('')
    } else {
      setResultados([])
      setError('No se encontró ningún producto')
    }
  }

  function cancelarSeleccion(): void {
    setProductoEncontrado(null)
    setCantidad('')
    setError('')
    inputCodigoRef.current?.focus()
  }

  async function manejarAgregar(evento: FormEvent): Promise<void> {
    evento.preventDefault()
    if (!productoEncontrado) return
    const monto = Number(cantidad)
    if (!monto || monto <= 0) return

    setEnviando(true)
    setError('')
    const resultado = await window.picaventa.registrarEntradaInventario(
      productoEncontrado.idProducto,
      { cantidad: monto }
    )

    if (resultado.ok) {
      setHistorial((actual) => [
        {
          id: siguienteIdHistorial++,
          nombreProducto: resultado.producto.nombreProducto,
          unidadMedida: resultado.producto.unidadMedida,
          cantidadAgregada: monto,
          nuevoTotal: resultado.producto.stockActual,
          hora: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
        },
        ...actual
      ])
      mostrarToast(`+${monto} ${resultado.producto.nombreProducto} — nuevo stock: ${resultado.producto.stockActual}`)
      setProductoEncontrado(null)
      setCantidad('')
      inputCodigoRef.current?.focus()
    } else {
      setError(resultado.error)
    }
    setEnviando(false)
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-texto-secundario">
        Escanea o busca el producto, indica cuánto llegó de mercancía nueva y se suma al stock
        actual — sin abrir el formulario completo de edición.
      </p>

      <div className="rounded-lg border border-borde bg-tarjeta p-4">
        {!productoEncontrado ? (
          <>
            <label className="text-sm font-medium text-neutral-700">
              Código de barras o nombre del producto
              <input
                ref={inputCodigoRef}
                type="text"
                autoFocus
                placeholder="Escanea o escribe para buscar..."
                value={codigo}
                onChange={(evento) => setCodigo(evento.target.value)}
                onKeyDown={(evento) => void manejarBuscar(evento)}
                className="mt-1 w-full rounded-md border border-neutral-300 px-4 py-3 text-base"
              />
            </label>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            {resultados.length > 0 && (
              <div className="mt-2 rounded-md border border-borde">
                {resultados.map((producto) => (
                  <button
                    key={producto.idProducto}
                    type="button"
                    onClick={() => seleccionarProducto(producto)}
                    className="block w-full border-b border-borde px-4 py-2 text-left text-sm last:border-0 hover:bg-arena"
                  >
                    {producto.nombreProducto}{' '}
                    <span className="text-texto-secundario">
                      (stock actual: {producto.stockActual} {producto.unidadMedida})
                    </span>
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <form onSubmit={manejarAgregar} className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-display text-lg font-semibold text-onix">
                  {productoEncontrado.nombreProducto}
                </p>
                <p className="text-sm text-texto-secundario">
                  Stock actual: {productoEncontrado.stockActual} {productoEncontrado.unidadMedida}
                </p>
              </div>
              <button type="button" onClick={cancelarSeleccion} className="text-sm text-texto-secundario underline">
                Cambiar producto
              </button>
            </div>
            <label className="text-sm font-medium text-neutral-700">
              Cantidad recibida
              <input
                ref={inputCantidadRef}
                type="number"
                min="0"
                step={productoEncontrado.unidadMedida === 'kg' ? '0.001' : '1'}
                required
                autoFocus
                value={cantidad}
                onChange={(evento) => setCantidad(evento.target.value)}
                className="mt-1 w-full rounded-md border border-neutral-300 px-4 py-3 text-base"
              />
            </label>
            {productoEncontrado && cantidad && Number(cantidad) > 0 && (
              <p className="text-sm text-texto-secundario">
                Nuevo stock:{' '}
                <span className="font-semibold text-onix">
                  {(productoEncontrado.stockActual + Number(cantidad)).toFixed(
                    productoEncontrado.unidadMedida === 'kg' ? 3 : 0
                  )}{' '}
                  {productoEncontrado.unidadMedida}
                </span>
              </p>
            )}
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={enviando}
              className="rounded-md bg-cobre px-4 py-3 text-sm font-semibold text-white hover:bg-cobre-oscuro disabled:opacity-50"
            >
              {enviando ? 'Agregando...' : 'Agregar al inventario'}
            </button>
          </form>
        )}
      </div>

      <div className="rounded-lg border border-borde bg-tarjeta p-4">
        <h2 className="mb-3 text-sm font-semibold text-texto-secundario">
          Entradas de esta sesión {historial.length > 0 && `(${historial.length})`}
        </h2>
        {historial.length === 0 ? (
          <p className="text-sm text-texto-secundario">Aún no has registrado ninguna entrada.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {historial.map((entrada) => (
              <li
                key={entrada.id}
                className="flex items-center justify-between rounded-lg border border-borde p-3 text-sm"
              >
                <span className="text-onix">{entrada.nombreProducto}</span>
                <span className="text-texto-secundario">
                  <span className="font-semibold text-exito">
                    +{entrada.cantidadAgregada} {entrada.unidadMedida}
                  </span>{' '}
                  → {entrada.nuevoTotal} {entrada.unidadMedida} · {entrada.hora}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
