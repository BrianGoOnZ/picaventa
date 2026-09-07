import { useEffect, useState } from 'react'
import type { ConfigLocal, DatosNegocio, SesionUsuario } from '@picaventa/shared'
import BarraLateral from '../componentes/BarraLateral'
import PantallaGestionUsuarios from './PantallaGestionUsuarios'
import PantallaConfiguracionNegocio from './PantallaConfiguracionNegocio'
import PantallaCatalogo from './PantallaCatalogo'
import PantallaVenta from './PantallaVenta'
import PantallaClientes from './PantallaClientes'
import PantallaCaja from './PantallaCaja'
import PantallaDashboardAdmin from './PantallaDashboardAdmin'

export type Vista = 'inicio' | 'usuarios' | 'negocio' | 'catalogo' | 'venta' | 'clientes' | 'caja'

interface Props {
  config: ConfigLocal
  sesion: SesionUsuario
  onCerrarSesion: () => void
}

export default function PantallaPrincipal({
  config,
  sesion,
  onCerrarSesion
}: Props): React.JSX.Element {
  const [vista, setVista] = useState<Vista>('inicio')
  const [productosStockBajo, setProductosStockBajo] = useState(0)
  const [negocio, setNegocio] = useState<DatosNegocio | null>(null)

  useEffect(() => {
    void window.picaventa.obtenerNegocio().then((resultado) => {
      if (resultado.ok) setNegocio(resultado.negocio)
    })

    // RF-13: alerta automática de stock bajo al iniciar sesión, sin depender
    // de que alguien consulte el reporte manualmente. El administrador ve el
    // detalle en el panel de Inicio; el cajero solo ve este aviso simple.
    void window.picaventa.listarProductos({ stockBajo: true }).then((resultado) => {
      if (resultado.ok) setProductosStockBajo(resultado.productos.length)
    })
  }, [])

  return (
    <div className="flex h-screen bg-arena">
      <BarraLateral sesion={sesion} vista={vista} onNavegar={setVista} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between border-b border-borde bg-tarjeta px-6 py-3">
          <div className="flex items-baseline gap-2">
            {negocio?.logoDatos && (
              <img src={negocio.logoDatos} alt="" className="h-7 w-7 rounded object-contain" />
            )}
            <span className="font-display text-xl font-semibold text-onix">
              {negocio?.nombreNegocio || 'PicaVenta'}
            </span>
            <span className="hidden text-xs text-texto-secundario sm:inline">
              {config.modo === 'servidor'
                ? 'Servidor'
                : `Caja — ${config.serverHost}:${config.serverPort}`}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-texto-secundario">
            <span>{sesion.nombreUsuario}</span>
            <span className="rounded-full bg-arena px-2 py-0.5 text-xs capitalize">
              {sesion.rolUsuario}
            </span>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto p-6">
          {vista === 'usuarios' && <PantallaGestionUsuarios />}
          {vista === 'negocio' && <PantallaConfiguracionNegocio config={config} />}
          {vista === 'catalogo' && <PantallaCatalogo sesion={sesion} />}
          {vista === 'clientes' && <PantallaClientes sesion={sesion} />}
          {vista === 'caja' && <PantallaCaja sesion={sesion} onCerrarSesion={onCerrarSesion} />}
          {vista === 'venta' && <PantallaVenta sesion={sesion} />}

          {vista === 'inicio' && sesion.rolUsuario === 'administrador' && (
            <PantallaDashboardAdmin
              onIrACatalogo={() => setVista('catalogo')}
              onIrAClientes={() => setVista('clientes')}
            />
          )}

          {vista === 'inicio' && sesion.rolUsuario !== 'administrador' && (
            <div className="mx-auto flex w-full max-w-2xl flex-col gap-2">
              <p className="text-sm text-texto-secundario">
                Hola, {sesion.nombreUsuario} — sesión de {sesion.rolUsuario}.
              </p>

              {productosStockBajo > 0 && (
                <p className="rounded-md bg-alerta/10 px-3 py-2 text-sm text-alerta">
                  ⚠ {productosStockBajo} producto{productosStockBajo === 1 ? '' : 's'} con stock bajo
                </p>
              )}

              <button
                type="button"
                onClick={() => setVista('venta')}
                className="mt-4 self-start rounded-md bg-cobre px-6 py-3 text-base font-semibold text-white hover:bg-cobre-oscuro"
              >
                Nueva venta
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
