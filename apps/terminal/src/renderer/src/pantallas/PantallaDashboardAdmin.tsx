import { useEffect, useState } from 'react'
import type { Cliente, CorteCajaResumen, ProductoReporte, Producto, VentaPorCajero } from '@picaventa/shared'
import TarjetaKpi from '../componentes/TarjetaKpi'
import GraficaBarrasDia from '../componentes/GraficaBarrasDia'
import GraficaBarrasHorizontal from '../componentes/GraficaBarrasHorizontal'
import GraficaDona from '../componentes/GraficaDona'
import { BOTON_SECUNDARIO } from '../lib/estilos'

interface Props {
  onIrACatalogo: () => void
  onIrAClientes: () => void
}

function inicioDeHoy(): Date {
  const f = new Date()
  f.setHours(0, 0, 0, 0)
  return f
}
function inicioDeAyer(): Date {
  const f = inicioDeHoy()
  f.setDate(f.getDate() - 1)
  return f
}
function finDeAyer(): Date {
  const f = inicioDeHoy()
  f.setMilliseconds(f.getMilliseconds() - 1)
  return f
}
function inicioDeMes(): Date {
  const f = new Date()
  f.setDate(1)
  f.setHours(0, 0, 0, 0)
  return f
}

export default function PantallaDashboardAdmin({ onIrACatalogo, onIrAClientes }: Props): React.JSX.Element {
  const [cargando, setCargando] = useState(true)
  const [ventasHoy, setVentasHoy] = useState({ total: 0, numero: 0 })
  const [ventasAyer, setVentasAyer] = useState(0)
  const [ventasMes, setVentasMes] = useState(0)
  const [metodoPagoHoy, setMetodoPagoHoy] = useState({ efectivo: 0, tarjeta: 0, fiado: 0 })
  const [topProductos, setTopProductos] = useState<ProductoReporte[]>([])
  const [ventasPorCajero, setVentasPorCajero] = useState<VentaPorCajero[]>([])
  const [diasTendencia, setDiasTendencia] = useState<7 | 30>(7)
  const [tendencia, setTendencia] = useState<{ fecha: string; total: number }[]>([])
  const [stockBajo, setStockBajo] = useState<Producto[]>([])
  const [clientesPendientes, setClientesPendientes] = useState<Cliente[]>([])
  const [clientesSobreLimite, setClientesSobreLimite] = useState<Cliente[]>([])
  const [cortes, setCortes] = useState<CorteCajaResumen[]>([])

  useEffect(() => {
    void (async () => {
      const [reporteHoy, reporteAyer, reporteMes, cajeros, productos, clientes, cortesRecientes] =
        await Promise.all([
          window.picaventa.obtenerReporteVentas(inicioDeHoy().toISOString(), new Date().toISOString()),
          window.picaventa.obtenerReporteVentas(inicioDeAyer().toISOString(), finDeAyer().toISOString()),
          window.picaventa.obtenerReporteVentas(inicioDeMes().toISOString(), new Date().toISOString()),
          window.picaventa.obtenerVentasPorCajero(inicioDeMes().toISOString(), new Date().toISOString()),
          window.picaventa.listarProductos({ stockBajo: true }),
          window.picaventa.listarClientes(),
          window.picaventa.listarCortes(8)
        ])

      if (reporteHoy.ok) {
        setVentasHoy({ total: reporteHoy.reporte.totalVendido, numero: reporteHoy.reporte.numeroVentas })
        setMetodoPagoHoy(reporteHoy.reporte.porMetodo)
      }
      if (reporteAyer.ok) setVentasAyer(reporteAyer.reporte.totalVendido)
      if (reporteMes.ok) {
        setVentasMes(reporteMes.reporte.totalVendido)
        setTopProductos([...reporteMes.reporte.productos].sort((a, b) => b.ingresos - a.ingresos).slice(0, 5))
      }
      if (cajeros.ok) setVentasPorCajero(cajeros.cajeros)
      if (productos.ok) setStockBajo(productos.productos)
      if (clientes.ok) {
        setClientesPendientes(clientes.clientes.filter((c) => c.pendienteRevision))
        setClientesSobreLimite(clientes.clientes.filter((c) => c.saldoActual > c.limiteCredito))
      }
      if (cortesRecientes.ok) setCortes(cortesRecientes.cortes)

      setCargando(false)
    })()
  }, [])

  useEffect(() => {
    void window.picaventa.obtenerVentasPorDia(diasTendencia).then((resultado) => {
      if (resultado.ok) setTendencia(resultado.dias)
    })
  }, [diasTendencia])

  if (cargando) {
    return <p className="text-sm text-texto-secundario">Cargando panel...</p>
  }

  const deltaVsAyer =
    ventasAyer > 0 ? ((ventasHoy.total - ventasAyer) / ventasAyer) * 100 : ventasHoy.total > 0 ? 100 : 0
  const ticketPromedio = ventasHoy.numero > 0 ? ventasHoy.total / ventasHoy.numero : 0
  const totalTendencia = tendencia.reduce((acumulado, d) => acumulado + d.total, 0)

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <TarjetaKpi
          titulo="Ventas de hoy"
          valor={`$${ventasHoy.total.toFixed(2)}`}
          delta={{ porcentaje: deltaVsAyer, etiqueta: 'vs. ayer' }}
        />
        <TarjetaKpi titulo="Ticket promedio (hoy)" valor={`$${ticketPromedio.toFixed(2)}`} />
        <TarjetaKpi titulo="Ventas del mes" valor={`$${ventasMes.toFixed(2)}`} />
      </div>

      <div className="rounded-lg border border-borde bg-tarjeta p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-texto-secundario">Tendencia de ventas</h2>
          <div className="flex gap-1">
            {([7, 30] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDiasTendencia(d)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                  diasTendencia === d ? 'bg-onix text-white' : 'border border-borde text-texto-secundario'
                }`}
              >
                {d} días
              </button>
            ))}
          </div>
        </div>
        <p className="mb-3 text-xs text-texto-secundario">
          Total: <span className="font-semibold text-onix">${totalTendencia.toFixed(2)}</span>
        </p>
        <GraficaBarrasDia dias={tendencia} />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div className="rounded-lg border border-borde bg-tarjeta p-4">
          <h2 className="mb-3 text-sm font-semibold text-texto-secundario">Método de pago (hoy)</h2>
          <GraficaDona
            segmentos={[
              { etiqueta: 'Efectivo', valor: metodoPagoHoy.efectivo, color: '#B4531F' },
              { etiqueta: 'Tarjeta', valor: metodoPagoHoy.tarjeta, color: '#4F7A78' },
              { etiqueta: 'Fiado', valor: metodoPagoHoy.fiado, color: '#9C6B8E' }
            ]}
          />
        </div>
        <div className="rounded-lg border border-borde bg-tarjeta p-4">
          <h2 className="mb-3 text-sm font-semibold text-texto-secundario">Top 5 productos (este mes)</h2>
          <GraficaBarrasHorizontal
            datos={topProductos.map((p) => ({ etiqueta: p.nombreProducto, valor: p.ingresos }))}
          />
        </div>
        <div className="rounded-lg border border-borde bg-tarjeta p-4">
          <h2 className="mb-3 text-sm font-semibold text-texto-secundario">Ventas por cajero (este mes)</h2>
          <GraficaBarrasHorizontal
            datos={ventasPorCajero.map((c) => ({ etiqueta: c.nombreUsuario, valor: c.total }))}
            color="#6B7A4F"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-borde bg-tarjeta p-4">
          <h2 className="mb-2 text-sm font-semibold text-texto-secundario">
            Stock bajo {stockBajo.length > 0 && `(${stockBajo.length})`}
          </h2>
          {stockBajo.length === 0 ? (
            <p className="text-xs text-texto-secundario">Todo en orden.</p>
          ) : (
            <ul className="flex flex-col gap-1.5 text-xs">
              {stockBajo.slice(0, 6).map((p) => (
                <li key={p.idProducto} className="flex justify-between gap-2">
                  <span className="truncate text-onix">{p.nombreProducto}</span>
                  <span className="shrink-0 font-medium text-peligro">
                    {p.stockActual} {p.unidadMedida}
                  </span>
                </li>
              ))}
              {stockBajo.length > 6 && (
                <li className="pt-1">
                  <button type="button" onClick={onIrACatalogo} className={BOTON_SECUNDARIO}>
                    Ver los {stockBajo.length} en Catálogo
                  </button>
                </li>
              )}
            </ul>
          )}
        </div>

        <div className="rounded-lg border border-borde bg-tarjeta p-4">
          <h2 className="mb-2 text-sm font-semibold text-texto-secundario">
            Clientes pendientes de revisión {clientesPendientes.length > 0 && `(${clientesPendientes.length})`}
          </h2>
          {clientesPendientes.length === 0 ? (
            <p className="text-xs text-texto-secundario">Nada pendiente.</p>
          ) : (
            <ul className="flex flex-col gap-1.5 text-xs">
              {clientesPendientes.slice(0, 6).map((c) => (
                <li key={c.idCliente} className="flex justify-between gap-2">
                  <span className="truncate text-onix">{c.nombreCliente}</span>
                  <span className="shrink-0 text-texto-secundario">${c.limiteCredito.toFixed(0)}</span>
                </li>
              ))}
              <li className="pt-1">
                <button type="button" onClick={onIrAClientes} className={BOTON_SECUNDARIO}>
                  Revisar en Clientes
                </button>
              </li>
            </ul>
          )}
        </div>

        <div className="rounded-lg border border-borde bg-tarjeta p-4">
          <h2 className="mb-2 text-sm font-semibold text-texto-secundario">
            Sobre su límite de crédito {clientesSobreLimite.length > 0 && `(${clientesSobreLimite.length})`}
          </h2>
          {clientesSobreLimite.length === 0 ? (
            <p className="text-xs text-texto-secundario">Nadie excede su límite.</p>
          ) : (
            <ul className="flex flex-col gap-1.5 text-xs">
              {clientesSobreLimite.slice(0, 6).map((c) => (
                <li key={c.idCliente} className="flex justify-between gap-2">
                  <span className="truncate text-onix">{c.nombreCliente}</span>
                  <span className="shrink-0 font-medium text-peligro">
                    +${(c.saldoActual - c.limiteCredito).toFixed(0)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-lg border border-borde bg-tarjeta p-4">
          <h2 className="mb-2 text-sm font-semibold text-texto-secundario">Últimos cortes de caja</h2>
          {cortes.length === 0 ? (
            <p className="text-xs text-texto-secundario">Aún no hay cortes registrados.</p>
          ) : (
            <ul className="flex flex-col gap-1.5 text-xs">
              {cortes.map((c) => (
                <li key={c.idCorte} className="flex justify-between gap-2">
                  <span className="truncate text-onix">
                    {c.nombreUsuario} · {new Date(c.fechaCorte).toLocaleDateString('es-MX')}
                  </span>
                  <span
                    className={`shrink-0 font-medium ${
                      c.diferencia === 0
                        ? 'text-exito'
                        : c.diferencia < 0
                          ? 'text-peligro'
                          : 'text-alerta'
                    }`}
                  >
                    {c.diferencia === 0
                      ? 'Cuadra'
                      : c.diferencia < 0
                        ? `Faltan $${Math.abs(c.diferencia).toFixed(0)}`
                        : `Sobran $${c.diferencia.toFixed(0)}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
