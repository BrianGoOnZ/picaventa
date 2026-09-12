import { useEffect, useState, type FormEvent } from 'react'
import { tienePermiso, type MovimientoCajaDetalle, type ResumenCorteCaja, type SesionUsuario } from '@picaventa/shared'
import PantallaReportes from './PantallaReportes'
import PantallaHistorialVentas from './PantallaHistorialVentas'
import PantallaHistorialCortes from './PantallaHistorialCortes'
import { useToast } from '../lib/ToastContext'
import { formatoMoneda } from '../lib/formato'

interface Props {
  sesion: SesionUsuario
  onCerrarSesion: () => void
}

const ETIQUETA_TIPO_MOVIMIENTO: Record<'retiro' | 'gasto', string> = { retiro: 'Retiro', gasto: 'Gasto' }

export default function PantallaCaja({ sesion, onCerrarSesion }: Props): React.JSX.Element {
  const [tab, setTab] = useState<'corte' | 'reportes' | 'cortes' | 'ventas'>('corte')
  const esAdmin = sesion.rolUsuario === 'administrador'
  const puedeVentas = tienePermiso(sesion, 'procesarDevoluciones')
  const { mostrarToast } = useToast()

  // Retiro/gasto
  const [tipoMovimiento, setTipoMovimiento] = useState<'retiro' | 'gasto'>('retiro')
  const [montoMovimiento, setMontoMovimiento] = useState('')
  const [conceptoMovimiento, setConceptoMovimiento] = useState('')
  const [pinMovimiento, setPinMovimiento] = useState('')
  const [enviandoMovimiento, setEnviandoMovimiento] = useState(false)
  const [errorMovimiento, setErrorMovimiento] = useState('')

  // Movimientos del turno abierto (incluye los retiros automáticos que
  // genera un reembolso en efectivo) — para revisar de dónde sale cada peso
  // antes de confirmar el corte, no solo el total.
  const [movimientosTurno, setMovimientosTurno] = useState<MovimientoCajaDetalle[]>([])

  // Cierre de turno
  const [mostrarCierre, setMostrarCierre] = useState(false)
  const [totalContado, setTotalContado] = useState('')
  const [enviandoCierre, setEnviandoCierre] = useState(false)
  const [errorCierre, setErrorCierre] = useState('')
  const [resumen, setResumen] = useState<ResumenCorteCaja | null>(null)

  async function cargarMovimientosTurno(): Promise<void> {
    const resultado = await window.picaventa.obtenerMovimientosTurno()
    if (resultado.ok) setMovimientosTurno(resultado.movimientos)
  }

  useEffect(() => {
    if (tab === 'corte') void cargarMovimientosTurno()
  }, [tab])

  async function manejarMovimiento(evento: FormEvent): Promise<void> {
    evento.preventDefault()
    setEnviandoMovimiento(true)
    setErrorMovimiento('')

    const resultado = await window.picaventa.registrarMovimientoCaja({
      tipo: tipoMovimiento,
      monto: Number(montoMovimiento),
      concepto: conceptoMovimiento,
      pin: pinMovimiento
    })

    if (resultado.ok) {
      setMontoMovimiento('')
      setConceptoMovimiento('')
      setPinMovimiento('')
      mostrarToast(tipoMovimiento === 'retiro' ? 'Retiro registrado' : 'Gasto registrado')
      await cargarMovimientosTurno()
    } else {
      setErrorMovimiento(resultado.error)
    }
    setEnviandoMovimiento(false)
  }

  async function manejarCerrarTurno(evento: FormEvent): Promise<void> {
    evento.preventDefault()
    setEnviandoCierre(true)
    setErrorCierre('')

    const resultado = await window.picaventa.cerrarTurno(Number(totalContado))

    if (resultado.ok) {
      await cargarMovimientosTurno()
      setResumen(resultado.resumen)
    } else {
      setErrorCierre(resultado.error)
    }
    setEnviandoCierre(false)
  }

  if (resumen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-onix/80 p-8">
        <div className="w-full max-w-md rounded-lg border border-neutral-200 bg-white p-6">
          <h1 className="mb-4 text-xl font-bold text-neutral-900">Resumen del turno</h1>
          <dl className="space-y-1 text-sm text-neutral-700">
            <div className="flex justify-between">
              <dt>Fondo inicial</dt>
              <dd>{formatoMoneda(resumen.fondoInicial)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Ventas en efectivo</dt>
              <dd>{formatoMoneda(resumen.ventasPorMetodo.efectivo)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Ventas con tarjeta</dt>
              <dd>{formatoMoneda(resumen.ventasPorMetodo.tarjeta)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Ventas a fiado</dt>
              <dd>{formatoMoneda(resumen.ventasPorMetodo.fiado)}</dd>
            </div>
            <div className="flex justify-between font-medium">
              <dt>Total vendido</dt>
              <dd>{formatoMoneda(resumen.totalVendido)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Retiros / gastos</dt>
              <dd>−{formatoMoneda(resumen.totalRetirosGastos)}</dd>
            </div>
            {movimientosTurno.length > 0 && (
              <div className="ml-3 space-y-0.5 text-xs text-neutral-500">
                {movimientosTurno.map((m) => (
                  <div key={m.idMovimiento} className="flex justify-between">
                    <span>
                      {ETIQUETA_TIPO_MOVIMIENTO[m.tipoMovimiento]}: {m.conceptoMovimiento}
                    </span>
                    <span>−{formatoMoneda(m.montoMovimiento)}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="my-2 border-t border-neutral-200" />
            <div className="flex justify-between font-semibold">
              <dt>Total esperado en caja</dt>
              <dd>{formatoMoneda(resumen.totalEsperado)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Total contado</dt>
              <dd>{formatoMoneda(resumen.totalContadoSistema)}</dd>
            </div>
            <div className="flex justify-between font-semibold">
              <dt>Diferencia</dt>
              <dd className={resumen.diferencia !== 0 ? 'text-red-600' : 'text-green-700'}>
                {resumen.diferencia >= 0 ? '+' : ''}
                {formatoMoneda(resumen.diferencia)}
              </dd>
            </div>
          </dl>
          <p className="mt-2 text-xs text-neutral-500">
            Tarjeta y fiado no cuentan para el efectivo esperado en caja.
          </p>
          <button
            type="button"
            onClick={onCerrarSesion}
            className="mt-4 w-full rounded-md bg-cobre hover:bg-cobre-oscuro px-4 py-2 text-sm font-semibold text-white"
          >
            Entendido, cerrar sesión
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      <h1 className="mb-6 text-2xl font-bold text-neutral-900">Corte de caja</h1>

        {(esAdmin || puedeVentas) && (
          <div className="mb-4 flex gap-2">
            <button
              type="button"
              onClick={() => setTab('corte')}
              className={`rounded-md px-4 py-2 text-sm ${
                tab === 'corte' ? 'bg-cobre hover:bg-cobre-oscuro text-white' : 'border border-neutral-300'
              }`}
            >
              Corte de caja
            </button>
            {esAdmin && (
              <button
                type="button"
                onClick={() => setTab('reportes')}
                className={`rounded-md px-4 py-2 text-sm ${
                  tab === 'reportes' ? 'bg-cobre hover:bg-cobre-oscuro text-white' : 'border border-neutral-300'
                }`}
              >
                Reportes
              </button>
            )}
            {esAdmin && (
              <button
                type="button"
                onClick={() => setTab('cortes')}
                className={`rounded-md px-4 py-2 text-sm ${
                  tab === 'cortes' ? 'bg-cobre hover:bg-cobre-oscuro text-white' : 'border border-neutral-300'
                }`}
              >
                Historial de cortes
              </button>
            )}
            {puedeVentas && (
              <button
                type="button"
                onClick={() => setTab('ventas')}
                className={`rounded-md px-4 py-2 text-sm ${
                  tab === 'ventas' ? 'bg-cobre hover:bg-cobre-oscuro text-white' : 'border border-neutral-300'
                }`}
              >
                Ventas
              </button>
            )}
          </div>
        )}

        {tab === 'ventas' && puedeVentas ? (
          <PantallaHistorialVentas sesion={sesion} />
        ) : tab === 'reportes' && esAdmin ? (
          <PantallaReportes />
        ) : tab === 'cortes' && esAdmin ? (
          <PantallaHistorialCortes />
        ) : (
          <div className="flex w-full flex-col gap-4">
            <form
              onSubmit={manejarMovimiento}
              className="rounded-lg border border-neutral-200 bg-white p-4"
            >
              <h2 className="mb-3 text-sm font-semibold text-neutral-700">
                Registrar retiro o gasto
              </h2>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
                <label className="text-sm font-medium text-neutral-700">
                  Tipo
                  <select
                    value={tipoMovimiento}
                    onChange={(evento) =>
                      setTipoMovimiento(evento.target.value as 'retiro' | 'gasto')
                    }
                    className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                  >
                    <option value="retiro">Retiro</option>
                    <option value="gasto">Gasto</option>
                  </select>
                </label>
                <label className="text-sm font-medium text-neutral-700">
                  Monto
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    value={montoMovimiento}
                    onChange={(evento) => setMontoMovimiento(evento.target.value)}
                    className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                  />
                </label>
                <label className="col-span-full text-sm font-medium text-neutral-700">
                  Concepto
                  <input
                    type="text"
                    required
                    value={conceptoMovimiento}
                    onChange={(evento) => setConceptoMovimiento(evento.target.value)}
                    className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-sm font-medium text-neutral-700">
                  Tu PIN
                  <input
                    type="password"
                    inputMode="numeric"
                    required
                    pattern="\d{4}"
                    maxLength={4}
                    value={pinMovimiento}
                    onChange={(evento) =>
                      setPinMovimiento(evento.target.value.replace(/\D/g, '').slice(0, 4))
                    }
                    className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 font-mono text-sm tracking-widest"
                  />
                </label>
              </div>
              {errorMovimiento && (
                <p className="mt-2 text-sm text-red-600">{errorMovimiento}</p>
              )}
              <button
                type="submit"
                disabled={enviandoMovimiento || pinMovimiento.length !== 4}
                className="mt-3 rounded-md bg-cobre hover:bg-cobre-oscuro px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {enviandoMovimiento ? 'Registrando...' : 'Registrar'}
              </button>
            </form>

            <div className="rounded-lg border border-neutral-200 bg-white p-4">
              <h2 className="mb-3 text-sm font-semibold text-neutral-700">
                Movimientos de este turno {movimientosTurno.length > 0 && `(${movimientosTurno.length})`}
              </h2>
              {movimientosTurno.length === 0 ? (
                <p className="text-sm text-neutral-500">Aún no hay retiros ni gastos registrados en este turno.</p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {movimientosTurno.map((m) => (
                    <li
                      key={m.idMovimiento}
                      className="flex items-center justify-between rounded-md border border-neutral-200 px-3 py-1.5 text-sm"
                    >
                      <span className="min-w-0 flex-1 truncate">
                        <span
                          className={`mr-2 rounded px-1.5 py-0.5 text-xs font-medium ${
                            m.tipoMovimiento === 'retiro' ? 'bg-alerta/10 text-alerta' : 'bg-peligro/10 text-peligro'
                          }`}
                        >
                          {ETIQUETA_TIPO_MOVIMIENTO[m.tipoMovimiento]}
                        </span>
                        {m.conceptoMovimiento}
                      </span>
                      <span className="shrink-0 font-medium text-neutral-700">
                        −{formatoMoneda(m.montoMovimiento)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-lg border border-neutral-200 bg-white p-4">
              <h2 className="mb-3 text-sm font-semibold text-neutral-700">Cerrar turno</h2>
              {!mostrarCierre ? (
                <button
                  type="button"
                  onClick={() => setMostrarCierre(true)}
                  className="rounded-md border border-neutral-300 px-4 py-2 text-sm"
                >
                  Iniciar cierre de turno
                </button>
              ) : (
                <form onSubmit={manejarCerrarTurno} className="flex items-end gap-3">
                  <label className="text-sm font-medium text-neutral-700">
                    Efectivo contado físicamente
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      autoFocus
                      value={totalContado}
                      onChange={(evento) => setTotalContado(evento.target.value)}
                      className="mt-1 w-40 rounded-md border border-neutral-300 px-3 py-2 text-sm"
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={enviandoCierre}
                    className="rounded-md bg-cobre hover:bg-cobre-oscuro px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {enviandoCierre ? 'Generando...' : 'Generar corte y cerrar sesión'}
                  </button>
                </form>
              )}
              {errorCierre && <p className="mt-2 text-sm text-red-600">{errorCierre}</p>}
            </div>
          </div>
        )}
    </div>
  )
}
