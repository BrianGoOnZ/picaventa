import { useEffect, useState, type FormEvent } from 'react'
import {
  ETIQUETAS_PERMISOS,
  PERMISOS_DISPONIBLES,
  type Permiso,
  type RolUsuario,
  type UsuarioResumen
} from '@picaventa/shared'
import { useToast } from '../lib/ToastContext'

export default function PantallaGestionUsuarios(): React.JSX.Element {
  const [usuarios, setUsuarios] = useState<UsuarioResumen[]>([])
  const [cargando, setCargando] = useState(true)
  const [nombre, setNombre] = useState('')
  const [correo, setCorreo] = useState('')
  const [password, setPassword] = useState('')
  const [pin, setPin] = useState('')
  const [rol, setRol] = useState<RolUsuario>('cajero')
  const [permisos, setPermisos] = useState<Permiso[]>([])
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const { mostrarToast } = useToast()

  const [idEditandoPermisos, setIdEditandoPermisos] = useState<number | null>(null)
  const [permisosEdicion, setPermisosEdicion] = useState<Permiso[]>([])
  const [guardandoPermisos, setGuardandoPermisos] = useState(false)

  function alternarPermiso(permiso: Permiso): void {
    setPermisos((actual) =>
      actual.includes(permiso) ? actual.filter((p) => p !== permiso) : [...actual, permiso]
    )
  }

  function alternarPermisoEdicion(permiso: Permiso): void {
    setPermisosEdicion((actual) =>
      actual.includes(permiso) ? actual.filter((p) => p !== permiso) : [...actual, permiso]
    )
  }

  function abrirEdicionPermisos(usuario: UsuarioResumen): void {
    setIdEditandoPermisos(usuario.idUsuario)
    setPermisosEdicion(usuario.permisos)
  }

  function cancelarEdicionPermisos(): void {
    setIdEditandoPermisos(null)
    setPermisosEdicion([])
  }

  async function guardarPermisosEdicion(idUsuario: number): Promise<void> {
    setGuardandoPermisos(true)
    const resultado = await window.picaventa.actualizarPermisosUsuario(idUsuario, {
      permisos: permisosEdicion
    })
    if (resultado.ok) {
      await cargarUsuarios()
      cancelarEdicionPermisos()
      mostrarToast('Permisos actualizados — se aplican la próxima vez que ese usuario inicie sesión')
    } else {
      mostrarToast(resultado.error, 'error')
    }
    setGuardandoPermisos(false)
  }

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

    const resultado = await window.picaventa.crearUsuario({
      nombre,
      correo,
      password,
      pin,
      rol,
      permisos: rol === 'cajero' ? permisos : []
    })

    if (resultado.ok) {
      setNombre('')
      setCorreo('')
      setPassword('')
      setPin('')
      setRol('cajero')
      setPermisos([])
      await cargarUsuarios()
      mostrarToast('Usuario registrado')
    } else {
      setError(resultado.error)
    }
    setEnviando(false)
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-bold text-neutral-900">Gestionar usuarios</h1>

      <form onSubmit={manejarEnviar} className="rounded-lg border border-borde bg-tarjeta p-4">
        <h2 className="mb-3 text-sm font-semibold text-texto-secundario">Registrar nuevo usuario</h2>
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
          {rol === 'cajero' && (
            <div className="col-span-2 rounded-md border border-borde bg-arena p-3">
              <p className="mb-2 text-xs font-semibold text-texto-secundario">
                Permisos del cajero — las ganancias y reportes financieros siempre son exclusivos
                del administrador, sin importar estos permisos.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {PERMISOS_DISPONIBLES.map((permiso) => (
                  <label key={permiso} className="flex items-center gap-2 text-sm text-onix">
                    <input
                      type="checkbox"
                      checked={permisos.includes(permiso)}
                      onChange={() => alternarPermiso(permiso)}
                    />
                    {ETIQUETAS_PERMISOS[permiso]}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={enviando || pin.length !== 4}
          className="mt-4 rounded-md bg-cobre px-4 py-2 text-sm font-semibold text-white hover:bg-cobre-oscuro disabled:opacity-50"
        >
          {enviando ? 'Creando...' : 'Registrar usuario'}
        </button>
      </form>

      <div className="rounded-lg border border-borde bg-tarjeta p-4">
        <h2 className="mb-3 text-sm font-semibold text-texto-secundario">
          Usuarios registrados {usuarios.length > 0 && `(${usuarios.length})`}
        </h2>
        {cargando ? (
          <p className="text-sm text-texto-secundario">Cargando...</p>
        ) : usuarios.length === 0 ? (
          <p className="text-sm text-texto-secundario">No hay usuarios.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {usuarios.map((usuario) => (
              <li key={usuario.idUsuario} className="rounded-lg border border-borde p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-onix">
                      {usuario.nombreUsuario} — {usuario.correoUsuario}
                    </p>
                    {usuario.rolUsuario === 'cajero' && usuario.permisos.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {usuario.permisos.map((permiso) => (
                          <span
                            key={permiso}
                            className="rounded-full border border-borde bg-arena px-2 py-0.5 text-xs text-texto-secundario"
                          >
                            {ETIQUETAS_PERMISOS[permiso]}
                          </span>
                        ))}
                      </div>
                    )}
                    {usuario.rolUsuario === 'cajero' && usuario.permisos.length === 0 && (
                      <p className="mt-1.5 text-xs text-texto-secundario">Sin permisos otorgados</p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="rounded-full bg-arena px-2 py-0.5 text-xs capitalize text-texto-secundario">
                      {usuario.rolUsuario}
                    </span>
                    {usuario.rolUsuario === 'cajero' && idEditandoPermisos !== usuario.idUsuario && (
                      <button
                        type="button"
                        onClick={() => abrirEdicionPermisos(usuario)}
                        className="rounded-md border border-borde px-2.5 py-1 text-xs font-medium text-texto-secundario hover:bg-arena"
                      >
                        Editar permisos
                      </button>
                    )}
                  </div>
                </div>

                {idEditandoPermisos === usuario.idUsuario && (
                  <div className="mt-3 rounded-md border border-borde bg-arena p-3">
                    <p className="mb-2 text-xs font-semibold text-texto-secundario">
                      Permisos de {usuario.nombreUsuario} — las ganancias y reportes financieros
                      siguen siendo exclusivos del administrador.
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {PERMISOS_DISPONIBLES.map((permiso) => (
                        <label key={permiso} className="flex items-center gap-2 text-sm text-onix">
                          <input
                            type="checkbox"
                            checked={permisosEdicion.includes(permiso)}
                            onChange={() => alternarPermisoEdicion(permiso)}
                          />
                          {ETIQUETAS_PERMISOS[permiso]}
                        </label>
                      ))}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={cancelarEdicionPermisos}
                        className="rounded-md border border-borde bg-tarjeta px-3 py-1.5 text-xs font-medium text-texto-secundario hover:bg-arena"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        disabled={guardandoPermisos}
                        onClick={() => void guardarPermisosEdicion(usuario.idUsuario)}
                        className="rounded-md bg-cobre px-3 py-1.5 text-xs font-semibold text-white hover:bg-cobre-oscuro disabled:opacity-50"
                      >
                        {guardandoPermisos ? 'Guardando...' : 'Guardar permisos'}
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
