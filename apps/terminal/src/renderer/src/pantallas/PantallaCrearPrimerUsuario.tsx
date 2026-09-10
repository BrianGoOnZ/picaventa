import { useState, type FormEvent } from 'react'
import type { SesionUsuario } from '@picaventa/shared'
import MarcaApp from '../componentes/MarcaApp'
import MostrarCodigoRecuperacion from '../componentes/MostrarCodigoRecuperacion'

interface Props {
  onListo: (sesion: SesionUsuario) => void
}

export default function PantallaCrearPrimerUsuario({ onListo }: Props): React.JSX.Element {
  const [nombre, setNombre] = useState('')
  const [correo, setCorreo] = useState('')
  const [password, setPassword] = useState('')
  const [pin, setPin] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [sesionCreada, setSesionCreada] = useState<SesionUsuario | null>(null)
  const [codigoRecuperacion, setCodigoRecuperacion] = useState('')

  async function manejarEnviar(evento: FormEvent): Promise<void> {
    evento.preventDefault()
    setEnviando(true)
    setError('')

    const resultado = await window.picaventa.crearPrimerUsuario({ nombre, correo, password, pin })

    if (resultado.ok) {
      if (resultado.codigoRecuperacion) {
        setSesionCreada(resultado.sesion)
        setCodigoRecuperacion(resultado.codigoRecuperacion)
      } else {
        onListo(resultado.sesion)
      }
    } else {
      setEnviando(false)
      setError(resultado.error)
    }
  }

  if (sesionCreada) {
    return (
      <MostrarCodigoRecuperacion codigo={codigoRecuperacion} onContinuar={() => onListo(sesionCreada)} />
    )
  }

  return (
    <div className="flex h-screen items-center justify-center bg-arena p-8">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-3">
          <MarcaApp />
          <div className="text-center">
            <h1 className="font-display text-2xl font-semibold text-onix">Crear el primer usuario</h1>
            <p className="text-sm text-texto-secundario">
              Aún no hay usuarios — este será el administrador.
            </p>
          </div>
        </div>

        <form
          onSubmit={manejarEnviar}
          className="flex flex-col gap-3 rounded-xl border border-borde bg-tarjeta p-6 shadow-sm"
        >
          <label className="text-sm font-medium text-onix">
            Nombre
            <input
              type="text"
              required
              autoFocus
              value={nombre}
              onChange={(evento) => setNombre(evento.target.value)}
              className="mt-1 w-full rounded-md border border-borde px-3 py-2.5 text-sm"
            />
          </label>
          <label className="text-sm font-medium text-onix">
            Correo
            <input
              type="email"
              required
              value={correo}
              onChange={(evento) => setCorreo(evento.target.value)}
              className="mt-1 w-full rounded-md border border-borde px-3 py-2.5 text-sm"
            />
          </label>
          <label className="text-sm font-medium text-onix">
            Contraseña
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(evento) => setPassword(evento.target.value)}
              className="mt-1 w-full rounded-md border border-borde px-3 py-2.5 text-sm"
            />
          </label>
          <label className="text-sm font-medium text-onix">
            PIN de 4 dígitos (para desbloquear rápido y acciones críticas)
            <input
              type="password"
              inputMode="numeric"
              required
              pattern="\d{4}"
              maxLength={4}
              value={pin}
              onChange={(evento) => setPin(evento.target.value.replace(/\D/g, '').slice(0, 4))}
              className="mt-1 w-full rounded-md border border-borde px-3 py-2.5 font-mono text-sm tracking-widest"
            />
          </label>
          {error && <p className="text-sm text-peligro">{error}</p>}
          <button
            type="submit"
            disabled={enviando || pin.length !== 4}
            className="mt-2 rounded-md bg-cobre px-4 py-2.5 text-sm font-semibold text-white hover:bg-cobre-oscuro disabled:opacity-50"
          >
            {enviando ? 'Creando...' : 'Crear usuario y entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
