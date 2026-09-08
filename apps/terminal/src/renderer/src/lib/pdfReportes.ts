import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { ReporteVentas, VentaPorCajero } from '@picaventa/shared'

const COLOR_COBRE: [number, number, number] = [180, 83, 31]
const COLOR_ARENA: [number, number, number] = [245, 240, 232]
const COLOR_ONIX: [number, number, number] = [26, 22, 20]

// desde/hasta llegan como datetime ISO completo (para que el filtro incluya
// la hora exacta); aquí solo importa la fecha, para el encabezado y el
// nombre del archivo.
function soloFecha(iso: string): string {
  return new Date(iso).toLocaleDateString('es-MX')
}

function dinero(valor: number): string {
  return `$${valor.toFixed(2)}`
}

function finDeTabla(doc: jsPDF): number {
  return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY
}

export function exportarReportePdf(
  reporte: ReporteVentas,
  ventasPorCajero: VentaPorCajero[],
  nombreNegocio: string
): void {
  const doc = new jsPDF()
  const desde = soloFecha(reporte.desde)
  const hasta = soloFecha(reporte.hasta)
  const ticketPromedio = reporte.numeroVentas > 0 ? reporte.totalVendido / reporte.numeroVentas : 0

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(...COLOR_ONIX)
  doc.text(nombreNegocio, 14, 18)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.text(`Reporte de ventas: ${desde} a ${hasta}`, 14, 26)

  doc.setFontSize(9)
  doc.setTextColor(120, 113, 108)
  doc.text(`Generado: ${new Date().toLocaleString('es-MX')}`, 14, 32)
  doc.setTextColor(...COLOR_ONIX)

  autoTable(doc, {
    startY: 40,
    head: [['Resumen', '']],
    body: [
      ['Total vendido', dinero(reporte.totalVendido)],
      ['Número de ventas', String(reporte.numeroVentas)],
      ['Ticket promedio', dinero(ticketPromedio)]
    ],
    theme: 'grid',
    headStyles: { fillColor: COLOR_ARENA, textColor: COLOR_ONIX, fontStyle: 'bold' },
    styles: { fontSize: 10 },
    columnStyles: { 1: { halign: 'right' } }
  })

  autoTable(doc, {
    startY: finDeTabla(doc) + 8,
    head: [['Método de pago', 'Monto']],
    body: [
      ['Efectivo', dinero(reporte.porMetodo.efectivo)],
      ['Tarjeta', dinero(reporte.porMetodo.tarjeta)],
      ['Fiado', dinero(reporte.porMetodo.fiado)]
    ],
    theme: 'grid',
    headStyles: { fillColor: COLOR_COBRE },
    styles: { fontSize: 10 },
    columnStyles: { 1: { halign: 'right' } }
  })

  let siguienteY = finDeTabla(doc) + 8

  if (ventasPorCajero.length > 0) {
    autoTable(doc, {
      startY: siguienteY,
      head: [['Ventas por cajero', 'Monto']],
      body: ventasPorCajero.map((c) => [c.nombreUsuario, dinero(c.total)]),
      theme: 'grid',
      headStyles: { fillColor: COLOR_COBRE },
      styles: { fontSize: 10 },
      columnStyles: { 1: { halign: 'right' } }
    })
    siguienteY = finDeTabla(doc) + 8
  }

  autoTable(doc, {
    startY: siguienteY,
    head: [['Producto', 'Cantidad', 'Ingresos', 'Margen aprox.']],
    body:
      reporte.productos.length > 0
        ? reporte.productos.map((p) => [
            p.nombreProducto,
            String(p.cantidad),
            dinero(p.ingresos),
            dinero(p.margenEstimado)
          ])
        : [['Sin ventas en este periodo.', '', '', '']],
    theme: 'grid',
    headStyles: { fillColor: COLOR_COBRE },
    styles: { fontSize: 9 },
    columnStyles: {
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' }
    }
  })

  doc.save(`reporte-ventas-${reporte.desde.slice(0, 10)}_a_${reporte.hasta.slice(0, 10)}.pdf`)
}
