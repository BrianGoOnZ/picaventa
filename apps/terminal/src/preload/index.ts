import { contextBridge, ipcRenderer } from 'electron'
import {
  CANALES_IPC,
  type ConfigLocal,
  type CredencialesLogin,
  type DatosAbono,
  type DatosCategoria,
  type DatosCliente,
  type DatosConfigurarServidor,
  type DatosCrearUsuario,
  type DatosCrearVenta,
  type DatosMovimientoCaja,
  type DatosNegocio,
  type DatosNuevoUsuario,
  type DatosProducto,
  type FiltrosProductos,
  type ResultadoAuth,
  type ResultadoCategoria,
  type ResultadoCliente,
  type ResultadoConexion,
  type ResultadoCorteCaja,
  type ResultadoCrearUsuario,
  type ResultadoCrearVenta,
  type ResultadoGuardarNegocio,
  type ResultadoListaCategorias,
  type ResultadoListaClientes,
  type ResultadoListaProductos,
  type ResultadoListaUsuarios,
  type ResultadoListaVentas,
  type ResultadoListaCortes,
  type ResultadoMovimientoCaja,
  type ResultadoObtenerNegocio,
  type ResultadoOperacion,
  type ResultadoProducto,
  type ResultadoReautenticacion,
  type ResultadoReporteVentas,
  type ResultadoVentaDetallada,
  type ResultadoVentasPorCajero,
  type ResultadoVentasPorDia,
  type RespuestaEstadoAuth,
  type SesionUsuario
} from '@picaventa/shared'

const api = {
  obtenerConfig: (): Promise<ConfigLocal | null> => ipcRenderer.invoke(CANALES_IPC.obtenerConfig),

  borrarConfig: (): Promise<void> => ipcRenderer.invoke(CANALES_IPC.borrarConfig),

  obtenerIpLocal: (): Promise<string | null> => ipcRenderer.invoke(CANALES_IPC.obtenerIpLocal),

  verificarServidor: (host: string, puerto: number): Promise<ResultadoConexion> =>
    ipcRenderer.invoke(CANALES_IPC.verificarServidor, host, puerto),

  configurarServidor: (datos: DatosConfigurarServidor): Promise<ResultadoConexion> =>
    ipcRenderer.invoke(CANALES_IPC.configurarServidor, datos),

  configurarTerminal: (host: string, puerto: number): Promise<ResultadoConexion> =>
    ipcRenderer.invoke(CANALES_IPC.configurarTerminal, host, puerto),

  iniciarServidorDesdeConfig: (): Promise<ResultadoConexion> =>
    ipcRenderer.invoke(CANALES_IPC.iniciarServidorDesdeConfig),

  obtenerEstadoInicialAuth: (): Promise<RespuestaEstadoAuth> =>
    ipcRenderer.invoke(CANALES_IPC.authEstadoInicial),

  crearPrimerUsuario: (datos: DatosNuevoUsuario): Promise<ResultadoAuth> =>
    ipcRenderer.invoke(CANALES_IPC.authCrearPrimerUsuario, datos),

  login: (credenciales: CredencialesLogin): Promise<ResultadoAuth> =>
    ipcRenderer.invoke(CANALES_IPC.authLogin, credenciales),

  cerrarSesion: (): Promise<void> => ipcRenderer.invoke(CANALES_IPC.authCerrarSesion),

  sesionActual: (): Promise<SesionUsuario | null> =>
    ipcRenderer.invoke(CANALES_IPC.authSesionActual),

  reautenticar: (pin: string): Promise<ResultadoReautenticacion> =>
    ipcRenderer.invoke(CANALES_IPC.authReautenticar, pin),

  listarUsuarios: (): Promise<ResultadoListaUsuarios> =>
    ipcRenderer.invoke(CANALES_IPC.authListarUsuarios),

  crearUsuario: (datos: DatosCrearUsuario): Promise<ResultadoCrearUsuario> =>
    ipcRenderer.invoke(CANALES_IPC.authCrearUsuario, datos),

  obtenerNegocio: (): Promise<ResultadoObtenerNegocio> =>
    ipcRenderer.invoke(CANALES_IPC.negocioObtener),

  guardarNegocio: (datos: DatosNegocio): Promise<ResultadoGuardarNegocio> =>
    ipcRenderer.invoke(CANALES_IPC.negocioGuardar, datos),

  listarCategorias: (): Promise<ResultadoListaCategorias> =>
    ipcRenderer.invoke(CANALES_IPC.catalogoListarCategorias),

  crearCategoria: (datos: DatosCategoria): Promise<ResultadoCategoria> =>
    ipcRenderer.invoke(CANALES_IPC.catalogoCrearCategoria, datos),

  editarCategoria: (id: number, datos: DatosCategoria): Promise<ResultadoCategoria> =>
    ipcRenderer.invoke(CANALES_IPC.catalogoEditarCategoria, id, datos),

  eliminarCategoria: (id: number): Promise<ResultadoOperacion> =>
    ipcRenderer.invoke(CANALES_IPC.catalogoEliminarCategoria, id),

  listarProductos: (filtros?: FiltrosProductos): Promise<ResultadoListaProductos> =>
    ipcRenderer.invoke(CANALES_IPC.catalogoListarProductos, filtros ?? {}),

  crearProducto: (datos: DatosProducto): Promise<ResultadoProducto> =>
    ipcRenderer.invoke(CANALES_IPC.catalogoCrearProducto, datos),

  editarProducto: (id: number, datos: DatosProducto): Promise<ResultadoProducto> =>
    ipcRenderer.invoke(CANALES_IPC.catalogoEditarProducto, id, datos),

  eliminarProducto: (id: number): Promise<ResultadoOperacion> =>
    ipcRenderer.invoke(CANALES_IPC.catalogoEliminarProducto, id),

  crearVenta: (datos: DatosCrearVenta): Promise<ResultadoCrearVenta> =>
    ipcRenderer.invoke(CANALES_IPC.ventasCrear, datos),

  listarVentas: (estado?: string): Promise<ResultadoListaVentas> =>
    ipcRenderer.invoke(CANALES_IPC.ventasListar, estado),

  obtenerVenta: (id: number): Promise<ResultadoVentaDetallada> =>
    ipcRenderer.invoke(CANALES_IPC.ventasObtener, id),

  cancelarVentaPausada: (id: number): Promise<ResultadoOperacion> =>
    ipcRenderer.invoke(CANALES_IPC.ventasCancelarPausada, id),

  listarClientes: (): Promise<ResultadoListaClientes> =>
    ipcRenderer.invoke(CANALES_IPC.clientesListar),

  crearCliente: (datos: DatosCliente): Promise<ResultadoCliente> =>
    ipcRenderer.invoke(CANALES_IPC.clientesCrear, datos),

  editarCliente: (id: number, datos: DatosCliente): Promise<ResultadoCliente> =>
    ipcRenderer.invoke(CANALES_IPC.clientesEditar, id, datos),

  eliminarCliente: (id: number): Promise<ResultadoOperacion> =>
    ipcRenderer.invoke(CANALES_IPC.clientesEliminar, id),

  registrarAbono: (id: number, datos: DatosAbono): Promise<ResultadoCliente> =>
    ipcRenderer.invoke(CANALES_IPC.clientesRegistrarAbono, id, datos),

  establecerFondoInicialTurno: (monto: number): Promise<void> =>
    ipcRenderer.invoke(CANALES_IPC.cajaEstablecerFondoInicial, monto),

  registrarMovimientoCaja: (datos: DatosMovimientoCaja): Promise<ResultadoMovimientoCaja> =>
    ipcRenderer.invoke(CANALES_IPC.cajaRegistrarMovimiento, datos),

  cerrarTurno: (totalContadoSistema: number): Promise<ResultadoCorteCaja> =>
    ipcRenderer.invoke(CANALES_IPC.cajaCerrarTurno, totalContadoSistema),

  obtenerReporteVentas: (desde?: string, hasta?: string): Promise<ResultadoReporteVentas> =>
    ipcRenderer.invoke(CANALES_IPC.cajaReporteVentas, desde, hasta),

  obtenerVentasPorDia: (dias: number): Promise<ResultadoVentasPorDia> =>
    ipcRenderer.invoke(CANALES_IPC.cajaVentasPorDia, dias),

  obtenerVentasPorCajero: (desde?: string, hasta?: string): Promise<ResultadoVentasPorCajero> =>
    ipcRenderer.invoke(CANALES_IPC.cajaVentasPorCajero, desde, hasta),

  listarCortes: (limite: number): Promise<ResultadoListaCortes> =>
    ipcRenderer.invoke(CANALES_IPC.cajaListarCortes, limite)
}

contextBridge.exposeInMainWorld('picaventa', api)

export type PicaventaApi = typeof api
