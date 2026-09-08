export const TIPO_MIME_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

export function descargarBlob(blob: Blob, nombreArchivo: string): void {
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombreArchivo
  document.body.appendChild(enlace)
  enlace.click()
  document.body.removeChild(enlace)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
