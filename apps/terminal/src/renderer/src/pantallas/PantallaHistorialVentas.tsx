import { useEffect, useState } from 'react'
import type {
  Devolucion,
  LineaVentaDetalle,
  Producto,
  SesionUsuario,
  TipoResolucion,
  Venta
} from '@picaventa/shared'
import { BOTON_ACENTO, BOTON_PELIGRO, BOTON_SECUNDARIO } from '../lib/estilos'
import { confirmarCritico } from '../lib/confirmar'
import { useToast } from '../lib/ToastContext'

interface Props {
  sesion: SesionUsuario
}

function hoyISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function devueltoPorProducto(devoluciones: Devolucion[], idProducto: number): number {
  return devoluciones
    .filter((d) => d.idProducto === idProducto)
    .reduce((acumulado, d) => acumulado + d.cantidadDevuelta, 0)
}

const ETIQUETAS_RESOLUCION: Record<TipoResolucion, string> = {
  reembolso: 'Reembolso',
  reposicion: 'Reposición (defectuoso)',
  cambio: 'Cambio' // valor legado, ya no se genera desde el formulario nuevo
}

// Lo que el cajero/admin elige en pantalla. "cambiar" no es un tipo de
// resolución propio a nivel de datos — se envía como 'reembolso' +
// productoCambio (ver @picaventa/shared ventas.ts para el porqué).
type AccionDevolucion = 'reposicion' | 'reembolso' | 'cambiar'

function claseSegmento(activo: boolean): string {
  return `flex-1 rounded-md px-2 py-1.5 text-xs font-medium ${
    activo ? 'bg-cobre text-white' : 'border border-borde text-texto-secundario hover:bg-arena'
  }`
}

export default function PantallaHistorialVentas({ sesion }: Props): React.JSX.Element {
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

  const [productos, setProductos] = useState<Producto[]>([])
  const [idProductoDevolucion, setIdProductoDevolucion] = useState<number | null>(null)
  const [cantidadDevolucion, setCantidadDevolucion] = useState('')
  const [motivoDevolucion, setMotivoDevolucion] = useState('')
  const [accion, setAccion] = useState<AccionDevolucion>('reembolso')
  const [buscarProductoCambio, setBuscarProductoCambio] = useState('')
  const [productoCambio, setProductoCambio] = useState<Producto | null>(null)
  const [cantidadCambio, setCantidadCambio] = useState('')
  const [pinDevolucion, setPinDevolucion] = useState('')
  const [procesandoDevolucion, setProcesandoDevolucion] = useState(false)

  const { mostrarToast } = useToast()

  useEffect(() => {
    void window.picaventa.listarProductos({}).then((r) => {
      if (r.ok) setProductos(r.productos)
    })
  }, [])

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
    cerrarFormularioDevolucion()
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

  function cerrarFormularioDevolucion(): void {
    setIdProductoDevolucion(null)
    setCantidadDevolucion('')
    setMotivoDevolucion('')
    setPinDevolucion('')
    setAccion('reembolso')
    setBuscarProductoCambio('')
    setProductoCambio(null)
    setCantidadCambio('')
  }

  function abrirFormularioDevolucion(idProducto: number): void {
    cerrarFormularioDevolucion()
    setIdProductoDevolucion(idProducto)
  }

  async function manejarRegistrarDevolucion(): Promise<void> {
    if (idSeleccionada === null || idProductoDevolucion === null) return
    const cantidad = Number(cantidadDevolucion)
    if (!cantidad || cantidad <= 0 || pinDevolucion.length !== 4 || !motivoDevolucion.trim()) return

    const cantidadNuevaNum = Number(cantidadCambio)
    if (accion === 'cambiar' && (!productoCambio || !cantidadNuevaNum || cantidadNuevaNum <= 0)) return

    const nombreProductoOriginal = lineas.find((l) => l.idProducto === idProductoDevolucion)?.nombreProducto ?? ''

    const titulo =
      accion === 'reposicion'
        ? `¿Reponer ${cantidad} unidad(es) de "${nombreProductoOriginal}"?`
        : accion === 'cambiar'
          ? '¿Procesar el cambio por otro producto?'
          : `¿Procesar el reembolso de ${cantidad}?`
    const texto =
      accion === 'reposicion'
        ? 'El producto devuelto NO regresa al inventario (se da por dañado/descartado) y se entrega uno de reemplazo. No se mueve dinero ni afecta reportes.'
        : accion === 'cambiar'
          ? `Se regresa "${nombreProductoOriginal}" al inventario y se entrega "${productoCambio?.nombreProducto}" en su lugar. La diferencia de precio se ajusta sola en el corte de caja y en Reportes.`
          : 'El producto vuelve al inventario y se le regresa su dinero: se descuenta del saldo si fue a fiado, o se registra un retiro de caja automático si fue en efectivo.'

    const confirmado = await confirmarCritico({
      titulo,
      texto,
      textoConfirmar: 'Sí, continuar',
      colorConfirmar: '#15803D'
    })
    if (!confirmado) return

    setProcesandoDevolucion(true)
    const resultado = await window.picaventa.registrarDevolucion(idSeleccionada, {
      idProducto: idProductoDevolucion,
      cantidad,
      motivo: motivoDevolucion.trim(),
      tipoResolucion: accion === 'reposicion' ? 'reposicion' : 'reembolso',
      productoCambio:
        accion === 'cambiar' && productoCambio
          ? { idProducto: productoCambio.idProducto, cantidad: cantidadNuevaNum }
          : undefined,
      pin: pinDevolucion
    })
    if (resultado.ok) {
      mostrarToast(
        resultado.ventaCambio
          ? `Cambio procesado — se generó la venta ${resultado.ventaCambio.folio}`
          : 'Devolución registrada correctamente'
      )
      cerrarFormularioDevolucion()
      await refrescarSeleccionada()
    } else {
      mostrarToast(resultado.error, 'error')
    }
    setProcesandoDevolucion(false)
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="rounded-lg border border-borde bg-tarjeta p-4">
        <div className="mb-3 flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-texto-secundario">Ventas del periodo</h2>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1 text-xs text-texto-secundario">
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
                        onClick={() => abrirFormularioDevolucion(linea.idProducto)}
                        className={`mt-2 ${BOTON_ACENTO}`}
                      >
                        Devolver
                      </button>
                    )}
                    {idProductoDevolucion === linea.idProducto &&
                      (() => {
                        const precioNetoOriginal =
                          (linea.cantidadVendida * linea.precioUnitarioVenta - linea.descuentoAplicado) /
                          linea.cantidadVendida
                        const cantidadNum = Number(cantidadDevolucion) || 0
                        const cantidadCambioNum = Number(cantidadCambio) || 0
                        const diferencia =
                          (productoCambio?.precioVenta ?? 0) * cantidadCambioNum - precioNetoOriginal * cantidadNum

                        return (
                          <div className="mt-3 flex flex-col gap-2 rounded-md border border-borde bg-arena p-3">
                            <div className="flex gap-1.5">
                              <button
                                type="button"
                                onClick={() => setAccion('reposicion')}
                                className={claseSegmento(accion === 'reposicion')}
                              >
                                🔧 Estaba dañado
                              </button>
                              <button
                                type="button"
                                onClick={() => setAccion('reembolso')}
                                className={claseSegmento(accion === 'reembolso')}
                              >
                                💵 Reembolso
                              </button>
                              <button
                                type="button"
                                onClick={() => setAccion('cambiar')}
                                className={claseSegmento(accion === 'cambiar')}
                              >
                                🔁 Cambia de producto
                              </button>
                            </div>
                            <p className="text-xs text-texto-secundario">
                              {accion === 'reposicion' &&
                                'Se repone con uno igual. El dañado no vuelve al inventario, no se mueve dinero.'}
                              {accion === 'reembolso' &&
                                'El producto regresa al inventario y se le devuelve su dinero.'}
                              {accion === 'cambiar' &&
                                'El producto regresa al inventario y se le entrega otro en su lugar.'}
                            </p>

                            <div className="grid grid-cols-2 gap-2">
                              <label className="text-xs font-medium text-texto-secundario">
                                Cantidad a devolver (máx. {disponible})
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
                                Motivo
                                <input
                                  type="text"
                                  value={motivoDevolucion}
                                  onChange={(evento) => setMotivoDevolucion(evento.target.value)}
                                  className="mt-1 w-full rounded-md border border-borde px-2 py-1.5 text-sm"
                                />
                              </label>
                            </div>

                            {accion === 'cambiar' && (
                              <div className="rounded-md border border-borde bg-tarjeta p-2">
                                <p className="mb-1 text-xs font-medium text-texto-secundario">
                                  Producto de reemplazo
                                </p>
                                {!productoCambio ? (
                                  <>
                                    <input
                                      type="text"
                                      placeholder="Buscar producto..."
                                      value={buscarProductoCambio}
                                      onChange={(evento) => setBuscarProductoCambio(evento.target.value)}
                                      className="w-full rounded-md border border-borde px-2 py-1.5 text-sm"
                                    />
                                    {buscarProductoCambio.trim() && (
                                      <div className="mt-1 max-h-28 overflow-y-auto rounded-md border border-borde">
                                        {productos
                                          .filter((p) =>
                                            p.nombreProducto
                                              .toLowerCase()
                                              .includes(buscarProductoCambio.toLowerCase())
                                          )
                                          .slice(0, 20)
                                          .map((p) => (
                                            <button
                                              key={p.idProducto}
                                              type="button"
                                              onClick={() => {
                                                setProductoCambio(p)
                                                setBuscarProductoCambio('')
                                              }}
                                              className="block w-full border-b border-borde px-2 py-1 text-left text-xs last:border-0 hover:bg-arena"
                                            >
                                              {p.nombreProducto} — ${p.precioVenta.toFixed(2)}
                                            </button>
                                          ))}
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <span className="flex-1 text-xs text-onix">
                                      {productoCambio.nombreProducto} — ${productoCambio.precioVenta.toFixed(2)}
                                    </span>
                                    <input
                                      type="number"
                                      min="0.001"
                                      step={productoCambio.unidadMedida === 'kg' ? '0.001' : '1'}
                                      placeholder="Cant."
                                      value={cantidadCambio}
                                      onChange={(evento) => setCantidadCambio(evento.target.value)}
                                      className="w-16 rounded-md border border-borde px-1.5 py-1 text-xs"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setProductoCambio(null)
                                        setCantidadCambio('')
                                      }}
                                      className={BOTON_SECUNDARIO}
                                    >
                                      Cambiar
                                    </button>
                                  </div>
                                )}
                                {productoCambio && cantidadCambioNum > 0 && cantidadNum > 0 && (
                                  <p className="mt-1.5 text-xs font-medium text-texto-secundario">
                                    {diferencia > 0.005 && `El cliente paga $${diferencia.toFixed(2)} más`}
                                    {diferencia < -0.005 && `Se le regresan $${Math.abs(diferencia).toFixed(2)}`}
                                    {Math.abs(diferencia) <= 0.005 && 'Sin diferencia de precio'}
                                  </p>
                                )}
                              </div>
                            )}

                            <label className="text-xs font-medium text-texto-secundario">
                              Tu PIN
                              <input
                                type="password"
                                inputMode="numeric"
                                pattern="\d{4}"
                                maxLength={4}
                                value={pinDevolucion}
                                onChange={(evento) =>
                                  setPinDevolucion(evento.target.value.replace(/\D/g, '').slice(0, 4))
                                }
                                className="mt-1 w-24 rounded-md border border-borde px-2 py-1.5 font-mono text-sm tracking-widest"
                              />
                            </label>

                            <div className="flex gap-2">
                              <button type="button" onClick={cerrarFormularioDevolucion} className={BOTON_SECUNDARIO}>
                                Cancelar
                              </button>
                              <button
                                type="button"
                                onClick={() => void manejarRegistrarDevolucion()}
                                disabled={
                                  procesandoDevolucion ||
                                  !cantidadDevolucion ||
                                  pinDevolucion.length !== 4 ||
                                  !motivoDevolucion.trim() ||
                                  (accion === 'cambiar' && (!productoCambio || !cantidadCambioNum))
                                }
                                className="rounded-md bg-exito px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                              >
                                {procesandoDevolucion ? 'Procesando...' : 'Confirmar'}
                              </button>
                            </div>
                          </div>
                        )
                      })()}
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
                      {d.cantidadDevuelta} × {d.nombreProducto} — {ETIQUETAS_RESOLUCION[d.tipoResolucion]}
                      {d.montoReembolsado > 0 && ` ($${d.montoReembolsado.toFixed(2)})`}
                      {d.folioVentaCambio && ` → cambiado por venta ${d.folioVentaCambio}`} (
                      {d.motivoDevolucion}) por {d.nombreUsuario}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {ventaSeleccionada.estadoVenta === 'activa' && sesion.rolUsuario === 'administrador' && (
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
