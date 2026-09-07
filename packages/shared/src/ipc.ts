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
  authReautenticar: 'auth:reautenticar',
  authListarUsuarios: 'auth:listar-usuarios',
  authCrearUsuario: 'auth:crear-usuario',

  negocioObtener: 'negocio:obtener',
  negocioGuardar: 'negocio:guardar',

  catalogoListarCategorias: 'catalogo:listar-categorias',
  catalogoCrearCategoria: 'catalogo:crear-categoria',
  catalogoEditarCategoria: 'catalogo:editar-categoria',
  catalogoEliminarCategoria: 'catalogo:eliminar-categoria',

  catalogoListarProductos: 'catalogo:listar-productos',
  catalogoCrearProducto: 'catalogo:crear-producto',
  catalogoEditarProducto: 'catalogo:editar-producto',
  catalogoEliminarProducto: 'catalogo:eliminar-producto',

  ventasCrear: 'ventas:crear',
  ventasListar: 'ventas:listar',
  ventasObtener: 'ventas:obtener',
  ventasCancelarPausada: 'ventas:cancelar-pausada',

  clientesListar: 'clientes:listar',
  clientesCrear: 'clientes:crear',
  clientesEditar: 'clientes:editar',
  clientesEliminar: 'clientes:eliminar',
  clientesRegistrarAbono: 'clientes:registrar-abono'
} as const
