import MarcaApp from '../componentes/MarcaApp'

interface Props {
  error: string
  onReintentar: () => void
  onCambiarConfiguracion: () => void
}

export default function PantallaErrorConexion({
  error,
  onReintentar,
  onCambiarConfiguracion
}: Props): React.JSX.Element {
  return (
    <div className="flex h-screen items-center justify-center bg-arena p-8">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <MarcaApp />
        </div>
        <div className="rounded-xl border border-peligro/30 bg-tarjeta p-6 text-center shadow-sm">
          <p className="font-display text-lg font-semibold text-peligro">No se pudo conectar con el servidor</p>
          <p className="mt-2 text-sm text-texto-secundario">{error}</p>
          <p className="mt-2 text-sm text-texto-secundario">
            Verifica que la PC servidor esté encendida y que ambas estén conectadas a la misma red.
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <button
              type="button"
              onClick={onCambiarConfiguracion}
              className="rounded-md border border-borde px-4 py-2.5 text-sm font-medium text-onix hover:bg-arena"
            >
              Cambiar configuración
            </button>
            <button
              type="button"
              onClick={onReintentar}
              className="rounded-md bg-cobre px-4 py-2.5 text-sm font-semibold text-white hover:bg-cobre-oscuro"
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
