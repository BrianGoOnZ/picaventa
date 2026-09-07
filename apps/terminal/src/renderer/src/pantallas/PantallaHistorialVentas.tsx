import { useEffect, useState } from 'react'
import type { Devolucion, LineaVentaDetalle, TipoResolucion, Venta } from '@picaventa/shared'
import { BOTON_PELIGRO, BOTON_SECUNDARIO } from '../lib/estilos'
import { confirmarCritico } from '../lib/confirmar'
import { useToast } from '../lib/ToastContext'

function hoyISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function devueltoPorProducto(devoluciones: Devolucion[], idProducto: number): number {
  return devoluciones
    .filter((d) => d.idProducto === idProducto)
    .reduce((acumulado, d) => acumulado + d.cantidadDevuelta, 0)
}

export default function PantallaHistorialVentas(): React.JSX.Element {
  const [desde, setDesde] = useState(hoyISO())
  const [hasta, setHasta] = useState(hoyISO())
  const [ventas, setVentas] = useState<Venta[]>([])
  const [cargando, setCargando] = useState(true)

  const [idSeleccionada, setIdSeleccionada] = useState<number | null>(null)
  const [lineas, setLineas] = useState<LineaVentaDetalle[]>([])
  const [ventaSeleccionada, setVentaSeleccionada] = useState<Venta | null>(null)
  const [devoluciones, setDevoluciones] = useState<Devolucion[]>([])

  const [mostrarCancelar, setMostrarCancelar] = useState(false)
  const [pinCancelar, setPinCancelar] = useState('')
  const [cancelando, setCancelando] = useState(false)

  const [idProductoDevolucion, setIdProductoDevolucion] = useState<number | null>(null)
  const [cantidadDevolucion, setCantidadDevolucion] = useState('')
  const [motivoDevolucion, setMotivoDevolucion] = useState('')
  const [tipoResolucion, setTipoResolucion] = useState<TipoResolucion>('reembolso')
  const [pinDevolucion, setPinDevolucion] = useState('')
  const [procesandoDevolucion, setProcesandoDevolucion] = useState(false)

  const { mostrarToast } = useToast()

  async function cargarVentas(): Promise<void> {
    setCargando(true)
    const resultado = await window.picaventa.listarVentas({ estado: 'activa', desde, hasta })
    if (resultado.ok) setVentas(resultado.ventas)
    setCargando(false)
  }

  useEffect(() => {
    void cargarVentas()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desde, hasta])

  async function seleccionarVenta(idVenta: number): Promise<void> {
    setIdSeleccionada(idVenta)
    setMostrarCancelar(false)
    setIdProductoDevolucion(null)
    const [detalle, listaDevoluciones] = await Promise.all([
      window.picaventa.obtenerVenta(idVenta),
      window.picaventa.listarDevoluciones(idVenta)
    ])
    if (detalle.ok) {
      setVentaSeleccionada(detalle.venta)
      setLineas(detalle.lineas)
    }
    if (listaDevoluciones.ok) setDevoluciones(listaDevoluciones.devoluciones)
  }

  async function refrescarSeleccionada(): Promise<void> {
    if (idSeleccionada === null) return
    await seleccionarVenta(idSeleccionada)
    await cargarVentas()
  }

  async function manejarCancelarVenta(): Promise<void> {
    if (idSeleccionada === null || pinCancelar.length !== 4) return

    const confirmado = await confirmarCritico({
      titulo: '¿Cancelar esta venta por completo?',
      texto:
        'Se reintegrará el stock de todos los productos y, si fue a fiado, se descontará del saldo del cliente. Esta acción no se puede deshacer.',
      textoConfirmar: 'Sí, cancelar venta',
      colorConfirmar: '#DC2626'
    })
    if (!confirmado) return

    setCancelando(true)
    const resultado = await window.picaventa.cancelarVentaActiva(idSeleccionada, { pin: pinCancelar })
    if (resultado.ok) {
      mostrarToast('Venta cancelada correctamente')
      setPinCancelar('')
      setMostrarCancelar(false)
      await refrescarSeleccionada()
    } else {
      mostrarToast(resultado.error, 'error')
    }
    setCancelando(false)
  }

  async function manejarRegistrarDevolucion(): Promise<void> {
    if (idSeleccionada === null || idProductoDevolucion === null) return
    const cantidad = Number(cantidadDevolucion)
    if (!cantidad || cantidad <= 0 || pinDevolucion.length !== 4 || !motivoDevolucion.trim()) return

    const confirmado = await confirmarCritico({
      titulo: `¿Procesar la devolución de ${cantidad}?`,
      texto:
        tipoResolucion === 'reembolso'
          ? 'El producto vuelve al inventario y, si aplica, se descuenta del saldo del cliente.'
          : 'El producto vuelve al inventario como parte de un cambio.',
      textoConfirmar: 'Sí, procesar devolución',
      colorConfirmar: '#15803D'
    })
    if (!confirmado) return

    setProcesandoDevolucion(true)
    const resultado = await window.picaventa.registrarDevolucion(idSeleccionada, {
      idProducto: idProductoDevolucion,
      cantidad,
      motivo: motivoDevolucion.trim(),
      tipoResolucion,
      pin: pinDevolucion
    })
    if (resultado.ok) {
      mostrarToast('Devolución registrada correctamente')
      setCantidadDevolucion('')
      setMotivoDevolucion('')
      setPinDevolucion('')
      setIdProductoDevolucion(null)
      await refrescarSeleccionada()
    } else {
      mostrarToast(resultado.error, 'error')
    }
    setProcesandoDevolucion(false)
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="rounded-lg border border-borde bg-tarjeta p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-semibold text-texto-secundario">Ventas del periodo</h2>
          <label className="ml-auto flex items-center gap-1 text-xs text-texto-secundario">
            Desde
            <input
              type="date"
              value={desde}
              onChange={(evento) => setDesde(evento.target.value)}
              className="rounded-md border border-borde px-2 py-1 text-xs"
            />
          </label>
          <label className="flex items-center gap-1 text-xs text-texto-secundario">
            Hasta
            <input
              type="date"
              value={hasta}
              onChange={(evento) => setHasta(evento.target.value)}
              className="rounded-md border border-borde px-2 py-1 text-xs"
            />
          </label>
        </div>

        {cargando ? (
          <p className="text-sm text-texto-secundario">Cargando...</p>
        ) : ventas.length === 0 ? (
          <p className="text-sm text-texto-secundario">No hay ventas cobradas en este periodo.</p>
        ) : (
          <ul className="flex max-h-[32rem] flex-col gap-1.5 overflow-y-auto">
            {ventas.map((v) => (
              <li key={v.idVenta}>
                <button
                  type="button"
                  onClick={() => void seleccionarVenta(v.idVenta)}
                  className={`flex w-full items-center justify-between rounded-lg border p-3 text-left text-sm ${
                    idSeleccionada === v.idVenta ? 'border-cobre bg-cobre/5' : 'border-borde hover:bg-arena'
                  }`}
                >
                  <span className="text-onix">
                    {v.folioVenta}
                    <span className="ml-2 text-xs capitalize text-texto-secundario">{v.metodoPago}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="text-texto-secundario">
                      {new Date(v.fechaVenta).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                    <span className="font-semibold text-onix">${v.total.toFixed(2)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-lg border border-borde bg-tarjeta p-4">
        {!ventaSeleccionada ? (
          <p className="text-sm text-texto-secundario">Selecciona una venta para ver el detalle.</p>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-display text-lg font-semibold text-onix">{ventaSeleccionada.folioVenta}</p>
                <p className="text-xs text-texto-secundario">
                  {new Date(ventaSeleccionada.fechaVenta).toLocaleString('es-MX')} ·{' '}
                  <span className="capitalize">{ventaSeleccionada.metodoPago}</span>
                </p>
              </div>
              <span className="font-display text-xl font-semibold text-onix">
                ${ventaSeleccionada.total.toFixed(2)}
              </span>
            </div>

            <ul className="flex flex-col gap-2">
              {lineas.map((linea) => {
                const yaDevuelto = devueltoPorProducto(devoluciones, linea.idProducto)
                const disponible = linea.cantidadVendida - yaDevuelto
                return (
                  <li key={linea.idProducto} className="rounded-lg border border-borde p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-onix">{linea.nombreProducto}</span>
                      <span className="text-texto-secundario">
                        {linea.cantidadVendida} {linea.unidadMedida} × ${linea.precioUnitarioVenta.toFixed(2)}
                      </span>
                    </div>
                    {yaDevuelto > 0 && (
                      <p className="mt-1 text-xs text-alerta">{yaDevuelto} ya devuelto(s)</p>
                    )}
                    {disponible > 0 && ventaSeleccionada.estadoVenta === 'activa' && (
                      <button
                        type="button"
                        onClick={() => {
                          setIdProductoDevolucion(linea.idProducto)
                          setCantidadDevolucion('')
                          setMotivoDevolucion('')
                          setPinDevolucion('')
                        }}
                        className="mt-2 text-xs font-medium text-cobre underline"
                      >
                        Devolver
                      </button>
                    )}
                    {idProductoDevolucion === linea.idProducto && (
                      <div className="mt-3 flex flex-col gap-2 rounded-md border border-borde bg-arena p-3">
                        <div className="grid grid-cols-2 gap-2">
                          <label className="text-xs font-medium text-texto-secundario">
                            Cantidad (máx. {disponible})
                            <input
                              type="number"
                              min="0.001"
                              max={disponible}
                              step={linea.unidadMedida === 'kg' ? '0.001' : '1'}
                              value={cantidadDevolucion}
                              onChange={(evento) => setCantidadDevolucion(evento.target.value)}
                              className="mt-1 w-full rounded-md border border-borde px-2 py-1.5 text-sm"
                            />
                          </label>
                          <label className="text-xs font-medium text-texto-secundario">
                            Resolución
                            <select
                              value={tipoResolucion}
                              onChange={(evento) => setTipoResolucion(evento.target.value as TipoResolucion)}
                              className="mt-1 w-full rounded-md border border-borde px-2 py-1.5 text-sm"
                            >
                              <option value="reembolso">Reembolso</option>
                              <option value="cambio">Cambio</option>
                            </select>
                          </label>
                          <label className="col-span-2 text-xs font-medium text-texto-secundario">
                            Motivo
                            <input
                              type="text"
                              value={motivoDevolucion}
                              onChange={(evento) => setMotivoDevolucion(evento.target.value)}
                              className="mt-1 w-full rounded-md border border-borde px-2 py-1.5 text-sm"
                            />
                          </label>
                          <label className="text-xs font-medium text-texto-secundario">
                            PIN de administrador
                            <input
                              type="password"
                              inputMode="numeric"
                              pattern="\d{4}"
                              maxLength={4}
                              value={pinDevolucion}
                              onChange={(evento) =>
                                setPinDevolucion(evento.target.value.replace(/\D/g, '').slice(0, 4))
                              }
                              className="mt-1 w-full rounded-md border border-borde px-2 py-1.5 font-mono text-sm tracking-widest"
                            />
                          </label>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setIdProductoDevolucion(null)}
                            className={BOTON_SECUNDARIO}
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={() => void manejarRegistrarDevolucion()}
                            disabled={
                              procesandoDevolucion ||
                              !cantidadDevolucion ||
                              pinDevolucion.length !== 4 ||
                              !motivoDevolucion.trim()
                            }
                            className="rounded-md bg-exito px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                          >
                            {procesandoDevolucion ? 'Procesando...' : 'Confirmar devolución'}
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>

            {devoluciones.length > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-semibold text-texto-secundario">
                  Devoluciones de esta venta
                </h3>
                <ul className="flex flex-col gap-1.5">
                  {devoluciones.map((d) => (
                    <li key={d.idDevolucion} className="text-xs text-texto-secundario">
                      {d.cantidadDevuelta} × {d.nombreProducto} — {d.tipoResolucion} ({d.motivoDevolucion}) por{' '}
                      {d.nombreUsuario}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {ventaSeleccionada.estadoVenta === 'activa' && (
              <div className="border-t border-borde pt-3">
                {!mostrarCancelar ? (
                  <button
                    type="button"
                    onClick={() => setMostrarCancelar(true)}
                    className={BOTON_PELIGRO}
                  >
                    Cancelar venta completa
                  </button>
                ) : (
                  <div className="flex flex-col gap-2 rounded-md border border-peligro/40 bg-peligro/5 p-3">
                    <label className="text-xs font-medium text-texto-secundario">
                      PIN de administrador para confirmar
                      <input
                        type="password"
                        inputMode="numeric"
                        autoFocus
                        pattern="\d{4}"
                        maxLength={4}
                        value={pinCancelar}
                        onChange={(evento) => setPinCancelar(evento.target.value.replace(/\D/g, '').slice(0, 4))}
                        className="mt-1 w-32 rounded-md border border-borde px-2 py-1.5 font-mono text-sm tracking-widest"
                      />
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setMostrarCancelar(false)
                          setPinCancelar('')
                        }}
                        className={BOTON_SECUNDARIO}
                      >
                        No cancelar
                      </button>
                      <button
                        type="button"
                        onClick={() => void manejarCancelarVenta()}
                        disabled={cancelando || pinCancelar.length !== 4}
                        className={BOTON_PELIGRO}
                      >
                        {cancelando ? 'Cancelando...' : 'Confirmar cancelación'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
