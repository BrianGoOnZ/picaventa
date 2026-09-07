import { useState, type FormEvent } from 'react'
import type { ResumenCorteCaja, SesionUsuario } from '@picaventa/shared'
import PantallaReportes from './PantallaReportes'

interface Props {
  sesion: SesionUsuario
  onVolver: () => void
  onCerrarSesion: () => void
}

export default function PantallaCaja({ sesion, onVolver, onCerrarSesion }: Props): React.JSX.Element {
  const [tab, setTab] = useState<'corte' | 'reportes'>('corte')

  // Retiro/gasto
  const [tipoMovimiento, setTipoMovimiento] = useState<'retiro' | 'gasto'>('retiro')
  const [montoMovimiento, setMontoMovimiento] = useState('')
  const [conceptoMovimiento, setConceptoMovimiento] = useState('')
  const [pinMovimiento, setPinMovimiento] = useState('')
  const [enviandoMovimiento, setEnviandoMovimiento] = useState(false)
  const [errorMovimiento, setErrorMovimiento] = useState('')
  const [movimientoOk, setMovimientoOk] = useState(false)

  // Cierre de turno
  const [mostrarCierre, setMostrarCierre] = useState(false)
  const [totalContado, setTotalContado] = useState('')
  const [enviandoCierre, setEnviandoCierre] = useState(false)
  const [errorCierre, setErrorCierre] = useState('')
  const [resumen, setResumen] = useState<ResumenCorteCaja | null>(null)

  async function manejarMovimiento(evento: FormEvent): Promise<void> {
    evento.preventDefault()
    setEnviandoMovimiento(true)
    setErrorMovimiento('')
    setMovimientoOk(false)

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
      setMovimientoOk(true)
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
      setResumen(resultado.resumen)
    } else {
      setErrorCierre(resultado.error)
    }
    setEnviandoCierre(false)
  }

  if (resumen) {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-100 p-8">
        <div className="w-full max-w-md rounded-lg border border-neutral-200 bg-white p-6">
          <h1 className="mb-4 text-xl font-bold text-neutral-900">Resumen del turno</h1>
          <dl className="space-y-1 text-sm text-neutral-700">
            <div className="flex justify-between">
              <dt>Fondo inicial</dt>
              <dd>${resumen.fondoInicial.toFixed(2)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Ventas en efectivo</dt>
              <dd>${resumen.ventasPorMetodo.efectivo.toFixed(2)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Ventas con tarjeta</dt>
              <dd>${resumen.ventasPorMetodo.tarjeta.toFixed(2)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Ventas a fiado</dt>
              <dd>${resumen.ventasPorMetodo.fiado.toFixed(2)}</dd>
            </div>
            <div className="flex justify-between font-medium">
              <dt>Total vendido</dt>
              <dd>${resumen.totalVendido.toFixed(2)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Retiros / gastos</dt>
              <dd>−${resumen.totalRetirosGastos.toFixed(2)}</dd>
            </div>
            <div className="my-2 border-t border-neutral-200" />
            <div className="flex justify-between font-semibold">
              <dt>Total esperado en caja</dt>
              <dd>${resumen.totalEsperado.toFixed(2)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Total contado</dt>
              <dd>${resumen.totalContadoSistema.toFixed(2)}</dd>
            </div>
            <div className="flex justify-between font-semibold">
              <dt>Diferencia</dt>
              <dd className={resumen.diferencia !== 0 ? 'text-red-600' : 'text-green-700'}>
                {resumen.diferencia >= 0 ? '+' : ''}
                {resumen.diferencia.toFixed(2)}
              </dd>
            </div>
          </dl>
          <p className="mt-2 text-xs text-neutral-500">
            La tarjeta y el fiado se muestran en el total vendido, pero no cuentan para el efectivo
            esperado en caja.
          </p>
          <button
            type="button"
            onClick={onCerrarSesion}
            className="mt-4 w-full rounded-md bg-neutral-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Entendido, cerrar sesión
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen justify-center overflow-y-auto bg-neutral-100 p-8">
      <div className="w-full max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-neutral-900">Corte de caja</h1>
          <button
            type="button"
            onClick={onVolver}
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm"
          >
            Volver
          </button>
        </div>

        {sesion.rolUsuario === 'administrador' && (
          <div className="mb-4 flex gap-2">
            <button
              type="button"
              onClick={() => setTab('corte')}
              className={`rounded-md px-4 py-2 text-sm ${
                tab === 'corte' ? 'bg-neutral-900 text-white' : 'border border-neutral-300'
              }`}
            >
              Corte de caja
            </button>
            <button
              type="button"
              onClick={() => setTab('reportes')}
              className={`rounded-md px-4 py-2 text-sm ${
                tab === 'reportes' ? 'bg-neutral-900 text-white' : 'border border-neutral-300'
              }`}
            >
              Reportes
            </button>
          </div>
        )}

        {tab === 'reportes' && sesion.rolUsuario === 'administrador' ? (
          <PantallaReportes />
        ) : (
          <div className="flex flex-col gap-4">
            <form
              onSubmit={manejarMovimiento}
              className="rounded-lg border border-neutral-200 bg-white p-4"
            >
              <h2 className="mb-3 text-sm font-semibold text-neutral-700">
                Registrar retiro o gasto
              </h2>
              <div className="grid grid-cols-2 gap-3">
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
                <label className="col-span-2 text-sm font-medium text-neutral-700">
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
                  Tu PIN (RNF-04)
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
              {movimientoOk && (
                <p className="mt-2 text-sm text-green-700">Registrado correctamente.</p>
              )}
              <button
                type="submit"
                disabled={enviandoMovimiento || pinMovimiento.length !== 4}
                className="mt-3 rounded-md bg-neutral-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {enviandoMovimiento ? 'Registrando...' : 'Registrar'}
              </button>
            </form>

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
                    className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
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
    </div>
  )
}
