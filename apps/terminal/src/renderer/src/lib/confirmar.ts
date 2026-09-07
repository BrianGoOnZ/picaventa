import Swal from 'sweetalert2'

interface OpcionesConfirmacion {
  titulo: string
  texto?: string
  textoConfirmar?: string
  colorConfirmar?: string
}

export async function confirmarCritico(opciones: OpcionesConfirmacion): Promise<boolean> {
  const resultado = await Swal.fire({
    icon: 'warning',
    title: opciones.titulo,
    text: opciones.texto,
    showCancelButton: true,
    confirmButtonText: opciones.textoConfirmar ?? 'Sí, continuar',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: opciones.colorConfirmar ?? '#B4531F',
    cancelButtonColor: '#57534E',
    focusCancel: true,
    customClass: { popup: 'sw-popup' }
  })
  return resultado.isConfirmed
}

export function confirmarEliminar(nombre: string): Promise<boolean> {
  return confirmarCritico({
    titulo: `¿Eliminar "${nombre}"?`,
    texto: 'Esta acción no se puede deshacer.',
    textoConfirmar: 'Sí, eliminar',
    colorConfirmar: '#DC2626'
  })
}
