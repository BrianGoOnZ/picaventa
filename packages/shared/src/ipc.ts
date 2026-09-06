export const CANALES_IPC = {
  obtenerConfig: 'config:obtener',
  borrarConfig: 'config:borrar',
  obtenerIpLocal: 'red:obtener-ip-local',
  verificarServidor: 'red:verificar-servidor',
  configurarServidor: 'config:configurar-servidor',
  configurarTerminal: 'config:configurar-terminal',
  iniciarServidorDesdeConfig: 'servidor:iniciar-desde-config',

  authEstadoInicial: 'auth:estado-inicial',
  authCrearPrimerUsuario: 'auth:crear-primer-usuario',
  authLogin: 'auth:login',
  authCerrarSesion: 'auth:cerrar-sesion',
  authSesionActual: 'auth:sesion-actual',
  authReautenticar: 'auth:reautenticar'
} as const
