interface Props {
  titulo: string
  valor: string
  delta?: { porcentaje: number; etiqueta: string }
}

export default function TarjetaKpi({ titulo, valor, delta }: Props): React.JSX.Element {
  return (
    <div className="rounded-lg border border-borde bg-tarjeta p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-texto-secundario">{titulo}</p>
      <p className="mt-1 font-display text-3xl font-semibold tabular-nums text-onix">{valor}</p>
      {delta && (
        <p
          className={`mt-1 text-xs font-medium ${
            delta.porcentaje > 0
              ? 'text-exito'
              : delta.porcentaje < 0
                ? 'text-peligro'
                : 'text-texto-secundario'
          }`}
        >
          {delta.porcentaje > 0 ? '▲' : delta.porcentaje < 0 ? '▼' : '–'}{' '}
          {Math.abs(delta.porcentaje).toFixed(0)}% {delta.etiqueta}
        </p>
      )}
    </div>
  )
}
