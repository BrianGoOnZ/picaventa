import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { PUERTO_SERVIDOR_DEFECTO } from '@picaventa/shared'

type Paso = 'elegir' | 'servidor' | 'terminal'

interface Props {
  onConfigurado: () => void
}

export default function AsistenteConfiguracion({ onConfigurado }: Props): React.JSX.Element {
  const [paso, setPaso] = useState<Paso>('elegir')

  if (paso === 'servidor') {
    return <FormularioServidor onVolver={() => setPaso('elegir')} onConfigurado={onConfigurado} />
  }

  if (paso === 'terminal') {
    return <FormularioTerminal onVolver={() => setPaso('elegir')} onConfigurado={onConfigurado} />
  }

  return (
    <Contenedor titulo="¿Qué es esta computadora?">
      <div className="flex gap-4">
        <button
          type="button"
          onClick={() => setPaso('servidor')}
          className="flex-1 rounded-lg border border-neutral-300 bg-white p-6 text-left shadow-sm hover:border-neutral-400"
        >
          <p className="text-lg font-semibold text-neutral-900">Servidor</p>
          <p className="mt-1 text-sm text-neutral-600">
            Esta PC tiene la base de datos y es el punto central. Solo debe haber una.
          </p>
        </button>
        <button
          type="button"
          onClick={() => setPaso('terminal')}
          className="flex-1 rounded-lg border border-neutral-300 bg-white p-6 text-left shadow-sm hover:border-neutral-400"
        >
          <p className="text-lg font-semibold text-neutral-900">Caja / Terminal</p>
          <p className="mt-1 text-sm text-neutral-600">
            Esta PC se conecta al servidor a través de la red local.
          </p>
        </button>
      </div>
    </Contenedor>
  )
}

interface PropsFormulario {
  onVolver: () => void
  onConfigurado: () => void
}

function FormularioServidor({ onVolver, onConfigurado }: PropsFormulario): React.JSX.Element {
  const [host, setHost] = useState('localhost')
  const [puerto, setPuerto] = useState('5432')
  const [passwordSuperusuario, setPasswordSuperusuario] = useState('')
  const [ipLocal, setIpLocal] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    window.picaventa.obtenerIpLocal().then(setIpLocal)
  }, [])

  async function manejarEnviar(evento: FormEvent): Promise<void> {
    evento.preventDefault()
    setEnviando(true)
    setError('')

    const resultado = await window.picaventa.configurarServidor({
      host,
      puerto: Number(puerto),
      passwordSuperusuario
    })

    if (resultado.ok) {
      onConfigurado()
    } else {
      setEnviando(false)
      setError(resultado.error)
    }
  }

  return (
    <Contenedor titulo="Configurar como Servidor">
      {ipLocal && (
        <p className="mb-4 rounded-md bg-blue-50 p-3 text-sm text-blue-900">
          La IP de este servidor en la red es <strong>{ipLocal}</strong> — anótala, la vas a
          necesitar para configurar las demás cajas.
        </p>
      )}
      <p className="mb-4 text-sm text-neutral-600">
        PostgreSQL ya debe estar instalado en esta PC. Solo necesitamos la contraseña del
        superusuario <strong>postgres</strong> que se configuró al instalarlo — la app crea y
        administra su propio usuario dedicado automáticamente, no vuelvas a necesitar esta
        contraseña después de este paso.
      </p>
      <form onSubmit={manejarEnviar} className="flex flex-col gap-3">
        <div className="flex gap-3">
          <label className="flex-1 text-sm font-medium text-neutral-700">
            Host
            <input
              type="text"
              value={host}
              onChange={(evento) => setHost(evento.target.value)}
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 font-mono text-sm"
            />
          </label>
          <label className="w-28 text-sm font-medium text-neutral-700">
            Puerto
            <input
              type="text"
              value={puerto}
              onChange={(evento) => setPuerto(evento.target.value)}
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 font-mono text-sm"
            />
          </label>
        </div>
        <label className="text-sm font-medium text-neutral-700">
          Contraseña del superusuario &quot;postgres&quot;
          <input
            type="password"
            required
            value={passwordSuperusuario}
            onChange={(evento) => setPasswordSuperusuario(evento.target.value)}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </label>
        {error && <p className="text-sm text-red-600">No se pudo conectar: {error}</p>}
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={onVolver}
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm"
          >
            Volver
          </button>
          <button
            type="submit"
            disabled={enviando}
            className="flex-1 rounded-md bg-neutral-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {enviando ? 'Configurando base de datos...' : 'Configurar y continuar'}
          </button>
        </div>
      </form>
    </Contenedor>
  )
}

function FormularioTerminal({ onVolver, onConfigurado }: PropsFormulario): React.JSX.Element {
  const [host, setHost] = useState('')
  const [puerto, setPuerto] = useState(String(PUERTO_SERVIDOR_DEFECTO))
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  async function manejarEnviar(evento: FormEvent): Promise<void> {
    evento.preventDefault()
    setEnviando(true)
    setError('')

    const puertoNumerico = Number(puerto)
    const resultado = await window.picaventa.configurarTerminal(host, puertoNumerico)

    if (resultado.ok) {
      onConfigurado()
    } else {
      setEnviando(false)
      setError(resultado.error)
    }
  }

  return (
    <Contenedor titulo="Configurar como Caja / Terminal">
      <form onSubmit={manejarEnviar} className="flex flex-col gap-3">
        <label className="text-sm font-medium text-neutral-700">
          IP del servidor
          <input
            type="text"
            placeholder="192.168.1.50"
            value={host}
            onChange={(evento) => setHost(evento.target.value)}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 font-mono text-sm"
          />
        </label>
        <label className="text-sm font-medium text-neutral-700">
          Puerto
          <input
            type="text"
            value={puerto}
            onChange={(evento) => setPuerto(evento.target.value)}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 font-mono text-sm"
          />
        </label>
        {error && (
          <p className="text-sm text-red-600">
            No se pudo conectar: {error}. Verifica que el servidor esté encendido y que ambas PCs
            estén en la misma red.
          </p>
        )}
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={onVolver}
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm"
          >
            Volver
          </button>
          <button
            type="submit"
            disabled={enviando || !host}
            className="flex-1 rounded-md bg-neutral-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {enviando ? 'Probando conexión...' : 'Probar conexión y guardar'}
          </button>
        </div>
      </form>
    </Contenedor>
  )
}

function Contenedor({ titulo, children }: { titulo: string; children: ReactNode }): React.JSX.Element {
  return (
    <div className="flex h-screen items-center justify-center bg-neutral-100 p-8">
      <div className="w-full max-w-lg">
        <h1 className="mb-6 text-center text-2xl font-bold text-neutral-900">{titulo}</h1>
        {children}
      </div>
    </div>
  )
}
