import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { LOGO_MAX_BYTES, type ConfigLocal, type EstadoRespaldo } from '@picaventa/shared'
import { useToast } from '../lib/ToastContext'

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

  const [estadoRespaldo, setEstadoRespaldo] = useState<EstadoRespaldo | null>(null)
  const [respaldoDisponible, setRespaldoDisponible] = useState(false)
  const [respaldando, setRespaldando] = useState(false)

  async function cargarEstadoRespaldo(): Promise<void> {
    const resultado = await window.picaventa.obtenerEstadoRespaldo()
    if (resultado.ok) {
      setRespaldoDisponible(resultado.disponible)
      setEstadoRespaldo(resultado.ultimoEstado)
    }
  }

  async function manejarRespaldarAhora(): Promise<void> {
    setRespaldando(true)
    const resultado = await window.picaventa.respaldarAhora()
    if (resultado.ok) {
      setEstadoRespaldo(resultado.estado)
      mostrarToast(resultado.estado.ok ? 'Respaldo generado correctamente' : resultado.estado.error ?? 'Error al respaldar', resultado.estado.ok ? 'exito' : 'error')
    } else {
      mostrarToast(resultado.error, 'error')
    }
    setRespaldando(false)
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
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function manejarArchivo(evento: ChangeEvent<HTMLInputElement>): void {
    const archivo = evento.target.files?.[0]
    if (!archivo) return

    if (archivo.size > LOGO_MAX_BYTES) {
      setError('El logo no debe pesar más de 500 KB')
      return
    }

    const lector = new FileReader()
    lector.onload = () => {
      setLogoDatos(lector.result as string)
      setError('')
    }
    lector.readAsDataURL(archivo)
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
    <div className="mx-auto w-full max-w-lg">
      <h1 className="mb-6 text-2xl font-bold text-neutral-900">Configuración del negocio</h1>

        <form
          onSubmit={manejarEnviar}
          className="flex flex-col gap-3 rounded-lg border border-neutral-200 bg-white p-4"
        >
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
          <label className="text-sm font-medium text-neutral-700">
            Logo (PNG/JPG, máx. 500 KB) — se usa en el ticket impreso
            <input
              type="file"
              accept="image/png,image/jpeg"
              onChange={manejarArchivo}
              className="mt-1 w-full text-sm"
            />
          </label>
          {logoDatos && (
            <img
              src={logoDatos}
              alt="Logo del negocio"
              className="h-20 w-auto self-start rounded border border-neutral-200"
            />
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={guardando}
            className="mt-2 rounded-md bg-cobre hover:bg-cobre-oscuro px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {guardando ? 'Guardando...' : 'Guardar'}
          </button>
        </form>

        {config.modo === 'servidor' && (
          <div className="mt-4 rounded-lg border border-neutral-200 bg-white p-4">
            <h2 className="mb-1 text-sm font-semibold text-neutral-700">
              Respaldo automático de la base de datos
            </h2>
            <p className="mb-3 text-xs text-neutral-500">
              Corre solo en esta computadora (rol de Servidor) todos los días a las 3:00 a.m. Se
              conserva un respaldo local por cada uno de los últimos 30 días.
            </p>
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
              </>
            )}
          </div>
        )}
    </div>
  )
}
