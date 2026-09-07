import { useEffect, useState, type FormEvent } from 'react'
import type { Cliente, SesionUsuario } from '@picaventa/shared'

interface Props {
  sesion: SesionUsuario
  onVolver: () => void
}

const FORMULARIO_VACIO = { nombreCliente: '', telefonoCliente: '', limiteCredito: '' }

export default function PantallaClientes({ sesion, onVolver }: Props): React.JSX.Element {
  const esAdmin = sesion.rolUsuario === 'administrador'
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [cargando, setCargando] = useState(true)
  const [formulario, setFormulario] = useState(FORMULARIO_VACIO)
  const [idEditando, setIdEditando] = useState<number | null>(null)
  const [idAbonando, setIdAbonando] = useState<number | null>(null)
  const [montoAbono, setMontoAbono] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

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

    const resultado =
      idEditando === null
        ? await window.picaventa.crearCliente(datos)
        : await window.picaventa.editarCliente(idEditando, datos)

    if (resultado.ok) {
      cancelarEdicion()
      await cargar()
    } else {
      setError(resultado.error)
    }
    setEnviando(false)
  }

  async function manejarEliminar(cliente: Cliente): Promise<void> {
    if (!window.confirm(`¿Eliminar a "${cliente.nombreCliente}"?`)) return
    const resultado = await window.picaventa.eliminarCliente(cliente.idCliente)
    if (resultado.ok) {
      await cargar()
    } else {
      setError(resultado.error)
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
    } else {
      setError(resultado.error)
    }
    setEnviando(false)
  }

  return (
    <div className="flex h-screen items-center justify-center bg-neutral-100 p-8">
      <div className="w-full max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-neutral-900">Clientes</h1>
          <button
            type="button"
            onClick={onVolver}
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm"
          >
            Volver
          </button>
        </div>

        <div className="mb-6 max-h-80 overflow-y-auto rounded-lg border border-neutral-200 bg-white p-4">
          {cargando ? (
            <p className="text-sm text-neutral-500">Cargando...</p>
          ) : clientes.length === 0 ? (
            <p className="text-sm text-neutral-500">No hay clientes.</p>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {clientes.map((cliente) => {
                const sobreLimite = cliente.saldoActual > cliente.limiteCredito
                return (
                  <li key={cliente.idCliente} className="py-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span>
                        {cliente.nombreCliente}
                        {cliente.telefonoCliente ? ` — ${cliente.telefonoCliente}` : ''}
                        {' — '}
                        <span className={sobreLimite ? 'font-semibold text-red-600' : ''}>
                          debe ${cliente.saldoActual.toFixed(2)} de ${cliente.limiteCredito.toFixed(2)}
                        </span>
                      </span>
                      <span className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setIdAbonando(cliente.idCliente)}
                          className="text-xs text-neutral-600 underline"
                        >
                          Abonar
                        </button>
                        {esAdmin && (
                          <>
                            <button
                              type="button"
                              onClick={() => manejarEditar(cliente)}
                              className="text-xs text-neutral-600 underline"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => void manejarEliminar(cliente)}
                              className="text-xs text-red-600 underline"
                            >
                              Eliminar
                            </button>
                          </>
                        )}
                      </span>
                    </div>
                    {idAbonando === cliente.idCliente && (
                      <form
                        onSubmit={(evento) => void manejarAbonar(evento, cliente.idCliente)}
                        className="mt-2 flex items-center gap-2"
                      >
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          autoFocus
                          placeholder="Monto"
                          value={montoAbono}
                          onChange={(evento) => setMontoAbono(evento.target.value)}
                          className="w-32 rounded-md border border-neutral-300 px-2 py-1 text-sm"
                        />
                        <button
                          type="submit"
                          disabled={enviando}
                          className="rounded-md bg-neutral-900 px-3 py-1 text-xs font-semibold text-white"
                        >
                          Registrar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIdAbonando(null)
                            setMontoAbono('')
                          }}
                          className="text-xs text-neutral-500 underline"
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

        {esAdmin && (
          <form
            onSubmit={manejarEnviar}
            className="grid grid-cols-2 gap-3 rounded-lg border border-neutral-200 bg-white p-4"
          >
            <h2 className="col-span-2 text-sm font-semibold text-neutral-700">
              {idEditando === null ? 'Nuevo cliente' : 'Editar cliente'}
            </h2>
            <label className="text-sm font-medium text-neutral-700">
              Nombre
              <input
                type="text"
                required
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
                <button
                  type="button"
                  onClick={cancelarEdicion}
                  className="rounded-md border border-neutral-300 px-4 py-2 text-sm"
                >
                  Cancelar
                </button>
              )}
              <button
                type="submit"
                disabled={enviando}
                className="flex-1 rounded-md bg-neutral-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {enviando ? 'Guardando...' : idEditando === null ? 'Agregar' : 'Guardar'}
              </button>
            </div>
          </form>
        )}
        {!esAdmin && error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </div>
  )
}
