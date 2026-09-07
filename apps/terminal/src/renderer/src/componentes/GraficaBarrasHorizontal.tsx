interface Props {
  datos: { etiqueta: string; valor: number }[]
  color?: string
}

export default function GraficaBarrasHorizontal({ datos, color }: Props): React.JSX.Element {
  if (datos.length === 0) {
    return <p className="text-sm text-texto-secundario">Sin datos en este periodo.</p>
  }

  const maximo = Math.max(...datos.map((d) => d.valor), 1)

  return (
    <div className="flex flex-col gap-2">
      {datos.map((d) => (
        <div key={d.etiqueta} className="flex items-center gap-2">
          <span className="w-28 shrink-0 truncate text-xs text-texto-secundario" title={d.etiqueta}>
            {d.etiqueta}
          </span>
          <div className="h-4 flex-1 overflow-hidden rounded bg-arena">
            <div
              className="h-full rounded"
              style={{ width: `${(d.valor / maximo) * 100}%`, backgroundColor: color ?? 'var(--color-cobre)' }}
            />
          </div>
          <span className="w-16 shrink-0 text-right text-xs font-medium tabular-nums text-onix">
            ${d.valor.toFixed(0)}
          </span>
        </div>
      ))}
    </div>
  )
}
