import { useEffect, useState, type KeyboardEvent } from 'react'
import type { Compra, CompraDetallada, Producto, Proveedor, UnidadMedida } from '@picaventa/shared'
import { BOTON_PELIGRO, BOTON_SECUNDARIO } from '../lib/estilos'
import { confirmarCritico } from '../lib/confirmar'
import { formatoMoneda } from '../lib/formato'
import { useToast } from '../lib/ToastContext'

interface LineaPendiente {
  idProducto: number
  nombreProducto: string
  unidadMedida: UnidadMedida
  cantidad: string
  costoUnitario: string
}

export default function PantallaCompras(): React.JSX.Element {
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [idProveedor, setIdProveedor] = useState<number | ''>('')
  const [actualizarPrecioCompra, setActualizarPrecioCompra] = useState(true)

  const [codigo, setCodigo] = useState('')
  const [resultadosBusqueda, setResultadosBusqueda] = useState<Producto[]>([])
  const [lineas, setLineas] = useState<LineaPendiente[]>([])
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  const [compras, setCompras] = useState<Compra[]>([])
  const [cargandoCompras, setCargandoCompras] = useState(true)
  const [compraSeleccionada, setCompraSeleccionada] = useState<CompraDetallada | null>(null)

  const { mostrarToast } = useToast()

  async function cargarCompras(): Promise<void> {
    const resultado = await window.picaventa.listarCompras()
    if (resultado.ok) setCompras(resultado.compras)
    setCargandoCompras(false)
  }

  useEffect(() => {
    void window.picaventa.listarProveedores().then((resultado) => {
      if (resultado.ok) setProveedores(resultado.proveedores)
    })
    void cargarCompras()
  }, [])

  async function manejarBuscar(evento: KeyboardEvent<HTMLInputElement>): Promise<void> {
    if (evento.key !== 'Enter') return
    const texto = codigo.trim()
    if (!texto) return

    const porCodigo = await window.picaventa.listarProductos({ codigoBarras: texto })
    if (porCodigo.ok && porCodigo.productos.length === 1) {
      agregarLinea(porCodigo.productos[0]!)
      return
    }
    const porNombre = await window.picaventa.listarProductos({ buscar: texto })
    if (porNombre.ok && porNombre.productos.length >= 1) {
      setResultadosBusqueda(porNombre.productos)
    } else {
      setError(`No se encontró ningún producto con "${texto}"`)
    }
  }

  function agregarLinea(producto: Producto): void {
    setLineas((actual) => {
      if (actual.some((l) => l.idProducto === producto.idProducto)) return actual
      return [
        ...actual,
        {
          idProducto: producto.idProducto,
          nombreProducto: producto.nombreProducto,
          unidadMedida: producto.unidadMedida,
          cantidad: '',
          costoUnitario: producto.precioCompra?.toString() ?? ''
        }
      ]
    })
    setCodigo('')
    setResultadosBusqueda([])
    setError('')
  }

  function actualizarLinea(idProducto: number, campo: 'cantidad' | 'costoUnitario', valor: string): void {
    setLineas((actual) => actual.map((l) => (l.idProducto === idProducto ? { ...l, [campo]: valor } : l)))
  }

  function quitarLinea(idProducto: number): void {
    setLineas((actual) => actual.filter((l) => l.idProducto !== idProducto))
  }

  const totalCompra = lineas.reduce(
    (acc, l) => acc + (Number(l.cantidad) || 0) * (Number(l.costoUnitario) || 0),
    0
  )

  async function manejarConfirmar(): Promise<void> {
    if (!idProveedor || lineas.length === 0) return
    const lineasValidas = lineas.filter((l) => Number(l.cantidad) > 0 && Number(l.costoUnitario) >= 0)
    if (lineasValidas.length !== lineas.length) {
      setError('Revisa que todas las líneas tengan cantidad y costo válidos')
      return
    }

    const confirmado = await confirmarCritico({
      titulo: `¿Registrar esta compra por ${formatoMoneda(totalCompra)}?`,
      texto: 'Se sumará la cantidad de cada línea al inventario.',
      textoConfirmar: 'Sí, registrar compra',
      colorConfirmar: '#15803D'
    })
    if (!confirmado) return

    setEnviando(true)
    const resultado = await window.picaventa.crearCompra({
      idProveedor,
      lineas: lineasValidas.map((l) => ({
        idProducto: l.idProducto,
        cantidad: Number(l.cantidad),
        costoUnitario: Number(l.costoUnitario)
      })),
      actualizarPrecioCompra
    })

    if (resultado.ok) {
      mostrarToast('Compra registrada correctamente')
      setLineas([])
      setIdProveedor('')
      await cargarCompras()
    } else {
      mostrarToast(resultado.error, 'error')
    }
    setEnviando(false)
  }

  async function verDetalle(idCompra: number): Promise<void> {
    const resultado = await window.picaventa.obtenerCompra(idCompra)
    if (resultado.ok) setCompraSeleccionada(resultado)
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="w-full rounded-lg border border-borde bg-tarjeta p-4">
        <h2 className="mb-3 text-sm font-semibold text-texto-secundario">Registrar compra</h2>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-3">
          <label className="text-sm font-medium text-neutral-700">
            Proveedor
            <select
              value={idProveedor}
              onChange={(evento) => setIdProveedor(evento.target.value ? Number(evento.target.value) : '')}
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            >
              <option value="">Selecciona un proveedor...</option>
              {proveedores.map((p) => (
                <option key={p.idProveedor} value={p.idProveedor}>
                  {p.nombreProveedor}
                  {p.nombreEmpresa ? ` — ${p.nombreEmpresa}` : ''}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm font-medium text-neutral-700">
            Escanea o busca cada producto de la factura
            <input
              type="text"
              placeholder="Código de barras o nombre..."
              value={codigo}
              onChange={(evento) => setCodigo(evento.target.value)}
              onKeyDown={(evento) => void manejarBuscar(evento)}
              className="mt-1 w-full rounded-md border border-neutral-300 px-4 py-3 text-base"
            />
          </label>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        {resultadosBusqueda.length > 0 && (
          <div className="mt-2 rounded-md border border-borde">
            {resultadosBusqueda.map((producto) => (
              <button
                key={producto.idProducto}
                type="button"
                onClick={() => agregarLinea(producto)}
                className="block w-full border-b border-borde px-4 py-2 text-left text-sm last:border-0 hover:bg-arena"
              >
                {producto.nombreProducto}
              </button>
            ))}
          </div>
        )}

        <label className="mt-3 flex items-center gap-1.5 text-sm text-texto-secundario">
          <input
            type="checkbox"
            checked={actualizarPrecioCompra}
            onChange={(evento) => setActualizarPrecioCompra(evento.target.checked)}
          />
          Actualizar el precio de compra de estos productos al costo facturado
        </label>
      </div>

      {lineas.length > 0 && (
        <div className="w-full rounded-lg border border-borde bg-tarjeta p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-texto-secundario">
                Líneas de la factura ({lineas.length})
              </h2>
              <span className="font-display text-lg font-semibold text-onix">
                {formatoMoneda(totalCompra)}
              </span>
            </div>
            <ul className="flex flex-col gap-2">
              {lineas.map((linea) => (
                <li key={linea.idProducto} className="rounded-lg border border-borde p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="min-w-0 flex-1 truncate text-onix">{linea.nombreProducto}</span>
                    <button
                      type="button"
                      onClick={() => quitarLinea(linea.idProducto)}
                      className={`shrink-0 ${BOTON_PELIGRO}`}
                    >
                      Quitar
                    </button>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <label className="text-xs text-texto-secundario">
                      Cantidad ({linea.unidadMedida})
                      <input
                        type="number"
                        min="0.001"
                        step={linea.unidadMedida === 'kg' ? '0.001' : '1'}
                        value={linea.cantidad}
                        onChange={(evento) => actualizarLinea(linea.idProducto, 'cantidad', evento.target.value)}
                        className="mt-1 block w-24 rounded border border-borde px-2 py-1"
                      />
                    </label>
                    <label className="text-xs text-texto-secundario">
                      Costo unitario
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={linea.costoUnitario}
                        onChange={(evento) =>
                          actualizarLinea(linea.idProducto, 'costoUnitario', evento.target.value)
                        }
                        className="mt-1 block w-24 rounded border border-borde px-2 py-1"
                      />
                    </label>
                  </div>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => void manejarConfirmar()}
              disabled={enviando || !idProveedor}
              className="mt-3 w-full rounded-md bg-exito px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              {enviando ? 'Registrando...' : 'Confirmar y registrar compra'}
            </button>
        </div>
      )}

      <div className="w-full rounded-lg border border-borde bg-tarjeta p-4">
        <h2 className="mb-3 text-sm font-semibold text-texto-secundario">Compras recientes</h2>
        {cargandoCompras ? (
          <p className="text-sm text-texto-secundario">Cargando...</p>
        ) : compras.length === 0 ? (
          <p className="text-sm text-texto-secundario">Aún no hay compras registradas.</p>
        ) : (
          <ul className="flex max-h-96 flex-col gap-1.5 overflow-y-auto">
            {compras.map((c) => (
              <li key={c.idCompra}>
                <button
                  type="button"
                  onClick={() => void verDetalle(c.idCompra)}
                  className="flex w-full items-center justify-between rounded-lg border border-borde p-3 text-left text-sm hover:bg-arena"
                >
                  <span className="text-onix">
                    {c.nombreProveedor}
                    <span className="ml-2 text-xs text-texto-secundario">
                      {new Date(c.fechaCompra).toLocaleDateString('es-MX')}
                    </span>
                  </span>
                  <span className="font-semibold text-onix">{formatoMoneda(c.total)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {compraSeleccionada && (
          <div className="mt-4 rounded-md border border-borde bg-arena p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold text-onix">
                {compraSeleccionada.compra.nombreProveedor}
              </p>
              <button
                type="button"
                onClick={() => setCompraSeleccionada(null)}
                className={BOTON_SECUNDARIO}
              >
                Cerrar
              </button>
            </div>
            <p className="mb-2 text-xs text-texto-secundario">
              {new Date(compraSeleccionada.compra.fechaCompra).toLocaleString('es-MX')} · registrada por{' '}
              {compraSeleccionada.compra.nombreUsuario}
            </p>
            <ul className="flex flex-col gap-1 text-xs text-texto-secundario">
              {compraSeleccionada.lineas.map((l) => (
                <li key={l.idProducto}>
                  {l.cantidadComprada} {l.unidadMedida} × {l.nombreProducto} — {formatoMoneda(l.costoUnitario)} c/u
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
