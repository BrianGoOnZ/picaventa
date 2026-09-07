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

  return (
    <div className="flex h-40 items-end gap-1">
      {dias.map((d) => {
        const esHoy = d.fecha === hoy
        const fecha = new Date(`${d.fecha}T12:00:00`)
        return (
          <div key={d.fecha} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
            <div className="flex w-full flex-1 items-end">
              <div
                title={`${d.fecha}: $${d.total.toFixed(2)}`}
                className={`w-full rounded-t transition-all ${esHoy ? 'bg-cobre' : 'bg-cobre/30'}`}
                style={{ height: `${Math.max((d.total / maximo) * 100, d.total > 0 ? 4 : 1)}%` }}
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
