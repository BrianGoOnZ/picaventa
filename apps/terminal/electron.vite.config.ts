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
    plugins: [externalizeDepsPlugin({ exclude: PAQUETES_INTERNOS })]
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
