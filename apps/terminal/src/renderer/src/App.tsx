import { useCallback, useEffect, useState } from 'react'
import type { ConfigLocal } from '@picaventa/shared'
import { reintentar } from './lib/reintentos'
import AsistenteConfiguracion from './pantallas/AsistenteConfiguracion'
import PantallaConectando from './pantallas/PantallaConectando'
import PantallaErrorConexion from './pantallas/PantallaErrorConexion'
import Sesion from './Sesion'

type Estado = 'cargando' | 'asistente' | 'conectando' | 'error' | 'listo'

export default function App(): React.JSX.Element {
  const [estado, setEstado] = useState<Estado>('cargando')
  const [config, setConfig] = useState<ConfigLocal | null>(null)
  const [error, setError] = useState('')

  const conectar = useCallback(async (configActual: ConfigLocal) => {
    setEstado('conectando')

    const resultado =
      configActual.modo === 'servidor'
        ? await reintentar(() => window.picaventa.iniciarServidorDesdeConfig())
        : await reintentar(() =>
            window.picaventa.verificarServidor(configActual.serverHost, configActual.serverPort)
          )

    if (resultado.ok) {
      setEstado('listo')
    } else {
      setError(resultado.error)
      setEstado('error')
    }
  }, [])

  useEffect(() => {
    let cancelado = false

    void (async () => {
      const configGuardada = await window.picaventa.obtenerConfig()
      if (cancelado) return

      if (!configGuardada) {
        setEstado('asistente')
        return
      }

      setConfig(configGuardada)
      await conectar(configGuardada)
    })()

    return () => {
      cancelado = true
    }
  }, [conectar])

  const manejarConfigurado = useCallback(async () => {
    // Se vuelve a pedir la config real guardada por el proceso main (en vez
    // de reconstruirla aquí) porque incluye datos que el renderer nunca ve,
    // como el jwtSecret generado del lado del servidor.
    const configGuardada = await window.picaventa.obtenerConfig()
    if (!configGuardada) return
    setConfig(configGuardada)
    await conectar(configGuardada)
  }, [conectar])

  const manejarCambiarConfiguracion = useCallback(async () => {
    await window.picaventa.borrarConfig()
    setConfig(null)
    setEstado('asistente')
  }, [])

  const manejarReintentar = useCallback(() => {
    if (config) void conectar(config)
  }, [config, conectar])

  switch (estado) {
    case 'asistente':
      return <AsistenteConfiguracion onConfigurado={manejarConfigurado} />
    case 'conectando':
      return <PantallaConectando mensaje="Conectando con el servidor..." />
    case 'error':
      return (
        <PantallaErrorConexion
          error={error}
          onReintentar={manejarReintentar}
          onCambiarConfiguracion={() => void manejarCambiarConfiguracion()}
        />
      )
    case 'listo':
      return config ? <Sesion config={config} /> : <PantallaConectando mensaje="Cargando..." />
    case 'cargando':
    default:
      return <PantallaConectando mensaje="Cargando..." />
  }
}
