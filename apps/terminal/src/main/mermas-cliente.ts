import type {
  ConfigLocal,
  DatosMerma,
  ResultadoHistorialMermas,
  ResultadoRegistrarMerma
} from '@picaventa/shared'
import { obtenerUrlBase, obtenerToken } from './sesion'
import { solicitarJson, opcionesJson } from './http-cliente'

export function registrarMerma(
  config: ConfigLocal,
  idProducto: number,
  datos: DatosMerma
): Promise<ResultadoRegistrarMerma> {
  const token = obtenerToken()
  if (!token) return Promise.resolve({ ok: false, error: 'No hay sesión activa' })
  return solicitarJson(
    `${obtenerUrlBase(config)}/productos/${idProducto}/merma`,
    opcionesJson('POST', datos, token)
  )
}

export function obtenerHistorialMermas(config: ConfigLocal): Promise<ResultadoHistorialMermas> {
  const token = obtenerToken()
  if (!token) return Promise.resolve({ ok: false, error: 'No hay sesión activa' })
  return solicitarJson(`${obtenerUrlBase(config)}/productos/mermas/historial`, {
    headers: { Authorization: `Bearer ${token}` }
  })
}
