import { useEffect, useMemo, useState } from 'react'
import type { CorteCajaResumen } from '@picaventa/shared'

function inicioDeHoy(): Date {
  const fecha = new Date()
  fecha.setHours(0, 0, 0, 0)
  return fecha
}

export default function PantallaHistorialCortes(): React.JSX.Element {
  const [desde, setDesde] = useState(() => {
    const inicio = inicioDeHoy()
    inicio.setDate(inicio.getDate() - 30)
    return inicio.toISOString().slice(0, 10)
  })
  const [hasta, setHasta] = useState(() => new Date().toISOString().slice(0, 10))
  const [cajero, setCajero] = useState('todos')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [cortes, setCortes] = useState<CorteCajaResumen[]>([])

  async function buscar(desdeIso: string, hastaIso: string): Promise<void> {
    setCargando(true)
    setError('')
    const desdeCompleto = new Date(desdeIso).toISOString()
    const hastaCompleto = new Date(`${hastaIso}T23:59:59`).toISOString()

    const resultado = await window.picaventa.listarCortes(500, desdeCompleto, hastaCompleto)
    if (resultado.ok) {
      setCortes(resultado.cortes)
    } else {
      setError(resultado.error)
    }
    setCargando(false)
  }

  useEffect(() => {
    void buscar(desde, hasta)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  const cajeros = useMemo(
    () => Array.from(new Set(cortes.map((c) => c.nombreUsuario))).sort(),
    [cortes]
  )
  const cortesFiltrados = cajero === 'todos' ? cortes : cortes.filter((c) => c.nombreUsuario === cajero)

  const totalDiferencias = cortesFiltrados.reduce((acumulado, c) => acumulado + c.diferencia, 0)
  const cortesConFaltante = cortesFiltrados.filter((c) => c.diferencia < 0).length

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
            <button type="button" onClick={() => atajo(7)} className="rounded-md border border-neutral-300 px-3 py-2 text-xs">
              Última semana
            </button>
            <button type="button" onClick={() => atajo(30)} className="rounded-md border border-neutral-300 px-3 py-2 text-xs">
              Último mes
            </button>
            <button type="button" onClick={() => atajo(90)} className="rounded-md border border-neutral-300 px-3 py-2 text-xs">
              Últimos 3 meses
            </button>
          </div>
          {cajeros.length > 1 && (
            <label className="text-sm font-medium text-neutral-700">
              Cajero
              <select
                value={cajero}
                onChange={(evento) => setCajero(evento.target.value)}
                className="mt-1 rounded-md border border-neutral-300 px-3 py-2 text-sm"
              >
                <option value="todos">Todos</option>
                {cajeros.map((nombre) => (
                  <option key={nombre} value={nombre}>
                    {nombre}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-sm text-neutral-700">
            {cortesFiltrados.length} corte{cortesFiltrados.length !== 1 ? 's' : ''} en este periodo
          </p>
          <p className="text-sm">
            Diferencia acumulada:{' '}
            <span className={`font-semibold ${totalDiferencias < 0 ? 'text-red-600' : 'text-green-700'}`}>
              {totalDiferencias >= 0 ? '+' : ''}
              ${totalDiferencias.toFixed(2)}
            </span>
            {cortesConFaltante > 0 && (
              <span className="ml-2 text-xs text-neutral-500">
                ({cortesConFaltante} con faltante)
              </span>
            )}
          </p>
        </div>

        {cortesFiltrados.length === 0 ? (
          <p className="text-sm text-neutral-500">
            {cargando ? 'Buscando...' : 'No hay cortes de caja en este periodo.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-neutral-500">
                <tr>
                  <th className="py-1">Fecha</th>
                  <th className="py-1">Cajero</th>
                  <th className="py-1 text-right">Fondo inicial</th>
                  <th className="py-1 text-right">Vendido</th>
                  <th className="py-1 text-right">Esperado</th>
                  <th className="py-1 text-right">Contado</th>
                  <th className="py-1 text-right">Diferencia</th>
                </tr>
              </thead>
              <tbody>
                {cortesFiltrados.map((c) => (
                  <tr key={c.idCorte} className="border-t border-neutral-100">
                    <td className="whitespace-nowrap py-1.5">
                      {new Date(c.fechaCorte).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="py-1.5">{c.nombreUsuario}</td>
                    <td className="py-1.5 text-right">${c.fondoInicial.toFixed(2)}</td>
                    <td className="py-1.5 text-right">${c.totalVendido.toFixed(2)}</td>
                    <td className="py-1.5 text-right">${c.totalEsperado.toFixed(2)}</td>
                    <td className="py-1.5 text-right">${c.totalContadoSistema.toFixed(2)}</td>
                    <td
                      className={`py-1.5 text-right font-medium ${
                        c.diferencia === 0 ? 'text-green-700' : c.diferencia < 0 ? 'text-red-600' : 'text-amber-600'
                      }`}
                    >
                      {c.diferencia === 0 ? 'Cuadra' : `${c.diferencia >= 0 ? '+' : ''}$${c.diferencia.toFixed(2)}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
