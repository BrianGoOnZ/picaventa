import { useState, type FormEvent } from 'react'

interface Props {
  nombreUsuario: string
  onListo: () => void
}

export default function PantallaFondoInicial({ nombreUsuario, onListo }: Props): React.JSX.Element {
  const [monto, setMonto] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function manejarEnviar(evento: FormEvent): Promise<void> {
    evento.preventDefault()
    setEnviando(true)
    await window.picaventa.establecerFondoInicialTurno(Number(monto) || 0)
    onListo()
  }

  return (
    <div className="flex h-screen items-center justify-center bg-neutral-100 p-8">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-center text-2xl font-bold text-neutral-900">
          Inicio de turno
        </h1>
        <p className="mb-6 text-center text-sm text-neutral-600">
          Hola, {nombreUsuario}. ¿Con cuánto efectivo empiezas tu turno?
        </p>
        <form onSubmit={manejarEnviar} className="flex flex-col gap-3">
          <label className="text-sm font-medium text-neutral-700">
            Fondo inicial
            <input
              type="number"
              min="0"
              step="0.01"
              required
              autoFocus
              value={monto}
              onChange={(evento) => setMonto(evento.target.value)}
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
          </label>
          <button
            type="submit"
            disabled={enviando}
            className="mt-2 rounded-md bg-cobre hover:bg-cobre-oscuro px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {enviando ? 'Guardando...' : 'Empezar turno'}
          </button>
        </form>
      </div>
    </div>
  )
}
