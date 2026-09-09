import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Paquetes propios del monorepo: no tienen build compilado (main/types apuntan
// a su .ts fuente), así que deben empaquetarse en vez de dejarse como
// dependencias externas de Node — de lo contrario Node no puede resolverlos
// en tiempo de ejecución.
const PAQUETES_INTERNOS = ['@picaventa/shared', '@picaventa/db', '@picaventa/servidor']

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin({ exclude: PAQUETES_INTERNOS })]
  },
  preload: {
    // El preload de Electron corre con sandbox:true (ver src/main/index.ts),
    // que restringe el require() en tiempo de ejecución a los módulos nativos
    // de Node/Electron — un paquete externo de node_modules (aquí, zod, vía
    // @picaventa/shared) no se resuelve ahí. Empaquetarlo (no excluirlo)
    // dentro de out/preload/index.js es lo que permite mantener el sandbox
    // activado sin perder la validación de @picaventa/shared en el preload.
    plugins: [externalizeDepsPlugin({ exclude: [...PAQUETES_INTERNOS, 'zod'] })]
  },
  renderer: {
    resolve: {
      alias: {
        '@': resolve('src/renderer/src')
      }
    },
    plugins: [react(), tailwindcss()]
  }
})
