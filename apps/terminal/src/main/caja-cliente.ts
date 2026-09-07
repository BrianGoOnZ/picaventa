import type {
  ConfigLocal,
  DatosMovimientoCaja,
  ResultadoCorteCaja,
  ResultadoMovimientoCaja,
  ResultadoReporteVentas
} from '@picaventa/shared'
import {
  obtenerUrlBase,
  obtenerToken,
  guardarFondoInicial,
  obtenerFondoInicial
} from './sesion'
import { solicitarJson, opcionesJson } from './http-cliente'

export function registrarMovimientoCaja(
  config: ConfigLocal,
  datos: DatosMovimientoCaja
): Promise<ResultadoMovimientoCaja> {
  const token = obtenerToken()
  if (!token) return Promise.resolve({ ok: false, error: 'No hay sesión activa' })
  return solicitarJson(
    `${obtenerUrlBase(config)}/caja/movimientos`,
    opcionesJson('POST', datos, token)
  )
}

export async function cerrarTurno(
  config: ConfigLocal,
  totalContadoSistema: number
): Promise<ResultadoCorteCaja> {
  const token = obtenerToken()
  if (!token) return { ok: false, error: 'No hay sesión activa' }

  const fondoInicial = obtenerFondoInicial()
  if (fondoInicial === null) {
    return { ok: false, error: 'No se registró el fondo inicial de este turno' }
  }

  return solicitarJson(
    `${obtenerUrlBase(config)}/caja/cerrar-turno`,
    opcionesJson('POST', { fondoInicial, totalContadoSistema }, token)
  )
}

export function obtenerReporteVentas(
  config: ConfigLocal,
  desde?: string,
  hasta?: string
): Promise<ResultadoReporteVentas> {
  const token = obtenerToken()
  if (!token) return Promise.resolve({ ok: false, error: 'No hay sesión activa' })

  const parametros = new URLSearchParams()
  if (desde) parametros.set('desde', desde)
  if (hasta) parametros.set('hasta', hasta)
  const query = parametros.toString()

  return solicitarJson(`${obtenerUrlBase(config)}/caja/reportes/ventas${query ? `?${query}` : ''}`, {
    headers: { Authorization: `Bearer ${token}` }
  })
}

export function establecerFondoInicialTurno(monto: number): void {
  guardarFondoInicial(monto)
}
