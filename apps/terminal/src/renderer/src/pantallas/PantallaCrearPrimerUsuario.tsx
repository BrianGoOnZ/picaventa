import { useState, type FormEvent } from 'react'
import type { SesionUsuario } from '@picaventa/shared'

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

  async function manejarEnviar(evento: FormEvent): Promise<void> {
    evento.preventDefault()
    setEnviando(true)
    setError('')

    const resultado = await window.picaventa.crearPrimerUsuario({ nombre, correo, password, pin })

    if (resultado.ok) {
      onListo(resultado.sesion)
    } else {
      setEnviando(false)
      setError(resultado.error)
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-neutral-100 p-8">
      <div className="w-full max-w-md">
        <h1 className="mb-2 text-center text-2xl font-bold text-neutral-900">
          Crear el primer usuario
        </h1>
        <p className="mb-6 text-center text-sm text-neutral-600">
          Este será el administrador del sistema. Todavía no hay ningún usuario registrado.
        </p>
        <form onSubmit={manejarEnviar} className="flex flex-col gap-3">
          <label className="text-sm font-medium text-neutral-700">
            Nombre
            <input
              type="text"
              required
              value={nombre}
              onChange={(evento) => setNombre(evento.target.value)}
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm font-medium text-neutral-700">
            Correo
            <input
              type="email"
              required
              value={correo}
              onChange={(evento) => setCorreo(evento.target.value)}
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm font-medium text-neutral-700">
            Contraseña
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(evento) => setPassword(evento.target.value)}
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm font-medium text-neutral-700">
            PIN de 4 dígitos (para desbloquear rápido y acciones críticas)
            <input
              type="password"
              inputMode="numeric"
              required
              pattern="\d{4}"
              maxLength={4}
              value={pin}
              onChange={(evento) => setPin(evento.target.value.replace(/\D/g, '').slice(0, 4))}
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 font-mono text-sm tracking-widest"
            />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={enviando || pin.length !== 4}
            className="mt-2 rounded-md bg-cobre hover:bg-cobre-oscuro px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {enviando ? 'Creando...' : 'Crear usuario y entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
