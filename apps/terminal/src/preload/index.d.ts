import type { PicaventaApi } from './index'

declare global {
  interface Window {
    picaventa: PicaventaApi
  }
}
