import { app, ipcMain } from 'electron'
import { networkInterfaces } from 'node:os'
import { randomBytes } from 'node:crypto'
import { join } from 'node:path'
import {
  CANALES_IPC,
  PUERTO_SERVIDOR_DEFECTO,
  probarConexionServidorRemoto,
  type ConfigLocal,
  type CredencialesLogin,
  type DatosAbono,
  type DatosActualizarPermisos,
  type DatosCategoria,
  type DatosCancelarVenta,
  type DatosCliente,
  type DatosCompra,
  type DatosCrearUsuario,
  type DatosConfigurarServidor,
  type DatosCrearVenta,
  type DatosDevolucion,
  type DatosEntradaInventario,
  type DatosMerma,
  type DatosMovimientoCaja,
  type DatosNegocio,
  type DatosNuevoUsuario,
  type DatosProducto,
  type DatosPromocion,
  type DatosProveedor,
  type FiltrosProductos,
  type FiltrosVentas,
  type ResultadoActualizarPermisos,
  type ResultadoAuth,
  type ResultadoCancelarVenta,
  type ResultadoCategoria,
  type ResultadoCliente,
  type ResultadoCompraDetallada,
  type ResultadoConexion,
  type ResultadoCorteCaja,
  type ResultadoCrearCompra,
  type ResultadoCrearUsuario,
  type ResultadoCrearVenta,
  type ResultadoDevolucion,
  type ResultadoEstadoRespaldo,
  type ResultadoGuardarNegocio,
  type ResultadoHistorialEntradas,
  type ResultadoHistorialMermas,
  type ResultadoHistorialPrecios,
  type ResultadoListaCategorias,
  type ResultadoListaClientes,
  type ResultadoListaCompras,
  type ResultadoListaDevoluciones,
  type ResultadoListaProductos,
  type ResultadoListaProveedores,
  type ResultadoListaPromociones,
  type ResultadoListaUsuarios,
  type ResultadoListaVentas,
  type ResultadoMovimientoCaja,
  type ResultadoListaCortes,
  type ResultadoObtenerNegocio,
  type ResultadoLecturaBascula,
  type ResultadoOperacion,
  type ResultadoProducto,
  type ResultadoPromocion,
  type ResultadoPromocionesActivas,
  type ResultadoProveedor,
  type ResultadoReautenticacion,
  type ResultadoRegistrarMerma,
  type ResultadoRespaldoManual,
  type ResultadoReporteVentas,
  type ResultadoVentaDetallada,
  type ResultadoVentasPorCajero,
  type ResultadoVentasPorDia,
  type RespuestaEstadoAuth,
  type SesionUsuario
} from '@picaventa/shared'
import { probarConexionPostgres, aplicarMigraciones, aprovisionarBaseDatos } from '@picaventa/db'
import { obtenerConfig, guardarConfig, borrarConfig } from './config-store'
import { arrancarServidorEmbebido } from './servidor-embebido'
import {
  listarProveedores,
  crearProveedor,
  editarProveedor,
  eliminarProveedor,
  crearCompra,
  listarCompras,
  obtenerCompra
} from './proveedores-cliente'
import { registrarMerma, obtenerHistorialMermas } from './mermas-cliente'
import {
  listarPromociones,
  listarPromocionesActivas,
  crearPromocion,
  editarPromocion,
  eliminarPromocion
} from './promociones-cliente'
import {
  obtenerEstadoInicial,
  crearPrimerUsuario,
  login,
  reautenticar,
  cerrarSesionRemota,
  listarUsuarios,
  crearUsuario,
  actualizarPermisosUsuario
} from './auth-cliente'
import { obtenerNegocio, guardarNegocio, obtenerEstadoRespaldo, respaldarAhora } from './negocio-cliente'
import {
  listarCategorias,
  crearCategoria,
  editarCategoria,
  eliminarCategoria,
  listarProductos,
  crearProducto,
  editarProducto,
  eliminarProducto,
  registrarEntradaInventario,
  obtenerHistorialEntradas,
  obtenerHistorialPrecios
} from './catalogo-cliente'
import {
  crearVenta,
  listarVentas,
  obtenerVenta,
  cancelarVentaPausada,
  cancelarVentaActiva,
  registrarDevolucion,
  listarDevoluciones
} from './ventas-cliente'
import {
  listarClientes,
  crearCliente,
  editarCliente,
  eliminarCliente,
  registrarAbono
} from './clientes-cliente'
import {
  registrarMovimientoCaja,
  cerrarTurno,
  obtenerReporteVentas,
  establecerFondoInicialTurno,
  obtenerVentasPorDia,
  obtenerVentasPorCajero,
  listarCortes
} from './caja-cliente'
import { obtenerSesion } from './sesion'
import { leerPesoBascula } from './bascula'

// aplicarMigraciones no puede ubicar packages/db/migrations por sí solo una
// vez empaquetado por electron-vite (import.meta.url apunta al bundle, no al
// código fuente). app.getAppPath() sí sobrevive al empaquetado.
// TODO: en un build empaquetado (electron-builder) esta ruta relativa al
// monorepo ya no existirá — hay que copiar migrations/ como recurso del
// instalador y leer desde process.resourcesPath en ese caso.
function obtenerCarpetaMigraciones(): string {
  return join(app.getAppPath(), '../../packages/db/migrations')
}

function obtenerIpLocal(): string | null {
  const interfaces = networkInterfaces()
  for (const nombre of Object.keys(interfaces)) {
    for (const iface of interfaces[nombre] ?? []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address
      }
    }
  }
  return null
}

export function registrarManejadoresIpc(): void {
  ipcMain.handle(CANALES_IPC.obtenerConfig, (): ConfigLocal | null => obtenerConfig())

  ipcMain.handle(CANALES_IPC.borrarConfig, (): void => borrarConfig())

  ipcMain.handle(CANALES_IPC.obtenerIpLocal, (): string | null => obtenerIpLocal())

  ipcMain.handle(
    CANALES_IPC.verificarServidor,
    (_evento, host: string, puerto: number): Promise<ResultadoConexion> =>
      probarConexionServidorRemoto(host, puerto)
  )

  ipcMain.handle(
    CANALES_IPC.configurarServidor,
    async (_evento, datos: DatosConfigurarServidor): Promise<ResultadoConexion> => {
      const { host, puerto, passwordSuperusuario } = datos
      // Conexión transitoria como superusuario, solo para crear/actualizar el
      // rol y la base de datos dedicados — nunca se guarda esta contraseña.
      const urlSuperusuario = `postgresql://postgres:${encodeURIComponent(
        passwordSuperusuario
      )}@${host}:${puerto}/postgres`

      const passwordRol = randomBytes(24).toString('hex')

      try {
        await aprovisionarBaseDatos(urlSuperusuario, passwordRol)
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) }
      }

      const postgresUrl = `postgresql://picaventa:${passwordRol}@${host}:${puerto}/picaventa`

      const prueba = await probarConexionPostgres(postgresUrl)
      if (!prueba.ok) return prueba

      const jwtSecret = randomBytes(32).toString('hex')

      try {
        await aplicarMigraciones(postgresUrl, obtenerCarpetaMigraciones())
        await arrancarServidorEmbebido(postgresUrl, jwtSecret, PUERTO_SERVIDOR_DEFECTO)
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) }
      }

      guardarConfig({
        modo: 'servidor',
        postgresUrl,
        jwtSecret,
        puerto: PUERTO_SERVIDOR_DEFECTO
      })
      return { ok: true }
    }
  )

  ipcMain.handle(
    CANALES_IPC.configurarTerminal,
    async (_evento, host: string, puerto: number): Promise<ResultadoConexion> => {
      const resultado = await probarConexionServidorRemoto(host, puerto)
      if (!resultado.ok) return resultado

      guardarConfig({ modo: 'terminal', serverHost: host, serverPort: puerto })
      return { ok: true }
    }
  )

  ipcMain.handle(
    CANALES_IPC.iniciarServidorDesdeConfig,
    async (): Promise<ResultadoConexion> => {
      const config = obtenerConfig()
      if (!config || config.modo !== 'servidor') {
        return { ok: false, error: 'No hay una configuración de servidor guardada' }
      }

      const prueba = await probarConexionPostgres(config.postgresUrl)
      if (!prueba.ok) return prueba

      try {
        await arrancarServidorEmbebido(config.postgresUrl, config.jwtSecret, config.puerto)
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) }
      }
      return { ok: true }
    }
  )

  ipcMain.handle(CANALES_IPC.authEstadoInicial, (): Promise<RespuestaEstadoAuth> => {
    const config = obtenerConfig()
    if (!config) return Promise.resolve({ hayUsuarios: false })
    return obtenerEstadoInicial(config)
  })

  ipcMain.handle(
    CANALES_IPC.authCrearPrimerUsuario,
    (_evento, datos: DatosNuevoUsuario): Promise<ResultadoAuth> => {
      const config = obtenerConfig()
      if (!config) return Promise.resolve({ ok: false, error: 'No hay configuración guardada' })
      return crearPrimerUsuario(config, datos)
    }
  )

  ipcMain.handle(
    CANALES_IPC.authLogin,
    (_evento, credenciales: CredencialesLogin): Promise<ResultadoAuth> => {
      const config = obtenerConfig()
      if (!config) return Promise.resolve({ ok: false, error: 'No hay configuración guardada' })
      return login(config, credenciales)
    }
  )

  ipcMain.handle(CANALES_IPC.authCerrarSesion, (): void => cerrarSesionRemota())

  ipcMain.handle(CANALES_IPC.authSesionActual, (): SesionUsuario | null => obtenerSesion())

  ipcMain.handle(
    CANALES_IPC.authReautenticar,
    (_evento, pin: string): Promise<ResultadoReautenticacion> => {
      const config = obtenerConfig()
      if (!config) return Promise.resolve({ ok: false, error: 'No hay configuración guardada' })
      return reautenticar(config, pin)
    }
  )

  ipcMain.handle(CANALES_IPC.authListarUsuarios, (): Promise<ResultadoListaUsuarios> => {
    const config = obtenerConfig()
    if (!config) return Promise.resolve({ ok: false, error: 'No hay configuración guardada' })
    return listarUsuarios(config)
  })

  ipcMain.handle(
    CANALES_IPC.authCrearUsuario,
    (_evento, datos: DatosCrearUsuario): Promise<ResultadoCrearUsuario> => {
      const config = obtenerConfig()
      if (!config) return Promise.resolve({ ok: false, error: 'No hay configuración guardada' })
      return crearUsuario(config, datos)
    }
  )

  ipcMain.handle(
    CANALES_IPC.authActualizarPermisos,
    (_evento, id: number, datos: DatosActualizarPermisos): Promise<ResultadoActualizarPermisos> => {
      const config = obtenerConfig()
      if (!config) return Promise.resolve({ ok: false, error: 'No hay configuración guardada' })
      return actualizarPermisosUsuario(config, id, datos)
    }
  )

  ipcMain.handle(CANALES_IPC.negocioObtener, (): Promise<ResultadoObtenerNegocio> => {
    const config = obtenerConfig()
    if (!config) return Promise.resolve({ ok: false, error: 'No hay configuración guardada' })
    return obtenerNegocio(config)
  })

  ipcMain.handle(
    CANALES_IPC.negocioGuardar,
    (_evento, datos: DatosNegocio): Promise<ResultadoGuardarNegocio> => {
      const config = obtenerConfig()
      if (!config) return Promise.resolve({ ok: false, error: 'No hay configuración guardada' })
      return guardarNegocio(config, datos)
    }
  )

  ipcMain.handle(CANALES_IPC.negocioEstadoRespaldo, (): Promise<ResultadoEstadoRespaldo> => {
    const config = obtenerConfig()
    if (!config) return Promise.resolve({ ok: false, error: 'No hay configuración guardada' })
    return obtenerEstadoRespaldo(config)
  })

  ipcMain.handle(CANALES_IPC.negocioRespaldarAhora, (): Promise<ResultadoRespaldoManual> => {
    const config = obtenerConfig()
    if (!config) return Promise.resolve({ ok: false, error: 'No hay configuración guardada' })
    return respaldarAhora(config)
  })

  ipcMain.handle(CANALES_IPC.catalogoListarCategorias, (): Promise<ResultadoListaCategorias> => {
    const config = obtenerConfig()
    if (!config) return Promise.resolve({ ok: false, error: 'No hay configuración guardada' })
    return listarCategorias(config)
  })

  ipcMain.handle(
    CANALES_IPC.catalogoCrearCategoria,
    (_evento, datos: DatosCategoria): Promise<ResultadoCategoria> => {
      const config = obtenerConfig()
      if (!config) return Promise.resolve({ ok: false, error: 'No hay configuración guardada' })
      return crearCategoria(config, datos)
    }
  )

  ipcMain.handle(
    CANALES_IPC.catalogoEditarCategoria,
    (_evento, id: number, datos: DatosCategoria): Promise<ResultadoCategoria> => {
      const config = obtenerConfig()
      if (!config) return Promise.resolve({ ok: false, error: 'No hay configuración guardada' })
      return editarCategoria(config, id, datos)
    }
  )

  ipcMain.handle(
    CANALES_IPC.catalogoEliminarCategoria,
    (_evento, id: number): Promise<ResultadoOperacion> => {
      const config = obtenerConfig()
      if (!config) return Promise.resolve({ ok: false, error: 'No hay configuración guardada' })
      return eliminarCategoria(config, id)
    }
  )

  ipcMain.handle(
    CANALES_IPC.catalogoListarProductos,
    (_evento, filtros: FiltrosProductos): Promise<ResultadoListaProductos> => {
      const config = obtenerConfig()
      if (!config) return Promise.resolve({ ok: false, error: 'No hay configuración guardada' })
      return listarProductos(config, filtros)
    }
  )

  ipcMain.handle(
    CANALES_IPC.catalogoCrearProducto,
    (_evento, datos: DatosProducto): Promise<ResultadoProducto> => {
      const config = obtenerConfig()
      if (!config) return Promise.resolve({ ok: false, error: 'No hay configuración guardada' })
      return crearProducto(config, datos)
    }
  )

  ipcMain.handle(
    CANALES_IPC.catalogoEditarProducto,
    (_evento, id: number, datos: DatosProducto): Promise<ResultadoProducto> => {
      const config = obtenerConfig()
      if (!config) return Promise.resolve({ ok: false, error: 'No hay configuración guardada' })
      return editarProducto(config, id, datos)
    }
  )

  ipcMain.handle(
    CANALES_IPC.catalogoEliminarProducto,
    (_evento, id: number): Promise<ResultadoOperacion> => {
      const config = obtenerConfig()
      if (!config) return Promise.resolve({ ok: false, error: 'No hay configuración guardada' })
      return eliminarProducto(config, id)
    }
  )

  ipcMain.handle(
    CANALES_IPC.catalogoRegistrarEntrada,
    (_evento, id: number, datos: DatosEntradaInventario): Promise<ResultadoProducto> => {
      const config = obtenerConfig()
      if (!config) return Promise.resolve({ ok: false, error: 'No hay configuración guardada' })
      return registrarEntradaInventario(config, id, datos)
    }
  )

  ipcMain.handle(CANALES_IPC.catalogoHistorialEntradas, (): Promise<ResultadoHistorialEntradas> => {
    const config = obtenerConfig()
    if (!config) return Promise.resolve({ ok: false, error: 'No hay configuración guardada' })
    return obtenerHistorialEntradas(config)
  })

  ipcMain.handle(CANALES_IPC.catalogoHistorialPrecios, (): Promise<ResultadoHistorialPrecios> => {
    const config = obtenerConfig()
    if (!config) return Promise.resolve({ ok: false, error: 'No hay configuración guardada' })
    return obtenerHistorialPrecios(config)
  })

  ipcMain.handle(
    CANALES_IPC.ventasCrear,
    (_evento, datos: DatosCrearVenta): Promise<ResultadoCrearVenta> => {
      const config = obtenerConfig()
      if (!config) return Promise.resolve({ ok: false, error: 'No hay configuración guardada' })
      return crearVenta(config, datos)
    }
  )

  ipcMain.handle(
    CANALES_IPC.ventasListar,
    (_evento, filtros?: FiltrosVentas): Promise<ResultadoListaVentas> => {
      const config = obtenerConfig()
      if (!config) return Promise.resolve({ ok: false, error: 'No hay configuración guardada' })
      return listarVentas(config, filtros)
    }
  )

  ipcMain.handle(
    CANALES_IPC.ventasObtener,
    (_evento, id: number): Promise<ResultadoVentaDetallada> => {
      const config = obtenerConfig()
      if (!config) return Promise.resolve({ ok: false, error: 'No hay configuración guardada' })
      return obtenerVenta(config, id)
    }
  )

  ipcMain.handle(
    CANALES_IPC.ventasCancelarPausada,
    (_evento, id: number): Promise<ResultadoOperacion> => {
      const config = obtenerConfig()
      if (!config) return Promise.resolve({ ok: false, error: 'No hay configuración guardada' })
      return cancelarVentaPausada(config, id)
    }
  )

  ipcMain.handle(
    CANALES_IPC.ventasCancelarActiva,
    (_evento, id: number, datos: DatosCancelarVenta): Promise<ResultadoCancelarVenta> => {
      const config = obtenerConfig()
      if (!config) return Promise.resolve({ ok: false, error: 'No hay configuración guardada' })
      return cancelarVentaActiva(config, id, datos)
    }
  )

  ipcMain.handle(
    CANALES_IPC.ventasRegistrarDevolucion,
    (_evento, id: number, datos: DatosDevolucion): Promise<ResultadoDevolucion> => {
      const config = obtenerConfig()
      if (!config) return Promise.resolve({ ok: false, error: 'No hay configuración guardada' })
      return registrarDevolucion(config, id, datos)
    }
  )

  ipcMain.handle(
    CANALES_IPC.ventasListarDevoluciones,
    (_evento, id: number): Promise<ResultadoListaDevoluciones> => {
      const config = obtenerConfig()
      if (!config) return Promise.resolve({ ok: false, error: 'No hay configuración guardada' })
      return listarDevoluciones(config, id)
    }
  )

  ipcMain.handle(CANALES_IPC.clientesListar, (): Promise<ResultadoListaClientes> => {
    const config = obtenerConfig()
    if (!config) return Promise.resolve({ ok: false, error: 'No hay configuración guardada' })
    return listarClientes(config)
  })

  ipcMain.handle(
    CANALES_IPC.clientesCrear,
    (_evento, datos: DatosCliente): Promise<ResultadoCliente> => {
      const config = obtenerConfig()
      if (!config) return Promise.resolve({ ok: false, error: 'No hay configuración guardada' })
      return crearCliente(config, datos)
    }
  )

  ipcMain.handle(
    CANALES_IPC.clientesEditar,
    (_evento, id: number, datos: DatosCliente): Promise<ResultadoCliente> => {
      const config = obtenerConfig()
      if (!config) return Promise.resolve({ ok: false, error: 'No hay configuración guardada' })
      return editarCliente(config, id, datos)
    }
  )

  ipcMain.handle(
    CANALES_IPC.clientesEliminar,
    (_evento, id: number): Promise<ResultadoOperacion> => {
      const config = obtenerConfig()
      if (!config) return Promise.resolve({ ok: false, error: 'No hay configuración guardada' })
      return eliminarCliente(config, id)
    }
  )

  ipcMain.handle(
    CANALES_IPC.clientesRegistrarAbono,
    (_evento, id: number, datos: DatosAbono): Promise<ResultadoCliente> => {
      const config = obtenerConfig()
      if (!config) return Promise.resolve({ ok: false, error: 'No hay configuración guardada' })
      return registrarAbono(config, id, datos)
    }
  )

  ipcMain.handle(CANALES_IPC.cajaEstablecerFondoInicial, (_evento, monto: number): void => {
    establecerFondoInicialTurno(monto)
  })

  ipcMain.handle(
    CANALES_IPC.cajaRegistrarMovimiento,
    (_evento, datos: DatosMovimientoCaja): Promise<ResultadoMovimientoCaja> => {
      const config = obtenerConfig()
      if (!config) return Promise.resolve({ ok: false, error: 'No hay configuración guardada' })
      return registrarMovimientoCaja(config, datos)
    }
  )

  ipcMain.handle(
    CANALES_IPC.cajaCerrarTurno,
    (_evento, totalContadoSistema: number): Promise<ResultadoCorteCaja> => {
      const config = obtenerConfig()
      if (!config) return Promise.resolve({ ok: false, error: 'No hay configuración guardada' })
      return cerrarTurno(config, totalContadoSistema)
    }
  )

  ipcMain.handle(
    CANALES_IPC.cajaReporteVentas,
    (_evento, desde?: string, hasta?: string): Promise<ResultadoReporteVentas> => {
      const config = obtenerConfig()
      if (!config) return Promise.resolve({ ok: false, error: 'No hay configuración guardada' })
      return obtenerReporteVentas(config, desde, hasta)
    }
  )

  ipcMain.handle(
    CANALES_IPC.cajaVentasPorDia,
    (_evento, dias: number): Promise<ResultadoVentasPorDia> => {
      const config = obtenerConfig()
      if (!config) return Promise.resolve({ ok: false, error: 'No hay configuración guardada' })
      return obtenerVentasPorDia(config, dias)
    }
  )

  ipcMain.handle(
    CANALES_IPC.cajaVentasPorCajero,
    (_evento, desde?: string, hasta?: string): Promise<ResultadoVentasPorCajero> => {
      const config = obtenerConfig()
      if (!config) return Promise.resolve({ ok: false, error: 'No hay configuración guardada' })
      return obtenerVentasPorCajero(config, desde, hasta)
    }
  )

  ipcMain.handle(
    CANALES_IPC.cajaListarCortes,
    (_evento, limite: number): Promise<ResultadoListaCortes> => {
      const config = obtenerConfig()
      if (!config) return Promise.resolve({ ok: false, error: 'No hay configuración guardada' })
      return listarCortes(config, limite)
    }
  )

  ipcMain.handle(CANALES_IPC.proveedoresListar, (): Promise<ResultadoListaProveedores> => {
    const config = obtenerConfig()
    if (!config) return Promise.resolve({ ok: false, error: 'No hay configuración guardada' })
    return listarProveedores(config)
  })

  ipcMain.handle(
    CANALES_IPC.proveedoresCrear,
    (_evento, datos: DatosProveedor): Promise<ResultadoProveedor> => {
      const config = obtenerConfig()
      if (!config) return Promise.resolve({ ok: false, error: 'No hay configuración guardada' })
      return crearProveedor(config, datos)
    }
  )

  ipcMain.handle(
    CANALES_IPC.proveedoresEditar,
    (_evento, id: number, datos: DatosProveedor): Promise<ResultadoProveedor> => {
      const config = obtenerConfig()
      if (!config) return Promise.resolve({ ok: false, error: 'No hay configuración guardada' })
      return editarProveedor(config, id, datos)
    }
  )

  ipcMain.handle(
    CANALES_IPC.proveedoresEliminar,
    (_evento, id: number): Promise<ResultadoOperacion> => {
      const config = obtenerConfig()
      if (!config) return Promise.resolve({ ok: false, error: 'No hay configuración guardada' })
      return eliminarProveedor(config, id)
    }
  )

  ipcMain.handle(
    CANALES_IPC.comprasCrear,
    (_evento, datos: DatosCompra): Promise<ResultadoCrearCompra> => {
      const config = obtenerConfig()
      if (!config) return Promise.resolve({ ok: false, error: 'No hay configuración guardada' })
      return crearCompra(config, datos)
    }
  )

  ipcMain.handle(CANALES_IPC.comprasListar, (): Promise<ResultadoListaCompras> => {
    const config = obtenerConfig()
    if (!config) return Promise.resolve({ ok: false, error: 'No hay configuración guardada' })
    return listarCompras(config)
  })

  ipcMain.handle(
    CANALES_IPC.comprasObtener,
    (_evento, id: number): Promise<ResultadoCompraDetallada> => {
      const config = obtenerConfig()
      if (!config) return Promise.resolve({ ok: false, error: 'No hay configuración guardada' })
      return obtenerCompra(config, id)
    }
  )

  ipcMain.handle(
    CANALES_IPC.mermasRegistrar,
    (_evento, idProducto: number, datos: DatosMerma): Promise<ResultadoRegistrarMerma> => {
      const config = obtenerConfig()
      if (!config) return Promise.resolve({ ok: false, error: 'No hay configuración guardada' })
      return registrarMerma(config, idProducto, datos)
    }
  )

  ipcMain.handle(CANALES_IPC.mermasHistorial, (): Promise<ResultadoHistorialMermas> => {
    const config = obtenerConfig()
    if (!config) return Promise.resolve({ ok: false, error: 'No hay configuración guardada' })
    return obtenerHistorialMermas(config)
  })

  ipcMain.handle(CANALES_IPC.promocionesListar, (): Promise<ResultadoListaPromociones> => {
    const config = obtenerConfig()
    if (!config) return Promise.resolve({ ok: false, error: 'No hay configuración guardada' })
    return listarPromociones(config)
  })

  ipcMain.handle(CANALES_IPC.promocionesListarActivas, (): Promise<ResultadoPromocionesActivas> => {
    const config = obtenerConfig()
    if (!config) return Promise.resolve({ ok: false, error: 'No hay configuración guardada' })
    return listarPromocionesActivas(config)
  })

  ipcMain.handle(
    CANALES_IPC.promocionesCrear,
    (_evento, datos: DatosPromocion): Promise<ResultadoPromocion> => {
      const config = obtenerConfig()
      if (!config) return Promise.resolve({ ok: false, error: 'No hay configuración guardada' })
      return crearPromocion(config, datos)
    }
  )

  ipcMain.handle(
    CANALES_IPC.promocionesEditar,
    (_evento, id: number, datos: DatosPromocion): Promise<ResultadoPromocion> => {
      const config = obtenerConfig()
      if (!config) return Promise.resolve({ ok: false, error: 'No hay configuración guardada' })
      return editarPromocion(config, id, datos)
    }
  )

  ipcMain.handle(
    CANALES_IPC.promocionesEliminar,
    (_evento, id: number): Promise<ResultadoOperacion> => {
      const config = obtenerConfig()
      if (!config) return Promise.resolve({ ok: false, error: 'No hay configuración guardada' })
      return eliminarPromocion(config, id)
    }
  )

  ipcMain.handle(CANALES_IPC.basculaLeerPeso, (): Promise<ResultadoLecturaBascula> => leerPesoBascula())
}
