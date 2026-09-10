import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { PUERTO_SERVIDOR_DEFECTO } from '@picaventa/shared'
import MarcaApp from '../componentes/MarcaApp'

type Paso = 'elegir' | 'servidor' | 'terminal'

interface Props {
  onConfigurado: () => void
}

function trazo(d: string): React.JSX.Element {
  return <path d={d} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
}

function IconoServidor(): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6">
      <rect x="4" y="4" width="16" height="5" rx="1" fill="none" stroke="currentColor" strokeWidth="1.75" />
      <rect x="4" y="10.5" width="16" height="5" rx="1" fill="none" stroke="currentColor" strokeWidth="1.75" />
      <rect x="4" y="17" width="16" height="3" rx="1" fill="none" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="7.2" cy="6.5" r="0.7" fill="currentColor" />
      <circle cx="7.2" cy="13" r="0.7" fill="currentColor" />
    </svg>
  )
}

function IconoTerminal(): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6">
      <rect x="3.5" y="4.5" width="17" height="11.5" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.75" />
      {trazo('M8.5 20h7M12 16v4')}
    </svg>
  )
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
    <Contenedor titulo="¿Qué es esta computadora?" ancho="max-w-2xl">
      <div className="flex gap-4">
        <button
          type="button"
          onClick={() => setPaso('servidor')}
          className="flex-1 rounded-xl border border-borde bg-tarjeta p-6 text-left shadow-sm hover:border-cobre"
        >
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-arena text-cobre">
            <IconoServidor />
          </div>
          <p className="font-display text-lg font-semibold text-onix">Servidor</p>
          <p className="mt-1 text-sm text-texto-secundario">
            Esta PC tiene la base de datos y es el punto central. Solo debe haber una.
          </p>
        </button>
        <button
          type="button"
          onClick={() => setPaso('terminal')}
          className="flex-1 rounded-xl border border-borde bg-tarjeta p-6 text-left shadow-sm hover:border-cobre"
        >
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-arena text-cobre">
            <IconoTerminal />
          </div>
          <p className="font-display text-lg font-semibold text-onix">Caja / Terminal</p>
          <p className="mt-1 text-sm text-texto-secundario">
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
        <p className="mb-4 rounded-md border border-borde bg-arena p-3 text-sm text-onix">
          IP de este servidor: <strong>{ipLocal}</strong> — la necesitarás para configurar las
          demás cajas.
        </p>
      )}
      <p className="mb-4 text-sm text-texto-secundario">
        Necesitamos la contraseña del superusuario <strong>postgres</strong> que configuraste al
        instalar PostgreSQL. No la vuelve a pedir después de este paso.
      </p>
      <form onSubmit={manejarEnviar} className="flex flex-col gap-3 rounded-xl border border-borde bg-tarjeta p-6 shadow-sm">
        <div className="flex gap-3">
          <label className="flex-1 text-sm font-medium text-onix">
            Host
            <input
              type="text"
              value={host}
              onChange={(evento) => setHost(evento.target.value)}
              className="mt-1 w-full rounded-md border border-borde px-3 py-2.5 font-mono text-sm"
            />
          </label>
          <label className="w-28 text-sm font-medium text-onix">
            Puerto
            <input
              type="text"
              value={puerto}
              onChange={(evento) => setPuerto(evento.target.value)}
              className="mt-1 w-full rounded-md border border-borde px-3 py-2.5 font-mono text-sm"
            />
          </label>
        </div>
        <label className="text-sm font-medium text-onix">
          Contraseña del superusuario &quot;postgres&quot;
          <input
            type="password"
            required
            value={passwordSuperusuario}
            onChange={(evento) => setPasswordSuperusuario(evento.target.value)}
            className="mt-1 w-full rounded-md border border-borde px-3 py-2.5 text-sm"
          />
        </label>
        {error && <p className="text-sm text-peligro">No se pudo conectar: {error}</p>}
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={onVolver}
            className="rounded-md border border-borde px-4 py-2.5 text-sm font-medium text-onix hover:bg-arena"
          >
            Volver
          </button>
          <button
            type="submit"
            disabled={enviando}
            className="flex-1 rounded-md bg-cobre px-4 py-2.5 text-sm font-semibold text-white hover:bg-cobre-oscuro disabled:opacity-50"
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
      <form onSubmit={manejarEnviar} className="flex flex-col gap-3 rounded-xl border border-borde bg-tarjeta p-6 shadow-sm">
        <label className="text-sm font-medium text-onix">
          IP del servidor
          <input
            type="text"
            placeholder="192.168.1.50"
            value={host}
            onChange={(evento) => setHost(evento.target.value)}
            className="mt-1 w-full rounded-md border border-borde px-3 py-2.5 font-mono text-sm"
          />
        </label>
        <label className="text-sm font-medium text-onix">
          Puerto
          <input
            type="text"
            value={puerto}
            onChange={(evento) => setPuerto(evento.target.value)}
            className="mt-1 w-full rounded-md border border-borde px-3 py-2.5 font-mono text-sm"
          />
        </label>
        {error && (
          <p className="text-sm text-peligro">
            No se pudo conectar: {error}. Verifica que el servidor esté encendido y que ambas PCs
            estén en la misma red.
          </p>
        )}
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={onVolver}
            className="rounded-md border border-borde px-4 py-2.5 text-sm font-medium text-onix hover:bg-arena"
          >
            Volver
          </button>
          <button
            type="submit"
            disabled={enviando || !host}
            className="flex-1 rounded-md bg-cobre px-4 py-2.5 text-sm font-semibold text-white hover:bg-cobre-oscuro disabled:opacity-50"
          >
            {enviando ? 'Probando conexión...' : 'Probar conexión y guardar'}
          </button>
        </div>
      </form>
    </Contenedor>
  )
}

function Contenedor({
  titulo,
  children,
  ancho = 'max-w-lg'
}: {
  titulo: string
  children: ReactNode
  ancho?: string
}): React.JSX.Element {
  return (
    <div className="flex h-screen items-center justify-center bg-arena p-8">
      <div className={`w-full ${ancho}`}>
        <div className="mb-6 flex flex-col items-center gap-3">
          <MarcaApp />
          <h1 className="text-center font-display text-2xl font-semibold text-onix">{titulo}</h1>
        </div>
        {children}
      </div>
    </div>
  )
}
