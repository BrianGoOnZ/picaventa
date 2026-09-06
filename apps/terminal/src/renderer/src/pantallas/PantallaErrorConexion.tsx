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
    <div className="flex h-screen items-center justify-center bg-neutral-100 p-8">
      <div className="w-full max-w-md rounded-lg border border-red-200 bg-white p-6 text-center shadow-sm">
        <p className="text-lg font-semibold text-red-700">No se pudo conectar con el servidor</p>
        <p className="mt-2 text-sm text-neutral-600">{error}</p>
        <p className="mt-2 text-sm text-neutral-600">
          Verifica que la PC servidor esté encendida y que ambas estén conectadas a la misma red.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <button
            type="button"
            onClick={onCambiarConfiguracion}
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm"
          >
            Cambiar configuración
          </button>
          <button
            type="button"
            onClick={onReintentar}
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Reintentar
          </button>
        </div>
      </div>
    </div>
  )
}
