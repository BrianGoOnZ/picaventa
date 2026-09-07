export const BOTON_SECUNDARIO =
  'rounded-md border border-borde bg-tarjeta px-3 py-1.5 text-xs font-medium text-texto-secundario hover:bg-arena'
export const BOTON_ACENTO =
  'rounded-md border border-cobre px-3 py-1.5 text-xs font-medium text-cobre hover:bg-cobre hover:text-white'
export const BOTON_PELIGRO =
  'rounded-md border border-peligro px-3 py-1.5 text-xs font-medium text-peligro hover:bg-peligro hover:text-white'

export const COLORES_AVATAR = [
  '#7C5B45',
  '#6B7A4F',
  '#8C6A2E',
  '#8E5B4E',
  '#4F7A78',
  '#9C6B8E',
  '#5B6B7A',
  '#3F6B52'
]

export function colorAvatar(id: number): string {
  return COLORES_AVATAR[id % COLORES_AVATAR.length]!
}
