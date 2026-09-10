import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { Proveedor } from '@picaventa/shared'
import { BOTON_PELIGRO, BOTON_SECUNDARIO } from '../lib/estilos'
import { confirmarEliminar } from '../lib/confirmar'
import { useToast } from '../lib/ToastContext'

const FORMULARIO_VACIO = {
  nombreProveedor: '',
  nombreEmpresa: '',
  telefonoProveedor: '',
  correoProveedor: ''
}

export default function PantallaProveedores(): React.JSX.Element {
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [cargando, setCargando] = useState(true)
  const [formulario, setFormulario] = useState(FORMULARIO_VACIO)
  const [idEditando, setIdEditando] = useState<number | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const { mostrarToast } = useToast()
  const formularioRef = useRef<HTMLFormElement>(null)

  async function cargar(): Promise<void> {
    const resultado = await window.picaventa.listarProveedores()
    if (resultado.ok) setProveedores(resultado.proveedores)
    setCargando(false)
  }

  useEffect(() => {
    void cargar()
  }, [])

  function manejarEditar(proveedor: Proveedor): void {
    setIdEditando(proveedor.idProveedor)
    setFormulario({
      nombreProveedor: proveedor.nombreProveedor,
      nombreEmpresa: proveedor.nombreEmpresa ?? '',
      telefonoProveedor: proveedor.telefonoProveedor ?? '',
      correoProveedor: proveedor.correoProveedor ?? ''
    })
    setError('')
    formularioRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function cancelarEdicion(): void {
    setIdEditando(null)
    setFormulario(FORMULARIO_VACIO)
    setError('')
  }

  async function manejarEnviar(evento: FormEvent): Promise<void> {
    evento.preventDefault()
    setEnviando(true)
    setError('')

    const datos = {
      nombreProveedor: formulario.nombreProveedor,
      nombreEmpresa: formulario.nombreEmpresa || undefined,
      telefonoProveedor: formulario.telefonoProveedor || undefined,
      correoProveedor: formulario.correoProveedor || undefined
    }

    const creando = idEditando === null
    const resultado = creando
      ? await window.picaventa.crearProveedor(datos)
      : await window.picaventa.editarProveedor(idEditando, datos)

    if (resultado.ok) {
      cancelarEdicion()
      await cargar()
      mostrarToast(creando ? 'Proveedor agregado' : 'Proveedor actualizado')
    } else {
      setError(resultado.error)
    }
    setEnviando(false)
  }

  async function manejarEliminar(proveedor: Proveedor): Promise<void> {
    if (!(await confirmarEliminar(proveedor.nombreProveedor))) return
    const resultado = await window.picaventa.eliminarProveedor(proveedor.idProveedor)
    if (resultado.ok) {
      await cargar()
      mostrarToast('Proveedor eliminado')
    } else {
      mostrarToast(resultado.error, 'error')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <form
        ref={formularioRef}
        onSubmit={manejarEnviar}
        className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3 rounded-lg border border-borde bg-tarjeta p-4"
      >
        <h2 className="col-span-full text-sm font-semibold text-texto-secundario">
          {idEditando === null ? 'Nuevo proveedor' : 'Editar proveedor'}
        </h2>
        <label className="text-sm font-medium text-neutral-700">
          Nombre de contacto
          <input
            type="text"
            required
            value={formulario.nombreProveedor}
            onChange={(evento) => setFormulario({ ...formulario, nombreProveedor: evento.target.value })}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm font-medium text-neutral-700">
          Empresa
          <input
            type="text"
            value={formulario.nombreEmpresa}
            onChange={(evento) => setFormulario({ ...formulario, nombreEmpresa: evento.target.value })}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm font-medium text-neutral-700">
          Teléfono
          <input
            type="text"
            value={formulario.telefonoProveedor}
            onChange={(evento) => setFormulario({ ...formulario, telefonoProveedor: evento.target.value })}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm font-medium text-neutral-700">
          Correo
          <input
            type="text"
            value={formulario.correoProveedor}
            onChange={(evento) => setFormulario({ ...formulario, correoProveedor: evento.target.value })}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </label>
        {error && <p className="col-span-full text-sm text-red-600">{error}</p>}
        <div className="col-span-full flex gap-2">
          {idEditando !== null && (
            <button type="button" onClick={cancelarEdicion} className={BOTON_SECUNDARIO}>
              Cancelar
            </button>
          )}
          <button
            type="submit"
            disabled={enviando}
            className="rounded-md bg-cobre px-4 py-2 text-sm font-semibold text-white hover:bg-cobre-oscuro disabled:opacity-50"
          >
            {enviando ? 'Guardando...' : idEditando === null ? 'Agregar proveedor' : 'Guardar cambios'}
          </button>
        </div>
      </form>

      <div className="rounded-lg border border-borde bg-tarjeta p-4">
        <h2 className="mb-3 text-sm font-semibold text-texto-secundario">
          Proveedores registrados {proveedores.length > 0 && `(${proveedores.length})`}
        </h2>
        {cargando ? (
          <p className="text-sm text-texto-secundario">Cargando...</p>
        ) : proveedores.length === 0 ? (
          <p className="text-sm text-texto-secundario">Aún no hay proveedores registrados.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {proveedores.map((proveedor) => (
              <li
                key={proveedor.idProveedor}
                className="flex items-center justify-between rounded-lg border border-borde p-3 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-onix">
                    {proveedor.nombreProveedor}
                    {proveedor.nombreEmpresa && (
                      <span className="ml-2 text-xs text-texto-secundario">{proveedor.nombreEmpresa}</span>
                    )}
                  </p>
                  <p className="text-xs text-texto-secundario">
                    {[proveedor.telefonoProveedor, proveedor.correoProveedor].filter(Boolean).join(' · ') || '—'}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <button type="button" onClick={() => manejarEditar(proveedor)} className={BOTON_SECUNDARIO}>
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => void manejarEliminar(proveedor)}
                    className={BOTON_PELIGRO}
                  >
                    Eliminar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
