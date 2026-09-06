import { useCallback, useEffect, useState } from 'react'
import { MINUTOS_INACTIVIDAD_DEFECTO, type ConfigLocal, type SesionUsuario } from '@picaventa/shared'
import { useInactividad } from './lib/useInactividad'
import PantallaCrearPrimerUsuario from './pantallas/PantallaCrearPrimerUsuario'
import PantallaLogin from './pantallas/PantallaLogin'
import PantallaBloqueo from './pantallas/PantallaBloqueo'
import PantallaPrincipal from './pantallas/PantallaPrincipal'
import PantallaConectando from './pantallas/PantallaConectando'

type Estado = 'cargando' | 'crear-primer-usuario' | 'login' | 'autenticado'

interface Props {
  config: ConfigLocal
}

export default function Sesion({ config }: Props): React.JSX.Element {
  const [estado, setEstado] = useState<Estado>('cargando')
  const [sesion, setSesion] = useState<SesionUsuario | null>(null)
  const [bloqueado, setBloqueado] = useState(false)

  useEffect(() => {
    let cancelado = false

    void (async () => {
      const { hayUsuarios } = await window.picaventa.obtenerEstadoInicialAuth()
      if (cancelado) return
      setEstado(hayUsuarios ? 'login' : 'crear-primer-usuario')
    })()

    return () => {
      cancelado = true
    }
  }, [])

  const manejarSesionIniciada = useCallback((nuevaSesion: SesionUsuario) => {
    setSesion(nuevaSesion)
    setBloqueado(false)
    setEstado('autenticado')
  }, [])

  const manejarCerrarSesion = useCallback(() => {
    void window.picaventa.cerrarSesion()
    setSesion(null)
    setBloqueado(false)
    setEstado('login')
  }, [])

  const manejarInactivo = useCallback(() => {
    setBloqueado(true)
  }, [])

  useInactividad(
    estado === 'autenticado' && !bloqueado,
    MINUTOS_INACTIVIDAD_DEFECTO * 60 * 1000,
    manejarInactivo
  )

  if (estado === 'crear-primer-usuario') {
    return <PantallaCrearPrimerUsuario onListo={manejarSesionIniciada} />
  }

  if (estado === 'login') {
    return <PantallaLogin onListo={manejarSesionIniciada} />
  }

  if (estado === 'autenticado' && sesion) {
    return (
      <>
        <PantallaPrincipal config={config} sesion={sesion} onCerrarSesion={manejarCerrarSesion} />
        {bloqueado && (
          <PantallaBloqueo
            nombreUsuario={sesion.nombreUsuario}
            onDesbloqueado={() => setBloqueado(false)}
          />
        )}
      </>
    )
  }

  return <PantallaConectando mensaje="Cargando..." />
}
