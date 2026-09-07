import { useState } from 'react'
import type { ReporteVentas } from '@picaventa/shared'

function inicioDeHoy(): Date {
  const fecha = new Date()
  fecha.setHours(0, 0, 0, 0)
  return fecha
}

export default function PantallaReportes(): React.JSX.Element {
  const [desde, setDesde] = useState(() => inicioDeHoy().toISOString().slice(0, 10))
  const [hasta, setHasta] = useState(() => new Date().toISOString().slice(0, 10))
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [reporte, setReporte] = useState<ReporteVentas | null>(null)

  async function buscar(desdeIso: string, hastaIso: string): Promise<void> {
    setCargando(true)
    setError('')
    const resultado = await window.picaventa.obtenerReporteVentas(
      new Date(desdeIso).toISOString(),
      new Date(`${hastaIso}T23:59:59`).toISOString()
    )
    if (resultado.ok) {
      setReporte(resultado.reporte)
    } else {
      setError(resultado.error)
    }
    setCargando(false)
  }

  function atajo(dias: number): void {
    const hoy = new Date()
    const inicio = new Date()
    inicio.setDate(hoy.getDate() - dias)
    const desdeNuevo = inicio.toISOString().slice(0, 10)
    const hastaNuevo = hoy.toISOString().slice(0, 10)
    setDesde(desdeNuevo)
    setHasta(hastaNuevo)
    void buscar(desdeNuevo, hastaNuevo)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm font-medium text-neutral-700">
            Desde
            <input
              type="date"
              value={desde}
              onChange={(evento) => setDesde(evento.target.value)}
              className="mt-1 rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm font-medium text-neutral-700">
            Hasta
            <input
              type="date"
              value={hasta}
              onChange={(evento) => setHasta(evento.target.value)}
              className="mt-1 rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
          </label>
          <button
            type="button"
            onClick={() => void buscar(desde, hasta)}
            disabled={cargando}
            className="rounded-md bg-cobre hover:bg-cobre-oscuro px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Buscar
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => atajo(0)}
              className="rounded-md border border-neutral-300 px-3 py-2 text-xs"
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={() => atajo(7)}
              className="rounded-md border border-neutral-300 px-3 py-2 text-xs"
            >
              Esta semana
            </button>
            <button
              type="button"
              onClick={() => atajo(30)}
              className="rounded-md border border-neutral-300 px-3 py-2 text-xs"
            >
              Este mes
            </button>
          </div>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>

      {reporte && (
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <div className="mb-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div>
              <p className="text-neutral-500">Total vendido</p>
              <p className="text-lg font-semibold">${reporte.totalVendido.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-neutral-500">Efectivo</p>
              <p className="text-lg font-semibold">${reporte.porMetodo.efectivo.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-neutral-500">Tarjeta</p>
              <p className="text-lg font-semibold">${reporte.porMetodo.tarjeta.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-neutral-500">Fiado</p>
              <p className="text-lg font-semibold">${reporte.porMetodo.fiado.toFixed(2)}</p>
            </div>
          </div>

          <h3 className="mb-2 text-sm font-semibold text-neutral-700">
            Productos más vendidos (margen aproximado)
          </h3>
          {reporte.productos.length === 0 ? (
            <p className="text-sm text-neutral-500">Sin ventas en este periodo.</p>
          ) : (
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-neutral-500">
                  <tr>
                    <th className="py-1">Producto</th>
                    <th className="py-1 text-right">Cantidad</th>
                    <th className="py-1 text-right">Ingresos</th>
                    <th className="py-1 text-right">Margen aprox.</th>
                  </tr>
                </thead>
                <tbody>
                  {reporte.productos.map((p) => (
                    <tr key={p.idProducto} className="border-t border-neutral-100">
                      <td className="py-1">{p.nombreProducto}</td>
                      <td className="py-1 text-right">{p.cantidad}</td>
                      <td className="py-1 text-right">${p.ingresos.toFixed(2)}</td>
                      <td className="py-1 text-right">${p.margenEstimado.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
