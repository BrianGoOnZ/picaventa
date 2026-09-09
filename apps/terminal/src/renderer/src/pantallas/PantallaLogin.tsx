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
    <div className="flex h-screen items-center justify-center bg-arena p-8">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cobre text-white shadow-sm">
            <svg viewBox="0 0 24 24" className="h-7 w-7">
              <path
                d="M4 6h2l1.5 10.5A2 2 0 0 0 9.5 18H18a2 2 0 0 0 2-1.7L21 9H7"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="10" cy="21" r="1.4" fill="currentColor" />
              <circle cx="17" cy="21" r="1.4" fill="currentColor" />
            </svg>
          </div>
          <div className="text-center">
            <h1 className="font-display text-2xl font-semibold text-onix">PicaVenta</h1>
            <p className="text-sm text-texto-secundario">Inicia sesión para continuar</p>
          </div>
        </div>

        <form
          onSubmit={manejarEnviar}
          className="flex flex-col gap-3 rounded-xl border border-borde bg-tarjeta p-6 shadow-sm"
        >
          <label className="text-sm font-medium text-onix">
            Correo
            <input
              type="email"
              required
              autoFocus
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
              value={password}
              onChange={(evento) => setPassword(evento.target.value)}
              className="mt-1 w-full rounded-md border border-borde px-3 py-2.5 text-sm"
            />
          </label>
          {error && <p className="text-sm text-peligro">{error}</p>}
          <button
            type="submit"
            disabled={enviando}
            className="mt-2 rounded-md bg-cobre px-4 py-2.5 text-sm font-semibold text-white hover:bg-cobre-oscuro disabled:opacity-50"
          >
            {enviando ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
