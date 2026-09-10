import { useState, type FormEvent } from 'react'
import type { SesionUsuario } from '@picaventa/shared'
import MarcaApp from '../componentes/MarcaApp'
import MostrarCodigoRecuperacion from '../componentes/MostrarCodigoRecuperacion'
import { BOTON_SECUNDARIO } from '../lib/estilos'
import { useToast } from '../lib/ToastContext'

interface Props {
  onListo: (sesion: SesionUsuario) => void
}

type Vista = 'login' | 'recuperar'

export default function PantallaLogin({ onListo }: Props): React.JSX.Element {
  const [vista, setVista] = useState<Vista>('login')
  const [correo, setCorreo] = useState('')
  const [password, setPassword] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const { mostrarToast } = useToast()

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

  if (vista === 'recuperar') {
    return (
      <FormularioRecuperacion
        onVolver={() => setVista('login')}
        onExito={() => {
          setVista('login')
          mostrarToast('Acceso restablecido — ya puedes iniciar sesión con tu nueva contraseña')
        }}
      />
    )
  }

  return (
    <div className="flex h-screen items-center justify-center bg-arena p-8">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3">
          <MarcaApp />
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
          <button
            type="button"
            onClick={() => setVista('recuperar')}
            className="text-center text-xs text-texto-secundario hover:text-cobre"
          >
            ¿Olvidaste tu acceso?
          </button>
        </form>
      </div>
    </div>
  )
}

interface PropsRecuperacion {
  onVolver: () => void
  onExito: () => void
}

function FormularioRecuperacion({ onVolver, onExito }: PropsRecuperacion): React.JSX.Element {
  const [correo, setCorreo] = useState('')
  const [codigoRecuperacion, setCodigoRecuperacion] = useState('')
  const [passwordNueva, setPasswordNueva] = useState('')
  const [pinNuevo, setPinNuevo] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [codigoNuevo, setCodigoNuevo] = useState('')

  async function manejarEnviar(evento: FormEvent): Promise<void> {
    evento.preventDefault()
    setEnviando(true)
    setError('')

    const resultado = await window.picaventa.recuperarAcceso({
      correo,
      codigoRecuperacion,
      passwordNueva,
      pinNuevo
    })

    if (resultado.ok) {
      setCodigoNuevo(resultado.codigoRecuperacionNuevo)
    } else {
      setEnviando(false)
      setError(resultado.error)
    }
  }

  if (codigoNuevo) {
    return <MostrarCodigoRecuperacion codigo={codigoNuevo} onContinuar={onExito} />
  }

  return (
    <div className="flex h-screen items-center justify-center bg-arena p-8">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3">
          <MarcaApp />
          <div className="text-center">
            <h1 className="font-display text-2xl font-semibold text-onix">Recuperar acceso</h1>
            <p className="text-sm text-texto-secundario">
              Solo para administradores, con el código que se mostró al crear la cuenta.
            </p>
          </div>
        </div>

        <form
          onSubmit={manejarEnviar}
          className="flex flex-col gap-3 rounded-xl border border-borde bg-tarjeta p-6 shadow-sm"
        >
          <label className="text-sm font-medium text-onix">
            Correo del administrador
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
            Código de recuperación
            <input
              type="text"
              required
              placeholder="XXXX-XXXX-XXXX"
              value={codigoRecuperacion}
              onChange={(evento) => setCodigoRecuperacion(evento.target.value.toUpperCase())}
              className="mt-1 w-full rounded-md border border-borde px-3 py-2.5 font-mono text-sm uppercase tracking-widest"
            />
          </label>
          <label className="text-sm font-medium text-onix">
            Nueva contraseña
            <input
              type="password"
              required
              minLength={8}
              value={passwordNueva}
              onChange={(evento) => setPasswordNueva(evento.target.value)}
              className="mt-1 w-full rounded-md border border-borde px-3 py-2.5 text-sm"
            />
          </label>
          <label className="text-sm font-medium text-onix">
            Nuevo PIN de 4 dígitos
            <input
              type="password"
              inputMode="numeric"
              required
              pattern="\d{4}"
              maxLength={4}
              value={pinNuevo}
              onChange={(evento) => setPinNuevo(evento.target.value.replace(/\D/g, '').slice(0, 4))}
              className="mt-1 w-full rounded-md border border-borde px-3 py-2.5 font-mono text-sm tracking-widest"
            />
          </label>
          {error && <p className="text-sm text-peligro">{error}</p>}
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={onVolver} className={BOTON_SECUNDARIO}>
              Volver
            </button>
            <button
              type="submit"
              disabled={enviando || pinNuevo.length !== 4}
              className="flex-1 rounded-md bg-cobre px-4 py-2.5 text-sm font-semibold text-white hover:bg-cobre-oscuro disabled:opacity-50"
            >
              {enviando ? 'Restableciendo...' : 'Restablecer acceso'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
