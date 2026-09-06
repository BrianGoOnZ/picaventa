interface Props {
  mensaje: string
}

export default function PantallaConectando({ mensaje }: Props): React.JSX.Element {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 bg-neutral-100">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-neutral-300 border-t-neutral-900" />
      <p className="text-neutral-700">{mensaje}</p>
    </div>
  )
}
