import type { ConfigLocal, SesionUsuario } from '@picaventa/shared'

interface Props {
  config: ConfigLocal
  sesion: SesionUsuario
  onCerrarSesion: () => void
}

export default function PantallaPrincipal({
  config,
  sesion,
  onCerrarSesion
}: Props): React.JSX.Element {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-2 bg-neutral-100">
      <p className="text-xl font-semibold text-neutral-800">PicaVenta</p>
      <p className="text-sm text-neutral-600">
        {config.modo === 'servidor'
          ? 'Modo: Servidor — conectado a la base de datos'
          : `Modo: Caja/Terminal — conectado a ${config.serverHost}:${config.serverPort}`}
      </p>
      <p className="text-sm text-neutral-600">
        Sesión: {sesion.nombreUsuario} ({sesion.rolUsuario})
      </p>
      <button
        type="button"
        onClick={onCerrarSesion}
        className="mt-4 rounded-md border border-neutral-300 px-4 py-2 text-sm"
      >
        Cerrar sesión
      </button>
    </div>
  )
}
