interface Segmento {
  etiqueta: string
  valor: number
  color: string
}

interface Props {
  segmentos: Segmento[]
}

const RADIO = 40
const GROSOR = 14
const CIRCUNFERENCIA = 2 * Math.PI * RADIO

export default function GraficaDona({ segmentos }: Props): React.JSX.Element {
  const total = segmentos.reduce((acumulado, s) => acumulado + s.valor, 0)

  if (total <= 0) {
    return <p className="text-sm text-texto-secundario">Sin ventas en este periodo.</p>
  }

  let acumulado = 0

  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 100 100" className="h-28 w-28 shrink-0 -rotate-90">
        {segmentos
          .filter((s) => s.valor > 0)
          .map((s) => {
            const largo = (s.valor / total) * CIRCUNFERENCIA
            const offset = (acumulado / total) * CIRCUNFERENCIA
            acumulado += s.valor
            return (
              <circle
                key={s.etiqueta}
                cx="50"
                cy="50"
                r={RADIO}
                fill="none"
                stroke={s.color}
                strokeWidth={GROSOR}
                strokeDasharray={`${largo} ${CIRCUNFERENCIA - largo}`}
                strokeDashoffset={-offset}
              />
            )
          })}
      </svg>
      <ul className="flex flex-col gap-1.5">
        {segmentos.map((s) => (
          <li key={s.etiqueta} className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="text-texto-secundario">{s.etiqueta}</span>
            <span className="font-medium tabular-nums text-onix">${s.valor.toFixed(0)}</span>
            <span className="text-texto-secundario">({((s.valor / total) * 100).toFixed(0)}%)</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
