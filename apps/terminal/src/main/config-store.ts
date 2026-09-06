import Store from 'electron-store'
import { configLocalSchema, type ConfigLocal } from '@picaventa/shared'

interface DatosAlmacen {
  config?: ConfigLocal
}

const store = new Store<DatosAlmacen>({ name: 'picaventa-config' })

export function obtenerConfig(): ConfigLocal | null {
  const guardado = store.get('config')
  if (!guardado) return null

  const resultado = configLocalSchema.safeParse(guardado)
  return resultado.success ? resultado.data : null
}

export function guardarConfig(config: ConfigLocal): void {
  store.set('config', config)
}

export function borrarConfig(): void {
  store.delete('config')
}
