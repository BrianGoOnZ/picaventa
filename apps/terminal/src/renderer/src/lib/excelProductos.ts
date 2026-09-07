import ExcelJS from 'exceljs'
import { readSheet } from 'read-excel-file/browser'
import type { Categoria, Producto, UnidadMedida } from '@picaventa/shared'

const TIPO_MIME_XLSX =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

const ENCABEZADOS = [
  'Nombre',
  'Código de barras',
  'Precio de compra',
  'Precio de venta',
  'Unidad (pieza o kg)',
  'Stock actual',
  'Stock mínimo',
  'Categoría'
] as const

async function crearHojaBase(): Promise<{ workbook: ExcelJS.Workbook; hoja: ExcelJS.Worksheet }> {
  const workbook = new ExcelJS.Workbook()
  const hoja = workbook.addWorksheet('Productos')
  hoja.columns = ENCABEZADOS.map((encabezado) => ({ header: encabezado, width: 24 }))
  hoja.getRow(1).font = { bold: true }
  return { workbook, hoja }
}

function descargarBlob(blob: Blob, nombreArchivo: string): void {
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombreArchivo
  document.body.appendChild(enlace)
  enlace.click()
  document.body.removeChild(enlace)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function descargarPlantillaProductos(): Promise<void> {
  const { workbook, hoja } = await crearHojaBase()

  hoja.addRow([
    'Refresco de cola 600ml (ejemplo — bórralo)',
    '7501234567890',
    12.5,
    18,
    'pieza',
    50,
    10,
    'Bebidas'
  ])
  hoja.getRow(2).font = { italic: true, color: { argb: 'FF8A8A8A' } }

  // Desplegable en la columna de unidad para evitar errores de captura.
  for (let fila = 2; fila <= 500; fila++) {
    hoja.getCell(`E${fila}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"pieza,kg"']
    }
  }

  const buffer = await workbook.xlsx.writeBuffer()
  descargarBlob(new Blob([buffer], { type: TIPO_MIME_XLSX }), 'plantilla-productos.xlsx')
}

export async function exportarProductosAExcel(
  productos: Producto[],
  categorias: Categoria[]
): Promise<void> {
  const { workbook, hoja } = await crearHojaBase()
  const nombrePorIdCategoria = new Map(categorias.map((c) => [c.idCategoria, c.nombreCategoria]))

  for (const producto of productos) {
    hoja.addRow([
      producto.nombreProducto,
      producto.codigoBarras ?? '',
      producto.precioCompra ?? '',
      producto.precioVenta,
      producto.unidadMedida,
      producto.stockActual,
      producto.stockMinimo,
      producto.idCategoria ? (nombrePorIdCategoria.get(producto.idCategoria) ?? '') : ''
    ])
  }

  const buffer = await workbook.xlsx.writeBuffer()
  const fecha = new Date().toISOString().slice(0, 10)
  descargarBlob(new Blob([buffer], { type: TIPO_MIME_XLSX }), `productos-${fecha}.xlsx`)
}

export interface FilaProductoExcel {
  fila: number
  nombreProducto: string
  codigoBarras: string
  precioCompra: string
  precioVenta: string
  unidadMedida: string
  stockActual: string
  stockMinimo: string
  categoria: string
}

function valorCelda(valores: unknown[], indice: number): string {
  const valor = valores[indice]
  if (valor == null) return ''
  if (valor instanceof Date) return valor.toISOString()
  return String(valor).trim()
}

// La escritura (plantilla/exportación) usa exceljs porque soporta listas
// desplegables de validación; la lectura usa read-excel-file porque exceljs
// se queda colgado indefinidamente al leer un archivo en el contexto del
// renderer de Electron (funciona escribiendo, pero no leyendo).
export async function parsearProductosDesdeExcel(archivo: File | Blob): Promise<FilaProductoExcel[]> {
  const filasCrudas = await readSheet(archivo)

  const filas: FilaProductoExcel[] = []
  filasCrudas.forEach((valores, indice) => {
    const numeroFila = indice + 1
    if (numeroFila === 1) return // fila de encabezados

    const nombreProducto = valorCelda(valores, 0)
    if (!nombreProducto) return // fila vacía, se ignora sin marcarla como error

    filas.push({
      fila: numeroFila,
      nombreProducto,
      codigoBarras: valorCelda(valores, 1),
      precioCompra: valorCelda(valores, 2),
      precioVenta: valorCelda(valores, 3),
      unidadMedida: valorCelda(valores, 4),
      stockActual: valorCelda(valores, 5),
      stockMinimo: valorCelda(valores, 6),
      categoria: valorCelda(valores, 7)
    })
  })

  return filas
}

export interface FilaProductoValidada {
  fila: number
  nombreProducto: string
  codigoBarras?: string
  precioCompra?: number
  precioVenta: number
  unidadMedida: UnidadMedida
  stockActual: number
  stockMinimo: number
  idCategoria?: number
  accion: 'crear' | 'actualizar'
  idProductoExistente?: number
  advertencias: string[]
  error?: string
}

function numeroOIndefinido(texto: string): number | undefined {
  if (!texto) return undefined
  const valor = Number(texto)
  return Number.isNaN(valor) ? undefined : valor
}

export function validarFilaProducto(
  filaExcel: FilaProductoExcel,
  categorias: Categoria[],
  productosExistentes: Producto[]
): FilaProductoValidada {
  const base = { fila: filaExcel.fila, nombreProducto: filaExcel.nombreProducto }

  const precioVenta = numeroOIndefinido(filaExcel.precioVenta)
  if (precioVenta === undefined || precioVenta < 0) {
    return {
      ...base,
      precioVenta: 0,
      unidadMedida: 'pieza',
      stockActual: 0,
      stockMinimo: 0,
      accion: 'crear',
      advertencias: [],
      error: `Precio de venta inválido: "${filaExcel.precioVenta}"`
    }
  }

  const unidadTexto = filaExcel.unidadMedida.trim().toLowerCase()
  let unidadMedida: UnidadMedida
  if (unidadTexto === '' || unidadTexto === 'pieza') unidadMedida = 'pieza'
  else if (unidadTexto === 'kg') unidadMedida = 'kg'
  else {
    return {
      ...base,
      precioVenta,
      unidadMedida: 'pieza',
      stockActual: 0,
      stockMinimo: 0,
      accion: 'crear',
      advertencias: [],
      error: `Unidad de medida inválida: "${filaExcel.unidadMedida}" (debe ser "pieza" o "kg")`
    }
  }

  const precioCompra = filaExcel.precioCompra ? numeroOIndefinido(filaExcel.precioCompra) : undefined
  if (filaExcel.precioCompra && (precioCompra === undefined || precioCompra < 0)) {
    return {
      ...base,
      precioVenta,
      unidadMedida,
      stockActual: 0,
      stockMinimo: 0,
      accion: 'crear',
      advertencias: [],
      error: `Precio de compra inválido: "${filaExcel.precioCompra}"`
    }
  }

  const stockActual = numeroOIndefinido(filaExcel.stockActual) ?? 0
  if (stockActual < 0) {
    return {
      ...base,
      precioVenta,
      unidadMedida,
      stockActual: 0,
      stockMinimo: 0,
      accion: 'crear',
      advertencias: [],
      error: `Stock actual inválido: "${filaExcel.stockActual}"`
    }
  }

  const stockMinimo = numeroOIndefinido(filaExcel.stockMinimo) ?? 0
  if (stockMinimo < 0) {
    return {
      ...base,
      precioVenta,
      unidadMedida,
      stockActual,
      stockMinimo: 0,
      accion: 'crear',
      advertencias: [],
      error: `Stock mínimo inválido: "${filaExcel.stockMinimo}"`
    }
  }

  const advertencias: string[] = []
  let idCategoria: number | undefined
  if (filaExcel.categoria) {
    const encontrada = categorias.find(
      (c) => c.nombreCategoria.toLowerCase() === filaExcel.categoria.toLowerCase()
    )
    if (encontrada) idCategoria = encontrada.idCategoria
    else advertencias.push(`Categoría "${filaExcel.categoria}" no existe — se guardará sin categoría`)
  }

  const codigoBarras = filaExcel.codigoBarras || undefined
  const existente = codigoBarras
    ? productosExistentes.find((p) => p.codigoBarras === codigoBarras)
    : undefined

  return {
    ...base,
    codigoBarras,
    precioCompra,
    precioVenta,
    unidadMedida,
    stockActual,
    stockMinimo,
    idCategoria,
    accion: existente ? 'actualizar' : 'crear',
    idProductoExistente: existente?.idProducto,
    advertencias
  }
}
