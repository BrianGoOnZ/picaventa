import { useEffect, useState, type FormEvent } from 'react'
import type { DatosNegocio } from '@picaventa/shared'
import MarcaApp from '../componentes/MarcaApp'

interface Props {
  nombreUsuario: string
  onListo: () => void
}

export default function PantallaFondoInicial({ nombreUsuario, onListo }: Props): React.JSX.Element {
  const [monto, setMonto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [negocio, setNegocio] = useState<DatosNegocio | null>(null)

  useEffect(() => {
    void window.picaventa.obtenerNegocio().then((resultado) => {
      if (resultado.ok) setNegocio(resultado.negocio)
    })
  }, [])

  async function manejarEnviar(evento: FormEvent): Promise<void> {
    evento.preventDefault()
    setEnviando(true)
    await window.picaventa.establecerFondoInicialTurno(Number(monto) || 0)
    onListo()
  }

  return (
    <div className="flex h-screen items-center justify-center bg-arena p-8">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3">
          {negocio?.logoDatos ? (
            <img src={negocio.logoDatos} alt="" className="h-14 w-14 rounded-2xl object-contain shadow-sm" />
          ) : (
            <MarcaApp />
          )}
          <div className="text-center">
            <h1 className="font-display text-2xl font-semibold text-onix">Inicio de turno</h1>
            <p className="text-sm text-texto-secundario">
              Hola, {nombreUsuario}.{' '}
              {negocio?.nombreNegocio
                ? `¿Con cuánto efectivo empiezas tu turno en ${negocio.nombreNegocio}?`
                : '¿Con cuánto efectivo empiezas tu turno?'}
            </p>
          </div>
        </div>

        <form
          onSubmit={manejarEnviar}
          className="flex flex-col gap-3 rounded-xl border border-borde bg-tarjeta p-6 shadow-sm"
        >
          <label className="text-sm font-medium text-onix">
            Fondo inicial
            <input
              type="number"
              min="0"
              step="0.01"
              required
              autoFocus
              value={monto}
              onChange={(evento) => setMonto(evento.target.value)}
              className="mt-1 w-full rounded-md border border-borde px-3 py-2.5 text-sm"
            />
          </label>
          <button
            type="submit"
            disabled={enviando}
            className="mt-2 rounded-md bg-cobre px-4 py-2.5 text-sm font-semibold text-white hover:bg-cobre-oscuro disabled:opacity-50"
          >
            {enviando ? 'Guardando...' : 'Empezar turno'}
          </button>
        </form>
      </div>
    </div>
  )
}
