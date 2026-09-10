import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type KeyboardEvent } from 'react'
import {
  tienePermiso,
  type EntradaInventarioHistorial,
  type Producto,
  type SesionUsuario,
  type UnidadMedida
} from '@picaventa/shared'
import { confirmarCritico } from '../lib/confirmar'
import { BOTON_PELIGRO, BOTON_SECUNDARIO } from '../lib/estilos'
import { useToast } from '../lib/ToastContext'

interface Props {
  sesion: SesionUsuario
}

interface Pendiente {
  idProducto: number
  nombreProducto: string
  unidadMedida: UnidadMedida
  stockPrevio: number
  cantidad: number
}

interface ResultadoEntrada {
  id: number
  nombreProducto: string
  mensaje: string
  ok: boolean
  hora: string
}

const NUEVO_PRODUCTO_VACIO = {
  nombreProducto: '',
  codigoBarras: '',
  precioCompra: '',
  precioVenta: '',
  unidadMedida: 'pieza' as UnidadMedida,
  stockInicial: '',
  stockMinimo: '5'
}

let siguienteIdResultado = 1

function horaActual(): string {
  return new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
}

export default function PantallaEntradaInventario({ sesion }: Props): React.JSX.Element {
  const esAdmin = sesion.rolUsuario === 'administrador'
  const puedeCrearProductos = tienePermiso(sesion, 'crearProductos')

  const [codigo, setCodigo] = useState('')
  const [resultadosBusqueda, setResultadosBusqueda] = useState<Producto[]>([])
  const [productoEncontrado, setProductoEncontrado] = useState<Producto | null>(null)
  const [cantidad, setCantidad] = useState('')
  const [error, setError] = useState('')

  const [mostrarNuevoProducto, setMostrarNuevoProducto] = useState(false)
  const [nuevoProducto, setNuevoProducto] = useState(NUEVO_PRODUCTO_VACIO)
  const [creandoProducto, setCreandoProducto] = useState(false)

  const [pendientes, setPendientes] = useState<Pendiente[]>([])
  const [enviandoLote, setEnviandoLote] = useState(false)
  const [resultados, setResultados] = useState<ResultadoEntrada[]>([])

  const [mostrarHistorialCompleto, setMostrarHistorialCompleto] = useState(false)
  const [historialCompleto, setHistorialCompleto] = useState<EntradaInventarioHistorial[]>([])
  const [cargandoHistorial, setCargandoHistorial] = useState(false)

  const { mostrarToast } = useToast()
  const inputCodigoRef = useRef<HTMLInputElement>(null)
  const inputCantidadRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputCodigoRef.current?.focus()
  }, [])

  function seleccionarProducto(producto: Producto): void {
    setProductoEncontrado(producto)
    setResultadosBusqueda([])
    setCodigo('')
    setError('')
    setTimeout(() => inputCantidadRef.current?.focus(), 0)
  }

  function abrirNuevoProducto(texto: string): void {
    if (!puedeCrearProductos) {
      setError('No tienes permiso para registrar productos nuevos. Pide a un administrador que lo registre.')
      setResultadosBusqueda([])
      return
    }
    setNuevoProducto({
      ...NUEVO_PRODUCTO_VACIO,
      nombreProducto: texto,
      codigoBarras: texto
    })
    setMostrarNuevoProducto(true)
    setResultadosBusqueda([])
    setError('')
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
      setResultadosBusqueda(porNombre.productos)
      setError('')
    } else {
      // No existe: en vez de mandar al cajero/admin a la pestaña de
      // Productos, se puede dar de alta aquí mismo sin perder el flujo.
      abrirNuevoProducto(texto)
    }
  }

  async function cargarHistorialCompleto(): Promise<void> {
    if (mostrarHistorialCompleto) {
      setMostrarHistorialCompleto(false)
      return
    }
    setMostrarHistorialCompleto(true)
    setCargandoHistorial(true)
    const resultado = await window.picaventa.obtenerHistorialEntradas()
    if (resultado.ok) setHistorialCompleto(resultado.entradas)
    setCargandoHistorial(false)
  }

  function cancelarSeleccion(): void {
    setProductoEncontrado(null)
    setCantidad('')
    setError('')
    inputCodigoRef.current?.focus()
  }

  function agregarAPendientes(evento: FormEvent): void {
    evento.preventDefault()
    if (!productoEncontrado) return
    const monto = Number(cantidad)
    if (!monto || monto <= 0) return

    setPendientes((actual) => {
      const existente = actual.find((p) => p.idProducto === productoEncontrado.idProducto)
      if (existente) {
        return actual.map((p) =>
          p.idProducto === productoEncontrado.idProducto ? { ...p, cantidad: p.cantidad + monto } : p
        )
      }
      return [
        ...actual,
        {
          idProducto: productoEncontrado.idProducto,
          nombreProducto: productoEncontrado.nombreProducto,
          unidadMedida: productoEncontrado.unidadMedida,
          stockPrevio: productoEncontrado.stockActual,
          cantidad: monto
        }
      ]
    })
    setProductoEncontrado(null)
    setCantidad('')
    inputCodigoRef.current?.focus()
  }

  function actualizarCantidadPendiente(idProducto: number, nuevaCantidad: number): void {
    setPendientes((actual) =>
      actual.map((p) => (p.idProducto === idProducto ? { ...p, cantidad: nuevaCantidad } : p))
    )
  }

  function quitarPendiente(idProducto: number): void {
    setPendientes((actual) => actual.filter((p) => p.idProducto !== idProducto))
  }

  async function manejarCrearProducto(evento: FormEvent): Promise<void> {
    evento.preventDefault()
    setCreandoProducto(true)
    setError('')

    const stockInicial = Number(nuevoProducto.stockInicial) || 0
    const resultado = await window.picaventa.crearProducto({
      nombreProducto: nuevoProducto.nombreProducto,
      codigoBarras: nuevoProducto.codigoBarras || undefined,
      precioCompra: nuevoProducto.precioCompra ? Number(nuevoProducto.precioCompra) : undefined,
      precioVenta: Number(nuevoProducto.precioVenta) || 0,
      unidadMedida: nuevoProducto.unidadMedida,
      stockActual: stockInicial,
      stockMinimo: Number(nuevoProducto.stockMinimo) || 0
    })

    if (resultado.ok) {
      setResultados((actual) => [
        {
          id: siguienteIdResultado++,
          nombreProducto: resultado.producto.nombreProducto,
          mensaje: `Producto nuevo — stock inicial: ${stockInicial} ${resultado.producto.unidadMedida}`,
          ok: true,
          hora: horaActual()
        },
        ...actual
      ])
      mostrarToast(`Producto "${resultado.producto.nombreProducto}" registrado`)
      setMostrarNuevoProducto(false)
      setNuevoProducto(NUEVO_PRODUCTO_VACIO)
      inputCodigoRef.current?.focus()
    } else {
      setError(resultado.error)
    }
    setCreandoProducto(false)
  }

  async function confirmarYEnviar(): Promise<void> {
    if (pendientes.length === 0) return

    const confirmado = await confirmarCritico({
      titulo: `¿Confirmar la entrada de ${pendientes.length} producto${pendientes.length === 1 ? '' : 's'}?`,
      texto: 'Se sumará la cantidad indicada al stock de cada uno. Revisa la lista antes de continuar.',
      textoConfirmar: 'Sí, cargar al inventario',
      colorConfirmar: '#15803D'
    })
    if (!confirmado) return

    setEnviandoLote(true)
    const nuevosResultados: ResultadoEntrada[] = []

    for (const pendiente of pendientes) {
      const resultado = await window.picaventa.registrarEntradaInventario(pendiente.idProducto, {
        cantidad: pendiente.cantidad
      })
      nuevosResultados.push({
        id: siguienteIdResultado++,
        nombreProducto: pendiente.nombreProducto,
        ok: resultado.ok,
        mensaje: resultado.ok
          ? `+${pendiente.cantidad} ${pendiente.unidadMedida} → nuevo stock: ${resultado.producto.stockActual}`
          : resultado.error,
        hora: horaActual()
      })
    }

    setResultados((actual) => [...nuevosResultados, ...actual])
    setPendientes([])
    setEnviandoLote(false)

    const exitosos = nuevosResultados.filter((r) => r.ok).length
    const fallidos = nuevosResultados.length - exitosos
    mostrarToast(
      fallidos === 0
        ? `${exitosos} producto${exitosos === 1 ? '' : 's'} cargado${exitosos === 1 ? '' : 's'} correctamente`
        : `${exitosos} cargado${exitosos === 1 ? '' : 's'}, ${fallidos} con error`,
      fallidos === 0 ? 'exito' : 'error'
    )
    inputCodigoRef.current?.focus()

    if (mostrarHistorialCompleto) {
      const actualizado = await window.picaventa.obtenerHistorialEntradas()
      if (actualizado.ok) setHistorialCompleto(actualizado.entradas)
    }
  }

  function actualizarCampoNuevoProducto(
    campo: keyof typeof NUEVO_PRODUCTO_VACIO,
    valor: string
  ): void {
    setNuevoProducto((actual) => ({ ...actual, [campo]: valor }))
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-texto-secundario">
          Escanea cada producto recibido — revisa la lista y confirma para cargarlo al inventario.
        </p>
        {esAdmin && (
          <button
            type="button"
            onClick={() => void cargarHistorialCompleto()}
            className="shrink-0 rounded-md border border-borde px-3 py-1.5 text-xs font-medium text-texto-secundario hover:bg-arena"
          >
            {mostrarHistorialCompleto ? 'Ocultar historial completo' : 'Ver historial completo'}
          </button>
        )}
      </div>

      {mostrarHistorialCompleto && (
        <div className="rounded-lg border border-borde bg-tarjeta p-4">
          <h2 className="mb-3 text-sm font-semibold text-texto-secundario">
            Historial completo de entradas — quién cargó qué inventario
          </h2>
          {cargandoHistorial ? (
            <p className="text-sm text-texto-secundario">Cargando...</p>
          ) : historialCompleto.length === 0 ? (
            <p className="text-sm text-texto-secundario">Aún no hay entradas registradas.</p>
          ) : (
            <div className="max-h-96 overflow-x-auto overflow-y-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-xs text-texto-secundario">
                    <th className="pb-2 pr-3 font-medium">Fecha</th>
                    <th className="pb-2 pr-3 font-medium">Producto</th>
                    <th className="pb-2 pr-3 font-medium">Cajero/admin</th>
                    <th className="pb-2 pr-3 font-medium">Cantidad</th>
                    <th className="pb-2 font-medium">Stock antes → después</th>
                  </tr>
                </thead>
                <tbody>
                  {historialCompleto.map((entrada) => (
                    <tr key={entrada.idEntrada} className="border-t border-borde">
                      <td className="py-2 pr-3 text-texto-secundario">
                        {new Date(entrada.fechaEntrada).toLocaleString('es-MX', {
                          dateStyle: 'short',
                          timeStyle: 'short'
                        })}
                      </td>
                      <td className="py-2 pr-3 text-onix">{entrada.nombreProducto}</td>
                      <td className="py-2 pr-3 text-onix">{entrada.nombreUsuario}</td>
                      <td className="py-2 pr-3 text-onix">
                        +{entrada.cantidad} {entrada.unidadMedida}
                      </td>
                      <td className="py-2 text-texto-secundario">
                        {entrada.stockAnterior} → <span className="font-semibold text-onix">{entrada.stockNuevo}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div className="w-full rounded-lg border border-borde bg-tarjeta p-4">
        {mostrarNuevoProducto ? (
          <form onSubmit={(evento) => void manejarCrearProducto(evento)} className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-onix">
                Este producto no existe — regístralo
              </h2>
              <button
                type="button"
                onClick={() => {
                  setMostrarNuevoProducto(false)
                  setError('')
                  inputCodigoRef.current?.focus()
                }}
                className={BOTON_SECUNDARIO}
              >
                Cancelar
              </button>
            </div>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
              <label className="text-sm font-medium text-neutral-700">
                Nombre
                <input
                  type="text"
                  required
                  autoFocus
                  value={nuevoProducto.nombreProducto}
                  onChange={(evento: ChangeEvent<HTMLInputElement>) =>
                    actualizarCampoNuevoProducto('nombreProducto', evento.target.value)
                  }
                  className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm font-medium text-neutral-700">
                Código de barras
                <input
                  type="text"
                  value={nuevoProducto.codigoBarras}
                  onChange={(evento: ChangeEvent<HTMLInputElement>) =>
                    actualizarCampoNuevoProducto('codigoBarras', evento.target.value)
                  }
                  className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm font-medium text-neutral-700">
                Unidad de medida
                <select
                  value={nuevoProducto.unidadMedida}
                  onChange={(evento) =>
                    actualizarCampoNuevoProducto('unidadMedida', evento.target.value)
                  }
                  className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                >
                  <option value="pieza">Pieza</option>
                  <option value="kg">Kilogramo (granel)</option>
                </select>
              </label>
              <label className="text-sm font-medium text-neutral-700">
                Precio de compra
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={nuevoProducto.precioCompra}
                  onChange={(evento: ChangeEvent<HTMLInputElement>) =>
                    actualizarCampoNuevoProducto('precioCompra', evento.target.value)
                  }
                  className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm font-medium text-neutral-700">
                Precio de venta
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={nuevoProducto.precioVenta}
                  onChange={(evento: ChangeEvent<HTMLInputElement>) =>
                    actualizarCampoNuevoProducto('precioVenta', evento.target.value)
                  }
                  className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm font-medium text-neutral-700">
                Stock inicial
                <input
                  type="number"
                  min="0"
                  step={nuevoProducto.unidadMedida === 'kg' ? '0.001' : '1'}
                  required
                  value={nuevoProducto.stockInicial}
                  onChange={(evento: ChangeEvent<HTMLInputElement>) =>
                    actualizarCampoNuevoProducto('stockInicial', evento.target.value)
                  }
                  className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm font-medium text-neutral-700">
                Stock mínimo (alerta)
                <input
                  type="number"
                  min="0"
                  step={nuevoProducto.unidadMedida === 'kg' ? '0.001' : '1'}
                  required
                  value={nuevoProducto.stockMinimo}
                  onChange={(evento: ChangeEvent<HTMLInputElement>) =>
                    actualizarCampoNuevoProducto('stockMinimo', evento.target.value)
                  }
                  className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                />
              </label>
            </div>
            <p className="text-xs text-texto-secundario">
              La categoría y la foto se pueden agregar después en Catálogo → Productos.
            </p>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={creandoProducto}
              className="rounded-md bg-cobre px-4 py-3 text-sm font-semibold text-white hover:bg-cobre-oscuro disabled:opacity-50"
            >
              {creandoProducto ? 'Registrando...' : 'Registrar producto'}
            </button>
          </form>
        ) : !productoEncontrado ? (
          <>
            <label className="block max-w-md text-sm font-medium text-neutral-700">
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
            {resultadosBusqueda.length > 0 && (
              <div className="mt-2 max-w-md rounded-md border border-borde">
                {resultadosBusqueda.map((producto) => (
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
                <button
                  type="button"
                  onClick={() => abrirNuevoProducto(codigo.trim())}
                  className="block w-full px-4 py-2 text-left text-sm text-cobre hover:bg-arena"
                >
                  Ninguno es — registrar "{codigo.trim()}" como producto nuevo
                </button>
              </div>
            )}
          </>
        ) : (
          <form onSubmit={agregarAPendientes} className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-display text-lg font-semibold text-onix">
                  {productoEncontrado.nombreProducto}
                </p>
                <p className="text-sm text-texto-secundario">
                  Stock actual: {productoEncontrado.stockActual} {productoEncontrado.unidadMedida}
                </p>
              </div>
              <button type="button" onClick={cancelarSeleccion} className={BOTON_SECUNDARIO}>
                Cambiar producto
              </button>
            </div>
            <label className="block max-w-xs text-sm font-medium text-neutral-700">
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
            <button
              type="submit"
              className="rounded-md bg-cobre px-4 py-3 text-sm font-semibold text-white hover:bg-cobre-oscuro"
            >
              Agregar a la lista
            </button>
          </form>
        )}
      </div>

      <div className="rounded-lg border border-borde bg-tarjeta p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-texto-secundario">
            Por confirmar {pendientes.length > 0 && `(${pendientes.length})`}
          </h2>
          {pendientes.length > 0 && (
            <button
              type="button"
              onClick={() => void confirmarYEnviar()}
              disabled={enviandoLote}
              className="rounded-md bg-exito px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              {enviandoLote ? 'Cargando...' : `Confirmar y cargar al inventario`}
            </button>
          )}
        </div>
        {pendientes.length === 0 ? (
          <p className="text-sm text-texto-secundario">
            Escanea un producto arriba para empezar.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {pendientes.map((pendiente) => (
              <li
                key={pendiente.idProducto}
                className="flex items-center gap-3 rounded-lg border border-borde p-3 text-sm"
              >
                <span className="min-w-0 flex-1 truncate text-onix">{pendiente.nombreProducto}</span>
                <label className="flex items-center gap-1 text-xs text-texto-secundario">
                  Cantidad
                  <input
                    type="number"
                    min="0.001"
                    step={pendiente.unidadMedida === 'kg' ? '0.001' : '1'}
                    value={pendiente.cantidad}
                    onChange={(evento) =>
                      actualizarCantidadPendiente(pendiente.idProducto, Number(evento.target.value))
                    }
                    className="w-20 rounded border border-borde px-2 py-1 text-onix"
                  />
                </label>
                <span className="shrink-0 text-xs text-texto-secundario">
                  {pendiente.stockPrevio} → <span className="font-semibold text-onix">
                    {pendiente.stockPrevio + pendiente.cantidad}
                  </span>{' '}
                  {pendiente.unidadMedida}
                </span>
                <button
                  type="button"
                  onClick={() => quitarPendiente(pendiente.idProducto)}
                  className={`shrink-0 ${BOTON_PELIGRO}`}
                >
                  Quitar
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {resultados.length > 0 && (
        <div className="rounded-lg border border-borde bg-tarjeta p-4">
          <h2 className="mb-3 text-sm font-semibold text-texto-secundario">
            Historial de esta sesión ({resultados.length})
          </h2>
          <ul className="flex flex-col gap-2">
            {resultados.map((resultado) => (
              <li
                key={resultado.id}
                className={`flex items-center justify-between rounded-lg border p-3 text-sm ${
                  resultado.ok ? 'border-borde' : 'border-peligro bg-peligro/5'
                }`}
              >
                <span className="flex items-center gap-2 text-onix">
                  <span className={resultado.ok ? 'text-exito' : 'text-peligro'}>
                    {resultado.ok ? '✓' : '✗'}
                  </span>
                  {resultado.nombreProducto}
                </span>
                <span className={resultado.ok ? 'text-texto-secundario' : 'font-medium text-peligro'}>
                  {resultado.mensaje} · {resultado.hora}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
