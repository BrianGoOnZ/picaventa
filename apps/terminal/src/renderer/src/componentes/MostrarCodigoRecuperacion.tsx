import { useState } from 'react'
import { BOTON_SECUNDARIO } from '../lib/estilos'

interface Props {
  codigo: string
  onContinuar: () => void
}

// Se muestra una sola vez, justo después de generarse (al crear un
// administrador, o después de usarlo para recuperar el acceso) — el
// servidor solo guarda su hash, así que si se pierde no hay forma de
// volver a consultarlo, solo generar uno nuevo repitiendo el proceso.
export default function MostrarCodigoRecuperacion({ codigo, onContinuar }: Props): React.JSX.Element {
  const [copiado, setCopiado] = useState(false)

  async function copiar(): Promise<void> {
    try {
      await navigator.clipboard.writeText(codigo)
      setCopiado(true)
    } catch {
      // Sin acceso al portapapeles (poco común en Electron) — el código ya
      // se ve en pantalla para copiarlo a mano.
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-onix/80 p-8">
      <div className="w-full max-w-md rounded-xl border border-borde bg-tarjeta p-6 shadow-lg">
        <h1 className="font-display text-xl font-semibold text-onix">Guarda tu código de recuperación</h1>
        <p className="mt-2 text-sm text-texto-secundario">
          Si algún día se olvida la contraseña y no hay otro administrador que la pueda restablecer,
          este código es la única forma de recuperar el acceso. Se muestra <strong>una sola vez</strong>
          — anótalo o guárdalo en un lugar seguro antes de continuar.
        </p>
        <div className="mt-4 rounded-md border border-cobre/40 bg-arena p-4 text-center font-mono text-2xl font-semibold tracking-widest text-onix">
          {codigo}
        </div>
        <button type="button" onClick={() => void copiar()} className={`mt-3 w-full ${BOTON_SECUNDARIO}`}>
          {copiado ? 'Copiado ✓' : 'Copiar código'}
        </button>
        <button
          type="button"
          onClick={onContinuar}
          className="mt-2 w-full rounded-md bg-cobre px-4 py-2.5 text-sm font-semibold text-white hover:bg-cobre-oscuro"
        >
          Ya lo guardé, continuar
        </button>
      </div>
    </div>
  )
}
