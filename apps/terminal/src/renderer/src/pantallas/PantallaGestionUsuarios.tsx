import { useEffect, useState, type FormEvent } from 'react'
import type { RolUsuario, UsuarioResumen } from '@picaventa/shared'

interface Props {
  onVolver: () => void
}

export default function PantallaGestionUsuarios({ onVolver }: Props): React.JSX.Element {
  const [usuarios, setUsuarios] = useState<UsuarioResumen[]>([])
  const [cargando, setCargando] = useState(true)
  const [nombre, setNombre] = useState('')
  const [correo, setCorreo] = useState('')
  const [password, setPassword] = useState('')
  const [pin, setPin] = useState('')
  const [rol, setRol] = useState<RolUsuario>('cajero')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  async function cargarUsuarios(): Promise<void> {
    const resultado = await window.picaventa.listarUsuarios()
    if (resultado.ok) setUsuarios(resultado.usuarios)
    setCargando(false)
  }

  useEffect(() => {
    void cargarUsuarios()
  }, [])

  async function manejarEnviar(evento: FormEvent): Promise<void> {
    evento.preventDefault()
    setEnviando(true)
    setError('')

    const resultado = await window.picaventa.crearUsuario({ nombre, correo, password, pin, rol })

    if (resultado.ok) {
      setNombre('')
      setCorreo('')
      setPassword('')
      setPin('')
      setRol('cajero')
      await cargarUsuarios()
    } else {
      setError(resultado.error)
    }
    setEnviando(false)
  }

  return (
    <div className="flex h-screen items-center justify-center bg-neutral-100 p-8">
      <div className="w-full max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-neutral-900">Gestionar usuarios</h1>
          <button
            type="button"
            onClick={onVolver}
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm"
          >
            Volver
          </button>
        </div>

        <div className="mb-6 rounded-lg border border-neutral-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-neutral-700">Usuarios registrados</h2>
          {cargando ? (
            <p className="text-sm text-neutral-500">Cargando...</p>
          ) : usuarios.length === 0 ? (
            <p className="text-sm text-neutral-500">No hay usuarios.</p>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {usuarios.map((usuario) => (
                <li
                  key={usuario.idUsuario}
                  className="flex items-center justify-between py-2 text-sm"
                >
                  <span className="text-neutral-800">
                    {usuario.nombreUsuario} — {usuario.correoUsuario}
                  </span>
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
                    {usuario.rolUsuario}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <form
          onSubmit={manejarEnviar}
          className="rounded-lg border border-neutral-200 bg-white p-4"
        >
          <h2 className="mb-3 text-sm font-semibold text-neutral-700">Registrar nuevo usuario</h2>
          <div className="grid grid-cols-2 gap-3">
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
              PIN de 4 dígitos
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
            <label className="col-span-2 text-sm font-medium text-neutral-700">
              Rol
              <select
                value={rol}
                onChange={(evento) => setRol(evento.target.value as RolUsuario)}
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
              >
                <option value="cajero">Cajero</option>
                <option value="administrador">Administrador</option>
              </select>
            </label>
          </div>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={enviando || pin.length !== 4}
            className="mt-4 rounded-md bg-neutral-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {enviando ? 'Creando...' : 'Registrar usuario'}
          </button>
        </form>
      </div>
    </div>
  )
}
