import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import {
  IMAGEN_PRODUCTO_MAX_BYTES,
  tienePermiso,
  type Categoria,
  type Producto,
  type SesionUsuario,
  type UnidadMedida
} from '@picaventa/shared'
import { BOTON_PELIGRO, BOTON_SECUNDARIO } from '../lib/estilos'
import { confirmarEliminar } from '../lib/confirmar'
import { useToast } from '../lib/ToastContext'

interface Props {
  sesion: SesionUsuario
}

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

export default function PantallaProductos({ sesion }: Props): React.JSX.Element {
  const puedeCrear = tienePermiso(sesion, 'crearProductos')
  const puedeEliminar = tienePermiso(sesion, 'eliminarProductos')
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
  const { mostrarToast } = useToast()
  const formularioRef = useRef<HTMLFormElement>(null)

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
    formularioRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
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

    const creando = idEditando === null
    const resultado = creando
      ? await window.picaventa.crearProducto(datos)
      : await window.picaventa.editarProducto(idEditando, datos)

    if (resultado.ok) {
      cancelarEdicion()
      await cargarProductos()
      mostrarToast(creando ? 'Producto agregado' : 'Producto actualizado')
    } else {
      setError(resultado.error)
    }
    setEnviando(false)
  }

  async function manejarEliminar(producto: Producto): Promise<void> {
    if (!(await confirmarEliminar(producto.nombreProducto))) return

    const resultado = await window.picaventa.eliminarProducto(producto.idProducto)
    if (resultado.ok) {
      await cargarProductos()
      mostrarToast('Producto eliminado')
    } else {
      mostrarToast(resultado.error, 'error')
    }
  }

  function nombreCategoria(idCategoria?: number): string {
    return categorias.find((c) => c.idCategoria === idCategoria)?.nombreCategoria ?? '—'
  }

  const esAdmin = sesion.rolUsuario === 'administrador'
  const mostrarFormulario = esAdmin || (puedeCrear && idEditando === null)

  return (
    <div className="flex flex-col gap-4">
      {mostrarFormulario && (
      <form
        ref={formularioRef}
        onSubmit={manejarEnviar}
        className="grid grid-cols-2 gap-3 rounded-lg border border-borde bg-tarjeta p-4"
      >
        <h2 className="col-span-2 text-sm font-semibold text-texto-secundario">
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
            <button type="button" onClick={cancelarEdicion} className={BOTON_SECUNDARIO}>
              Cancelar
            </button>
          )}
          <button
            type="submit"
            disabled={enviando}
            className="flex-1 rounded-md bg-cobre px-4 py-2 text-sm font-semibold text-white hover:bg-cobre-oscuro disabled:opacity-50"
          >
            {enviando ? 'Guardando...' : idEditando === null ? 'Agregar producto' : 'Guardar cambios'}
          </button>
        </div>
      </form>
      )}

      <div className="rounded-lg border border-borde bg-tarjeta p-4">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <h2 className="text-sm font-semibold text-texto-secundario">
            Productos registrados {productos.length > 0 && `(${productos.length})`}
          </h2>
          <input
            type="text"
            placeholder="Buscar por nombre..."
            value={buscar}
            onChange={(evento) => setBuscar(evento.target.value)}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
          />
          <label className="flex items-center gap-1.5 text-sm text-texto-secundario">
            <input
              type="checkbox"
              checked={soloStockBajo}
              onChange={(evento) => setSoloStockBajo(evento.target.checked)}
            />
            Solo stock bajo
          </label>
        </div>

        {cargando ? (
          <p className="text-sm text-texto-secundario">Cargando...</p>
        ) : productos.length === 0 ? (
          <p className="text-sm text-texto-secundario">Aún no hay productos registrados.</p>
        ) : (
          <ul className="flex max-h-96 flex-col gap-2 overflow-y-auto">
            {productos.map((producto) => {
              const stockBajo = producto.stockActual <= producto.stockMinimo
              return (
                <li
                  key={producto.idProducto}
                  className="flex items-center gap-3 rounded-lg border border-borde p-3 text-sm"
                >
                  {producto.imagenDatos ? (
                    <img
                      src={producto.imagenDatos}
                      alt=""
                      className="h-9 w-9 shrink-0 rounded object-cover"
                    />
                  ) : (
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded font-display text-sm font-semibold text-white"
                      style={{
                        backgroundColor:
                          categorias.find((c) => c.idCategoria === producto.idCategoria)
                            ?.colorCategoria ?? '#57534E'
                      }}
                    >
                      {producto.nombreProducto.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-onix">{producto.nombreProducto}</p>
                    <p className="text-xs text-texto-secundario">
                      {nombreCategoria(producto.idCategoria)} · ${producto.precioVenta.toFixed(2)} ·{' '}
                      <span className={stockBajo ? 'font-semibold text-peligro' : ''}>
                        stock: {producto.stockActual} {producto.unidadMedida}
                      </span>
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    {esAdmin && (
                      <button
                        type="button"
                        onClick={() => manejarEditar(producto)}
                        className={BOTON_SECUNDARIO}
                      >
                        Editar
                      </button>
                    )}
                    {(esAdmin || puedeEliminar) && (
                      <button
                        type="button"
                        onClick={() => void manejarEliminar(producto)}
                        className={BOTON_PELIGRO}
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
