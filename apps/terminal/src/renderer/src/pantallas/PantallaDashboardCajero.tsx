import { useEffect, useState } from 'react'
import {
  tienePermiso,
  type DevolucionReporte,
  type MovimientoCajaDetalle,
  type ResumenTurnoAbierto,
  type SesionUsuario
} from '@picaventa/shared'
import TarjetaKpi from '../componentes/TarjetaKpi'
import { formatoMoneda } from '../lib/formato'

interface Props {
  sesion: SesionUsuario
  productosStockBajo: number
  onIrAVenta: () => void
  onIrACaja: () => void
}

const ETIQUETAS_RESOLUCION: Record<string, string> = {
  reembolso: 'Reembolso',
  reposicion: 'Reposición (defectuoso)',
  cambio: 'Cambio'
}

export default function PantallaDashboardCajero({
  sesion,
  productosStockBajo,
  onIrAVenta,
  onIrACaja
}: Props): React.JSX.Element {
  const puedeDevoluciones = tienePermiso(sesion, 'procesarDevoluciones')
  const [cargando, setCargando] = useState(true)
  const [resumen, setResumen] = useState<ResumenTurnoAbierto | null>(null)
  const [fondoInicial, setFondoInicial] = useState<number | null>(null)
  const [movimientos, setMovimientos] = useState<MovimientoCajaDetalle[]>([])
  const [devoluciones, setDevoluciones] = useState<DevolucionReporte[]>([])

  useEffect(() => {
    void (async () => {
      const [resultadoResumen, resultadoFondo, resultadoMovimientos, resultadoDevoluciones] = await Promise.all([
        window.picaventa.obtenerResumenTurno(),
        window.picaventa.obtenerFondoInicialTurno(),
        window.picaventa.obtenerMovimientosTurno(),
        puedeDevoluciones
          ? window.picaventa.obtenerDevolucionesTurno()
          : Promise.resolve({ ok: true as const, devoluciones: [] })
      ])

      if (resultadoResumen.ok) setResumen(resultadoResumen.resumen)
      setFondoInicial(resultadoFondo)
      if (resultadoMovimientos.ok) setMovimientos(resultadoMovimientos.movimientos)
      if (resultadoDevoluciones.ok) setDevoluciones(resultadoDevoluciones.devoluciones)
      setCargando(false)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const totalRetiros = movimientos.reduce((acumulado, m) => acumulado + m.montoMovimiento, 0)
  const horaInicio = resumen
    ? new Date(resumen.fechaInicio).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
    : ''

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <div>
        <h1 className="font-display text-2xl font-semibold text-onix">Hola, {sesion.nombreUsuario}</h1>
        <p className="text-sm text-texto-secundario">
          {resumen ? `Turno iniciado a las ${horaInicio}` : 'Sesión de cajero'}
        </p>
      </div>

      {productosStockBajo > 0 && (
        <p className="rounded-md bg-alerta/10 px-3 py-2 text-sm text-alerta">
          ⚠ {productosStockBajo} producto{productosStockBajo === 1 ? '' : 's'} con stock bajo
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onIrAVenta}
          className="rounded-md bg-cobre px-6 py-3 text-base font-semibold text-white hover:bg-cobre-oscuro"
        >
          Nueva venta
        </button>
        <button
          type="button"
          onClick={onIrACaja}
          className="rounded-md border border-borde px-6 py-3 text-base font-medium text-onix hover:bg-arena"
        >
          Ir a Corte de caja
        </button>
      </div>

      {!cargando && (
        <>
          <div>
            <h2 className="mb-2 text-sm font-semibold text-texto-secundario">Tu turno</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <TarjetaKpi titulo="Fondo inicial" valor={fondoInicial !== null ? formatoMoneda(fondoInicial) : '—'} />
              <TarjetaKpi titulo="Vendido" valor={formatoMoneda(resumen?.totalVendido ?? 0)} />
              <TarjetaKpi titulo="Ventas" valor={String(resumen?.numeroVentas ?? 0)} />
              <TarjetaKpi titulo="Retiros / gastos" valor={formatoMoneda(totalRetiros)} />
            </div>
          </div>

          {resumen && resumen.numeroVentas > 0 && (
            <div className="rounded-lg border border-borde bg-tarjeta p-4">
              <h3 className="mb-2 text-sm font-semibold text-texto-secundario">Por método de pago</h3>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-texto-secundario">Efectivo</p>
                  <p className="text-lg font-semibold text-onix">{formatoMoneda(resumen.ventasPorMetodo.efectivo)}</p>
                </div>
                <div>
                  <p className="text-texto-secundario">Tarjeta</p>
                  <p className="text-lg font-semibold text-onix">{formatoMoneda(resumen.ventasPorMetodo.tarjeta)}</p>
                </div>
                <div>
                  <p className="text-texto-secundario">Fiado</p>
                  <p className="text-lg font-semibold text-onix">{formatoMoneda(resumen.ventasPorMetodo.fiado)}</p>
                </div>
              </div>
            </div>
          )}

          {movimientos.length > 0 && (
            <div className="rounded-lg border border-borde bg-tarjeta p-4">
              <h3 className="mb-2 text-sm font-semibold text-texto-secundario">
                Retiros y gastos de tu turno ({movimientos.length})
              </h3>
              <ul className="flex flex-col gap-1.5 text-sm">
                {movimientos.map((m) => (
                  <li key={m.idMovimiento} className="flex justify-between border-t border-borde pt-1.5 first:border-0 first:pt-0">
                    <span className="text-onix">{m.conceptoMovimiento}</span>
                    <span className="font-medium text-texto-secundario">−{formatoMoneda(m.montoMovimiento)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {puedeDevoluciones && devoluciones.length > 0 && (
            <div className="rounded-lg border border-borde bg-tarjeta p-4">
              <h3 className="mb-2 text-sm font-semibold text-texto-secundario">
                Devoluciones que procesaste hoy ({devoluciones.length})
              </h3>
              <ul className="flex flex-col gap-1.5 text-sm">
                {devoluciones.map((d) => (
                  <li key={d.idDevolucion} className="border-t border-borde pt-1.5 first:border-0 first:pt-0">
                    <span className="text-onix">
                      {d.cantidadDevuelta} × {d.nombreProducto}
                    </span>{' '}
                    <span className="text-texto-secundario">
                      — {ETIQUETAS_RESOLUCION[d.tipoResolucion] ?? d.tipoResolucion} ({d.motivoDevolucion})
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  )
}
