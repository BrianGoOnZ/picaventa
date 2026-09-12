// Las fotos se guardan embebidas en base64 directo en la base de datos (no
// como archivo aparte — servidor y cajas no comparten sistema de archivos),
// así que un límite de tamaño es necesario para no inflar la base ni la
// sincronización con las demás cajas. En vez de pedirle al usuario que
// comprima la foto a mano (nadie sin experiencia sabe cómo), se redimensiona
// y comprime aquí mismo, en automático, antes de guardarla.
const DIMENSION_MAXIMA_PX = 320

export async function comprimirImagen(archivo: File, maxBytes: number): Promise<string> {
  const dataUrlOriginal = await leerComoDataUrl(archivo)
  const imagen = await cargarImagen(dataUrlOriginal)

  const escala = Math.min(1, DIMENSION_MAXIMA_PX / Math.max(imagen.width, imagen.height))
  const ancho = Math.max(1, Math.round(imagen.width * escala))
  const alto = Math.max(1, Math.round(imagen.height * escala))

  const canvas = document.createElement('canvas')
  canvas.width = ancho
  canvas.height = alto
  const contexto = canvas.getContext('2d')
  if (!contexto) return dataUrlOriginal
  // JPEG no tiene canal alfa: sin esto, el fondo transparente de un PNG (muy
  // común en logos) se volvería negro en vez de blanco al convertir.
  contexto.fillStyle = '#ffffff'
  contexto.fillRect(0, 0, ancho, alto)
  contexto.drawImage(imagen, 0, 0, ancho, alto)

  let calidad = 0.85
  let resultado = canvas.toDataURL('image/jpeg', calidad)
  // Baja la calidad hasta que quepa en el límite — 320px ya es chico, así que
  // en la práctica casi nunca hace falta bajar de la primera pasada.
  while (tamanoDataUrl(resultado) > maxBytes && calidad > 0.3) {
    calidad -= 0.15
    resultado = canvas.toDataURL('image/jpeg', calidad)
  }
  return resultado
}

function leerComoDataUrl(archivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const lector = new FileReader()
    lector.onload = () => resolve(lector.result as string)
    lector.onerror = () => reject(lector.error ?? new Error('No se pudo leer el archivo'))
    lector.readAsDataURL(archivo)
  })
}

function cargarImagen(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const imagen = new Image()
    imagen.onload = () => resolve(imagen)
    imagen.onerror = () => reject(new Error('El archivo no es una imagen válida'))
    imagen.src = dataUrl
  })
}

function tamanoDataUrl(dataUrl: string): number {
  const base64 = dataUrl.split(',')[1] ?? ''
  return Math.ceil((base64.length * 3) / 4)
}
