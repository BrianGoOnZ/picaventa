import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import fs from 'node:fs/promises'
import { existsSync, readdirSync } from 'node:fs'
import path from 'node:path'
import cron from 'node-cron'
import postgres from 'postgres'
import bcrypt from 'bcrypt'
import { eq } from 'drizzle-orm'
import { Router, type Request } from 'express'
import { usuarios, type crearConexion } from '@picaventa/db'
import {
  datosRestaurarRespaldoSchema,
  type EstadoRespaldo,
  type InfoRespaldo,
  type PayloadJwt,
  type ResultadoRestaurarRespaldo
} from '@picaventa/shared'
import { verificarJwt, requiereAdministrador } from './auth.js'

const execFileAsync = promisify(execFile)

const NOMBRE_MANIFIESTO = 'estado-respaldo.json'
const DIAS_RETENCION = 30
const HORA_RESPALDO_DIARIO = '0 3 * * *' // 3:00 a.m., hora local del servidor

type Db = ReturnType<typeof crearConexion>
// Ver la misma nota en auth.ts: se evita la augmentación global de Express.Request.
type RequestAutenticado = Request & { usuarioToken?: PayloadJwt }

// pg_dump y pg_restore siempre viven junto al Postgres que ya se instaló
// para correr este mismo servidor (RF de aprovisionamiento) — se buscan ahí
// en vez de asumir que están en el PATH, ya que el instalador oficial de
// Windows no lo agrega automáticamente.
function localizarBinarioPostgres(nombreBase: string): string | null {
  if (process.platform !== 'win32') return nombreBase

  const baseInstalacion = 'C:\\Program Files\\PostgreSQL'
  try {
    const versiones = readdirSync(baseInstalacion)
      .filter((nombre) => /^\d+$/.test(nombre))
      .sort((a, b) => Number(b) - Number(a))

    for (const version of versiones) {
      const candidato = path.join(baseInstalacion, version, 'bin', `${nombreBase}.exe`)
      if (existsSync(candidato)) return candidato
    }
  } catch {
    // La carpeta de instalación no existe con ese nombre — se reporta como
    // no encontrado, no se lanza un error.
  }
  return null
}

export function localizarPgDump(): string | null {
  return localizarBinarioPostgres('pg_dump')
}

export function localizarPgRestore(): string | null {
  return localizarBinarioPostgres('pg_restore')
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

export async function listarRespaldos(carpeta: string): Promise<InfoRespaldo[]> {
  let nombres: string[]
  try {
    nombres = await fs.readdir(carpeta)
  } catch {
    return []
  }

  const respaldos: InfoRespaldo[] = []
  for (const nombre of nombres) {
    if (!nombre.endsWith('.dump')) continue
    const info = await fs.stat(path.join(carpeta, nombre))
    respaldos.push({ archivo: nombre, fecha: info.mtime.toISOString(), tamanoBytes: info.size })
  }

  respaldos.sort((a, b) => b.fecha.localeCompare(a.fecha))
  return respaldos
}

export async function restaurarRespaldo(
  postgresUrl: string,
  carpeta: string,
  archivo: string
): Promise<ResultadoRestaurarRespaldo> {
  // El nombre de archivo viene del cliente — nunca se usa como ruta directa,
  // solo como nombre de archivo dentro de la carpeta de respaldos ya
  // conocida por el servidor (evita salir de esa carpeta).
  if (archivo.includes('/') || archivo.includes('\\') || !archivo.endsWith('.dump')) {
    return { ok: false, error: 'Nombre de respaldo inválido' }
  }

  const rutaArchivo = path.join(carpeta, archivo)
  if (!existsSync(rutaArchivo)) {
    return { ok: false, error: 'No se encontró ese archivo de respaldo' }
  }

  const rutaPgRestore = localizarPgRestore()
  if (!rutaPgRestore) {
    return {
      ok: false,
      error:
        'No se encontró pg_restore. Se esperaba en C:\\Program Files\\PostgreSQL\\<versión>\\bin — verifica la instalación de Postgres.'
    }
  }

  // Corta cualquier otra conexión activa a la base (incluidas las del propio
  // servidor) antes de restaurar: pg_restore usa --clean para recrear cada
  // objeto desde cero, y eso choca con locks de conexiones que sigan abiertas.
  // El rol de la app solo puede terminar sus propias conexiones (sin ser
  // superusuario), que es exactamente lo que se necesita aquí.
  const sqlAdmin = postgres(postgresUrl, { max: 1, connect_timeout: 10 })
  try {
    await sqlAdmin`
      SELECT pg_terminate_backend(pid) FROM pg_stat_activity
      WHERE datname = current_database() AND pid <> pg_backend_pid()
    `
  } finally {
    await sqlAdmin.end()
  }

  try {
    await execFileAsync(rutaPgRestore, [
      '--clean',
      '--if-exists',
      '--no-owner',
      '-d',
      postgresUrl,
      rutaArchivo
    ])
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

export interface ProgramadorRespaldo {
  detener: () => void
  respaldarAhora: () => Promise<EstadoRespaldo>
  obtenerUltimoEstado: () => Promise<EstadoRespaldo | null>
  listar: () => Promise<InfoRespaldo[]>
  restaurar: (archivo: string) => Promise<ResultadoRestaurarRespaldo>
  // Cambia la carpeta de destino sin reiniciar el servidor (ni la tarea
  // programada) — el admin la elige desde Ajustes del negocio y el cambio
  // debe aplicar de inmediato, no hasta el próximo reinicio de la app.
  actualizarCarpeta: (carpeta: string) => void
}

const UN_DIA_MS = 24 * 60 * 60 * 1000

// Solo corre en la instancia "servidor" (la única con la base de datos
// completa) — ver 03-Arquitectura-general.md, fila 11.
export function programarRespaldoDiario(
  postgresUrl: string,
  carpetaInicial: string
): ProgramadorRespaldo {
  let carpetaDestino = carpetaInicial

  const tarea = cron.schedule(HORA_RESPALDO_DIARIO, () => {
    void generarRespaldo(postgresUrl, carpetaDestino)
  })

  // Si la PC estuvo apagada a las 3 a.m. (o la app cerrada), ese respaldo
  // diario se perdió — en vez de esperar hasta el día siguiente, se genera
  // uno en cuanto la app vuelve a arrancar, si el último tiene más de un día
  // (o nunca se ha generado ninguno).
  void (async () => {
    const ultimoEstado = await leerManifiesto(carpetaDestino)
    const antiguo = !ultimoEstado || Date.now() - new Date(ultimoEstado.fecha).getTime() > UN_DIA_MS
    if (antiguo) await generarRespaldo(postgresUrl, carpetaDestino)
  })()

  return {
    detener: () => tarea.stop(),
    respaldarAhora: () => generarRespaldo(postgresUrl, carpetaDestino),
    obtenerUltimoEstado: () => leerManifiesto(carpetaDestino),
    listar: () => listarRespaldos(carpetaDestino),
    restaurar: (archivo: string) => restaurarRespaldo(postgresUrl, carpetaDestino, archivo),
    actualizarCarpeta: (carpeta: string) => {
      carpetaDestino = carpeta
    }
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

  router.get('/listar', verificarJwt, requiereAdministrador, async (req, res) => {
    const programador = obtenerProgramador(req)
    if (!programador) {
      res.json({ ok: true, respaldos: [] })
      return
    }
    const respaldos = await programador.listar()
    res.json({ ok: true, respaldos })
  })

  // Restaurar reemplaza TODA la base de datos actual por la del respaldo
  // elegido — destructivo e irreversible, así que exige el PIN de quien lo
  // autoriza, igual que otras acciones críticas (ver /usuarios/:id/acceso).
  router.post('/restaurar', verificarJwt, requiereAdministrador, async (req, res) => {
    const programador = obtenerProgramador(req)
    if (!programador) {
      res.status(409).json({
        ok: false,
        error: 'La restauración solo está disponible en la instancia de Servidor'
      })
      return
    }

    const datos = datosRestaurarRespaldoSchema.safeParse(req.body)
    if (!datos.success) {
      res.status(400).json({ ok: false, error: datos.error.issues[0]?.message ?? 'Datos inválidos' })
      return
    }

    const payload = (req as RequestAutenticado).usuarioToken as PayloadJwt
    const db = req.app.locals.db as Db
    const [actor] = await db.select().from(usuarios).where(eq(usuarios.idUsuario, payload.idUsuario))
    if (!actor || !(await bcrypt.compare(datos.data.pin, actor.pinHash))) {
      res.status(401).json({ ok: false, error: 'PIN incorrecto' })
      return
    }

    const resultado = await programador.restaurar(datos.data.archivo)
    res.json(resultado)
  })

  return router
}
