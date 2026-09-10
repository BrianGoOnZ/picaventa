import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { Categoria, Producto, Promocion, TipoDescuentoPromocion } from '@picaventa/shared'
import { BOTON_PELIGRO, BOTON_SECUNDARIO } from '../lib/estilos'
import { confirmarEliminar } from '../lib/confirmar'
import { useToast } from '../lib/ToastContext'

const ETIQUETAS_TIPO: Record<TipoDescuentoPromocion, string> = {
  porcentaje: '% de descuento',
  montoFijo: 'Monto fijo por unidad',
  dosPorUno: '2x1'
}

const AYUDA_TIPO: Record<TipoDescuentoPromocion, string> = {
  porcentaje: 'Ejemplo: 20 = 20% menos en cada pieza.',
  montoFijo: 'Ejemplo: 5 = $5 menos por cada pieza, sin importar su precio.',
  dosPorUno: 'Por cada 2 piezas que se lleve, 1 sale gratis. No necesita un valor.'
}

type AlcancePromocion = 'categoria' | 'productos'

function hoyISO(): string {
  return new Date().toISOString().slice(0, 10)
}

const FORMULARIO_VACIO = {
  nombrePromocion: '',
  tipoPromocion: 'porcentaje' as TipoDescuentoPromocion,
  valorDescuento: '',
  descripcionPromocion: '',
  fechaInicioPromocion: hoyISO(),
  fechaFinPromocion: hoyISO(),
  idCategoria: '',
  activa: true
}

export default function PantallaPromociones(): React.JSX.Element {
  const [promociones, setPromociones] = useState<Promocion[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [cargando, setCargando] = useState(true)

  const [formulario, setFormulario] = useState(FORMULARIO_VACIO)
  const [alcance, setAlcance] = useState<AlcancePromocion>('categoria')
  const [idsProductos, setIdsProductos] = useState<number[]>([])
  const [buscarProducto, setBuscarProducto] = useState('')
  const [idEditando, setIdEditando] = useState<number | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const { mostrarToast } = useToast()
  const formularioRef = useRef<HTMLFormElement>(null)

  async function cargar(): Promise<void> {
    const resultado = await window.picaventa.listarPromociones()
    if (resultado.ok) setPromociones(resultado.promociones)
    setCargando(false)
  }

  useEffect(() => {
    void cargar()
    void window.picaventa.listarCategorias().then((r) => {
      if (r.ok) setCategorias(r.categorias)
    })
    void window.picaventa.listarProductos({}).then((r) => {
      if (r.ok) setProductos(r.productos)
    })
  }, [])

  function manejarEditar(promocion: Promocion): void {
    setIdEditando(promocion.idPromocion)
    setFormulario({
      nombrePromocion: promocion.nombrePromocion,
      tipoPromocion: promocion.tipoPromocion,
      valorDescuento: promocion.valorDescuento?.toString() ?? '',
      descripcionPromocion: promocion.descripcionPromocion ?? '',
      fechaInicioPromocion: promocion.fechaInicioPromocion,
      fechaFinPromocion: promocion.fechaFinPromocion,
      idCategoria: promocion.idCategoria?.toString() ?? '',
      activa: promocion.activa
    })
    setIdsProductos(promocion.idsProductos)
    // Si ya tenía productos específicos guardados, se respeta ese modo aunque
    // también tuviera una categoría; si no, se asume categoría por defecto.
    setAlcance(promocion.idsProductos.length > 0 ? 'productos' : 'categoria')
    setError('')
    formularioRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function cancelarEdicion(): void {
    setIdEditando(null)
    setFormulario(FORMULARIO_VACIO)
    setIdsProductos([])
    setAlcance('categoria')
    setBuscarProducto('')
    setError('')
  }

  function alternarProducto(idProducto: number): void {
    setIdsProductos((actual) =>
      actual.includes(idProducto) ? actual.filter((id) => id !== idProducto) : [...actual, idProducto]
    )
  }

  async function manejarEnviar(evento: FormEvent): Promise<void> {
    evento.preventDefault()
    setError('')

    if (alcance === 'categoria' && !formulario.idCategoria) {
      setError('Elige a qué categoría aplica la promoción.')
      return
    }
    if (alcance === 'productos' && idsProductos.length === 0) {
      setError('Elige al menos un producto para la promoción.')
      return
    }

    setEnviando(true)

    const datos = {
      nombrePromocion: formulario.nombrePromocion,
      tipoPromocion: formulario.tipoPromocion,
      valorDescuento:
        formulario.tipoPromocion === 'dosPorUno' ? undefined : Number(formulario.valorDescuento),
      descripcionPromocion: formulario.descripcionPromocion || undefined,
      fechaInicioPromocion: formulario.fechaInicioPromocion,
      fechaFinPromocion: formulario.fechaFinPromocion,
      idCategoria: alcance === 'categoria' ? Number(formulario.idCategoria) : undefined,
      idsProductos: alcance === 'productos' ? idsProductos : [],
      activa: formulario.activa
    }

    const creando = idEditando === null
    const resultado = creando
      ? await window.picaventa.crearPromocion(datos)
      : await window.picaventa.editarPromocion(idEditando, datos)

    if (resultado.ok) {
      cancelarEdicion()
      await cargar()
      mostrarToast(creando ? 'Promoción creada' : 'Promoción actualizada')
    } else {
      setError(resultado.error)
    }
    setEnviando(false)
  }

  async function manejarEliminar(promocion: Promocion): Promise<void> {
    if (!(await confirmarEliminar(promocion.nombrePromocion))) return
    const resultado = await window.picaventa.eliminarPromocion(promocion.idPromocion)
    if (resultado.ok) {
      await cargar()
      mostrarToast('Promoción eliminada')
    } else {
      mostrarToast(resultado.error, 'error')
    }
  }

  function nombreCategoria(id?: number): string {
    return categorias.find((c) => c.idCategoria === id)?.nombreCategoria ?? '—'
  }

  function descripcionAlcance(promocion: Promocion): string {
    if (promocion.idsProductos.length > 0) {
      return `📦 ${promocion.idsProductos.length} producto(s) específico(s)`
    }
    if (promocion.idCategoria !== undefined) {
      return `📂 Categoría: ${nombreCategoria(promocion.idCategoria)}`
    }
    return 'Sin alcance definido'
  }

  const productosFiltrados = buscarProducto
    ? productos.filter((p) => p.nombreProducto.toLowerCase().includes(buscarProducto.toLowerCase()))
    : productos

  const claseSeccion = 'col-span-full border-b border-borde pb-1 text-xs font-semibold uppercase tracking-wide text-texto-secundario'

  return (
    <div className="flex flex-col gap-4">
      <form
        ref={formularioRef}
        onSubmit={manejarEnviar}
        className="grid w-full grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3 rounded-lg border border-borde bg-tarjeta p-4"
      >
        <h2 className="col-span-full text-sm font-semibold text-texto-secundario">
          {idEditando === null ? 'Nueva promoción' : 'Editar promoción'}
        </h2>

        <h3 className={claseSeccion}>1. Datos de la promoción</h3>
        <label className="col-span-full text-sm font-medium text-neutral-700">
          Nombre
          <input
            type="text"
            required
            placeholder="Ej. Quincena de bebidas"
            value={formulario.nombrePromocion}
            onChange={(evento) => setFormulario({ ...formulario, nombrePromocion: evento.target.value })}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm font-medium text-neutral-700">
          Tipo de descuento
          <select
            value={formulario.tipoPromocion}
            onChange={(evento) =>
              setFormulario({ ...formulario, tipoPromocion: evento.target.value as TipoDescuentoPromocion })
            }
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          >
            {Object.entries(ETIQUETAS_TIPO).map(([valor, etiqueta]) => (
              <option key={valor} value={valor}>
                {etiqueta}
              </option>
            ))}
          </select>
        </label>
        {formulario.tipoPromocion !== 'dosPorUno' && (
          <label className="text-sm font-medium text-neutral-700">
            {formulario.tipoPromocion === 'porcentaje' ? 'Porcentaje (0-100)' : 'Monto fijo por unidad'}
            <input
              type="number"
              min="0.01"
              step="0.01"
              required
              value={formulario.valorDescuento}
              onChange={(evento) => setFormulario({ ...formulario, valorDescuento: evento.target.value })}
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
          </label>
        )}
        <p className="col-span-full -mt-1 text-xs text-texto-secundario">{AYUDA_TIPO[formulario.tipoPromocion]}</p>

        <h3 className={claseSeccion}>2. ¿A qué aplica?</h3>
        <div className="col-span-full flex max-w-md gap-2">
          <button
            type="button"
            onClick={() => setAlcance('categoria')}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium ${
              alcance === 'categoria'
                ? 'bg-cobre text-white'
                : 'border border-neutral-300 text-texto-secundario hover:bg-arena'
            }`}
          >
            📂 Una categoría completa
          </button>
          <button
            type="button"
            onClick={() => setAlcance('productos')}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium ${
              alcance === 'productos'
                ? 'bg-cobre text-white'
                : 'border border-neutral-300 text-texto-secundario hover:bg-arena'
            }`}
          >
            📦 Productos específicos
          </button>
        </div>

        {alcance === 'categoria' ? (
          <label className="col-span-full max-w-md text-sm font-medium text-neutral-700">
            Categoría
            <select
              value={formulario.idCategoria}
              onChange={(evento) => setFormulario({ ...formulario, idCategoria: evento.target.value })}
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            >
              <option value="">Elige una categoría...</option>
              {categorias.map((c) => (
                <option key={c.idCategoria} value={c.idCategoria}>
                  {c.nombreCategoria}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-xs text-texto-secundario">
              Se aplicará a todos los productos de esta categoría, incluyendo los que agregues después.
            </span>
          </label>
        ) : (
          <div className="col-span-full max-w-md">
            <label className="text-sm font-medium text-neutral-700">Productos</label>
            <span className="mb-1 block text-xs text-texto-secundario">
              Marca uno o varios productos de tu catálogo.
            </span>
            <input
              type="text"
              placeholder="Buscar producto..."
              value={buscarProducto}
              onChange={(evento) => setBuscarProducto(evento.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
            />
            <div className="mt-2 max-h-40 overflow-y-auto rounded-md border border-borde">
              {productosFiltrados.map((p) => (
                <label
                  key={p.idProducto}
                  className="flex items-center gap-2 border-b border-borde px-3 py-1.5 text-sm text-onix last:border-0 hover:bg-arena"
                >
                  <input
                    type="checkbox"
                    checked={idsProductos.includes(p.idProducto)}
                    onChange={() => alternarProducto(p.idProducto)}
                  />
                  {p.nombreProducto}
                </label>
              ))}
            </div>
            {idsProductos.length > 0 && (
              <p className="mt-1 text-xs text-texto-secundario">
                {idsProductos.length} producto(s) seleccionado(s)
              </p>
            )}
          </div>
        )}

        <h3 className={claseSeccion}>3. Vigencia</h3>
        <label className="text-sm font-medium text-neutral-700">
          Desde
          <input
            type="date"
            required
            value={formulario.fechaInicioPromocion}
            onChange={(evento) => setFormulario({ ...formulario, fechaInicioPromocion: evento.target.value })}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm font-medium text-neutral-700">
          Hasta
          <input
            type="date"
            required
            value={formulario.fechaFinPromocion}
            onChange={(evento) => setFormulario({ ...formulario, fechaFinPromocion: evento.target.value })}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm font-medium text-neutral-700">
          Descripción (opcional)
          <input
            type="text"
            value={formulario.descripcionPromocion}
            onChange={(evento) => setFormulario({ ...formulario, descripcionPromocion: evento.target.value })}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="col-span-full flex items-center gap-1.5 text-sm text-texto-secundario">
          <input
            type="checkbox"
            checked={formulario.activa}
            onChange={(evento) => setFormulario({ ...formulario, activa: evento.target.checked })}
          />
          Activa (se aplica automáticamente en el punto de venta)
        </label>

        {error && <p className="col-span-full text-sm text-red-600">{error}</p>}
        <div className="col-span-full flex gap-2">
          {idEditando !== null && (
            <button type="button" onClick={cancelarEdicion} className={BOTON_SECUNDARIO}>
              Cancelar
            </button>
          )}
          <button
            type="submit"
            disabled={enviando}
            className="rounded-md bg-cobre px-4 py-2 text-sm font-semibold text-white hover:bg-cobre-oscuro disabled:opacity-50"
          >
            {enviando ? 'Guardando...' : idEditando === null ? 'Crear promoción' : 'Guardar cambios'}
          </button>
        </div>
      </form>

      <div className="rounded-lg border border-borde bg-tarjeta p-4">
        <h2 className="mb-3 text-sm font-semibold text-texto-secundario">
          Promociones {promociones.length > 0 && `(${promociones.length})`}
        </h2>
        {cargando ? (
          <p className="text-sm text-texto-secundario">Cargando...</p>
        ) : promociones.length === 0 ? (
          <p className="text-sm text-texto-secundario">Aún no hay promociones registradas.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {promociones.map((promocion) => (
              <li
                key={promocion.idPromocion}
                className="flex items-center justify-between rounded-lg border border-borde p-3 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-onix">
                    {promocion.nombrePromocion}
                    {!promocion.activa && (
                      <span className="ml-2 rounded bg-arena px-1.5 py-0.5 text-xs text-texto-secundario">
                        Inactiva
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-texto-secundario">
                    {ETIQUETAS_TIPO[promocion.tipoPromocion]}
                    {promocion.valorDescuento ? ` (${promocion.valorDescuento})` : ''} ·{' '}
                    {promocion.fechaInicioPromocion} a {promocion.fechaFinPromocion} ·{' '}
                    {descripcionAlcance(promocion)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <button type="button" onClick={() => manejarEditar(promocion)} className={BOTON_SECUNDARIO}>
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => void manejarEliminar(promocion)}
                    className={BOTON_PELIGRO}
                  >
                    Eliminar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
