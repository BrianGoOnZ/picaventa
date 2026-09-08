import ExcelJS from 'exceljs'
import type { ReporteVentas, VentaPorCajero } from '@picaventa/shared'
import { TIPO_MIME_XLSX, descargarBlob } from './excel'

const FORMATO_MONEDA = '"$"#,##0.00'

// desde/hasta llegan como datetime ISO completo (para que el filtro incluya
// la hora exacta); aquí solo importa la fecha, para el nombre del archivo y
// el encabezado del reporte.
function soloFecha(iso: string): string {
  return new Date(iso).toLocaleDateString('es-MX')
}

export async function exportarReporteAExcel(
  reporte: ReporteVentas,
  ventasPorCajero: VentaPorCajero[],
  nombreNegocio: string
): Promise<void> {
  const workbook = new ExcelJS.Workbook()
  const desde = soloFecha(reporte.desde)
  const hasta = soloFecha(reporte.hasta)

  // --- Hoja 1: resumen del periodo ---
  const resumen = workbook.addWorksheet('Resumen')
  resumen.columns = [{ width: 26 }, { width: 18 }]

  resumen.addRow([nombreNegocio]).font = { bold: true, size: 14 }
  resumen.addRow([`Reporte de ventas: ${desde} a ${hasta}`])
  resumen.addRow([`Generado: ${new Date().toLocaleString('es-MX')}`])
  resumen.addRow([])

  const ticketPromedio = reporte.numeroVentas > 0 ? reporte.totalVendido / reporte.numeroVentas : 0
  resumen.addRow(['Total vendido', reporte.totalVendido]).getCell(2).numFmt = FORMATO_MONEDA
  resumen.addRow(['Número de ventas', reporte.numeroVentas])
  resumen.addRow(['Ticket promedio', ticketPromedio]).getCell(2).numFmt = FORMATO_MONEDA
  resumen.addRow([])

  resumen.addRow(['Por método de pago', 'Monto']).font = { bold: true }
  resumen.addRow(['Efectivo', reporte.porMetodo.efectivo]).getCell(2).numFmt = FORMATO_MONEDA
  resumen.addRow(['Tarjeta', reporte.porMetodo.tarjeta]).getCell(2).numFmt = FORMATO_MONEDA
  resumen.addRow(['Fiado', reporte.porMetodo.fiado]).getCell(2).numFmt = FORMATO_MONEDA

  if (ventasPorCajero.length > 0) {
    resumen.addRow([])
    resumen.addRow(['Por cajero', 'Monto']).font = { bold: true }
    for (const c of ventasPorCajero) {
      resumen.addRow([c.nombreUsuario, c.total]).getCell(2).numFmt = FORMATO_MONEDA
    }
  }

  // --- Hoja 2: detalle por producto ---
  const productos = workbook.addWorksheet('Productos vendidos')
  productos.columns = [
    { header: 'Producto', width: 32 },
    { header: 'Cantidad vendida', width: 18 },
    { header: 'Ingresos', width: 16 },
    { header: 'Margen aproximado', width: 20 }
  ]
  productos.getRow(1).font = { bold: true }

  for (const p of reporte.productos) {
    const fila = productos.addRow([p.nombreProducto, p.cantidad, p.ingresos, p.margenEstimado])
    fila.getCell(3).numFmt = FORMATO_MONEDA
    fila.getCell(4).numFmt = FORMATO_MONEDA
  }

  const buffer = await workbook.xlsx.writeBuffer()
  const nombreArchivo = `reporte-ventas-${reporte.desde.slice(0, 10)}_a_${reporte.hasta.slice(0, 10)}.xlsx`
  descargarBlob(new Blob([buffer], { type: TIPO_MIME_XLSX }), nombreArchivo)
}
