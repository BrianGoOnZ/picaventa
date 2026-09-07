import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import fs from 'node:fs/promises'
import { existsSync, readdirSync } from 'node:fs'
import path from 'node:path'
import cron from 'node-cron'
import { Router, type Request } from 'express'
import { type EstadoRespaldo } from '@picaventa/shared'
import { verificarJwt, requiereAdministrador } from './auth.js'

const execFileAsync = promisify(execFile)

const NOMBRE_MANIFIESTO = 'estado-respaldo.json'
const DIAS_RETENCION = 30
const HORA_RESPALDO_DIARIO = '0 3 * * *' // 3:00 a.m., hora local del servidor

// pg_dump siempre vive junto al Postgres que ya se instaló para correr este
// mismo servidor (RF de aprovisionamiento) — se busca ahí en vez de asumir
// que está en el PATH, ya que el instalador oficial de Windows no lo agrega
// automáticamente.
export function localizarPgDump(): string | null {
  if (process.platform !== 'win32') return 'pg_dump'

  const baseInstalacion = 'C:\\Program Files\\PostgreSQL'
  try {
    const versiones = readdirSync(baseInstalacion)
      .filter((nombre) => /^\d+$/.test(nombre))
      .sort((a, b) => Number(b) - Number(a))

    for (const version of versiones) {
      const candidato = path.join(baseInstalacion, version, 'bin', 'pg_dump.exe')
      if (existsSync(candidato)) return candidato
    }
  } catch {
    // La carpeta de instalación no existe con ese nombre — se reporta como
    // no encontrado, no se lanza un error.
  }
  return null
}

async function leerManifiesto(carpeta: string): Promise<EstadoRespaldo | null> {
  try {
    const contenido = await fs.readFile(path.join(carpeta, NOMBRE_MANIFIESTO), 'utf8')
    return JSON.parse(contenido) as EstadoRespaldo
  } catch {
    return null
  }
}

async function escribirManifiesto(carpeta: string, estado: EstadoRespaldo): Promise<void> {
  await fs.writeFile(path.join(carpeta, NOMBRE_MANIFIESTO), JSON.stringify(estado, null, 2), 'utf8')
}

async function limpiarRespaldosViejos(carpeta: string): Promise<void> {
  const limiteMs = DIAS_RETENCION * 24 * 60 * 60 * 1000
  const ahora = Date.now()

  const archivos = await fs.readdir(carpeta)
  for (const nombre of archivos) {
    if (!nombre.endsWith('.dump')) continue
    const rutaCompleta = path.join(carpeta, nombre)
    const info = await fs.stat(rutaCompleta)
    if (ahora - info.mtimeMs > limiteMs) {
      await fs.unlink(rutaCompleta)
    }
  }
}

export async function generarRespaldo(
  postgresUrl: string,
  carpetaDestino: string
): Promise<EstadoRespaldo> {
  await fs.mkdir(carpetaDestino, { recursive: true })

  const rutaPgDump = localizarPgDump()
  if (!rutaPgDump) {
    const estado: EstadoRespaldo = {
      fecha: new Date().toISOString(),
      ok: false,
      error:
        'No se encontró pg_dump. Se esperaba en C:\\Program Files\\PostgreSQL\\<versión>\\bin — verifica la instalación de Postgres.'
    }
    await escribirManifiesto(carpetaDestino, estado)
    return estado
  }

  const marcaTiempo = new Date().toISOString().replace(/[:.]/g, '-')
  const nombreArchivo = `respaldo-${marcaTiempo}.dump`
  const rutaArchivo = path.join(carpetaDestino, nombreArchivo)

  try {
    // Formato "custom" (-F c): comprimido y restaurable con pg_restore,
    // a diferencia de un volcado de texto plano.
    await execFileAsync(rutaPgDump, [postgresUrl, '-F', 'c', '-f', rutaArchivo])
    await limpiarRespaldosViejos(carpetaDestino)

    const estado: EstadoRespaldo = { fecha: new Date().toISOString(), ok: true, archivo: nombreArchivo }
    await escribirManifiesto(carpetaDestino, estado)
    return estado
  } catch (err) {
    const estado: EstadoRespaldo = {
      fecha: new Date().toISOString(),
      ok: false,
      error: err instanceof Error ? err.message : String(err)
    }
    await escribirManifiesto(carpetaDestino, estado)
    return estado
  }
}

export interface ProgramadorRespaldo {
  detener: () => void
  respaldarAhora: () => Promise<EstadoRespaldo>
  obtenerUltimoEstado: () => Promise<EstadoRespaldo | null>
}

// Solo corre en la instancia "servidor" (la única con la base de datos
// completa) — ver 03-Arquitectura-general.md, fila 11.
export function programarRespaldoDiario(
  postgresUrl: string,
  carpetaDestino: string
): ProgramadorRespaldo {
  const tarea = cron.schedule(HORA_RESPALDO_DIARIO, () => {
    void generarRespaldo(postgresUrl, carpetaDestino)
  })

  return {
    detener: () => tarea.stop(),
    respaldarAhora: () => generarRespaldo(postgresUrl, carpetaDestino),
    obtenerUltimoEstado: () => leerManifiesto(carpetaDestino)
  }
}

function obtenerProgramador(req: Request): ProgramadorRespaldo | null {
  return (req.app.locals.programadorRespaldo as ProgramadorRespaldo | undefined) ?? null
}

export function crearRutasRespaldo(): Router {
  const router = Router()

  router.get('/', verificarJwt, requiereAdministrador, async (req, res) => {
    const programador = obtenerProgramador(req)
    if (!programador) {
      res.json({ ok: true, disponible: false, ultimoEstado: null })
      return
    }
    const ultimoEstado = await programador.obtenerUltimoEstado()
    res.json({ ok: true, disponible: true, ultimoEstado })
  })

  router.post('/ahora', verificarJwt, requiereAdministrador, async (req, res) => {
    const programador = obtenerProgramador(req)
    if (!programador) {
      res.status(409).json({
        ok: false,
        error: 'El respaldo automático solo está disponible en la instancia de Servidor'
      })
      return
    }
    const estado = await programador.respaldarAhora()
    res.json({ ok: true, estado })
  })

  return router
}
