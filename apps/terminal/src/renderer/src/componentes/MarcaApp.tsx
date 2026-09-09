interface Props {
  tamano?: 'normal' | 'grande'
}

export default function MarcaApp({ tamano = 'normal' }: Props): React.JSX.Element {
  const caja = tamano === 'grande' ? 'h-16 w-16' : 'h-14 w-14'
  const icono = tamano === 'grande' ? 'h-8 w-8' : 'h-7 w-7'

  return (
    <div className={`flex ${caja} items-center justify-center rounded-2xl bg-cobre text-white shadow-sm`}>
      <svg viewBox="0 0 24 24" className={icono}>
        <path
          d="M4 6h2l1.5 10.5A2 2 0 0 0 9.5 18H18a2 2 0 0 0 2-1.7L21 9H7"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="10" cy="21" r="1.4" fill="currentColor" />
        <circle cx="17" cy="21" r="1.4" fill="currentColor" />
      </svg>
    </div>
  )
}
