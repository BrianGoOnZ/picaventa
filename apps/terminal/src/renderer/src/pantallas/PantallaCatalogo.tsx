import { useState } from 'react'
import { tienePermiso, type SesionUsuario } from '@picaventa/shared'
import PantallaCategorias from './PantallaCategorias'
import PantallaProductos from './PantallaProductos'
import PantallaEntradaInventario from './PantallaEntradaInventario'
import PantallaAjusteInventario from './PantallaAjusteInventario'
import PantallaPromociones from './PantallaPromociones'

type Tab = 'productos' | 'categorias' | 'entradas' | 'ajustes' | 'promociones'

interface Props {
  sesion: SesionUsuario
}

export default function PantallaCatalogo({ sesion }: Props): React.JSX.Element {
  const esAdmin = sesion.rolUsuario === 'administrador'
  const puedeProductos = esAdmin || tienePermiso(sesion, 'crearProductos')
  const puedeCategorias = esAdmin || tienePermiso(sesion, 'crearCategorias')
  const puedeEntradas = esAdmin || tienePermiso(sesion, 'cargarInventario')

  const [tab, setTab] = useState<Tab>(
    puedeProductos ? 'productos' : puedeCategorias ? 'categorias' : 'entradas'
  )

  return (
    <div className="mx-auto w-full max-w-6xl">
      <h1 className="mb-6 text-2xl font-bold text-neutral-900">Catálogo</h1>

      <div className="mb-4 flex gap-2">
        {puedeProductos && (
          <button
            type="button"
            onClick={() => setTab('productos')}
            className={`rounded-md px-4 py-2 text-sm ${
              tab === 'productos' ? 'bg-cobre hover:bg-cobre-oscuro text-white' : 'border border-neutral-300'
            }`}
          >
            Productos
          </button>
        )}
        {puedeCategorias && (
          <button
            type="button"
            onClick={() => setTab('categorias')}
            className={`rounded-md px-4 py-2 text-sm ${
              tab === 'categorias' ? 'bg-cobre hover:bg-cobre-oscuro text-white' : 'border border-neutral-300'
            }`}
          >
            Categorías
          </button>
        )}
        {puedeEntradas && (
          <button
            type="button"
            onClick={() => setTab('entradas')}
            className={`rounded-md px-4 py-2 text-sm ${
              tab === 'entradas' ? 'bg-cobre hover:bg-cobre-oscuro text-white' : 'border border-neutral-300'
            }`}
          >
            Entradas de mercancía
          </button>
        )}
        {esAdmin && (
          <button
            type="button"
            onClick={() => setTab('ajustes')}
            className={`rounded-md px-4 py-2 text-sm ${
              tab === 'ajustes' ? 'bg-cobre hover:bg-cobre-oscuro text-white' : 'border border-neutral-300'
            }`}
          >
            Mermas y ajustes
          </button>
        )}
        {esAdmin && (
          <button
            type="button"
            onClick={() => setTab('promociones')}
            className={`rounded-md px-4 py-2 text-sm ${
              tab === 'promociones' ? 'bg-cobre hover:bg-cobre-oscuro text-white' : 'border border-neutral-300'
            }`}
          >
            Promociones
          </button>
        )}
      </div>

      {tab === 'productos' && puedeProductos && <PantallaProductos sesion={sesion} />}
      {tab === 'categorias' && puedeCategorias && <PantallaCategorias sesion={sesion} />}
      {tab === 'entradas' && puedeEntradas && <PantallaEntradaInventario sesion={sesion} />}
      {tab === 'ajustes' && esAdmin && <PantallaAjusteInventario />}
      {tab === 'promociones' && esAdmin && <PantallaPromociones />}
    </div>
  )
}
