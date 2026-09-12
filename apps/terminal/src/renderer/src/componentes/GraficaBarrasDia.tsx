import { formatoMoneda } from '../lib/formato'

interface Props {
  dias: { fecha: string; total: number }[]
}

const DIA_SEMANA = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']

function fechaLocalISO(fecha: Date): string {
  const anio = fecha.getFullYear()
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  return `${anio}-${mes}-${dia}`
}

export default function GraficaBarrasDia({ dias }: Props): React.JSX.Element {
  const maximo = Math.max(...dias.map((d) => d.total), 1)
  const hoy = fechaLocalISO(new Date())
  const mostrarEtiquetas = dias.length <= 14
  // Deja aire arriba de la barra más alta para que quepa su número — sin
  // esto, la barra del día con más ventas taparía su propia etiqueta.
  const alturaMaxima = mostrarEtiquetas ? 85 : 100

  return (
    <div className="flex h-40 items-end gap-1">
      {dias.map((d) => {
        const esHoy = d.fecha === hoy
        const fecha = new Date(`${d.fecha}T12:00:00`)
        return (
          <div key={d.fecha} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
            <div className="flex w-full flex-1 flex-col items-center justify-end">
              {mostrarEtiquetas && d.total > 0 && (
                <span className="mb-0.5 whitespace-nowrap text-[9px] font-medium tabular-nums text-texto-secundario">
                  {formatoMoneda(d.total, 0)}
                </span>
              )}
              <div
                title={`${d.fecha}: ${formatoMoneda(d.total)}`}
                className={`w-full rounded-t transition-all ${esHoy ? 'bg-cobre' : 'bg-cobre/30'}`}
                style={{ height: `${Math.max((d.total / maximo) * alturaMaxima, d.total > 0 ? 4 : 1)}%` }}
              />
            </div>
            {mostrarEtiquetas && (
              <span className="text-[10px] text-texto-secundario">
                {DIA_SEMANA[fecha.getDay()]} {fecha.getDate()}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
