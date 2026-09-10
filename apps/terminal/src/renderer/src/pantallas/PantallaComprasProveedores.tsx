import { useState } from 'react'
import PantallaProveedores from './PantallaProveedores'
import PantallaCompras from './PantallaCompras'

type Tab = 'compras' | 'proveedores'

export default function PantallaComprasProveedores(): React.JSX.Element {
  const [tab, setTab] = useState<Tab>('compras')

  return (
    <div className="w-full">
      <h1 className="mb-6 text-2xl font-bold text-neutral-900">Compras y proveedores</h1>

      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => setTab('compras')}
          className={`rounded-md px-4 py-2 text-sm ${
            tab === 'compras' ? 'bg-cobre hover:bg-cobre-oscuro text-white' : 'border border-neutral-300'
          }`}
        >
          Registrar compra
        </button>
        <button
          type="button"
          onClick={() => setTab('proveedores')}
          className={`rounded-md px-4 py-2 text-sm ${
            tab === 'proveedores' ? 'bg-cobre hover:bg-cobre-oscuro text-white' : 'border border-neutral-300'
          }`}
        >
          Proveedores
        </button>
      </div>

      {tab === 'compras' && <PantallaCompras />}
      {tab === 'proveedores' && <PantallaProveedores />}
    </div>
  )
}
