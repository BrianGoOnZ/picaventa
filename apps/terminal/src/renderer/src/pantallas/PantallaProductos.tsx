import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { IMAGEN_PRODUCTO_MAX_BYTES, type Categoria, type Producto, type UnidadMedida } from '@picaventa/shared'

const FORMULARIO_VACIO = {
  nombreProducto: '',
  codigoBarras: '',
  precioCompra: '',
  precioVenta: '',
  unidadMedida: 'pieza' as UnidadMedida,
  stockActual: '',
  stockMinimo: '',
  idCategoria: ''
}

export default function PantallaProductos(): React.JSX.Element {
  const [productos, setProductos] = useState<Producto[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [cargando, setCargando] = useState(true)
  const [buscar, setBuscar] = useState('')
  const [soloStockBajo, setSoloStockBajo] = useState(false)
  const [formulario, setFormulario] = useState(FORMULARIO_VACIO)
  const [imagenDatos, setImagenDatos] = useState<string | undefined>(undefined)
  const [idEditando, setIdEditando] = useState<number | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  function manejarArchivoImagen(evento: ChangeEvent<HTMLInputElement>): void {
    const archivo = evento.target.files?.[0]
    if (!archivo) return

    if (archivo.size > IMAGEN_PRODUCTO_MAX_BYTES) {
      setError('La foto no debe pesar más de 200 KB')
      return
    }

    const lector = new FileReader()
    lector.onload = () => {
      setImagenDatos(lector.result as string)
      setError('')
    }
    lector.readAsDataURL(archivo)
  }

  async function cargarProductos(): Promise<void> {
    const resultado = await window.picaventa.listarProductos({
      buscar: buscar || undefined,
      stockBajo: soloStockBajo || undefined
    })
    if (resultado.ok) setProductos(resultado.productos)
    setCargando(false)
  }

  useEffect(() => {
    void window.picaventa.listarCategorias().then((resultado) => {
      if (resultado.ok) setCategorias(resultado.categorias)
    })
  }, [])

  useEffect(() => {
    setCargando(true)
    void cargarProductos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buscar, soloStockBajo])

  function manejarEditar(producto: Producto): void {
    setIdEditando(producto.idProducto)
    setFormulario({
      nombreProducto: producto.nombreProducto,
      codigoBarras: producto.codigoBarras ?? '',
      precioCompra: producto.precioCompra?.toString() ?? '',
      precioVenta: producto.precioVenta.toString(),
      unidadMedida: producto.unidadMedida,
      stockActual: producto.stockActual.toString(),
      stockMinimo: producto.stockMinimo.toString(),
      idCategoria: producto.idCategoria?.toString() ?? ''
    })
    setImagenDatos(producto.imagenDatos)
    setError('')
  }

  function cancelarEdicion(): void {
    setIdEditando(null)
    setFormulario(FORMULARIO_VACIO)
    setImagenDatos(undefined)
    setError('')
  }

  async function manejarEnviar(evento: FormEvent): Promise<void> {
    evento.preventDefault()
    setEnviando(true)
    setError('')

    const datos = {
      nombreProducto: formulario.nombreProducto,
      codigoBarras: formulario.codigoBarras || undefined,
      precioCompra: formulario.precioCompra ? Number(formulario.precioCompra) : undefined,
      precioVenta: Number(formulario.precioVenta),
      unidadMedida: formulario.unidadMedida,
      stockActual: Number(formulario.stockActual),
      stockMinimo: Number(formulario.stockMinimo),
      idCategoria: formulario.idCategoria ? Number(formulario.idCategoria) : undefined,
      imagenDatos
    }

    const resultado =
      idEditando === null
        ? await window.picaventa.crearProducto(datos)
        : await window.picaventa.editarProducto(idEditando, datos)

    if (resultado.ok) {
      cancelarEdicion()
      await cargarProductos()
    } else {
      setError(resultado.error)
    }
    setEnviando(false)
  }

  async function manejarEliminar(producto: Producto): Promise<void> {
    if (!window.confirm(`¿Eliminar "${producto.nombreProducto}"?`)) return

    const resultado = await window.picaventa.eliminarProducto(producto.idProducto)
    if (resultado.ok) {
      await cargarProductos()
    } else {
      setError(resultado.error)
    }
  }

  function nombreCategoria(idCategoria?: number): string {
    return categorias.find((c) => c.idCategoria === idCategoria)?.nombreCategoria ?? '—'
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <h2 className="text-sm font-semibold text-neutral-700">Productos</h2>
          <input
            type="text"
            placeholder="Buscar por nombre..."
            value={buscar}
            onChange={(evento) => setBuscar(evento.target.value)}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
          />
          <label className="flex items-center gap-1.5 text-sm text-neutral-600">
            <input
              type="checkbox"
              checked={soloStockBajo}
              onChange={(evento) => setSoloStockBajo(evento.target.checked)}
            />
            Solo stock bajo
          </label>
        </div>

        {cargando ? (
          <p className="text-sm text-neutral-500">Cargando...</p>
        ) : productos.length === 0 ? (
          <p className="text-sm text-neutral-500">No hay productos.</p>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            <ul className="divide-y divide-neutral-100">
              {productos.map((producto) => {
                const stockBajo = producto.stockActual <= producto.stockMinimo
                return (
                  <li
                    key={producto.idProducto}
                    className="flex items-center justify-between py-2 text-sm"
                  >
                    <span className="flex items-center gap-2 text-neutral-800">
                      {producto.imagenDatos ? (
                        <img
                          src={producto.imagenDatos}
                          alt=""
                          className="h-8 w-8 shrink-0 rounded object-cover"
                        />
                      ) : (
                        <span
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-xs font-semibold text-white"
                          style={{
                            backgroundColor:
                              categorias.find((c) => c.idCategoria === producto.idCategoria)
                                ?.colorCategoria ?? '#57534E'
                          }}
                        >
                          {producto.nombreProducto.charAt(0).toUpperCase()}
                        </span>
                      )}
                      <span>
                        {producto.nombreProducto}{' '}
                        <span className="text-neutral-500">
                          ({nombreCategoria(producto.idCategoria)})
                        </span>
                        {' — $'}
                        {producto.precioVenta.toFixed(2)} —{' '}
                        <span className={stockBajo ? 'font-semibold text-red-600' : ''}>
                          stock: {producto.stockActual} {producto.unidadMedida}
                        </span>
                      </span>
                    </span>
                    <span className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => manejarEditar(producto)}
                        className="text-xs text-neutral-600 underline"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => void manejarEliminar(producto)}
                        className="text-xs text-red-600 underline"
                      >
                        Eliminar
                      </button>
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>

      <form
        onSubmit={manejarEnviar}
        className="grid grid-cols-2 gap-3 rounded-lg border border-neutral-200 bg-white p-4"
      >
        <h2 className="col-span-2 text-sm font-semibold text-neutral-700">
          {idEditando === null ? 'Nuevo producto' : 'Editar producto'}
        </h2>
        <label className="col-span-2 text-sm font-medium text-neutral-700">
          Nombre
          <input
            type="text"
            required
            value={formulario.nombreProducto}
            onChange={(evento) =>
              setFormulario({ ...formulario, nombreProducto: evento.target.value })
            }
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="col-span-2 text-sm font-medium text-neutral-700">
          Foto (opcional, máx. 200 KB) — si no se sube, se muestra un color por categoría
          <div className="mt-1 flex items-center gap-3">
            <input
              type="file"
              accept="image/png,image/jpeg"
              onChange={manejarArchivoImagen}
              className="flex-1 text-sm"
            />
            {imagenDatos && (
              <img
                src={imagenDatos}
                alt=""
                className="h-12 w-12 rounded border border-neutral-200 object-cover"
              />
            )}
          </div>
        </label>
        <label className="text-sm font-medium text-neutral-700">
          Código de barras
          <input
            type="text"
            value={formulario.codigoBarras}
            onChange={(evento) =>
              setFormulario({ ...formulario, codigoBarras: evento.target.value })
            }
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm font-medium text-neutral-700">
          Categoría
          <select
            value={formulario.idCategoria}
            onChange={(evento) => setFormulario({ ...formulario, idCategoria: evento.target.value })}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          >
            <option value="">Sin categoría</option>
            {categorias.map((categoria) => (
              <option key={categoria.idCategoria} value={categoria.idCategoria}>
                {categoria.nombreCategoria}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium text-neutral-700">
          Precio de compra
          <input
            type="number"
            step="0.01"
            min="0"
            value={formulario.precioCompra}
            onChange={(evento) =>
              setFormulario({ ...formulario, precioCompra: evento.target.value })
            }
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm font-medium text-neutral-700">
          Precio de venta
          <input
            type="number"
            step="0.01"
            min="0"
            required
            value={formulario.precioVenta}
            onChange={(evento) => setFormulario({ ...formulario, precioVenta: evento.target.value })}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm font-medium text-neutral-700">
          Unidad de medida
          <select
            value={formulario.unidadMedida}
            onChange={(evento) =>
              setFormulario({ ...formulario, unidadMedida: evento.target.value as UnidadMedida })
            }
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          >
            <option value="pieza">Pieza</option>
            <option value="kg">Kilogramo (granel)</option>
          </select>
        </label>
        <label className="text-sm font-medium text-neutral-700">
          Stock actual
          <input
            type="number"
            step="0.001"
            min="0"
            required
            value={formulario.stockActual}
            onChange={(evento) => setFormulario({ ...formulario, stockActual: evento.target.value })}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm font-medium text-neutral-700">
          Stock mínimo (alerta)
          <input
            type="number"
            step="0.001"
            min="0"
            required
            value={formulario.stockMinimo}
            onChange={(evento) => setFormulario({ ...formulario, stockMinimo: evento.target.value })}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </label>
        {error && <p className="col-span-2 text-sm text-red-600">{error}</p>}
        <div className="col-span-2 flex gap-2">
          {idEditando !== null && (
            <button
              type="button"
              onClick={cancelarEdicion}
              className="rounded-md border border-neutral-300 px-4 py-2 text-sm"
            >
              Cancelar
            </button>
          )}
          <button
            type="submit"
            disabled={enviando}
            className="flex-1 rounded-md bg-cobre hover:bg-cobre-oscuro px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {enviando ? 'Guardando...' : idEditando === null ? 'Agregar' : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
  )
}
