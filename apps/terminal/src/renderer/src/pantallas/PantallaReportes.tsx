import { useEffect, useState } from 'react'
import type { DevolucionReporte, ReporteVentas, TipoResolucion, VentaPorCajero } from '@picaventa/shared'
import { exportarReportePdf } from '../lib/pdfReportes'
import { formatoMoneda } from '../lib/formato'
import { useToast } from '../lib/ToastContext'

function inicioDeHoy(): Date {
  const fecha = new Date()
  fecha.setHours(0, 0, 0, 0)
  return fecha
}

const ETIQUETAS_RESOLUCION: Record<TipoResolucion, string> = {
  reembolso: 'Reembolso',
  reposicion: 'Reposición (defectuoso)',
  cambio: 'Cambio' // valor legado
}

export default function PantallaReportes(): React.JSX.Element {
  const [desde, setDesde] = useState(() => inicioDeHoy().toISOString().slice(0, 10))
  const [hasta, setHasta] = useState(() => new Date().toISOString().slice(0, 10))
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [reporte, setReporte] = useState<ReporteVentas | null>(null)
  const [ventasPorCajero, setVentasPorCajero] = useState<VentaPorCajero[]>([])
  const [devoluciones, setDevoluciones] = useState<DevolucionReporte[]>([])
  const [nombreNegocio, setNombreNegocio] = useState('PicaVenta')
  const [exportando, setExportando] = useState(false)
  const { mostrarToast } = useToast()

  useEffect(() => {
    void window.picaventa.obtenerNegocio().then((resultado) => {
      if (resultado.ok && resultado.negocio) setNombreNegocio(resultado.negocio.nombreNegocio)
    })
  }, [])

  async function buscar(desdeIso: string, hastaIso: string): Promise<void> {
    setCargando(true)
    setError('')
    const desdeCompleto = new Date(desdeIso).toISOString()
    const hastaCompleto = new Date(`${hastaIso}T23:59:59`).toISOString()

    const [resultado, resultadoCajeros, resultadoDevoluciones] = await Promise.all([
      window.picaventa.obtenerReporteVentas(desdeCompleto, hastaCompleto),
      window.picaventa.obtenerVentasPorCajero(desdeCompleto, hastaCompleto),
      window.picaventa.obtenerReporteDevoluciones(desdeCompleto, hastaCompleto)
    ])

    if (resultado.ok) {
      setReporte(resultado.reporte)
    } else {
      setError(resultado.error)
    }
    setVentasPorCajero(resultadoCajeros.ok ? resultadoCajeros.cajeros : [])
    setDevoluciones(resultadoDevoluciones.ok ? resultadoDevoluciones.devoluciones : [])
    setCargando(false)
  }

  function manejarExportar(): void {
    if (!reporte) return
    setExportando(true)
    exportarReportePdf(reporte, ventasPorCajero, nombreNegocio)
    mostrarToast('Reporte exportado')
    setExportando(false)
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
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-xs text-neutral-500">
              Periodo: {new Date(reporte.desde).toLocaleDateString('es-MX')} a{' '}
              {new Date(reporte.hasta).toLocaleDateString('es-MX')}
            </p>
            <button
              type="button"
              onClick={manejarExportar}
              disabled={exportando}
              className="shrink-0 rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium hover:bg-neutral-50 disabled:opacity-50"
            >
              {exportando ? 'Exportando...' : '📄 Exportar a PDF'}
            </button>
          </div>
          <div className="mb-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div>
              <p className="text-neutral-500">Total vendido</p>
              <p className="text-lg font-semibold">{formatoMoneda(reporte.totalVendido)}</p>
            </div>
            <div>
              <p className="text-neutral-500">Efectivo</p>
              <p className="text-lg font-semibold">{formatoMoneda(reporte.porMetodo.efectivo)}</p>
            </div>
            <div>
              <p className="text-neutral-500">Tarjeta</p>
              <p className="text-lg font-semibold">{formatoMoneda(reporte.porMetodo.tarjeta)}</p>
            </div>
            <div>
              <p className="text-neutral-500">Fiado</p>
              <p className="text-lg font-semibold">{formatoMoneda(reporte.porMetodo.fiado)}</p>
            </div>
          </div>

          {ventasPorCajero.length > 0 && (
            <div className="mb-4">
              <h3 className="mb-2 text-sm font-semibold text-neutral-700">Ventas por cajero</h3>
              <ul className="flex flex-col gap-1 text-sm">
                {ventasPorCajero.map((c) => (
                  <li key={c.idUsuario} className="flex justify-between border-t border-neutral-100 py-1">
                    <span>{c.nombreUsuario}</span>
                    <span className="font-medium">{formatoMoneda(c.total)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <h3 className="mb-2 text-sm font-semibold text-neutral-700">
            Productos más vendidos (margen aproximado)
          </h3>
          {reporte.productos.length === 0 ? (
            <p className="text-sm text-neutral-500">Sin ventas en este periodo.</p>
          ) : (
            <div className="max-h-64 overflow-x-auto overflow-y-auto">
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
                      <td className="py-1 text-right">{formatoMoneda(p.ingresos)}</td>
                      <td className="py-1 text-right">{formatoMoneda(p.margenEstimado)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {reporte && (
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <h3 className="mb-2 text-sm font-semibold text-neutral-700">
            Devoluciones del periodo {devoluciones.length > 0 && `(${devoluciones.length})`}
          </h3>
          {devoluciones.length === 0 ? (
            <p className="text-sm text-neutral-500">Sin devoluciones en este periodo.</p>
          ) : (
            <ul className="flex max-h-96 flex-col gap-2 overflow-y-auto">
              {devoluciones.map((d) => (
                <li key={d.idDevolucion} className="rounded-lg border border-neutral-200 p-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-neutral-900">
                        {d.cantidadDevuelta} × {d.nombreProducto}
                      </p>
                      <p className="mt-0.5 text-xs text-neutral-500">
                        {d.folioVenta}
                        {d.folioVentaCambio && ` → ${d.folioVentaCambio}`} ·{' '}
                        {new Date(d.fechaDevolucion).toLocaleString('es-MX', {
                          dateStyle: 'short',
                          timeStyle: 'short'
                        })}{' '}
                        · {d.nombreUsuario}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700">
                        {ETIQUETAS_RESOLUCION[d.tipoResolucion]}
                      </span>
                      {d.montoReembolsado > 0 && (
                        <p className="mt-1 font-semibold text-neutral-900">{formatoMoneda(d.montoReembolsado)}</p>
                      )}
                    </div>
                  </div>
                  <p className="mt-1.5 text-xs text-neutral-600">{d.motivoDevolucion}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
