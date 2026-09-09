import type { DatosTicketImpresion, ResultadoAbrirCajon, ResultadoImpresionTicket } from '@picaventa/shared'

// TODO (cuando se instale una impresora térmica física en la tienda):
// reemplazar estos dos stubs por una integración real. Las impresoras de
// tickets más comunes en tiendas y mercados en México (Epson TM-T20/T88,
// Xprinter, POS-58/80 genéricas) hablan el protocolo ESC/POS y se conectan
// por USB (aparecen como puerto serial virtual) o por red (IP:9100).
//
// Pasos para conectarla de verdad, sin tener que tocar nada del renderer:
//   1. `npm install node-thermal-printer` (o `escpos` + `escpos-usb`/
//      `escpos-network` según el tipo de conexión) en este workspace.
//   2. Detectar/elegir la impresora: igual que con la báscula (bascula.ts),
//      lo más simple es dejar que el administrador elija el puerto o la IP
//      una sola vez desde Ajustes del negocio y guardarlo en la
//      configuración local (ver config-store.ts).
//   3. Construir el ticket con los comandos ESC/POS de la librería (texto,
//      corte de papel, y el pulso `ESC p` para abrir el cajón si va
//      conectado a la misma impresora — la mayoría de cajones de dinero se
//      abren así, no con un cable aparte).
//   4. Reemplazar el cuerpo de `imprimirTicketTermico()` y `abrirCajonDinero()`
//      de abajo para que hagan la impresión/pulso real en vez del error fijo
//      que devuelven hoy.
//
// Mientras tanto, la UI (TicketVenta) ya está conectada a estas funciones a
// través de window.picaventa.imprimirTicketTermico()/abrirCajonDinero() — el
// botón "Imprimir" las llama primero, y como hoy siempre fallan, cae
// automáticamente al diálogo de impresión del sistema (window.print()). El
// día que la impresora esté lista, el único cambio necesario es este archivo.
export async function imprimirTicketTermico(_datos: DatosTicketImpresion): Promise<ResultadoImpresionTicket> {
  return {
    ok: false,
    error: 'No hay impresora térmica conectada todavía — se usará el diálogo de impresión del sistema.'
  }
}

export async function abrirCajonDinero(): Promise<ResultadoAbrirCajon> {
  return { ok: false, error: 'No hay impresora térmica conectada todavía — abre el cajón manualmente.' }
}
