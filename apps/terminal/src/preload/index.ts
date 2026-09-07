import { contextBridge, ipcRenderer } from 'electron'
import {
  CANALES_IPC,
  type ConfigLocal,
  type CredencialesLogin,
  type DatosAbono,
  type DatosActualizarPermisos,
  type DatosCancelarVenta,
  type DatosCategoria,
  type DatosCliente,
  type DatosConfigurarServidor,
  type DatosCrearUsuario,
  type DatosCrearVenta,
  type DatosDevolucion,
  type DatosEntradaInventario,
  type DatosMovimientoCaja,
  type DatosNegocio,
  type DatosNuevoUsuario,
  type DatosProducto,
  type FiltrosProductos,
  type FiltrosVentas,
  type ResultadoActualizarPermisos,
  type ResultadoAuth,
  type ResultadoCancelarVenta,
  type ResultadoCategoria,
  type ResultadoCliente,
  type ResultadoConexion,
  type ResultadoCorteCaja,
  type ResultadoCrearUsuario,
  type ResultadoCrearVenta,
  type ResultadoDevolucion,
  type ResultadoEstadoRespaldo,
  type ResultadoGuardarNegocio,
  type ResultadoHistorialEntradas,
  type ResultadoHistorialPrecios,
  type ResultadoListaCategorias,
  type ResultadoListaClientes,
  type ResultadoListaDevoluciones,
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
  type ResultadoRespaldoManual,
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

  actualizarPermisosUsuario: (
    id: number,
    datos: DatosActualizarPermisos
  ): Promise<ResultadoActualizarPermisos> =>
    ipcRenderer.invoke(CANALES_IPC.authActualizarPermisos, id, datos),

  obtenerNegocio: (): Promise<ResultadoObtenerNegocio> =>
    ipcRenderer.invoke(CANALES_IPC.negocioObtener),

  guardarNegocio: (datos: DatosNegocio): Promise<ResultadoGuardarNegocio> =>
    ipcRenderer.invoke(CANALES_IPC.negocioGuardar, datos),

  obtenerEstadoRespaldo: (): Promise<ResultadoEstadoRespaldo> =>
    ipcRenderer.invoke(CANALES_IPC.negocioEstadoRespaldo),

  respaldarAhora: (): Promise<ResultadoRespaldoManual> =>
    ipcRenderer.invoke(CANALES_IPC.negocioRespaldarAhora),

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

  registrarEntradaInventario: (
    id: number,
    datos: DatosEntradaInventario
  ): Promise<ResultadoProducto> => ipcRenderer.invoke(CANALES_IPC.catalogoRegistrarEntrada, id, datos),

  obtenerHistorialEntradas: (): Promise<ResultadoHistorialEntradas> =>
    ipcRenderer.invoke(CANALES_IPC.catalogoHistorialEntradas),

  obtenerHistorialPrecios: (): Promise<ResultadoHistorialPrecios> =>
    ipcRenderer.invoke(CANALES_IPC.catalogoHistorialPrecios),

  crearVenta: (datos: DatosCrearVenta): Promise<ResultadoCrearVenta> =>
    ipcRenderer.invoke(CANALES_IPC.ventasCrear, datos),

  listarVentas: (filtros?: FiltrosVentas): Promise<ResultadoListaVentas> =>
    ipcRenderer.invoke(CANALES_IPC.ventasListar, filtros),

  obtenerVenta: (id: number): Promise<ResultadoVentaDetallada> =>
    ipcRenderer.invoke(CANALES_IPC.ventasObtener, id),

  cancelarVentaPausada: (id: number): Promise<ResultadoOperacion> =>
    ipcRenderer.invoke(CANALES_IPC.ventasCancelarPausada, id),

  cancelarVentaActiva: (id: number, datos: DatosCancelarVenta): Promise<ResultadoCancelarVenta> =>
    ipcRenderer.invoke(CANALES_IPC.ventasCancelarActiva, id, datos),

  registrarDevolucion: (id: number, datos: DatosDevolucion): Promise<ResultadoDevolucion> =>
    ipcRenderer.invoke(CANALES_IPC.ventasRegistrarDevolucion, id, datos),

  listarDevoluciones: (id: number): Promise<ResultadoListaDevoluciones> =>
    ipcRenderer.invoke(CANALES_IPC.ventasListarDevoluciones, id),

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
