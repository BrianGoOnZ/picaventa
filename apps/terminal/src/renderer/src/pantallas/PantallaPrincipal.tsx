import { useEffect, useState } from 'react'
import type { ConfigLocal, SesionUsuario } from '@picaventa/shared'
import PantallaGestionUsuarios from './PantallaGestionUsuarios'
import PantallaConfiguracionNegocio from './PantallaConfiguracionNegocio'
import PantallaCatalogo from './PantallaCatalogo'
import PantallaVenta from './PantallaVenta'
import PantallaClientes from './PantallaClientes'
import PantallaCaja from './PantallaCaja'

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
  const [vista, setVista] = useState<
    'inicio' | 'usuarios' | 'negocio' | 'catalogo' | 'venta' | 'clientes' | 'caja'
  >('inicio')
  const [productosStockBajo, setProductosStockBajo] = useState(0)
  const [clientesPendientes, setClientesPendientes] = useState(0)

  useEffect(() => {
    // RF-13: alerta automática de stock bajo al iniciar sesión, sin depender
    // de que alguien consulte el reporte manualmente.
    void window.picaventa.listarProductos({ stockBajo: true }).then((resultado) => {
      if (resultado.ok) setProductosStockBajo(resultado.productos.length)
    })

    if (sesion.rolUsuario === 'administrador') {
      // Alerta de clientes dados de alta por un cajero a media venta a
      // fiado, pendientes de que un administrador los revise.
      void window.picaventa.listarClientes().then((resultado) => {
        if (resultado.ok) {
          setClientesPendientes(resultado.clientes.filter((c) => c.pendienteRevision).length)
        }
      })
    }
  }, [])

  if (vista === 'usuarios') {
    return <PantallaGestionUsuarios onVolver={() => setVista('inicio')} />
  }

  if (vista === 'negocio') {
    return <PantallaConfiguracionNegocio onVolver={() => setVista('inicio')} />
  }

  if (vista === 'catalogo') {
    return <PantallaCatalogo onVolver={() => setVista('inicio')} />
  }

  if (vista === 'clientes') {
    return <PantallaClientes sesion={sesion} onVolver={() => setVista('inicio')} />
  }

  if (vista === 'caja') {
    return (
      <PantallaCaja
        sesion={sesion}
        onVolver={() => setVista('inicio')}
        onCerrarSesion={onCerrarSesion}
      />
    )
  }

  if (vista === 'venta') {
    return (
      <div className="flex h-screen flex-col">
        <div className="flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-2">
          <span className="text-sm text-neutral-600">
            {sesion.nombreUsuario} ({sesion.rolUsuario})
          </span>
          <button
            type="button"
            onClick={() => setVista('inicio')}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
          >
            Salir de venta
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          <PantallaVenta />
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-2 bg-neutral-100">
      <p className="text-xl font-semibold text-neutral-800">PicaVenta</p>
      <p className="text-sm text-neutral-600">
        {config.modo === 'servidor'
          ? 'Modo: Servidor — conectado a la base de datos'
          : `Modo: Caja/Terminal — conectado a ${config.serverHost}:${config.serverPort}`}
      </p>
      <p className="text-sm text-neutral-600">
        Sesión: {sesion.nombreUsuario} ({sesion.rolUsuario})
      </p>

      {productosStockBajo > 0 && (
        <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
          ⚠ {productosStockBajo} producto{productosStockBajo === 1 ? '' : 's'} con stock bajo
          {sesion.rolUsuario === 'administrador' && (
            <>
              {' — '}
              <button
                type="button"
                onClick={() => setVista('catalogo')}
                className="underline"
              >
                revisar
              </button>
            </>
          )}
        </p>
      )}

      {clientesPendientes > 0 && (
        <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
          ⚠ {clientesPendientes} cliente{clientesPendientes === 1 ? '' : 's'} dado
          {clientesPendientes === 1 ? '' : 's'} de alta por un cajero, pendiente
          {clientesPendientes === 1 ? '' : 's'} de revisión —{' '}
          <button type="button" onClick={() => setVista('clientes')} className="underline">
            revisar
          </button>
        </p>
      )}

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => setVista('venta')}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-semibold text-white"
        >
          Punto de venta
        </button>
        <button
          type="button"
          onClick={() => setVista('clientes')}
          className="rounded-md border border-neutral-300 px-4 py-2 text-sm"
        >
          Clientes
        </button>
        {sesion.rolUsuario === 'administrador' && (
          <>
            <button
              type="button"
              onClick={() => setVista('catalogo')}
              className="rounded-md border border-neutral-300 px-4 py-2 text-sm"
            >
              Catálogo
            </button>
            <button
              type="button"
              onClick={() => setVista('usuarios')}
              className="rounded-md border border-neutral-300 px-4 py-2 text-sm"
            >
              Gestionar usuarios
            </button>
            <button
              type="button"
              onClick={() => setVista('negocio')}
              className="rounded-md border border-neutral-300 px-4 py-2 text-sm"
            >
              Configuración del negocio
            </button>
          </>
        )}
        <button
          type="button"
          onClick={() => setVista('caja')}
          className="rounded-md border border-neutral-300 px-4 py-2 text-sm"
        >
          Corte de caja / Cerrar turno
        </button>
      </div>
    </div>
  )
}
