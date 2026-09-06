import { useState, type FormEvent } from 'react'

interface Props {
  nombreUsuario: string
  onDesbloqueado: () => void
}

export default function PantallaBloqueo({ nombreUsuario, onDesbloqueado }: Props): React.JSX.Element {
  const [pin, setPin] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  async function manejarEnviar(evento: FormEvent): Promise<void> {
    evento.preventDefault()
    setEnviando(true)
    setError('')

    const resultado = await window.picaventa.reautenticar(pin)

    if (resultado.ok) {
      onDesbloqueado()
    } else {
      setEnviando(false)
      setError(resultado.error)
      setPin('')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/80 backdrop-blur-sm">
      <div className="w-full max-w-xs rounded-lg bg-white p-6 shadow-lg">
        <p className="mb-1 text-center text-sm text-neutral-500">Sesión bloqueada</p>
        <h2 className="mb-4 text-center text-lg font-semibold text-neutral-900">{nombreUsuario}</h2>
        <form onSubmit={manejarEnviar} className="flex flex-col gap-3">
          <input
            type="password"
            inputMode="numeric"
            autoFocus
            required
            pattern="\d{4}"
            maxLength={4}
            placeholder="PIN"
            value={pin}
            onChange={(evento) => setPin(evento.target.value.replace(/\D/g, '').slice(0, 4))}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-center font-mono text-lg tracking-[0.5em]"
          />
          {error && <p className="text-center text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={enviando || pin.length !== 4}
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {enviando ? 'Verificando...' : 'Desbloquear'}
          </button>
        </form>
      </div>
    </div>
  )
}
