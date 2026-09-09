import MarcaApp from '../componentes/MarcaApp'

interface Props {
  mensaje: string
}

export default function PantallaConectando({ mensaje }: Props): React.JSX.Element {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 bg-arena">
      <MarcaApp />
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-borde border-t-cobre" />
      <p className="text-sm text-texto-secundario">{mensaje}</p>
    </div>
  )
}
