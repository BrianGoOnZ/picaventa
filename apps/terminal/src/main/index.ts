import { app, BrowserWindow, Menu } from 'electron'
import { join } from 'node:path'
import { registrarManejadoresIpc } from './ipc'
import { detenerServidorEmbebido } from './servidor-embebido'

// Sin menú nativo: en Windows, la tecla Alt sola abre el menú de la
// aplicación por defecto (File/Edit/View...), lo que interfiere con los
// atajos de teclado de Punto de Venta (Alt+1/2/3). También evita que un
// cajero recargue la app o abra DevTools sin querer a media venta.
Menu.setApplicationMenu(null)

function crearVentana(): void {
  const ventana = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      // El preload usa @picaventa/shared (que depende de zod); el sandbox por
      // defecto de Electron no permite requerir paquetes npm arbitrarios ahí.
      // contextIsolation (activo por defecto) sigue protegiendo al renderer.
      sandbox: false
    }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    ventana.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    ventana.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  registrarManejadoresIpc()
  crearVentana()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', async (evento) => {
  evento.preventDefault()
  await detenerServidorEmbebido()
  app.exit()
})
