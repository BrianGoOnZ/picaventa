import { useEffect, useMemo, useState, type FormEvent, type KeyboardEvent } from 'react'
import type {
  Categoria,
  Cliente,
  DatosNegocio,
  Producto,
  UnidadMedida,
  VentaDetallada
} from '@picaventa/shared'
import PantallaApartados from './PantallaApartados'
import TarjetaProducto from '../componentes/TarjetaProducto'
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
  clienteNombre?: string
}

export default function PantallaVenta(): React.JSX.Element {
  const [vista, setVista] = useState<'venta' | 'apartados'>('venta')
  const [carrito, setCarrito] = useState<LineaCarrito[]>([])
  const [textoBusqueda, setTextoBusqueda] = useState('')
  const [productos, setProductos] = useState<Producto[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [categoriaFiltro, setCategoriaFiltro] = useState<number | 'todas'>('todas')
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'tarjeta' | 'fiado'>('efectivo')
  const [efectivoRecibido, setEfectivoRecibido] = useState('')
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [idClienteSeleccionado, setIdClienteSeleccionado] = useState<number | null>(null)
  const [mostrarNuevoCliente, setMostrarNuevoCliente] = useState(false)
  const [nuevoClienteNombre, setNuevoClienteNombre] = useState('')
  const [nuevoClienteLimite, setNuevoClienteLimite] = useState('')
  const [creandoCliente, setCreandoCliente] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [negocio, setNegocio] = useState<DatosNegocio | null>(null)
  const [ticket, setTicket] = useState<TicketPendiente | null>(null)

  useEffect(() => {
    void window.picaventa.obtenerNegocio().then((resultado) => {
      if (resultado.ok) setNegocio(resultado.negocio)
    })
    void window.picaventa.listarClientes().then((resultado) => {
      if (resultado.ok) setClientes(resultado.clientes)
    })
    void window.picaventa.listarCategorias().then((resultado) => {
      if (resultado.ok) setCategorias(resultado.categorias)
    })
    void window.picaventa.listarProductos().then((resultado) => {
      if (resultado.ok) setProductos(resultado.productos)
    })
  }, [])

  const colorPorCategoria = new Map(categorias.map((c) => [c.idCategoria, c.colorCategoria]))
  const COLOR_SIN_CATEGORIA = '#57534E'

  const productosFiltrados = useMemo(() => {
    const texto = textoBusqueda.trim().toLowerCase()
    return productos.filter((p) => {
      const coincideCategoria = categoriaFiltro === 'todas' || p.idCategoria === categoriaFiltro
      const coincideTexto = !texto || p.nombreProducto.toLowerCase().includes(texto)
      return coincideCategoria && coincideTexto
    })
  }, [productos, categoriaFiltro, textoBusqueda])

  const total = carrito.reduce(
    (acumulado, linea) => acumulado + linea.cantidad * linea.precioVenta - linea.descuento,
    0
  )
  const efectivoNumero = Number(efectivoRecibido) || 0
  const cambio = metodoPago === 'efectivo' ? efectivoNumero - total : undefined

  const clienteSeleccionado =
    metodoPago === 'fiado'
      ? (clientes.find((c) => c.idCliente === idClienteSeleccionado) ?? null)
      : null
  const clienteYaBloqueado =
    clienteSeleccionado !== null && clienteSeleccionado.saldoActual > clienteSeleccionado.limiteCredito
  const clienteExcederiaConEstaVenta =
    clienteSeleccionado !== null &&
    !clienteYaBloqueado &&
    clienteSeleccionado.saldoActual + total > clienteSeleccionado.limiteCredito

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
    setError('')
  }

  async function manejarBuscar(evento: KeyboardEvent<HTMLInputElement>): Promise<void> {
    if (evento.key !== 'Enter') return
    const texto = textoBusqueda.trim()
    if (!texto) return

    // Código de barras exacto (lector de código de barras): agrega directo.
    const porCodigo = await window.picaventa.listarProductos({ codigoBarras: texto })
    if (porCodigo.ok && porCodigo.productos.length === 1) {
      agregarAlCarrito(porCodigo.productos[0]!)
      return
    }

    // Si el texto ya dejó un solo producto visible en la cuadrícula, Enter
    // lo agrega directamente sin tener que dar clic.
    if (productosFiltrados.length === 1) {
      agregarAlCarrito(productosFiltrados[0]!)
      return
    }
    setError(productosFiltrados.length === 0 ? 'No se encontró ningún producto' : '')
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
    setIdClienteSeleccionado(null)
    setError('')
  }

  async function manejarCobrar(): Promise<void> {
    if (carrito.length === 0) return
    if (metodoPago === 'efectivo' && efectivoNumero < total) {
      setError('El efectivo recibido es menor al total')
      return
    }
    if (metodoPago === 'fiado') {
      if (!idClienteSeleccionado) {
        setError('Debe seleccionar un cliente para vender a fiado')
        return
      }
      if (clienteYaBloqueado) {
        setError('Este cliente ya excede su límite de crédito — debe abonar antes de comprar a fiado')
        return
      }
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
      estado: 'activa',
      idCliente: metodoPago === 'fiado' ? (idClienteSeleccionado ?? undefined) : undefined
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
        efectivoRecibido: metodoPago === 'efectivo' ? efectivoNumero : undefined,
        clienteNombre: clienteSeleccionado?.nombreCliente
      })
      limpiarVenta()
    } else {
      setError(resultado.error)
    }
    setEnviando(false)
  }

  async function manejarPausar(): Promise<void> {
    if (carrito.length === 0) return
    if (metodoPago === 'fiado' && !idClienteSeleccionado) {
      setError('Debe seleccionar un cliente para vender a fiado')
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
      estado: 'pausada',
      idCliente: metodoPago === 'fiado' ? (idClienteSeleccionado ?? undefined) : undefined
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
    // Restaurar el método de pago y el cliente originales del apartado —
    // sin esto, al reanudar siempre quedaba en "efectivo" sin cliente,
    // perdiendo silenciosamente que la venta era a tarjeta o a fiado.
    setMetodoPago(detalle.venta.metodoPago as 'efectivo' | 'tarjeta' | 'fiado')
    setIdClienteSeleccionado(detalle.venta.idCliente ?? null)
    setEfectivoRecibido('')
    setVista('venta')
  }

  async function manejarCrearClienteRapido(evento: FormEvent<HTMLFormElement>): Promise<void> {
    evento.preventDefault()
    if (!nuevoClienteNombre.trim()) return

    setCreandoCliente(true)
    setError('')
    const resultado = await window.picaventa.crearCliente({
      nombreCliente: nuevoClienteNombre.trim(),
      limiteCredito: Number(nuevoClienteLimite) || 0
    })

    if (resultado.ok) {
      setClientes((actual) => [...actual, resultado.cliente])
      setIdClienteSeleccionado(resultado.cliente.idCliente)
      setNuevoClienteNombre('')
      setNuevoClienteLimite('')
      setMostrarNuevoCliente(false)
    } else {
      setError(resultado.error)
    }
    setCreandoCliente(false)
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
        clienteNombre={ticket.clienteNombre}
        onCerrar={() => setTicket(null)}
      />
    )
  }

  return (
    <div className="flex h-full gap-4">
      {/* Columna izquierda: búsqueda, categorías y cuadrícula de productos */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="mb-3 flex items-center gap-3">
          <input
            type="text"
            autoFocus
            placeholder="Código de barras o nombre del producto..."
            value={textoBusqueda}
            onChange={(evento) => setTextoBusqueda(evento.target.value)}
            onKeyDown={(evento) => void manejarBuscar(evento)}
            className="flex-1 rounded-md border border-borde bg-tarjeta px-4 py-3 text-base"
          />
          <button
            type="button"
            onClick={() => setVista('apartados')}
            className="shrink-0 rounded-md border border-borde bg-tarjeta px-4 py-3 text-sm"
          >
            Apartados
          </button>
        </div>

        <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setCategoriaFiltro('todas')}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium ${
              categoriaFiltro === 'todas'
                ? 'border-onix bg-onix text-white'
                : 'border-borde bg-tarjeta text-texto-secundario'
            }`}
          >
            Todas
          </button>
          {categorias.map((c) => (
            <button
              key={c.idCategoria}
              type="button"
              onClick={() => setCategoriaFiltro(c.idCategoria)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${
                categoriaFiltro === c.idCategoria
                  ? 'border-transparent text-white'
                  : 'border-borde bg-tarjeta text-texto-secundario'
              }`}
              style={categoriaFiltro === c.idCategoria ? { backgroundColor: c.colorCategoria } : undefined}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: c.colorCategoria }}
              />
              {c.nombreCategoria}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {productosFiltrados.length === 0 ? (
            <p className="p-6 text-center text-sm text-texto-secundario">
              No se encontraron productos.
            </p>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(112px,1fr))] gap-3">
              {productosFiltrados.map((producto) => (
                <TarjetaProducto
                  key={producto.idProducto}
                  producto={producto}
                  colorCategoria={
                    (producto.idCategoria && colorPorCategoria.get(producto.idCategoria)) ||
                    COLOR_SIN_CATEGORIA
                  }
                  onSeleccionar={agregarAlCarrito}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Columna derecha: carrito y cobro */}
      <div className="flex w-[380px] shrink-0 flex-col rounded-lg border border-borde bg-tarjeta">
        <div className="flex-1 overflow-y-auto p-3">
          {carrito.length === 0 ? (
            <p className="p-6 text-center text-sm text-texto-secundario">El carrito está vacío</p>
          ) : (
            carrito.map((linea) => (
              <div key={linea.idProducto} className="border-b border-borde py-2 text-sm last:border-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 flex-1 truncate font-medium text-onix">
                    {linea.nombreProducto}
                  </p>
                  <span className="shrink-0 tabular-nums font-medium text-onix">
                    ${(linea.cantidad * linea.precioVenta - linea.descuento).toFixed(2)}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-texto-secundario">
                  <label className="flex items-center gap-1">
                    Cant.
                    <input
                      type="number"
                      min="0"
                      step={linea.unidadMedida === 'kg' ? '0.001' : '1'}
                      value={linea.cantidad}
                      onChange={(evento) =>
                        actualizarLinea(linea.idProducto, 'cantidad', Number(evento.target.value))
                      }
                      className="w-14 rounded border border-borde px-1 py-0.5 text-onix"
                    />
                  </label>
                  <label className="flex items-center gap-1">
                    Desc.
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={linea.descuento}
                      onChange={(evento) =>
                        actualizarLinea(linea.idProducto, 'descuento', Number(evento.target.value))
                      }
                      className="w-14 rounded border border-borde px-1 py-0.5 text-onix"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => quitarLinea(linea.idProducto)}
                    className="ml-auto text-peligro underline"
                  >
                    Quitar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-borde p-3">
          <label className="text-xs font-medium text-texto-secundario">
            Método de pago
            <select
              value={metodoPago}
              onChange={(evento) => {
                setMetodoPago(evento.target.value as 'efectivo' | 'tarjeta' | 'fiado')
                setIdClienteSeleccionado(null)
              }}
              className="mt-1 block w-full rounded-md border border-borde px-3 py-2 text-sm text-onix"
            >
              <option value="efectivo">Efectivo</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="fiado">Fiado</option>
            </select>
          </label>

          {metodoPago === 'efectivo' && (
            <div className="flex items-end gap-3">
              <label className="flex-1 text-xs font-medium text-texto-secundario">
                Recibido
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={efectivoRecibido}
                  onChange={(evento) => setEfectivoRecibido(evento.target.value)}
                  className="mt-1 block w-full rounded-md border border-borde px-3 py-2 text-sm text-onix"
                />
              </label>
              {cambio !== undefined && (
                <p className="pb-2 text-sm text-texto-secundario">
                  Cambio:{' '}
                  <span className="font-semibold text-onix">
                    ${cambio >= 0 ? cambio.toFixed(2) : '—'}
                  </span>
                </p>
              )}
            </div>
          )}

          {metodoPago === 'fiado' && !mostrarNuevoCliente && (
            <label className="text-xs font-medium text-texto-secundario">
              Cliente
              <div className="mt-1 flex flex-col gap-2">
                <select
                  value={idClienteSeleccionado ?? ''}
                  onChange={(evento) =>
                    setIdClienteSeleccionado(evento.target.value ? Number(evento.target.value) : null)
                  }
                  className="block w-full rounded-md border border-borde px-3 py-2 text-sm text-onix"
                >
                  <option value="">Selecciona un cliente...</option>
                  {clientes.map((c) => (
                    <option key={c.idCliente} value={c.idCliente}>
                      {c.nombreCliente} (debe ${c.saldoActual.toFixed(2)} de $
                      {c.limiteCredito.toFixed(2)})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setMostrarNuevoCliente(true)}
                  className="self-start rounded-md border border-borde px-3 py-1.5 text-xs"
                >
                  + Nuevo cliente
                </button>
              </div>
            </label>
          )}
          {metodoPago === 'fiado' && mostrarNuevoCliente && (
            <form
              onSubmit={(evento) => void manejarCrearClienteRapido(evento)}
              className="rounded-md border border-borde bg-arena p-3"
            >
              <p className="mb-2 text-xs text-texto-secundario">
                Se creará marcado como pendiente de revisión por un administrador.
              </p>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-texto-secundario">
                  Nombre
                  <input
                    type="text"
                    required
                    autoFocus
                    value={nuevoClienteNombre}
                    onChange={(evento) => setNuevoClienteNombre(evento.target.value)}
                    className="mt-1 block w-full rounded-md border border-borde px-3 py-2 text-sm text-onix"
                  />
                </label>
                <label className="text-xs font-medium text-texto-secundario">
                  Límite de crédito
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={nuevoClienteLimite}
                    onChange={(evento) => setNuevoClienteLimite(evento.target.value)}
                    className="mt-1 block w-full rounded-md border border-borde px-3 py-2 text-sm text-onix"
                  />
                </label>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={creandoCliente}
                    className="flex-1 rounded-md bg-cobre px-3 py-2 text-sm font-semibold text-white hover:bg-cobre-oscuro disabled:opacity-50"
                  >
                    {creandoCliente ? 'Creando...' : 'Crear'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMostrarNuevoCliente(false)}
                    className="text-sm text-texto-secundario underline"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </form>
          )}
          {clienteYaBloqueado && (
            <p className="text-xs font-semibold text-peligro">
              Este cliente ya excede su límite de crédito — debe abonar antes de poder comprar a
              fiado de nuevo.
            </p>
          )}
          {clienteExcederiaConEstaVenta && (
            <p className="text-xs text-alerta">
              Esta venta hará que el cliente exceda su límite. Se le permite esta vez, pero no
              podrá volver a comprar a fiado hasta que pague.
            </p>
          )}

          <div className="flex items-center justify-between border-t border-borde pt-3">
            <span className="font-display text-2xl font-semibold text-onix">
              ${total.toFixed(2)}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={
                  enviando ||
                  carrito.length === 0 ||
                  (metodoPago === 'fiado' && (!idClienteSeleccionado || clienteYaBloqueado))
                }
                onClick={() => void manejarPausar()}
                className="rounded-md border border-borde px-3 py-2 text-sm disabled:opacity-50"
              >
                Pausar
              </button>
              <button
                type="button"
                disabled={
                  enviando ||
                  carrito.length === 0 ||
                  (metodoPago === 'fiado' && (!idClienteSeleccionado || clienteYaBloqueado))
                }
                onClick={() => void manejarCobrar()}
                className="rounded-md bg-cobre px-5 py-2 text-sm font-semibold text-white hover:bg-cobre-oscuro disabled:opacity-50"
              >
                {enviando ? 'Procesando...' : 'Cobrar'}
              </button>
            </div>
          </div>
          {error && <p className="text-sm text-peligro">{error}</p>}
        </div>
      </div>
    </div>
  )
}
