import type { ResultadoLecturaBascula } from '@picaventa/shared'

// TODO (cuando se instale una báscula física en la tienda): reemplazar este
// stub por una integración real. La gran mayoría de básculas de mostrador
// (TORREY, Rice Lake, CAS, Excell, etc. — muy comunes en tiendas y mercados
// en México) se conectan por un puerto serial (RS-232 directo o un
// adaptador USB-serial) y mandan continuamente el peso como texto plano,
// algo como "ST,GS,+001.250kg\r\n" — el formato exacto, baud rate y si
// manda una bandera de "estable"/"inestable" varían por marca y modelo, así
// que hay que revisar el manual de la báscula que se compre.
//
// Pasos para conectarla de verdad, sin tener que tocar nada del renderer:
//   1. `npm install serialport` en este workspace (apps/terminal) — es la
//      librería estándar de Node para hablar con puertos seriales/COM
//      dentro de un proceso de Electron.
//   2. Detectar el puerto: `SerialPort.list()` lista los puertos COM
//      disponibles. Lo más simple es dejar que el administrador elija el
//      puerto correcto una sola vez desde Ajustes del negocio, y guardarlo
//      en la configuración local (junto a host/puerto del servidor, ver
//      config-store.ts) — así no hay que volver a configurarlo cada vez
//      que arranca la app.
//   3. Abrir el puerto con los parámetros de esa báscula (típicamente 9600
//      baud, 8 bits de datos, sin paridad, 1 bit de parada — pero SIEMPRE
//      confirmar contra el manual del modelo real antes de asumir esto).
//   4. Parsear cada línea recibida para sacar el número de peso y si esa
//      lectura ya se "estabilizó" (casi todas las básculas distinguen
//      lectura estable de inestable, para no capturar el peso a medio
//      pesaje mientras el producto todavía se está acomodando).
//   5. Reemplazar el cuerpo de `leerPesoBascula()` de abajo para que
//      devuelva esa lectura real en vez del error fijo que devuelve hoy.
//
// Mientras tanto, la UI (el modal de peso para productos a granel en
// PantallaVenta) ya está conectada a esta función a través de
// window.picaventa.leerPesoBascula() — el botón "Leer báscula" la llama
// tal cual, y como hoy siempre falla, simplemente le pide al cajero que
// capture el peso a mano. El día que la báscula esté lista, el único
// cambio necesario es este archivo.
export async function leerPesoBascula(): Promise<ResultadoLecturaBascula> {
  return {
    ok: false,
    error: 'No hay báscula conectada todavía — captura el peso manualmente.'
  }
}
