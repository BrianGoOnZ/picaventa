import { useState } from 'react'
import type { ConfigLocal, SesionUsuario } from '@picaventa/shared'
import PantallaGestionUsuarios from './PantallaGestionUsuarios'
import PantallaConfiguracionNegocio from './PantallaConfiguracionNegocio'

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
  const [vista, setVista] = useState<'inicio' | 'usuarios' | 'negocio'>('inicio')

  if (vista === 'usuarios') {
    return <PantallaGestionUsuarios onVolver={() => setVista('inicio')} />
  }

  if (vista === 'negocio') {
    return <PantallaConfiguracionNegocio onVolver={() => setVista('inicio')} />
  }

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
      <div className="mt-4 flex gap-2">
        {sesion.rolUsuario === 'administrador' && (
          <>
            <button
              type="button"
              onClick={() => setVista('usuarios')}
              className="rounded-md border border-neutral-300 px-4 py-2 text-sm"
            >
              Gestionar usuarios
            </button>
            <button
              type="button"
              onClick={() => setVista('negocio')}
              className="rounded-md border border-neutral-300 px-4 py-2 text-sm"
            >
              Configuración del negocio
            </button>
          </>
        )}
        <button
          type="button"
          onClick={onCerrarSesion}
          className="rounded-md border border-neutral-300 px-4 py-2 text-sm"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}
