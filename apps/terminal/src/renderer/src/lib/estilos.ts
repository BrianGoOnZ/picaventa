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

// Color para una categoría creada automáticamente (ej. al importar un Excel
// de productos) — colores primarios/vivos, a propósito distintos de la
// paleta apagada de arriba, para que se distingan fácil en las tarjetas de
// Punto de Venta. En vez de una lista fija que se repite al pasar de N
// categorías, el tono gira por el "ángulo dorado" (~137.5°): con eso nunca
// caen dos categorías en el mismo tono, sin importar cuántas se creen.
export function colorCategoriaAutomatica(indice: number): string {
  const tono = (indice * 137.508) % 360
  return hslAHex(tono, 70, 48)
}

function hslAHex(h: number, s: number, l: number): string {
  const saturacion = s / 100
  const luminosidad = l / 100
  const k = (n: number): number => (n + h / 30) % 12
  const a = saturacion * Math.min(luminosidad, 1 - luminosidad)
  const f = (n: number): number =>
    luminosidad - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  const aHex = (x: number): string => Math.round(255 * x).toString(16).padStart(2, '0')
  return `#${aHex(f(0))}${aHex(f(8))}${aHex(f(4))}`.toUpperCase()
}
