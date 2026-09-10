import { app } from 'electron'
import { obtenerConfig } from './config-store'

// Solo la PC configurada como Servidor necesita abrirse sola: es la única
// que tiene la base de datos y el servidor embebido — si nadie la abre por
// la mañana, las demás cajas no pueden vender y no corre el respaldo diario
// (ver programarRespaldoDiario en @picaventa/servidor). Una Terminal/caja no
// tiene esa urgencia, así que no se le activa.
//
// Solo aplica en un build empaquetado: en desarrollo registraría el binario
// de Electron (con flags de dev) para abrirse solo al iniciar sesión, algo
// que nadie quiere en la máquina de quien programa.
export function sincronizarInicioAutomatico(): void {
  if (!app.isPackaged) return
  const config = obtenerConfig()
  app.setLoginItemSettings({ openAtLogin: config?.modo === 'servidor' })
}
