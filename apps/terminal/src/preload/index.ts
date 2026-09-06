import { contextBridge, ipcRenderer } from 'electron'
import {
  CANALES_IPC,
  type ConfigLocal,
  type CredencialesLogin,
  type DatosCrearUsuario,
  type DatosNegocio,
  type DatosNuevoUsuario,
  type ResultadoAuth,
  type ResultadoConexion,
  type ResultadoCrearUsuario,
  type ResultadoGuardarNegocio,
  type ResultadoListaUsuarios,
  type ResultadoObtenerNegocio,
  type ResultadoReautenticacion,
  type RespuestaEstadoAuth,
  type SesionUsuario
} from '@picaventa/shared'

const api = {
  obtenerConfig: (): Promise<ConfigLocal | null> => ipcRenderer.invoke(CANALES_IPC.obtenerConfig),

  borrarConfig: (): Promise<void> => ipcRenderer.invoke(CANALES_IPC.borrarConfig),

  obtenerIpLocal: (): Promise<string | null> => ipcRenderer.invoke(CANALES_IPC.obtenerIpLocal),

  verificarServidor: (host: string, puerto: number): Promise<ResultadoConexion> =>
    ipcRenderer.invoke(CANALES_IPC.verificarServidor, host, puerto),

  configurarServidor: (postgresUrl: string): Promise<ResultadoConexion> =>
    ipcRenderer.invoke(CANALES_IPC.configurarServidor, postgresUrl),

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
    ipcRenderer.invoke(CANALES_IPC.negocioGuardar, datos)
}

contextBridge.exposeInMainWorld('picaventa', api)

export type PicaventaApi = typeof api
