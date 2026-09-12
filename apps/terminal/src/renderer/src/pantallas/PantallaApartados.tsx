import { useEffect, useState } from 'react'
import type { Venta, VentaDetallada } from '@picaventa/shared'
import { formatoMoneda } from '../lib/formato'

interface Props {
  onVolver: () => void
  onReanudar: (detalle: VentaDetallada) => void
}

export default function PantallaApartados({ onVolver, onReanudar }: Props): React.JSX.Element {
  const [ventas, setVentas] = useState<Venta[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    void window.picaventa.listarVentas({ estado: 'pausada' }).then((resultado) => {
      if (resultado.ok) setVentas(resultado.ventas)
      setCargando(false)
    })
  }, [])

  async function manejarReanudar(idVenta: number): Promise<void> {
    const detalle = await window.picaventa.obtenerVenta(idVenta)
    if (!detalle.ok) {
      setError(detalle.error)
      return
    }
    await window.picaventa.cancelarVentaPausada(idVenta)
    onReanudar(detalle)
  }

  return (
    <div className="flex h-screen items-center justify-center bg-neutral-100 p-8">
      <div className="w-full max-w-lg">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-neutral-900">Apartados</h1>
          <button
            type="button"
            onClick={onVolver}
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm"
          >
            Volver
          </button>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          {cargando ? (
            <p className="text-sm text-neutral-500">Cargando...</p>
          ) : ventas.length === 0 ? (
            <p className="text-sm text-neutral-500">No hay ventas en espera.</p>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {ventas.map((v) => (
                <li key={v.idVenta} className="flex items-center justify-between py-2 text-sm">
                  <span>
                    {v.folioVenta} — {formatoMoneda(v.total)} —{' '}
                    {new Date(v.fechaVenta).toLocaleTimeString('es-MX')}
                  </span>
                  <button
                    type="button"
                    onClick={() => void manejarReanudar(v.idVenta)}
                    className="rounded-md bg-cobre hover:bg-cobre-oscuro px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    Reanudar
                  </button>
                </li>
              ))}
            </ul>
          )}
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>
      </div>
    </div>
  )
}
