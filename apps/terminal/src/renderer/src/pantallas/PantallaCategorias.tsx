import { useEffect, useState, type FormEvent } from 'react'
import type { Categoria } from '@picaventa/shared'

export default function PantallaCategorias(): React.JSX.Element {
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [cargando, setCargando] = useState(true)
  const [nombreCategoria, setNombreCategoria] = useState('')
  const [idEditando, setIdEditando] = useState<number | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

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
    setError('')
  }

  function cancelarEdicion(): void {
    setIdEditando(null)
    setNombreCategoria('')
    setError('')
  }

  async function manejarEnviar(evento: FormEvent): Promise<void> {
    evento.preventDefault()
    setEnviando(true)
    setError('')

    const resultado =
      idEditando === null
        ? await window.picaventa.crearCategoria({ nombreCategoria })
        : await window.picaventa.editarCategoria(idEditando, { nombreCategoria })

    if (resultado.ok) {
      cancelarEdicion()
      await cargar()
    } else {
      setError(resultado.error)
    }
    setEnviando(false)
  }

  async function manejarEliminar(categoria: Categoria): Promise<void> {
    if (!window.confirm(`¿Eliminar la categoría "${categoria.nombreCategoria}"?`)) return

    const resultado = await window.picaventa.eliminarCategoria(categoria.idCategoria)
    if (resultado.ok) {
      await cargar()
    } else {
      setError(resultado.error)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-neutral-700">Categorías</h2>
        {cargando ? (
          <p className="text-sm text-neutral-500">Cargando...</p>
        ) : categorias.length === 0 ? (
          <p className="text-sm text-neutral-500">No hay categorías.</p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {categorias.map((categoria) => (
              <li
                key={categoria.idCategoria}
                className="flex items-center justify-between py-2 text-sm"
              >
                <span className="text-neutral-800">{categoria.nombreCategoria}</span>
                <span className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => manejarEditar(categoria)}
                    className="text-xs text-neutral-600 underline"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => void manejarEliminar(categoria)}
                    className="text-xs text-red-600 underline"
                  >
                    Eliminar
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <form
        onSubmit={manejarEnviar}
        className="flex items-end gap-2 rounded-lg border border-neutral-200 bg-white p-4"
      >
        <label className="flex-1 text-sm font-medium text-neutral-700">
          {idEditando === null ? 'Nueva categoría' : 'Editar categoría'}
          <input
            type="text"
            required
            value={nombreCategoria}
            onChange={(evento) => setNombreCategoria(evento.target.value)}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </label>
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
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {idEditando === null ? 'Agregar' : 'Guardar'}
        </button>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
