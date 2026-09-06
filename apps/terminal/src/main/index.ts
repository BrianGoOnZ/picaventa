import { app, BrowserWindow } from 'electron'
import { join } from 'node:path'
import { registrarManejadoresIpc } from './ipc'
import { detenerServidorEmbebido } from './servidor-embebido'

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
