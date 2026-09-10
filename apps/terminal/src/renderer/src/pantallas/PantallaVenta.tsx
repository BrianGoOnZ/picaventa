import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import {
  calcularDescuentoPromocion,
  promocionAplicaAProducto,
  tienePermiso,
  type Categoria,
  type Cliente,
  type DatosNegocio,
  type Producto,
  type PromocionActiva,
  type SesionUsuario,
  type UnidadMedida,
  type VentaDetallada
} from '@picaventa/shared'
import PantallaApartados from './PantallaApartados'
import TarjetaProducto from '../componentes/TarjetaProducto'
import TicketVenta, { type LineaTicket } from './TicketVenta'
import { confirmarCritico } from '../lib/confirmar'
import { BOTON_PELIGRO, BOTON_SECUNDARIO } from '../lib/estilos'

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

interface Props {
  sesion: SesionUsuario
}

export default function PantallaVenta({ sesion }: Props): React.JSX.Element {
  const puedeCrearClientes = tienePermiso(sesion, 'crearClientes')
  const [vista, setVista] = useState<'venta' | 'apartados'>('venta')
  const [carrito, setCarrito] = useState<LineaCarrito[]>([])
  const [textoBusqueda, setTextoBusqueda] = useState('')
  const [productos, setProductos] = useState<Producto[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [promocionesActivas, setPromocionesActivas] = useState<PromocionActiva[]>([])
  const [categoriaFiltro, setCategoriaFiltro] = useState<number | 'todas'>('todas')
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'tarjeta' | 'fiado'>('efectivo')
  const [efectivoRecibido, setEfectivoRecibido] = useState('')
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [idClienteSeleccionado, setIdClienteSeleccionado] = useState<number | null>(null)
  const [mostrarNuevoCliente, setMostrarNuevoCliente] = useState(false)
  const [nuevoClienteNombre, setNuevoClienteNombre] = useState('')
  const [nuevoClienteNota, setNuevoClienteNota] = useState('')
  const [nuevoClienteLimite, setNuevoClienteLimite] = useState('')
  const [creandoCliente, setCreandoCliente] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [negocio, setNegocio] = useState<DatosNegocio | null>(null)
  const [ticket, setTicket] = useState<TicketPendiente | null>(null)
  const [indiceSeleccionado, setIndiceSeleccionado] = useState<number | null>(null)
  const inputBusquedaRef = useRef<HTMLInputElement>(null)
  const [indiceResaltado, setIndiceResaltado] = useState(0)
  const tarjetaRefs = useRef<Map<number, HTMLButtonElement>>(new Map())
  const gridRef = useRef<HTMLDivElement>(null)
  const cantidadRefs = useRef<Map<number, HTMLInputElement>>(new Map())
  const idProductoAResaltarRef = useRef<number | null>(null)

  // Productos a granel (kg): en vez de agregar 1 pieza directo, se pide el
  // peso en una ventana aparte — a mano por ahora, y ya lista para que un
  // día "Leer báscula" traiga el peso solo (ver main/bascula.ts).
  const [productoParaPesar, setProductoParaPesar] = useState<Producto | null>(null)
  const [pesoManual, setPesoManual] = useState('')
  const [leyendoBascula, setLeyendoBascula] = useState(false)
  const [errorBascula, setErrorBascula] = useState('')
  const inputPesoRef = useRef<HTMLInputElement>(null)

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
    // RF-21: se traen las promociones activas para aplicarlas solas al
    // agregar un producto al carrito, sin que el cajero tenga que acordarse.
    void window.picaventa.listarPromocionesActivas().then((resultado) => {
      if (resultado.ok) setPromocionesActivas(resultado.promociones)
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

  // Cada vez que cambia el filtro (texto o categoría), el resaltado de
  // teclado vuelve al primer resultado — así ↓/↑ siempre arrancan desde
  // arriba de la lista que se ve en pantalla, no desde donde se quedó antes.
  useEffect(() => {
    setIndiceResaltado(0)
  }, [productosFiltrados])

  useEffect(() => {
    if (!textoBusqueda.trim()) return
    tarjetaRefs.current.get(indiceResaltado)?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [indiceResaltado, textoBusqueda])

  // Cuenta cuántas columnas tiene la cuadrícula EN ESTE momento (es
  // responsiva, así que cambia con el tamaño de la ventana) para que ↑/↓
  // se muevan una fila completa en vez de solo un producto.
  function columnasDeLaCuadricula(): number {
    if (!gridRef.current) return 1
    return getComputedStyle(gridRef.current).gridTemplateColumns.split(' ').filter(Boolean).length || 1
  }

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

  // RF-21: promoción automática — se recalcula con cada escaneo/clic (no solo
  // al crear la línea), para que un 2x1 detecte correctamente cuando la
  // cantidad acumulada ya completa un par.
  function descuentoPromocionParaCantidad(producto: Producto, cantidad: number): number {
    const promo = promocionesActivas.find((p) =>
      promocionAplicaAProducto(p, producto.idProducto, producto.idCategoria)
    )
    return promo ? calcularDescuentoPromocion(promo, producto.precioVenta, cantidad) : 0
  }

  function agregarAlCarritoConCantidad(producto: Producto, cantidadAAgregar: number): void {
    // Forma funcional de setCarrito: si se agregan dos productos en el mismo
    // tick (dos clics muy seguidos, o el lector de código de barras mandando
    // teclas más rápido de lo que React vuelve a renderizar), leer "carrito"
    // del cierre en vez del actualizador pierde la primera adición porque
    // ambas llamadas partirían del mismo arreglo desactualizado.
    idProductoAResaltarRef.current = producto.idProducto
    setCarrito((actual) => {
      const indiceExistente = actual.findIndex((l) => l.idProducto === producto.idProducto)
      if (indiceExistente !== -1) {
        const nuevaCantidad = actual[indiceExistente]!.cantidad + cantidadAAgregar
        return actual.map((l, i) =>
          i === indiceExistente
            ? { ...l, cantidad: nuevaCantidad, descuento: descuentoPromocionParaCantidad(producto, nuevaCantidad) }
            : l
        )
      }
      return [
        ...actual,
        {
          idProducto: producto.idProducto,
          nombreProducto: producto.nombreProducto,
          unidadMedida: producto.unidadMedida,
          precioVenta: producto.precioVenta,
          cantidad: cantidadAAgregar,
          descuento: descuentoPromocionParaCantidad(producto, cantidadAAgregar)
        }
      ]
    })
    setTextoBusqueda('')
    setError('')
  }

  function agregarAlCarrito(producto: Producto): void {
    // A granel (kg): no se puede saber cuánto es "una unidad" sin pesarlo,
    // así que en vez de agregar directo se abre la ventana de peso.
    if (producto.unidadMedida === 'kg') {
      setProductoParaPesar(producto)
      setPesoManual('')
      setErrorBascula('')
      return
    }
    agregarAlCarritoConCantidad(producto, 1)
  }

  function confirmarPeso(): void {
    if (!productoParaPesar) return
    const peso = Number(pesoManual)
    if (!peso || peso <= 0) return
    agregarAlCarritoConCantidad(productoParaPesar, peso)
    setProductoParaPesar(null)
    setPesoManual('')
  }

  function cancelarPeso(): void {
    setProductoParaPesar(null)
    setPesoManual('')
    setErrorBascula('')
  }

  async function leerDeBascula(): Promise<void> {
    setLeyendoBascula(true)
    setErrorBascula('')
    const resultado = await window.picaventa.leerPesoBascula()
    if (resultado.ok) {
      setPesoManual(resultado.peso.toFixed(3))
    } else {
      setErrorBascula(resultado.error)
    }
    setLeyendoBascula(false)
  }

  useEffect(() => {
    if (productoParaPesar) {
      setTimeout(() => inputPesoRef.current?.focus(), 0)
    }
  }, [productoParaPesar])

  async function manejarBuscar(evento: KeyboardEvent<HTMLInputElement>): Promise<void> {
    // Las flechas solo navegan los resultados una vez que hay algo escrito
    // — mientras el buscador está vacío no hay nada que resaltar y el
    // teclado se comporta normal (sin esto, ↑/↓/←/→ interferirían incluso
    // antes de filtrar algo).
    const hayTexto = textoBusqueda.trim().length > 0

    if (hayTexto && (evento.key === 'ArrowDown' || evento.key === 'ArrowUp')) {
      if (productosFiltrados.length === 0) return
      evento.preventDefault()
      const columnas = columnasDeLaCuadricula()
      setIndiceResaltado((actual) => {
        const siguiente = evento.key === 'ArrowDown' ? actual + columnas : actual - columnas
        return Math.max(0, Math.min(siguiente, productosFiltrados.length - 1))
      })
      return
    }

    if (hayTexto && (evento.key === 'ArrowLeft' || evento.key === 'ArrowRight')) {
      // El cursor de texto en este campo nunca se mueve con las flechas —
      // solo sirven para escribir y borrar. Antes se dejaba mover el cursor
      // hasta que llegara al extremo del texto para recién ahí navegar la
      // cuadrícula, pero eso se sentía como un retraso confuso (primero
      // "no hace nada" varias veces y luego salta). Ahora cualquier flecha,
      // en cualquier posición del cursor, mueve la cuadrícula de una vez.
      if (productosFiltrados.length === 0) return
      evento.preventDefault()
      setIndiceResaltado((actual) => {
        const siguiente = evento.key === 'ArrowRight' ? actual + 1 : actual - 1
        return Math.max(0, Math.min(siguiente, productosFiltrados.length - 1))
      })
      return
    }

    if (evento.key !== 'Enter') return
    const texto = textoBusqueda.trim()
    if (!texto) return

    // Código de barras exacto (lector de código de barras): agrega directo.
    const porCodigo = await window.picaventa.listarProductos({ codigoBarras: texto })
    if (porCodigo.ok && porCodigo.productos.length === 1) {
      agregarAlCarrito(porCodigo.productos[0]!)
      return
    }

    // Agrega el resultado resaltado — si solo hay uno, es el único posible;
    // si hay varios, es el que se ubicó con las flechas.
    if (productosFiltrados[indiceResaltado]) {
      agregarAlCarrito(productosFiltrados[indiceResaltado]!)
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

  // Se resuelve la selección del carrito después de que "carrito" ya se
  // actualizó (nunca dentro del actualizador de setCarrito, cuyo momento
  // exacto de ejecución no está garantizado): si se acaba de agregar o
  // incrementar un producto, se selecciona esa línea; si el carrito se
  // achicó (se quitó una línea), se ajusta la selección a los límites nuevos.
  useEffect(() => {
    const idProducto = idProductoAResaltarRef.current
    if (idProducto !== null) {
      idProductoAResaltarRef.current = null
      const indice = carrito.findIndex((l) => l.idProducto === idProducto)
      if (indice !== -1) {
        setIndiceSeleccionado(indice)
        return
      }
    }
    setIndiceSeleccionado((actual) => {
      if (carrito.length === 0) return null
      if (actual === null) return null
      return Math.min(actual, carrito.length - 1)
    })
  }, [carrito])

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
      notaCliente: nuevoClienteNota.trim() || undefined,
      limiteCredito: Number(nuevoClienteLimite) || 0
    })

    if (resultado.ok) {
      setClientes((actual) => [...actual, resultado.cliente])
      setIdClienteSeleccionado(resultado.cliente.idCliente)
      setNuevoClienteNombre('')
      setNuevoClienteNota('')
      setNuevoClienteLimite('')
      setMostrarNuevoCliente(false)
    } else {
      setError(resultado.error)
    }
    setCreandoCliente(false)
  }

  // Atajos de teclado para vender sin soltar el teclado: F2 buscador,
  // F3 cambia la cantidad de la línea seleccionada, F4 cobra, F8 pausa,
  // F9 abre/cierra Apartados, Alt+1/2/3 cambia el método de pago,
  // ↑/↓ navegan el carrito, Supr quita la línea seleccionada, y Esc
  // cierra lo que esté "encima" (ticket, nuevo cliente, Apartados) o
  // cancela la venta si no hay nada más que cerrar.
  useEffect(() => {
    function manejarTeclado(evento: globalThis.KeyboardEvent): void {
      if (evento.key === 'Escape') {
        if (productoParaPesar) {
          cancelarPeso()
          return
        }
        if (ticket) {
          setTicket(null)
          return
        }
        if (mostrarNuevoCliente) {
          setMostrarNuevoCliente(false)
          return
        }
        if (vista === 'apartados') {
          setVista('venta')
          return
        }
        if (carrito.length > 0) {
          evento.preventDefault()
          void confirmarCritico({
            titulo: '¿Cancelar la venta actual?',
            texto: 'Se vaciará el carrito. Esta acción no se puede deshacer.',
            textoConfirmar: 'Sí, cancelar venta'
          }).then((confirmado) => {
            if (confirmado) limpiarVenta()
          })
        }
        return
      }

      if (ticket || vista !== 'venta' || productoParaPesar) return

      if (evento.key === 'F2') {
        evento.preventDefault()
        inputBusquedaRef.current?.focus()
        inputBusquedaRef.current?.select()
        return
      }

      if (evento.key === 'F4') {
        evento.preventDefault()
        if (!enviando && carrito.length > 0) void manejarCobrar()
        return
      }

      if (evento.key === 'F8') {
        evento.preventDefault()
        if (!enviando && carrito.length > 0) void manejarPausar()
        return
      }

      if (evento.key === 'F9') {
        evento.preventDefault()
        setVista('apartados')
        return
      }

      if (evento.altKey && (evento.key === '1' || evento.key === '2' || evento.key === '3')) {
        evento.preventDefault()
        const metodos = { '1': 'efectivo', '2': 'tarjeta', '3': 'fiado' } as const
        setMetodoPago(metodos[evento.key])
        setIdClienteSeleccionado(null)
        return
      }

      if (evento.key === 'F3') {
        evento.preventDefault()
        if (indiceSeleccionado !== null && carrito[indiceSeleccionado]) {
          const input = cantidadRefs.current.get(carrito[indiceSeleccionado]!.idProducto)
          input?.focus()
          input?.select()
        }
        return
      }

      // Se evita interferir con los campos numéricos de cantidad/descuento
      // (ya usan las flechas para subir o bajar el valor) y con el buscador
      // (ya usa las flechas para moverse entre los resultados filtrados).
      const activo = document.activeElement as HTMLInputElement | null
      const enCampoNumerico = activo?.tagName === 'INPUT' && activo.type === 'number'
      const enBuscador = activo === inputBusquedaRef.current

      if (
        (evento.key === 'ArrowDown' || evento.key === 'ArrowUp') &&
        !enCampoNumerico &&
        !enBuscador &&
        carrito.length > 0
      ) {
        evento.preventDefault()
        setIndiceSeleccionado((actual) => {
          const base = actual ?? -1
          const siguiente = evento.key === 'ArrowDown' ? base + 1 : base - 1
          return Math.max(0, Math.min(siguiente, carrito.length - 1))
        })
        return
      }

      if (
        evento.key === 'Delete' &&
        !enCampoNumerico &&
        !enBuscador &&
        indiceSeleccionado !== null &&
        carrito[indiceSeleccionado]
      ) {
        evento.preventDefault()
        quitarLinea(carrito[indiceSeleccionado]!.idProducto)
      }
    }

    document.addEventListener('keydown', manejarTeclado)
    return () => document.removeEventListener('keydown', manejarTeclado)
  }, [
    ticket,
    mostrarNuevoCliente,
    vista,
    carrito,
    indiceSeleccionado,
    enviando,
    manejarCobrar,
    manejarPausar,
    productoParaPesar
  ])

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
    <div className="relative flex h-full gap-4">
      {productoParaPesar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-onix/80 p-4">
          <div className="w-full max-w-sm rounded-lg border border-borde bg-tarjeta p-6 shadow-lg">
            <p className="font-display text-lg font-semibold text-onix">{productoParaPesar.nombreProducto}</p>
            <p className="mb-4 text-sm text-texto-secundario">
              ${productoParaPesar.precioVenta.toFixed(2)} por kg — indica cuánto pesa
            </p>

            <label className="text-sm font-medium text-texto-secundario">
              Peso (kg)
              <input
                ref={inputPesoRef}
                type="number"
                min="0.001"
                step="0.001"
                autoFocus
                value={pesoManual}
                onChange={(evento) => setPesoManual(evento.target.value)}
                onKeyDown={(evento) => {
                  if (evento.key === 'Enter') {
                    evento.preventDefault()
                    confirmarPeso()
                  }
                }}
                className="mt-1 w-full rounded-md border border-borde px-4 py-3 text-center text-lg tabular-nums text-onix"
              />
            </label>

            <button
              type="button"
              onClick={() => void leerDeBascula()}
              disabled={leyendoBascula}
              className="mt-3 w-full rounded-md border border-borde px-3 py-2 text-sm text-texto-secundario hover:bg-arena disabled:opacity-50"
            >
              {leyendoBascula ? 'Leyendo báscula...' : '⚖️ Leer báscula'}
            </button>
            {errorBascula && <p className="mt-2 text-xs text-alerta">{errorBascula}</p>}

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={cancelarPeso}
                className="flex-1 rounded-md border border-borde px-4 py-2 text-sm text-texto-secundario"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarPeso}
                disabled={!Number(pesoManual) || Number(pesoManual) <= 0}
                className="flex-1 rounded-md bg-cobre px-4 py-2 text-sm font-semibold text-white hover:bg-cobre-oscuro disabled:opacity-50"
              >
                Agregar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Columna izquierda: búsqueda, categorías y cuadrícula de productos */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="mb-3 flex items-center gap-3">
          <div className="relative flex-1">
            <input
              ref={inputBusquedaRef}
              type="text"
              autoFocus
              placeholder="Código de barras o nombre del producto..."
              value={textoBusqueda}
              onChange={(evento) => setTextoBusqueda(evento.target.value)}
              onKeyDown={(evento) => void manejarBuscar(evento)}
              className="w-full rounded-md border border-borde bg-tarjeta px-4 py-3 text-base"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded border border-borde bg-arena px-1.5 py-0.5 text-[10px] font-medium text-texto-secundario">
              F2
            </span>
          </div>
          <button
            type="button"
            onClick={() => setVista('apartados')}
            className="shrink-0 rounded-md border border-borde bg-tarjeta px-4 py-3 text-sm"
          >
            Apartados <span className="text-texto-secundario">(F9)</span>
          </button>
        </div>
        {textoBusqueda && productosFiltrados.length > 1 && (
          <p className="-mt-2 mb-3 text-[10px] text-texto-secundario">
            ↑↓←→ elige entre los resultados · Enter lo agrega
          </p>
        )}

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
            <div ref={gridRef} className="grid grid-cols-[repeat(auto-fill,minmax(112px,1fr))] gap-3">
              {productosFiltrados.map((producto, indice) => (
                <TarjetaProducto
                  key={producto.idProducto}
                  producto={producto}
                  colorCategoria={
                    (producto.idCategoria && colorPorCategoria.get(producto.idCategoria)) ||
                    COLOR_SIN_CATEGORIA
                  }
                  resaltado={!!textoBusqueda.trim() && indice === indiceResaltado}
                  onSeleccionar={agregarAlCarrito}
                  cardRef={(el) => {
                    if (el) tarjetaRefs.current.set(indice, el)
                    else tarjetaRefs.current.delete(indice)
                  }}
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
            <>
              {carrito.map((linea, indice) => (
                <div
                  key={linea.idProducto}
                  onClick={() => setIndiceSeleccionado(indice)}
                  className={`cursor-pointer rounded-md border-b border-borde px-2 py-2 text-sm last:border-0 ${
                    indiceSeleccionado === indice ? 'bg-cobre/10 ring-1 ring-cobre' : ''
                  }`}
                >
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
                        ref={(el) => {
                          if (el) cantidadRefs.current.set(linea.idProducto, el)
                          else cantidadRefs.current.delete(linea.idProducto)
                        }}
                        type="number"
                        min="0"
                        step={linea.unidadMedida === 'kg' ? '0.001' : '1'}
                        value={linea.cantidad}
                        onFocus={() => setIndiceSeleccionado(indice)}
                        onKeyDown={(evento) => {
                          if (evento.key === 'Enter') {
                            evento.preventDefault()
                            inputBusquedaRef.current?.focus()
                          }
                        }}
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
                        onFocus={() => setIndiceSeleccionado(indice)}
                        onChange={(evento) =>
                          actualizarLinea(linea.idProducto, 'descuento', Number(evento.target.value))
                        }
                        className="w-14 rounded border border-borde px-1 py-0.5 text-onix"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => quitarLinea(linea.idProducto)}
                      className={`ml-auto ${BOTON_PELIGRO}`}
                    >
                      Quitar
                    </button>
                  </div>
                </div>
              ))}
              <p className="mt-1 px-2 text-[10px] text-texto-secundario">
                ↑↓ selecciona · Supr quita · F3 cambia cantidad
              </p>
            </>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-borde p-3">
          <label className="text-xs font-medium text-texto-secundario">
            Método de pago <span className="text-texto-secundario">(Alt+1/2/3)</span>
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
                {puedeCrearClientes && (
                  <button
                    type="button"
                    onClick={() => setMostrarNuevoCliente(true)}
                    className="self-start rounded-md border border-borde px-3 py-1.5 text-xs"
                  >
                    + Nuevo cliente
                  </button>
                )}
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
                  Nota o referencia (opcional)
                  <input
                    type="text"
                    placeholder="Domicilio, señas particulares, con quién trabaja..."
                    value={nuevoClienteNota}
                    onChange={(evento) => setNuevoClienteNota(evento.target.value)}
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
                    className={BOTON_SECUNDARIO}
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
                Pausar <span className="text-texto-secundario">(F8)</span>
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
                {enviando ? 'Procesando...' : 'Cobrar (F4)'}
              </button>
            </div>
          </div>
          {error && <p className="text-sm text-peligro">{error}</p>}
          {carrito.length > 0 && (
            <p className="text-[10px] text-texto-secundario">Esc cancela la venta actual</p>
          )}
        </div>
      </div>
    </div>
  )
}
