import type { SesionUsuario } from '@picaventa/shared'
import type { Vista } from '../pantallas/PantallaPrincipal'

interface Props {
  sesion: SesionUsuario
  vista: Vista
  onNavegar: (vista: Vista) => void
}

function trazo(d: string): React.JSX.Element {
  return <path d={d} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
}

const ICONOS: Record<string, (props: { className?: string }) => React.JSX.Element> = {
  inicio: ({ className }) => (
    <svg viewBox="0 0 24 24" className={className}>
      {trazo('M4 11.5 12 4l8 7.5M6 10v9h12v-9')}
    </svg>
  ),
  venta: ({ className }) => (
    <svg viewBox="0 0 24 24" className={className}>
      {trazo('M4 6h2l1.5 10.5A2 2 0 0 0 9.5 18H18a2 2 0 0 0 2-1.7L21 9H7')}
      <circle cx="10" cy="21" r="1.4" fill="currentColor" />
      <circle cx="17" cy="21" r="1.4" fill="currentColor" />
    </svg>
  ),
  clientes: ({ className }) => (
    <svg viewBox="0 0 24 24" className={className}>
      <circle cx="12" cy="8.5" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.75" />
      {trazo('M5.5 19.5c1-3.3 3.6-5 6.5-5s5.5 1.7 6.5 5')}
    </svg>
  ),
  catalogo: ({ className }) => (
    <svg viewBox="0 0 24 24" className={className}>
      {trazo('M4 7.5 12 4l8 3.5-8 3.5-8-3.5Z')}
      {trazo('M4 7.5V16l8 3.5 8-3.5V7.5')}
      {trazo('M12 11v8.5')}
    </svg>
  ),
  caja: ({ className }) => (
    <svg viewBox="0 0 24 24" className={className}>
      <rect x="3.5" y="8" width="17" height="11" rx="1.6" fill="none" stroke="currentColor" strokeWidth="1.75" />
      {trazo('M3.5 12.5h17M8 8V6.2A2.2 2.2 0 0 1 10.2 4h3.6A2.2 2.2 0 0 1 16 6.2V8')}
    </svg>
  ),
  usuarios: ({ className }) => (
    <svg viewBox="0 0 24 24" className={className}>
      <circle cx="9" cy="8" r="2.6" fill="none" stroke="currentColor" strokeWidth="1.75" />
      {trazo('M3.8 19c.8-2.8 2.8-4.3 5.2-4.3s4.4 1.5 5.2 4.3')}
      <circle cx="17" cy="8.5" r="2.1" fill="none" stroke="currentColor" strokeWidth="1.6" />
      {trazo('M15.6 14.9c2 .2 3.5 1.6 4.1 3.9')}
    </svg>
  ),
  negocio: ({ className }) => (
    <svg viewBox="0 0 24 24" className={className}>
      <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.75" />
      {trazo(
        'M12 4.2v1.9M12 17.9v1.9M19.8 12h-1.9M6.1 12H4.2M17.3 6.7l-1.35 1.35M8.05 15.95 6.7 17.3M17.3 17.3l-1.35-1.35M8.05 8.05 6.7 6.7'
      )}
    </svg>
  )
}

const ITEMS: { vista: Vista; etiqueta: string; icono: keyof typeof ICONOS; soloAdmin?: boolean }[] = [
  { vista: 'inicio', etiqueta: 'Inicio', icono: 'inicio' },
  { vista: 'venta', etiqueta: 'Punto de venta', icono: 'venta' },
  { vista: 'clientes', etiqueta: 'Clientes', icono: 'clientes' },
  { vista: 'caja', etiqueta: 'Corte de caja', icono: 'caja' },
  { vista: 'catalogo', etiqueta: 'Catálogo', icono: 'catalogo', soloAdmin: true },
  { vista: 'usuarios', etiqueta: 'Usuarios', icono: 'usuarios', soloAdmin: true },
  { vista: 'negocio', etiqueta: 'Ajustes del negocio', icono: 'negocio', soloAdmin: true }
]

export default function BarraLateral({ sesion, vista, onNavegar }: Props): React.JSX.Element {
  const esAdmin = sesion.rolUsuario === 'administrador'

  return (
    <nav className="group relative z-20 flex w-16 shrink-0 flex-col overflow-hidden bg-onix py-4 transition-[width] duration-200 ease-out hover:w-56">
      <div className="flex flex-col gap-1 px-2">
        {ITEMS.filter((item) => esAdmin || !item.soloAdmin).map((item) => {
          const Icono = ICONOS[item.icono]!
          const activo = vista === item.vista
          return (
            <button
              key={item.vista}
              type="button"
              onClick={() => onNavegar(item.vista)}
              title={item.etiqueta}
              className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                activo
                  ? 'bg-cobre text-white'
                  : 'text-arena/70 hover:bg-white/10 hover:text-arena'
              }`}
            >
              <Icono className="h-5 w-5 shrink-0" />
              <span className="whitespace-nowrap opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                {item.etiqueta}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
