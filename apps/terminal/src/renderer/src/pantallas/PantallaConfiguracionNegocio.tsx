import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { LOGO_MAX_BYTES, type ConfigLocal, type EstadoRespaldo, type InfoRespaldo } from '@picaventa/shared'
import { BOTON_SECUNDARIO, BOTON_PELIGRO } from '../lib/estilos'
import { comprimirImagen } from '../lib/imagenes'
import { useToast } from '../lib/ToastContext'

function formatearTamano(bytes: number): string {
  const mb = bytes / (1024 * 1024)
  if (mb >= 1) return `${mb.toFixed(1)} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

interface Props {
  config: ConfigLocal
}

export default function PantallaConfiguracionNegocio({ config }: Props): React.JSX.Element {
  const [nombreNegocio, setNombreNegocio] = useState('')
  const [direccionNegocio, setDireccionNegocio] = useState('')
  const [telefonoNegocio, setTelefonoNegocio] = useState('')
  const [logoDatos, setLogoDatos] = useState<string | undefined>(undefined)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const { mostrarToast } = useToast()
  const inputLogoRef = useRef<HTMLInputElement>(null)

  const [estadoRespaldo, setEstadoRespaldo] = useState<EstadoRespaldo | null>(null)
  const [respaldoDisponible, setRespaldoDisponible] = useState(false)
  const [respaldando, setRespaldando] = useState(false)
  const [respaldos, setRespaldos] = useState<InfoRespaldo[]>([])
  const [archivoARestaurar, setArchivoARestaurar] = useState<string | null>(null)
  const [pinRestaurar, setPinRestaurar] = useState('')
  const [restaurando, setRestaurando] = useState(false)
  const [errorRestaurar, setErrorRestaurar] = useState('')
  const [carpetaRespaldos, setCarpetaRespaldos] = useState(
    config.modo === 'servidor' ? config.carpetaRespaldos : undefined
  )
  const [cambiandoCarpeta, setCambiandoCarpeta] = useState(false)

  async function cargarEstadoRespaldo(): Promise<void> {
    const resultado = await window.picaventa.obtenerEstadoRespaldo()
    if (resultado.ok) {
      setRespaldoDisponible(resultado.disponible)
      setEstadoRespaldo(resultado.ultimoEstado)
    }
  }

  async function cargarRespaldos(): Promise<void> {
    const resultado = await window.picaventa.listarRespaldos()
    if (resultado.ok) setRespaldos(resultado.respaldos)
  }

  async function manejarRespaldarAhora(): Promise<void> {
    setRespaldando(true)
    const resultado = await window.picaventa.respaldarAhora()
    if (resultado.ok) {
      setEstadoRespaldo(resultado.estado)
      mostrarToast(resultado.estado.ok ? 'Respaldo generado correctamente' : resultado.estado.error ?? 'Error al respaldar', resultado.estado.ok ? 'exito' : 'error')
      if (resultado.estado.ok) void cargarRespaldos()
    } else {
      mostrarToast(resultado.error, 'error')
    }
    setRespaldando(false)
  }

  function abrirRestaurar(archivo: string): void {
    setArchivoARestaurar(archivo)
    setPinRestaurar('')
    setErrorRestaurar('')
  }

  async function confirmarRestaurar(): Promise<void> {
    if (!archivoARestaurar) return
    setRestaurando(true)
    setErrorRestaurar('')

    const resultado = await window.picaventa.restaurarRespaldo({
      archivo: archivoARestaurar,
      pin: pinRestaurar
    })

    if (resultado.ok) {
      mostrarToast('Respaldo restaurado — la aplicación se va a recargar')
      window.location.reload()
      return
    }

    setErrorRestaurar(resultado.error)
    setRestaurando(false)
  }

  async function manejarElegirCarpeta(): Promise<void> {
    setCambiandoCarpeta(true)
    const resultado = await window.picaventa.elegirCarpetaRespaldos()
    if (resultado.ok) {
      if (resultado.carpeta) {
        setCarpetaRespaldos(resultado.carpeta)
        mostrarToast('Carpeta de respaldos actualizada')
      }
    } else {
      mostrarToast(resultado.error, 'error')
    }
    setCambiandoCarpeta(false)
  }

  async function manejarRestablecerCarpeta(): Promise<void> {
    setCambiandoCarpeta(true)
    const resultado = await window.picaventa.restablecerCarpetaRespaldos()
    if (resultado.ok) {
      setCarpetaRespaldos(undefined)
      mostrarToast('Se restableció la carpeta por defecto')
    } else {
      mostrarToast(resultado.error, 'error')
    }
    setCambiandoCarpeta(false)
  }

  useEffect(() => {
    void (async () => {
      const resultado = await window.picaventa.obtenerNegocio()
      if (resultado.ok && resultado.negocio) {
        setNombreNegocio(resultado.negocio.nombreNegocio)
        setDireccionNegocio(resultado.negocio.direccionNegocio ?? '')
        setTelefonoNegocio(resultado.negocio.telefonoNegocio ?? '')
        setLogoDatos(resultado.negocio.logoDatos)
      }
      setCargando(false)
    })()

    if (config.modo === 'servidor') {
      void cargarEstadoRespaldo()
      void cargarRespaldos()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function manejarArchivo(evento: ChangeEvent<HTMLInputElement>): Promise<void> {
    const archivo = evento.target.files?.[0]
    if (!archivo) return

    try {
      setLogoDatos(await comprimirImagen(archivo, LOGO_MAX_BYTES))
      setError('')
    } catch {
      setError('No se pudo procesar ese logo — intenta con otro.')
    }
  }

  async function manejarEnviar(evento: FormEvent): Promise<void> {
    evento.preventDefault()
    setGuardando(true)
    setError('')

    const resultado = await window.picaventa.guardarNegocio({
      nombreNegocio,
      direccionNegocio: direccionNegocio || undefined,
      telefonoNegocio: telefonoNegocio || undefined,
      logoDatos
    })

    if (resultado.ok) {
      mostrarToast('Datos del negocio guardados')
    } else {
      setError(resultado.error)
    }
    setGuardando(false)
  }

  if (cargando) {
    return <p className="text-sm text-neutral-500">Cargando...</p>
  }

  return (
    <div className="w-full">
      <h1 className="mb-6 text-2xl font-bold text-neutral-900">Configuración del negocio</h1>

      <div className="flex w-full flex-col gap-4">
        <form
          onSubmit={manejarEnviar}
          className="w-full rounded-lg border border-neutral-200 bg-white p-4"
        >
          <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
            <label className="text-sm font-medium text-neutral-700">
              Nombre del negocio
              <input
                type="text"
                required
                value={nombreNegocio}
                onChange={(evento) => setNombreNegocio(evento.target.value)}
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm font-medium text-neutral-700">
              Dirección
              <input
                type="text"
                value={direccionNegocio}
                onChange={(evento) => setDireccionNegocio(evento.target.value)}
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm font-medium text-neutral-700">
              Teléfono
              <input
                type="text"
                value={telefonoNegocio}
                onChange={(evento) => setTelefonoNegocio(evento.target.value)}
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
              />
            </label>
          </div>
          <div className="mt-3">
            <p className="text-sm font-medium text-neutral-700">
              Logo — se usa en el ticket impreso
            </p>
            <div className="mt-1 flex items-center gap-3">
              <input
                ref={inputLogoRef}
                type="file"
                accept="image/*"
                onChange={(e) => void manejarArchivo(e)}
                className="hidden"
              />
              <button type="button" onClick={() => inputLogoRef.current?.click()} className={BOTON_SECUNDARIO}>
                {logoDatos ? 'Cambiar logo...' : 'Elegir logo...'}
              </button>
              {!logoDatos && <span className="text-xs text-neutral-500">Ningún archivo seleccionado</span>}
            </div>
          </div>
          {logoDatos && (
            <img
              src={logoDatos}
              alt="Logo del negocio"
              className="mt-3 h-20 w-auto self-start rounded border border-neutral-200"
            />
          )}
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={guardando}
            className="mt-3 rounded-md bg-cobre hover:bg-cobre-oscuro px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {guardando ? 'Guardando...' : 'Guardar'}
          </button>
        </form>

        {config.modo === 'servidor' && (
          <div className="w-full rounded-lg border border-neutral-200 bg-white p-4">
            <h2 className="mb-1 text-sm font-semibold text-neutral-700">
              Respaldo automático de la base de datos
            </h2>
            <p className="mb-3 text-xs text-neutral-500">
              3 veces al día (12:00 p.m., 6:00 p.m. y 10:30 p.m.) — se conservan los últimos 15 días.
            </p>

            <div className="mb-4 rounded-md border border-neutral-200 bg-neutral-50 p-3">
              <p className="text-xs font-medium text-neutral-700">Carpeta de respaldos</p>
              <p className="mt-0.5 break-all text-xs text-neutral-500">
                {carpetaRespaldos ?? 'Carpeta por defecto de la aplicación'}
              </p>
              <p className="mt-1 text-xs text-neutral-400">
                Una carpeta de OneDrive o Google Drive también sube el respaldo a la nube.
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => void manejarElegirCarpeta()}
                  disabled={cambiandoCarpeta}
                  className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs disabled:opacity-50"
                >
                  Elegir carpeta...
                </button>
                {carpetaRespaldos && (
                  <button
                    type="button"
                    onClick={() => void manejarRestablecerCarpeta()}
                    disabled={cambiandoCarpeta}
                    className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs disabled:opacity-50"
                  >
                    Usar carpeta por defecto
                  </button>
                )}
              </div>
            </div>

            {!respaldoDisponible ? (
              <p className="text-sm text-neutral-500">
                El respaldo automático no está disponible en este momento.
              </p>
            ) : (
              <>
                {estadoRespaldo ? (
                  <p className="mb-3 text-sm">
                    Último respaldo:{' '}
                    <span className={estadoRespaldo.ok ? 'text-green-700' : 'font-medium text-red-600'}>
                      {new Date(estadoRespaldo.fecha).toLocaleString('es-MX', {
                        dateStyle: 'short',
                        timeStyle: 'short'
                      })}{' '}
                      {estadoRespaldo.ok ? '✓' : `— error: ${estadoRespaldo.error}`}
                    </span>
                  </p>
                ) : (
                  <p className="mb-3 text-sm text-neutral-500">Aún no se ha generado ningún respaldo.</p>
                )}
                <button
                  type="button"
                  onClick={() => void manejarRespaldarAhora()}
                  disabled={respaldando}
                  className="rounded-md border border-neutral-300 px-4 py-2 text-sm disabled:opacity-50"
                >
                  {respaldando ? 'Respaldando...' : 'Respaldar ahora'}
                </button>

                <div className="mt-4 border-t border-neutral-200 pt-3">
                  <h3 className="mb-2 text-sm font-semibold text-neutral-700">Restaurar un respaldo</h3>
                  {respaldos.length === 0 ? (
                    <p className="text-sm text-neutral-500">Todavía no hay respaldos disponibles.</p>
                  ) : (
                    <ul className="flex flex-col gap-2">
                      {respaldos.map((r) => (
                        <li
                          key={r.archivo}
                          className="flex items-center justify-between gap-3 rounded-md border border-neutral-200 px-3 py-2 text-sm"
                        >
                          <span>
                            {new Date(r.fecha).toLocaleString('es-MX', {
                              dateStyle: 'short',
                              timeStyle: 'short'
                            })}{' '}
                            <span className="text-neutral-400">— {formatearTamano(r.tamanoBytes)}</span>
                          </span>
                          <button type="button" onClick={() => abrirRestaurar(r.archivo)} className={BOTON_PELIGRO}>
                            Restaurar
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

        {archivoARestaurar && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/60 p-8">
            <div className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-6 shadow-lg">
              <h2 className="text-lg font-semibold text-neutral-900">¿Restaurar este respaldo?</h2>
              <p className="mt-2 text-sm text-neutral-600">
                <strong>Reemplaza toda la información actual</strong> por la de este respaldo — no
                se puede deshacer. Confirma con tu PIN.
              </p>
              <label className="mt-4 block text-sm font-medium text-neutral-700">
                Tu PIN
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="\d{4}"
                  maxLength={4}
                  autoFocus
                  value={pinRestaurar}
                  onChange={(evento) => setPinRestaurar(evento.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 font-mono text-sm tracking-widest"
                />
              </label>
              {errorRestaurar && <p className="mt-2 text-sm text-red-600">{errorRestaurar}</p>}
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setArchivoARestaurar(null)}
                  disabled={restaurando}
                  className={BOTON_SECUNDARIO}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => void confirmarRestaurar()}
                  disabled={restaurando || pinRestaurar.length !== 4}
                  className="flex-1 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {restaurando ? 'Restaurando...' : 'Sí, restaurar y reemplazar todo'}
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  )
}
