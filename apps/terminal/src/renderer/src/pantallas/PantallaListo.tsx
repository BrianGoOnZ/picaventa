import type { ConfigLocal } from '@picaventa/shared'

interface Props {
  config: ConfigLocal
}

export default function PantallaListo({ config }: Props): React.JSX.Element {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-2 bg-neutral-100">
      <p className="text-xl font-semibold text-neutral-800">PicaVenta</p>
      <p className="text-sm text-neutral-600">
        {config.modo === 'servidor'
          ? 'Modo: Servidor — conectado a la base de datos'
          : `Modo: Caja/Terminal — conectado a ${config.serverHost}:${config.serverPort}`}
      </p>
    </div>
  )
}
