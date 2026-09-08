import type { Producto } from '@picaventa/shared'

interface Props {
  producto: Producto
  colorCategoria: string
  resaltado?: boolean
  onSeleccionar: (producto: Producto) => void
  cardRef?: (el: HTMLButtonElement | null) => void
}

export default function TarjetaProducto({
  producto,
  colorCategoria,
  resaltado,
  onSeleccionar,
  cardRef
}: Props): React.JSX.Element {
  const agotado = producto.stockActual <= 0

  return (
    <button
      ref={cardRef}
      type="button"
      onClick={() => onSeleccionar(producto)}
      disabled={agotado}
      className={`group flex flex-col overflow-hidden rounded-lg border bg-tarjeta text-left shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-md disabled:pointer-events-none disabled:opacity-40 ${
        resaltado ? 'border-cobre ring-2 ring-cobre' : 'border-borde'
      }`}
    >
      {producto.imagenDatos ? (
        <img
          src={producto.imagenDatos}
          alt=""
          className="aspect-square w-full object-cover"
        />
      ) : (
        <div
          className="flex aspect-square w-full items-center justify-center"
          style={{ backgroundColor: colorCategoria }}
        >
          <span className="font-display text-3xl font-semibold text-white/90">
            {producto.nombreProducto.charAt(0).toUpperCase()}
          </span>
        </div>
      )}
      <div className="flex flex-1 flex-col gap-0.5 p-2">
        <p className="line-clamp-2 text-xs font-medium leading-tight text-onix">
          {producto.nombreProducto}
        </p>
        <p className="mt-auto font-display text-sm font-semibold tabular-nums text-cobre">
          ${producto.precioVenta.toFixed(2)}
          {producto.unidadMedida === 'kg' && <span className="text-texto-secundario">/kg</span>}
        </p>
        {agotado && <p className="text-[10px] font-semibold uppercase text-peligro">Agotado</p>}
      </div>
    </button>
  )
}
