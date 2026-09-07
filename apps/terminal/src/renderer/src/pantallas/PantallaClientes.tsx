import { useEffect, useRef, useState, type FormEvent } from 'react'
import { tienePermiso, type Cliente, type SesionUsuario } from '@picaventa/shared'
import { BOTON_ACENTO, BOTON_PELIGRO, BOTON_SECUNDARIO, colorAvatar } from '../lib/estilos'
import { confirmarEliminar } from '../lib/confirmar'
import { useToast } from '../lib/ToastContext'

interface Props {
  sesion: SesionUsuario
}

const FORMULARIO_VACIO = { nombreCliente: '', telefonoCliente: '', limiteCredito: '' }

export default function PantallaClientes({ sesion }: Props): React.JSX.Element {
  const esAdmin = sesion.rolUsuario === 'administrador'
  const puedeCrear = tienePermiso(sesion, 'crearClientes')
  const puedeEliminar = tienePermiso(sesion, 'eliminarClientes')
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [cargando, setCargando] = useState(true)
  const [formulario, setFormulario] = useState(FORMULARIO_VACIO)
  const [idEditando, setIdEditando] = useState<number | null>(null)
  const [idAbonando, setIdAbonando] = useState<number | null>(null)
  const [montoAbono, setMontoAbono] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const formularioRef = useRef<HTMLFormElement>(null)
  const { mostrarToast } = useToast()

  async function cargar(): Promise<void> {
    const resultado = await window.picaventa.listarClientes()
    if (resultado.ok) setClientes(resultado.clientes)
    setCargando(false)
  }

  useEffect(() => {
    void cargar()
  }, [])

  function manejarEditar(cliente: Cliente): void {
    setIdEditando(cliente.idCliente)
    setFormulario({
      nombreCliente: cliente.nombreCliente,
      telefonoCliente: cliente.telefonoCliente ?? '',
      limiteCredito: cliente.limiteCredito.toString()
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
      nombreCliente: formulario.nombreCliente,
      telefonoCliente: formulario.telefonoCliente || undefined,
      limiteCredito: Number(formulario.limiteCredito) || 0
    }

    const creando = idEditando === null
    const resultado = creando
      ? await window.picaventa.crearCliente(datos)
      : await window.picaventa.editarCliente(idEditando, datos)

    if (resultado.ok) {
      cancelarEdicion()
      await cargar()
      mostrarToast(creando ? 'Cliente agregado' : 'Cliente actualizado')
    } else {
      setError(resultado.error)
    }
    setEnviando(false)
  }

  async function manejarEliminar(cliente: Cliente): Promise<void> {
    if (!(await confirmarEliminar(cliente.nombreCliente))) return
    const resultado = await window.picaventa.eliminarCliente(cliente.idCliente)
    if (resultado.ok) {
      await cargar()
      mostrarToast('Cliente eliminado')
    } else {
      mostrarToast(resultado.error, 'error')
    }
  }

  async function manejarAbonar(evento: FormEvent, idCliente: number): Promise<void> {
    evento.preventDefault()
    const monto = Number(montoAbono)
    if (!monto || monto <= 0) return

    setEnviando(true)
    setError('')
    const resultado = await window.picaventa.registrarAbono(idCliente, { monto })

    if (resultado.ok) {
      setIdAbonando(null)
      setMontoAbono('')
      await cargar()
      mostrarToast('Abono registrado')
    } else {
      setError(resultado.error)
    }
    setEnviando(false)
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-bold text-neutral-900">Clientes</h1>

      {(esAdmin || (idEditando === null && puedeCrear)) && (
        <form
          ref={formularioRef}
          onSubmit={manejarEnviar}
          className="grid grid-cols-2 gap-3 rounded-lg border border-borde bg-tarjeta p-4"
        >
          <h2 className="col-span-2 text-sm font-semibold text-texto-secundario">
            {idEditando === null ? 'Nuevo cliente' : 'Editar cliente'}
          </h2>
          {!esAdmin && (
            <p className="col-span-2 -mt-2 text-xs text-texto-secundario">
              Se creará marcado como pendiente de revisión por un administrador.
            </p>
          )}
          <label className="text-sm font-medium text-neutral-700">
            Nombre
            <input
              type="text"
              required
              autoFocus
              value={formulario.nombreCliente}
              onChange={(evento) =>
                setFormulario({ ...formulario, nombreCliente: evento.target.value })
              }
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm font-medium text-neutral-700">
            Teléfono
            <input
              type="text"
              value={formulario.telefonoCliente}
              onChange={(evento) =>
                setFormulario({ ...formulario, telefonoCliente: evento.target.value })
              }
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm font-medium text-neutral-700">
            Límite de crédito
            <input
              type="number"
              min="0"
              step="0.01"
              required
              value={formulario.limiteCredito}
              onChange={(evento) =>
                setFormulario({ ...formulario, limiteCredito: evento.target.value })
              }
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
          </label>
          {error && <p className="col-span-2 text-sm text-red-600">{error}</p>}
          <div className="col-span-2 flex gap-2">
            {idEditando !== null && (
              <button type="button" onClick={cancelarEdicion} className={BOTON_SECUNDARIO}>
                Cancelar
              </button>
            )}
            <button
              type="submit"
              disabled={enviando}
              className="flex-1 rounded-md bg-cobre px-4 py-2 text-sm font-semibold text-white hover:bg-cobre-oscuro disabled:opacity-50"
            >
              {enviando ? 'Guardando...' : idEditando === null ? 'Agregar cliente' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      )}

      <div className="rounded-lg border border-borde bg-tarjeta p-4">
        <h2 className="mb-3 text-sm font-semibold text-texto-secundario">
          Clientes registrados {clientes.length > 0 && `(${clientes.length})`}
        </h2>
        {cargando ? (
          <p className="text-sm text-texto-secundario">Cargando...</p>
        ) : clientes.length === 0 ? (
          <p className="text-sm text-texto-secundario">Aún no hay clientes registrados.</p>
        ) : (
          <ul className="flex max-h-96 flex-col gap-2 overflow-y-auto">
            {clientes.map((cliente) => {
              const sobreLimite = cliente.saldoActual > cliente.limiteCredito
              return (
                <li
                  key={cliente.idCliente}
                  className="rounded-lg border border-borde p-3 text-sm"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-display text-sm font-semibold text-white"
                      style={{ backgroundColor: colorAvatar(cliente.idCliente) }}
                    >
                      {cliente.nombreCliente.charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-onix">
                        {cliente.nombreCliente}
                        {esAdmin && cliente.pendienteRevision && (
                          <span className="ml-2 rounded bg-alerta/10 px-1.5 py-0.5 text-xs font-semibold text-alerta">
                            Pendiente de revisión
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-texto-secundario">
                        {cliente.telefonoCliente && `${cliente.telefonoCliente} · `}
                        <span className={sobreLimite ? 'font-semibold text-peligro' : ''}>
                          debe ${cliente.saldoActual.toFixed(2)} de ${cliente.limiteCredito.toFixed(2)}
                        </span>
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setIdAbonando(cliente.idCliente)}
                        className={BOTON_ACENTO}
                      >
                        Abonar
                      </button>
                      {esAdmin && (
                        <button
                          type="button"
                          onClick={() => manejarEditar(cliente)}
                          className={BOTON_SECUNDARIO}
                        >
                          Editar
                        </button>
                      )}
                      {(esAdmin || puedeEliminar) && (
                        <button
                          type="button"
                          onClick={() => void manejarEliminar(cliente)}
                          className={BOTON_PELIGRO}
                        >
                          Eliminar
                        </button>
                      )}
                    </div>
                  </div>
                  {idAbonando === cliente.idCliente && (
                    <form
                      onSubmit={(evento) => void manejarAbonar(evento, cliente.idCliente)}
                      className="mt-3 flex items-center gap-2 border-t border-borde pt-3"
                    >
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        autoFocus
                        placeholder="Monto"
                        value={montoAbono}
                        onChange={(evento) => setMontoAbono(evento.target.value)}
                        className="w-32 rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
                      />
                      <button
                        type="submit"
                        disabled={enviando}
                        className="rounded-md bg-cobre px-3 py-1.5 text-xs font-semibold text-white hover:bg-cobre-oscuro"
                      >
                        Registrar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIdAbonando(null)
                          setMontoAbono('')
                        }}
                        className={BOTON_SECUNDARIO}
                      >
                        Cancelar
                      </button>
                    </form>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
