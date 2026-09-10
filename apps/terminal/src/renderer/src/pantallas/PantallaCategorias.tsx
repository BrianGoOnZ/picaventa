import { useEffect, useRef, useState, type FormEvent } from 'react'
import { tienePermiso, type Categoria, type SesionUsuario } from '@picaventa/shared'
import { BOTON_PELIGRO, BOTON_SECUNDARIO } from '../lib/estilos'
import { confirmarEliminar } from '../lib/confirmar'
import { useToast } from '../lib/ToastContext'

interface Props {
  sesion: SesionUsuario
}

export default function PantallaCategorias({ sesion }: Props): React.JSX.Element {
  const esAdmin = sesion.rolUsuario === 'administrador'
  const puedeCrear = tienePermiso(sesion, 'crearCategorias')
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [cargando, setCargando] = useState(true)
  const [nombreCategoria, setNombreCategoria] = useState('')
  const [colorCategoria, setColorCategoria] = useState('#7C5B45')
  const [colorTocado, setColorTocado] = useState(false)
  const [idEditando, setIdEditando] = useState<number | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const { mostrarToast } = useToast()
  const formularioRef = useRef<HTMLFormElement>(null)

  async function cargar(): Promise<void> {
    const resultado = await window.picaventa.listarCategorias()
    if (resultado.ok) setCategorias(resultado.categorias)
    setCargando(false)
  }

  useEffect(() => {
    void cargar()
  }, [])

  function manejarEditar(categoria: Categoria): void {
    setIdEditando(categoria.idCategoria)
    setNombreCategoria(categoria.nombreCategoria)
    setColorCategoria(categoria.colorCategoria)
    setColorTocado(true)
    setError('')
    formularioRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function cancelarEdicion(): void {
    setIdEditando(null)
    setNombreCategoria('')
    setColorTocado(false)
    setError('')
  }

  async function manejarEnviar(evento: FormEvent): Promise<void> {
    evento.preventDefault()
    setEnviando(true)
    setError('')

    const creando = idEditando === null
    // En una categoría nueva, si el administrador no tocó el selector de
    // color se deja que el servidor asigne uno por rotación.
    const datos = { nombreCategoria, colorCategoria: colorTocado ? colorCategoria : undefined }
    const resultado = creando
      ? await window.picaventa.crearCategoria(datos)
      : await window.picaventa.editarCategoria(idEditando, datos)

    if (resultado.ok) {
      cancelarEdicion()
      await cargar()
      mostrarToast(creando ? 'Categoría agregada' : 'Categoría actualizada')
    } else {
      setError(resultado.error)
    }
    setEnviando(false)
  }

  async function manejarEliminar(categoria: Categoria): Promise<void> {
    if (!(await confirmarEliminar(categoria.nombreCategoria))) return

    const resultado = await window.picaventa.eliminarCategoria(categoria.idCategoria)
    if (resultado.ok) {
      await cargar()
      mostrarToast('Categoría eliminada')
    } else {
      mostrarToast(resultado.error, 'error')
    }
  }

  const mostrarFormulario = esAdmin || (puedeCrear && idEditando === null)

  return (
    <div className="flex flex-col gap-4">
      {mostrarFormulario && (
      <form
        ref={formularioRef}
        onSubmit={manejarEnviar}
        className="flex w-full items-end gap-2 rounded-lg border border-borde bg-tarjeta p-4"
      >
        <label className="max-w-sm flex-1 text-sm font-medium text-neutral-700">
          {idEditando === null ? 'Nueva categoría' : 'Editar categoría'}
          <input
            type="text"
            required
            value={nombreCategoria}
            onChange={(evento) => setNombreCategoria(evento.target.value)}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm font-medium text-neutral-700">
          Color
          <input
            type="color"
            value={colorCategoria}
            onChange={(evento) => {
              setColorCategoria(evento.target.value)
              setColorTocado(true)
            }}
            className="mt-1 block h-9 w-12 rounded-md border border-neutral-300"
          />
        </label>
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
          {idEditando === null ? 'Agregar' : 'Guardar'}
        </button>
      </form>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="rounded-lg border border-borde bg-tarjeta p-4">
        <h2 className="mb-3 text-sm font-semibold text-texto-secundario">
          Categorías registradas {categorias.length > 0 && `(${categorias.length})`}
        </h2>
        {cargando ? (
          <p className="text-sm text-texto-secundario">Cargando...</p>
        ) : categorias.length === 0 ? (
          <p className="text-sm text-texto-secundario">Aún no hay categorías registradas.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {categorias.map((categoria) => (
              <li
                key={categoria.idCategoria}
                className="flex items-center gap-3 rounded-lg border border-borde p-3 text-sm"
              >
                <span
                  className="h-4 w-4 shrink-0 rounded-full"
                  style={{ backgroundColor: categoria.colorCategoria }}
                />
                <span className="flex-1 font-medium text-onix">{categoria.nombreCategoria}</span>
                <div className="flex shrink-0 gap-1.5">
                  {esAdmin && (
                    <button
                      type="button"
                      onClick={() => manejarEditar(categoria)}
                      className={BOTON_SECUNDARIO}
                    >
                      Editar
                    </button>
                  )}
                  {esAdmin && (
                    <button
                      type="button"
                      onClick={() => void manejarEliminar(categoria)}
                      className={BOTON_PELIGRO}
                    >
                      Eliminar
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
