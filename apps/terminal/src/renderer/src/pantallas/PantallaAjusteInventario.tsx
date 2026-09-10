import { useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import type { MermaHistorial, Producto, TipoMerma } from '@picaventa/shared'
import { confirmarCritico } from '../lib/confirmar'
import { BOTON_SECUNDARIO } from '../lib/estilos'
import { useToast } from '../lib/ToastContext'

export default function PantallaAjusteInventario(): React.JSX.Element {
  const [codigo, setCodigo] = useState('')
  const [resultadosBusqueda, setResultadosBusqueda] = useState<Producto[]>([])
  const [productoEncontrado, setProductoEncontrado] = useState<Producto | null>(null)
  const [error, setError] = useState('')

  const [tipoMerma, setTipoMerma] = useState<TipoMerma>('merma')
  const [cantidad, setCantidad] = useState('')
  const [motivo, setMotivo] = useState('')
  const [enviando, setEnviando] = useState(false)

  const [mostrarHistorial, setMostrarHistorial] = useState(false)
  const [historial, setHistorial] = useState<MermaHistorial[]>([])
  const [cargandoHistorial, setCargandoHistorial] = useState(false)

  const { mostrarToast } = useToast()
  const inputCodigoRef = useRef<HTMLInputElement>(null)

  function seleccionarProducto(producto: Producto): void {
    setProductoEncontrado(producto)
    setResultadosBusqueda([])
    setCodigo('')
    setError('')
    setCantidad(tipoMerma === 'ajuste' ? producto.stockActual.toString() : '')
    setMotivo(tipoMerma === 'ajuste' ? 'Conteo físico' : '')
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
    } else {
      setError(`No se encontró ningún producto con "${texto}"`)
    }
  }

  function cambiarTipo(nuevoTipo: TipoMerma): void {
    setTipoMerma(nuevoTipo)
    if (productoEncontrado) {
      setCantidad(nuevoTipo === 'ajuste' ? productoEncontrado.stockActual.toString() : '')
      setMotivo(nuevoTipo === 'ajuste' ? 'Conteo físico' : '')
    }
  }

  function cancelarSeleccion(): void {
    setProductoEncontrado(null)
    setCantidad('')
    setMotivo('')
    setError('')
    inputCodigoRef.current?.focus()
  }

  async function manejarEnviar(evento: FormEvent): Promise<void> {
    evento.preventDefault()
    if (!productoEncontrado) return
    const monto = Number(cantidad)
    if (cantidad === '' || monto < 0 || !motivo.trim()) return

    const confirmado = await confirmarCritico({
      titulo:
        tipoMerma === 'merma'
          ? `¿Dar de baja ${monto} ${productoEncontrado.unidadMedida} de "${productoEncontrado.nombreProducto}"?`
          : `¿Corregir el stock de "${productoEncontrado.nombreProducto}" a ${monto} ${productoEncontrado.unidadMedida}?`,
      texto: 'Esta acción queda registrada con tu usuario y no se puede deshacer.',
      textoConfirmar: 'Sí, continuar',
      colorConfirmar: tipoMerma === 'merma' ? '#DC2626' : '#B4531F'
    })
    if (!confirmado) return

    setEnviando(true)
    const resultado = await window.picaventa.registrarMerma(productoEncontrado.idProducto, {
      idProducto: productoEncontrado.idProducto,
      tipoMerma,
      motivo: motivo.trim(),
      cantidad: monto
    })

    if (resultado.ok) {
      mostrarToast(
        tipoMerma === 'merma'
          ? `Merma registrada — nuevo stock: ${resultado.stockNuevo}`
          : `Stock corregido — ahora: ${resultado.stockNuevo}`
      )
      cancelarSeleccion()
      if (mostrarHistorial) await cargarHistorial()
    } else {
      setError(resultado.error)
    }
    setEnviando(false)
  }

  async function cargarHistorial(): Promise<void> {
    setCargandoHistorial(true)
    const resultado = await window.picaventa.obtenerHistorialMermas()
    if (resultado.ok) setHistorial(resultado.mermas)
    setCargandoHistorial(false)
  }

  async function alternarHistorial(): Promise<void> {
    if (mostrarHistorial) {
      setMostrarHistorial(false)
      return
    }
    setMostrarHistorial(true)
    await cargarHistorial()
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-texto-secundario">
          Registra mermas (caducidad, daño) o corrige el stock tras un conteo físico. Ambos quedan
          en el historial con tu usuario y la fecha.
        </p>
        <button
          type="button"
          onClick={() => void alternarHistorial()}
          className="shrink-0 rounded-md border border-borde px-3 py-1.5 text-xs font-medium text-texto-secundario hover:bg-arena"
        >
          {mostrarHistorial ? 'Ocultar historial' : 'Ver historial'}
        </button>
      </div>

      {mostrarHistorial && (
        <div className="rounded-lg border border-borde bg-tarjeta p-4">
          <h2 className="mb-3 text-sm font-semibold text-texto-secundario">
            Historial de mermas y ajustes
          </h2>
          {cargandoHistorial ? (
            <p className="text-sm text-texto-secundario">Cargando...</p>
          ) : historial.length === 0 ? (
            <p className="text-sm text-texto-secundario">Aún no hay registros.</p>
          ) : (
            <div className="max-h-96 overflow-x-auto overflow-y-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-xs text-texto-secundario">
                    <th className="pb-2 pr-3 font-medium">Fecha</th>
                    <th className="pb-2 pr-3 font-medium">Producto</th>
                    <th className="pb-2 pr-3 font-medium">Tipo</th>
                    <th className="pb-2 pr-3 font-medium">Motivo</th>
                    <th className="pb-2 pr-3 font-medium">Cantidad</th>
                    <th className="pb-2 font-medium">Quién</th>
                  </tr>
                </thead>
                <tbody>
                  {historial.map((m) => (
                    <tr key={m.idMerma} className="border-t border-borde">
                      <td className="py-2 pr-3 text-texto-secundario">
                        {new Date(m.fechaMerma).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="py-2 pr-3 text-onix">{m.nombreProducto}</td>
                      <td className="py-2 pr-3 capitalize text-onix">{m.tipoMerma}</td>
                      <td className="py-2 pr-3 text-texto-secundario">{m.motivoMerma}</td>
                      <td className={`py-2 pr-3 font-medium ${m.cantidadMerma < 0 ? 'text-peligro' : 'text-onix'}`}>
                        {m.cantidadMerma > 0 && m.tipoMerma === 'ajuste' ? '+' : ''}
                        {m.cantidadMerma} {m.unidadMedida}
                      </td>
                      <td className="py-2 text-texto-secundario">{m.nombreUsuario}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div className="max-w-2xl rounded-lg border border-borde bg-tarjeta p-4">
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
            {resultadosBusqueda.length > 0 && (
              <div className="mt-2 rounded-md border border-borde">
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
              </div>
            )}
          </>
        ) : (
          <form onSubmit={(evento) => void manejarEnviar(evento)} className="flex flex-col gap-3">
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

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => cambiarTipo('merma')}
                className={`flex-1 rounded-md px-3 py-2 text-sm font-medium ${
                  tipoMerma === 'merma' ? 'bg-peligro text-white' : 'border border-borde text-texto-secundario'
                }`}
              >
                Merma (caducidad, daño)
              </button>
              <button
                type="button"
                onClick={() => cambiarTipo('ajuste')}
                className={`flex-1 rounded-md px-3 py-2 text-sm font-medium ${
                  tipoMerma === 'ajuste' ? 'bg-cobre text-white' : 'border border-borde text-texto-secundario'
                }`}
              >
                Ajuste por conteo físico
              </button>
            </div>

            <label className="text-sm font-medium text-neutral-700">
              {tipoMerma === 'merma' ? 'Cantidad perdida' : 'Stock físico contado'}
              <input
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
            <label className="text-sm font-medium text-neutral-700">
              Motivo
              <input
                type="text"
                required
                value={motivo}
                onChange={(evento) => setMotivo(evento.target.value)}
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
              />
            </label>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={enviando}
              className={`rounded-md px-4 py-3 text-sm font-semibold text-white disabled:opacity-50 ${
                tipoMerma === 'merma' ? 'bg-peligro hover:opacity-90' : 'bg-cobre hover:bg-cobre-oscuro'
              }`}
            >
              {enviando ? 'Guardando...' : tipoMerma === 'merma' ? 'Registrar merma' : 'Guardar ajuste'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
