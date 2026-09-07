import { useState, type FormEvent } from 'react'
import type { SesionUsuario } from '@picaventa/shared'

interface Props {
  onListo: (sesion: SesionUsuario) => void
}

export default function PantallaLogin({ onListo }: Props): React.JSX.Element {
  const [correo, setCorreo] = useState('')
  const [password, setPassword] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  async function manejarEnviar(evento: FormEvent): Promise<void> {
    evento.preventDefault()
    setEnviando(true)
    setError('')

    const resultado = await window.picaventa.login({ correo, password })

    if (resultado.ok) {
      onListo(resultado.sesion)
    } else {
      setEnviando(false)
      setError(resultado.error)
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-neutral-100 p-8">
      <div className="w-full max-w-sm">
        <h1 className="mb-6 text-center text-2xl font-bold text-neutral-900">PicaVenta</h1>
        <form onSubmit={manejarEnviar} className="flex flex-col gap-3">
          <label className="text-sm font-medium text-neutral-700">
            Correo
            <input
              type="email"
              required
              autoFocus
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
              value={password}
              onChange={(evento) => setPassword(evento.target.value)}
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={enviando}
            className="mt-2 rounded-md bg-cobre hover:bg-cobre-oscuro px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {enviando ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
