import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { LOGO_MAX_BYTES } from '@picaventa/shared'

export default function PantallaConfiguracionNegocio(): React.JSX.Element {
  const [nombreNegocio, setNombreNegocio] = useState('')
  const [direccionNegocio, setDireccionNegocio] = useState('')
  const [telefonoNegocio, setTelefonoNegocio] = useState('')
  const [logoDatos, setLogoDatos] = useState<string | undefined>(undefined)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [guardado, setGuardado] = useState(false)

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
    setGuardado(false)

    const resultado = await window.picaventa.guardarNegocio({
      nombreNegocio,
      direccionNegocio: direccionNegocio || undefined,
      telefonoNegocio: telefonoNegocio || undefined,
      logoDatos
    })

    if (resultado.ok) {
      setGuardado(true)
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
          {guardado && <p className="text-sm text-green-700">Guardado correctamente.</p>}
          <button
            type="submit"
            disabled={guardando}
            className="mt-2 rounded-md bg-cobre hover:bg-cobre-oscuro px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {guardando ? 'Guardando...' : 'Guardar'}
          </button>
        </form>
    </div>
  )
}
