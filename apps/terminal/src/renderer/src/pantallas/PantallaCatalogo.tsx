import { useState } from 'react'
import PantallaCategorias from './PantallaCategorias'
import PantallaProductos from './PantallaProductos'

interface Props {
  onVolver: () => void
}

export default function PantallaCatalogo({ onVolver }: Props): React.JSX.Element {
  const [tab, setTab] = useState<'productos' | 'categorias'>('productos')

  return (
    <div className="flex h-screen justify-center overflow-y-auto bg-neutral-100 p-8">
      <div className="w-full max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-neutral-900">Catálogo</h1>
          <button
            type="button"
            onClick={onVolver}
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm"
          >
            Volver
          </button>
        </div>

        <div className="mb-4 flex gap-2">
          <button
            type="button"
            onClick={() => setTab('productos')}
            className={`rounded-md px-4 py-2 text-sm ${
              tab === 'productos' ? 'bg-neutral-900 text-white' : 'border border-neutral-300'
            }`}
          >
            Productos
          </button>
          <button
            type="button"
            onClick={() => setTab('categorias')}
            className={`rounded-md px-4 py-2 text-sm ${
              tab === 'categorias' ? 'bg-neutral-900 text-white' : 'border border-neutral-300'
            }`}
          >
            Categorías
          </button>
        </div>

        {tab === 'productos' ? <PantallaProductos /> : <PantallaCategorias />}
      </div>
    </div>
  )
}
