// Formato de dinero consistente en toda la app: separador de miles (coma) y
// símbolo de peso, para poder leer montos grandes de un vistazo — antes cada
// pantalla armaba el texto a mano (`$${monto.toFixed(2)}`), sin comas.
const FORMATO_2_DECIMALES = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
})
const FORMATO_SIN_DECIMALES = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
})

// Ya incluye el símbolo "$" y el signo "-" si el monto es negativo — no hay
// que volver a anteponerlos en el sitio donde se use.
export function formatoMoneda(monto: number, decimales: 0 | 2 = 2): string {
  return (decimales === 0 ? FORMATO_SIN_DECIMALES : FORMATO_2_DECIMALES).format(monto)
}
