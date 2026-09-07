import { useState } from 'react'
import PantallaCategorias from './PantallaCategorias'
import PantallaProductos from './PantallaProductos'
import PantallaEntradaInventario from './PantallaEntradaInventario'

type Tab = 'productos' | 'categorias' | 'entradas'

export default function PantallaCatalogo(): React.JSX.Element {
  const [tab, setTab] = useState<Tab>('productos')

  return (
    <div className="mx-auto w-full max-w-3xl">
      <h1 className="mb-6 text-2xl font-bold text-neutral-900">Catálogo</h1>

      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => setTab('productos')}
          className={`rounded-md px-4 py-2 text-sm ${
            tab === 'productos' ? 'bg-cobre hover:bg-cobre-oscuro text-white' : 'border border-neutral-300'
          }`}
        >
          Productos
        </button>
        <button
          type="button"
          onClick={() => setTab('categorias')}
          className={`rounded-md px-4 py-2 text-sm ${
            tab === 'categorias' ? 'bg-cobre hover:bg-cobre-oscuro text-white' : 'border border-neutral-300'
          }`}
        >
          Categorías
        </button>
        <button
          type="button"
          onClick={() => setTab('entradas')}
          className={`rounded-md px-4 py-2 text-sm ${
            tab === 'entradas' ? 'bg-cobre hover:bg-cobre-oscuro text-white' : 'border border-neutral-300'
          }`}
        >
          Entradas de mercancía
        </button>
      </div>

      {tab === 'productos' && <PantallaProductos />}
      {tab === 'categorias' && <PantallaCategorias />}
      {tab === 'entradas' && <PantallaEntradaInventario />}
    </div>
  )
}
