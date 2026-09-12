import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import {
  IMAGEN_PRODUCTO_MAX_BYTES,
  tienePermiso,
  type CambioPrecioHistorial,
  type Categoria,
  type Producto,
  type SesionUsuario,
  type UnidadMedida
} from '@picaventa/shared'
import { BOTON_PELIGRO, BOTON_SECUNDARIO, colorCategoriaAutomatica } from '../lib/estilos'
import { comprimirImagen } from '../lib/imagenes'
import { confirmarEliminar, confirmarCritico } from '../lib/confirmar'
import { useToast } from '../lib/ToastContext'
import {
  descargarPlantillaProductos,
  exportarProductosAExcel,
  parsearProductosDesdeExcel,
  validarFilaProducto,
  type FilaProductoValidada
} from '../lib/excelProductos'

interface ResultadoImportacion {
  fila: number
  nombreProducto: string
  ok: boolean
  mensaje: string
}

interface ResultadoLoteFotos {
  archivo: string
  ok: boolean
  mensaje: string
}

// Para emparejar el nombre del archivo con el producto sin que el usuario
// tenga que escribirlo exactamente igual: sin acentos, sin mayúsculas, y
// tratando guiones/guiones bajos como espacios ("coca-cola_600ml" ~ "Coca
// Cola 600ml").
const RANGO_DIACRITICOS = /[̀-ͯ]/g

function normalizarClave(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(RANGO_DIACRITICOS, '') // quita acentos (marcas diacríticas combinadas tras NFD)
    .toLowerCase()
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

interface Props {
  sesion: SesionUsuario
}

const FORMULARIO_VACIO = {
  nombreProducto: '',
  codigoBarras: '',
  precioCompra: '',
  precioVenta: '',
  unidadMedida: 'pieza' as UnidadMedida,
  stockActual: '',
  stockMinimo: '',
  idCategoria: ''
}

export default function PantallaProductos({ sesion }: Props): React.JSX.Element {
  const puedeCrear = tienePermiso(sesion, 'crearProductos')
  const [productos, setProductos] = useState<Producto[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [cargando, setCargando] = useState(true)
  const [buscar, setBuscar] = useState('')
  const [soloStockBajo, setSoloStockBajo] = useState(false)
  const [orden, setOrden] = useState<'nombre-asc' | 'nombre-desc' | 'reciente' | 'antiguo'>('nombre-asc')
  const [formulario, setFormulario] = useState(FORMULARIO_VACIO)
  const [imagenDatos, setImagenDatos] = useState<string | undefined>(undefined)
  const [idEditando, setIdEditando] = useState<number | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const { mostrarToast } = useToast()
  const formularioRef = useRef<HTMLFormElement>(null)

  const [exportando, setExportando] = useState(false)
  const [leyendoExcel, setLeyendoExcel] = useState(false)
  const [filasParaImportar, setFilasParaImportar] = useState<FilaProductoValidada[]>([])
  const [importando, setImportando] = useState(false)
  const [resultadosImportacion, setResultadosImportacion] = useState<ResultadoImportacion[]>([])
  const inputExcelRef = useRef<HTMLInputElement>(null)
  const inputImagenRef = useRef<HTMLInputElement>(null)
  const inputLoteFotosRef = useRef<HTMLInputElement>(null)
  const [procesandoLoteFotos, setProcesandoLoteFotos] = useState(false)
  const [resultadosLoteFotos, setResultadosLoteFotos] = useState<ResultadoLoteFotos[]>([])

  const [mostrarHistorialPrecios, setMostrarHistorialPrecios] = useState(false)
  const [historialPrecios, setHistorialPrecios] = useState<CambioPrecioHistorial[]>([])
  const [cargandoHistorialPrecios, setCargandoHistorialPrecios] = useState(false)

  async function manejarArchivoImagen(evento: ChangeEvent<HTMLInputElement>): Promise<void> {
    const archivo = evento.target.files?.[0]
    if (!archivo) return

    try {
      setImagenDatos(await comprimirImagen(archivo, IMAGEN_PRODUCTO_MAX_BYTES))
      setError('')
    } catch {
      setError('No se pudo procesar esa foto — intenta con otra.')
    }
  }

  // Deja subir muchas fotos de golpe en vez de una por una: el nombre de
  // cada archivo (sin extensión) se busca contra el código de barras y,
  // si no coincide, contra el nombre del producto (ignorando acentos,
  // mayúsculas y guiones). Lo que no se pudo emparejar queda listado abajo
  // para que se pueda renombrar y volver a intentar solo con esos.
  async function manejarLoteFotos(evento: ChangeEvent<HTMLInputElement>): Promise<void> {
    const archivos = Array.from(evento.target.files ?? [])
    if (archivos.length === 0) return

    setProcesandoLoteFotos(true)
    setResultadosLoteFotos([])
    const resultados: ResultadoLoteFotos[] = []

    for (const archivo of archivos) {
      const nombreSinExtension = archivo.name.replace(/\.[a-z0-9]+$/i, '')
      const claveArchivo = normalizarClave(nombreSinExtension)

      const productoEncontrado =
        productos.find((p) => p.codigoBarras && p.codigoBarras === nombreSinExtension.trim()) ??
        productos.find((p) => normalizarClave(p.nombreProducto) === claveArchivo)

      if (!productoEncontrado) {
        resultados.push({
          archivo: archivo.name,
          ok: false,
          mensaje: 'No coincide con ningún producto (por código de barras o nombre)'
        })
        continue
      }

      try {
        const imagenComprimida = await comprimirImagen(archivo, IMAGEN_PRODUCTO_MAX_BYTES)
        const resultado = await window.picaventa.editarProducto(productoEncontrado.idProducto, {
          nombreProducto: productoEncontrado.nombreProducto,
          codigoBarras: productoEncontrado.codigoBarras,
          precioCompra: productoEncontrado.precioCompra,
          precioVenta: productoEncontrado.precioVenta,
          unidadMedida: productoEncontrado.unidadMedida,
          stockActual: productoEncontrado.stockActual,
          stockMinimo: productoEncontrado.stockMinimo,
          idCategoria: productoEncontrado.idCategoria,
          imagenDatos: imagenComprimida
        })
        resultados.push({
          archivo: archivo.name,
          ok: resultado.ok,
          mensaje: resultado.ok ? `Foto puesta en "${productoEncontrado.nombreProducto}"` : resultado.error
        })
      } catch {
        resultados.push({ archivo: archivo.name, ok: false, mensaje: 'No se pudo procesar esa imagen' })
      }
    }

    setResultadosLoteFotos(resultados)
    await cargarProductos()
    setProcesandoLoteFotos(false)
    evento.target.value = ''

    const exitosos = resultados.filter((r) => r.ok).length
    mostrarToast(
      `${exitosos} de ${resultados.length} fotos puestas correctamente`,
      exitosos === resultados.length ? 'exito' : 'error'
    )
  }

  async function cargarProductos(): Promise<void> {
    const resultado = await window.picaventa.listarProductos({
      buscar: buscar || undefined,
      stockBajo: soloStockBajo || undefined
    })
    if (resultado.ok) setProductos(resultado.productos)
    setCargando(false)
  }

  useEffect(() => {
    void window.picaventa.listarCategorias().then((resultado) => {
      if (resultado.ok) setCategorias(resultado.categorias)
    })
  }, [])

  useEffect(() => {
    setCargando(true)
    void cargarProductos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buscar, soloStockBajo])

  // El servidor ya regresa los productos en orden alfabético por defecto;
  // esto solo reordena lo que ya se cargó (sin volver a pedirlo al
  // servidor), así que cambiar el orden es instantáneo.
  const productosOrdenados = useMemo(() => {
    const copia = [...productos]
    switch (orden) {
      case 'nombre-asc':
        return copia.sort((a, b) => a.nombreProducto.localeCompare(b.nombreProducto, 'es'))
      case 'nombre-desc':
        return copia.sort((a, b) => b.nombreProducto.localeCompare(a.nombreProducto, 'es'))
      case 'reciente':
        return copia.sort((a, b) => b.idProducto - a.idProducto)
      case 'antiguo':
        return copia.sort((a, b) => a.idProducto - b.idProducto)
    }
  }, [productos, orden])

  function manejarEditar(producto: Producto): void {
    setIdEditando(producto.idProducto)
    setFormulario({
      nombreProducto: producto.nombreProducto,
      codigoBarras: producto.codigoBarras ?? '',
      precioCompra: producto.precioCompra?.toString() ?? '',
      precioVenta: producto.precioVenta.toString(),
      unidadMedida: producto.unidadMedida,
      stockActual: producto.stockActual.toString(),
      stockMinimo: producto.stockMinimo.toString(),
      idCategoria: producto.idCategoria?.toString() ?? ''
    })
    setImagenDatos(producto.imagenDatos)
    setError('')
    formularioRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function cancelarEdicion(): void {
    setIdEditando(null)
    setFormulario(FORMULARIO_VACIO)
    setImagenDatos(undefined)
    setError('')
  }

  async function manejarEnviar(evento: FormEvent): Promise<void> {
    evento.preventDefault()
    setEnviando(true)
    setError('')

    const datos = {
      nombreProducto: formulario.nombreProducto,
      codigoBarras: formulario.codigoBarras || undefined,
      precioCompra: formulario.precioCompra ? Number(formulario.precioCompra) : undefined,
      precioVenta: Number(formulario.precioVenta),
      unidadMedida: formulario.unidadMedida,
      stockActual: Number(formulario.stockActual),
      stockMinimo: Number(formulario.stockMinimo),
      idCategoria: formulario.idCategoria ? Number(formulario.idCategoria) : undefined,
      imagenDatos
    }

    const creando = idEditando === null
    const resultado = creando
      ? await window.picaventa.crearProducto(datos)
      : await window.picaventa.editarProducto(idEditando, datos)

    if (resultado.ok) {
      cancelarEdicion()
      await cargarProductos()
      mostrarToast(creando ? 'Producto agregado' : 'Producto actualizado')
      if (mostrarHistorialPrecios) {
        const actualizado = await window.picaventa.obtenerHistorialPrecios()
        if (actualizado.ok) setHistorialPrecios(actualizado.cambios)
      }
    } else {
      setError(resultado.error)
    }
    setEnviando(false)
  }

  async function manejarEliminar(producto: Producto): Promise<void> {
    if (!(await confirmarEliminar(producto.nombreProducto))) return

    const resultado = await window.picaventa.eliminarProducto(producto.idProducto)
    if (resultado.ok) {
      await cargarProductos()
      mostrarToast('Producto eliminado')
    } else {
      mostrarToast(resultado.error, 'error')
    }
  }

  function nombreCategoria(idCategoria?: number): string {
    return categorias.find((c) => c.idCategoria === idCategoria)?.nombreCategoria ?? '—'
  }

  async function manejarExportar(): Promise<void> {
    setExportando(true)
    // Se exporta el catálogo completo, sin importar el filtro/búsqueda activo
    // en pantalla, para que el análisis no se quede con una lista parcial sin
    // que el administrador se dé cuenta.
    const resultado = await window.picaventa.listarProductos({})
    if (resultado.ok) {
      await exportarProductosAExcel(resultado.productos, categorias)
      mostrarToast(`${resultado.productos.length} productos exportados`)
    } else {
      mostrarToast(resultado.error, 'error')
    }
    setExportando(false)
  }

  async function alternarHistorialPrecios(): Promise<void> {
    if (mostrarHistorialPrecios) {
      setMostrarHistorialPrecios(false)
      return
    }
    setMostrarHistorialPrecios(true)
    setCargandoHistorialPrecios(true)
    const resultado = await window.picaventa.obtenerHistorialPrecios()
    if (resultado.ok) setHistorialPrecios(resultado.cambios)
    setCargandoHistorialPrecios(false)
  }

  async function manejarSeleccionArchivoExcel(evento: ChangeEvent<HTMLInputElement>): Promise<void> {
    const archivo = evento.target.files?.[0]
    evento.target.value = ''
    if (!archivo) return

    setLeyendoExcel(true)
    setResultadosImportacion([])
    try {
      const filasExcel = await parsearProductosDesdeExcel(archivo)

      // Las categorías que el archivo menciona pero todavía no existen se
      // crean solas — así cargar 1000 productos no implica ir a crear cada
      // categoría a mano antes, ni volver a categorizar todo después.
      const vistas = new Map<string, string>()
      for (const fila of filasExcel) {
        const nombre = fila.categoria.trim()
        if (nombre && !vistas.has(nombre.toLowerCase())) vistas.set(nombre.toLowerCase(), nombre)
      }
      const existentes = new Set(categorias.map((c) => c.nombreCategoria.toLowerCase()))
      const faltantes = [...vistas.entries()].filter(([clave]) => !existentes.has(clave))

      let categoriasActuales = categorias
      if (faltantes.length > 0) {
        const nuevas: Categoria[] = []
        for (const [, nombre] of faltantes) {
          const resultado = await window.picaventa.crearCategoria({
            nombreCategoria: nombre,
            colorCategoria: colorCategoriaAutomatica(categoriasActuales.length + nuevas.length)
          })
          if (resultado.ok) nuevas.push(resultado.categoria)
        }
        if (nuevas.length > 0) {
          categoriasActuales = [...categoriasActuales, ...nuevas]
          setCategorias(categoriasActuales)
          mostrarToast(`Se crearon ${nuevas.length} categoría(s) nueva(s) del archivo`)
        }
      }

      const productosActuales = await window.picaventa.listarProductos({})
      const validadas = filasExcel.map((fila) =>
        validarFilaProducto(fila, categoriasActuales, productosActuales.ok ? productosActuales.productos : [])
      )
      setFilasParaImportar(validadas)
      if (validadas.length === 0) {
        mostrarToast('El archivo no tiene filas con datos', 'error')
      }
    } catch (err) {
      console.error('Error al leer el Excel de importación:', err)
      mostrarToast('No se pudo leer el archivo — verifica que sea un .xlsx válido', 'error')
    }
    setLeyendoExcel(false)
  }

  function quitarFilaImportar(fila: number): void {
    setFilasParaImportar((actual) => actual.filter((f) => f.fila !== fila))
  }

  async function confirmarImportacion(): Promise<void> {
    const filasValidas = filasParaImportar.filter((f) => !f.error)
    if (filasValidas.length === 0) return

    const confirmado = await confirmarCritico({
      titulo: `¿Importar ${filasValidas.length} producto${filasValidas.length === 1 ? '' : 's'}?`,
      texto: 'Se crearán o actualizarán los productos según lo indicado en cada fila. Revisa la lista antes de continuar.',
      textoConfirmar: 'Sí, importar',
      colorConfirmar: '#15803D'
    })
    if (!confirmado) return

    setImportando(true)
    const resultados: ResultadoImportacion[] = []

    for (const fila of filasValidas) {
      const datos = {
        nombreProducto: fila.nombreProducto,
        codigoBarras: fila.codigoBarras,
        precioCompra: fila.precioCompra,
        precioVenta: fila.precioVenta,
        unidadMedida: fila.unidadMedida,
        stockActual: fila.stockActual,
        stockMinimo: fila.stockMinimo,
        idCategoria: fila.idCategoria
      }
      const resultado =
        fila.accion === 'actualizar' && fila.idProductoExistente
          ? await window.picaventa.editarProducto(fila.idProductoExistente, datos)
          : await window.picaventa.crearProducto(datos)

      resultados.push({
        fila: fila.fila,
        nombreProducto: fila.nombreProducto,
        ok: resultado.ok,
        mensaje: resultado.ok
          ? fila.accion === 'actualizar'
            ? 'Actualizado'
            : 'Creado'
          : resultado.error
      })
    }

    setResultadosImportacion(resultados)
    setFilasParaImportar([])
    setImportando(false)
    await cargarProductos()

    const exitosos = resultados.filter((r) => r.ok).length
    const fallidos = resultados.length - exitosos
    mostrarToast(
      fallidos === 0
        ? `${exitosos} producto${exitosos === 1 ? '' : 's'} importado${exitosos === 1 ? '' : 's'} correctamente`
        : `${exitosos} importado${exitosos === 1 ? '' : 's'}, ${fallidos} con error`,
      fallidos === 0 ? 'exito' : 'error'
    )
  }

  const esAdmin = sesion.rolUsuario === 'administrador'
  const mostrarFormulario = esAdmin || (puedeCrear && idEditando === null)

  return (
    <div className="flex flex-col gap-4">
      {esAdmin && (
        <div className="rounded-lg border border-borde bg-tarjeta p-4">
          <h2 className="mb-1 text-sm font-semibold text-texto-secundario">Excel del catálogo</h2>
          <p className="mb-3 text-xs text-texto-secundario">
            Exporta o carga muchos productos a la vez — incluye precio de compra y de venta, por
            eso es exclusivo de administrador.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void descargarPlantillaProductos()}
              className={BOTON_SECUNDARIO}
            >
              Descargar plantilla
            </button>
            <button
              type="button"
              onClick={() => void manejarExportar()}
              disabled={exportando}
              className={BOTON_SECUNDARIO}
            >
              {exportando ? 'Exportando...' : 'Exportar a Excel'}
            </button>
            <button
              type="button"
              onClick={() => inputExcelRef.current?.click()}
              disabled={leyendoExcel}
              className={BOTON_SECUNDARIO}
            >
              {leyendoExcel ? 'Leyendo archivo...' : 'Importar desde Excel'}
            </button>
            <input
              ref={inputExcelRef}
              type="file"
              accept=".xlsx"
              onChange={(evento) => void manejarSeleccionArchivoExcel(evento)}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => void alternarHistorialPrecios()}
              className={BOTON_SECUNDARIO}
            >
              {mostrarHistorialPrecios ? 'Ocultar historial de precios' : 'Ver historial de precios'}
            </button>
          </div>
        </div>
      )}

      {esAdmin && (
        <div className="rounded-lg border border-borde bg-tarjeta p-4">
          <h2 className="mb-1 text-sm font-semibold text-texto-secundario">Fotos de productos en lote</h2>
          <p className="mb-3 text-xs text-texto-secundario">
            Selecciona varias fotos a la vez — cada una se empareja sola con el producto cuyo
            código de barras o nombre coincida con el nombre del archivo (ej. "7501055300013.jpg"
            o "Coca-Cola 600ml.jpg"). Se comprimen igual que al subir una por una.
          </p>
          <button
            type="button"
            onClick={() => inputLoteFotosRef.current?.click()}
            disabled={procesandoLoteFotos}
            className={BOTON_SECUNDARIO}
          >
            {procesandoLoteFotos ? 'Procesando...' : 'Elegir varias fotos...'}
          </button>
          <input
            ref={inputLoteFotosRef}
            type="file"
            accept="image/*"
            multiple
            onChange={(evento) => void manejarLoteFotos(evento)}
            className="hidden"
          />
        </div>
      )}

      {resultadosLoteFotos.length > 0 && (
        <div className="rounded-lg border border-borde bg-tarjeta p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-texto-secundario">
              Resultado del lote de fotos ({resultadosLoteFotos.length})
            </h2>
            <button
              type="button"
              onClick={() => setResultadosLoteFotos([])}
              className={BOTON_SECUNDARIO}
            >
              Cerrar
            </button>
          </div>
          <ul className="flex max-h-64 flex-col gap-2 overflow-y-auto">
            {resultadosLoteFotos.map((resultado, indice) => (
              <li
                key={indice}
                className={`flex items-center justify-between rounded-lg border p-3 text-sm ${
                  resultado.ok ? 'border-borde' : 'border-peligro bg-peligro/5'
                }`}
              >
                <span className="flex items-center gap-2 text-onix">
                  <span className={resultado.ok ? 'text-exito' : 'text-peligro'}>
                    {resultado.ok ? '✓' : '✗'}
                  </span>
                  {resultado.archivo}
                </span>
                <span className={resultado.ok ? 'text-texto-secundario' : 'font-medium text-peligro'}>
                  {resultado.mensaje}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {mostrarHistorialPrecios && (
        <div className="rounded-lg border border-borde bg-tarjeta p-4">
          <h2 className="mb-3 text-sm font-semibold text-texto-secundario">
            Historial de cambios de precio — quién editó qué
          </h2>
          {cargandoHistorialPrecios ? (
            <p className="text-sm text-texto-secundario">Cargando...</p>
          ) : historialPrecios.length === 0 ? (
            <p className="text-sm text-texto-secundario">Aún no se ha registrado ningún cambio de precio.</p>
          ) : (
            <div className="max-h-96 overflow-x-auto overflow-y-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-xs text-texto-secundario">
                    <th className="pb-2 pr-3 font-medium">Fecha</th>
                    <th className="pb-2 pr-3 font-medium">Producto</th>
                    <th className="pb-2 pr-3 font-medium">Quién</th>
                    <th className="pb-2 font-medium">Precio antes → después</th>
                  </tr>
                </thead>
                <tbody>
                  {historialPrecios.map((cambio) => (
                    <tr key={cambio.idHistoricoPrecio} className="border-t border-borde">
                      <td className="py-2 pr-3 text-texto-secundario">
                        {new Date(cambio.fechaCambio).toLocaleString('es-MX', {
                          dateStyle: 'short',
                          timeStyle: 'short'
                        })}
                      </td>
                      <td className="py-2 pr-3 text-onix">{cambio.nombreProducto}</td>
                      <td className="py-2 pr-3 text-onix">{cambio.nombreUsuario}</td>
                      <td className="py-2 text-texto-secundario">
                        ${cambio.precioAnterior.toFixed(2)} →{' '}
                        <span className="font-semibold text-onix">${cambio.precioNuevo.toFixed(2)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {filasParaImportar.length > 0 && (
        <div className="rounded-lg border border-borde bg-tarjeta p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-texto-secundario">
              Revisar antes de importar ({filasParaImportar.length})
            </h2>
            <button
              type="button"
              onClick={() => void confirmarImportacion()}
              disabled={importando || filasParaImportar.every((f) => !!f.error)}
              className="rounded-md bg-exito px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              {importando ? 'Importando...' : 'Confirmar e importar'}
            </button>
          </div>
          <ul className="flex max-h-96 flex-col gap-2 overflow-y-auto">
            {filasParaImportar.map((fila) => (
              <li
                key={fila.fila}
                className={`rounded-lg border p-3 text-sm ${fila.error ? 'border-peligro bg-peligro/5' : 'border-borde'}`}
              >
                <div className="flex items-center gap-3">
                  <span className="shrink-0 text-xs text-texto-secundario">Fila {fila.fila}</span>
                  <span className="min-w-0 flex-1 truncate font-medium text-onix">
                    {fila.nombreProducto || '(sin nombre)'}
                  </span>
                  {!fila.error && (
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                        fila.accion === 'actualizar' ? 'bg-alerta/10 text-alerta' : 'bg-exito/10 text-exito'
                      }`}
                    >
                      {fila.accion === 'actualizar' ? `Actualiza #${fila.idProductoExistente}` : 'Nuevo'}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => quitarFilaImportar(fila.fila)}
                    className={`shrink-0 ${BOTON_PELIGRO}`}
                  >
                    Quitar
                  </button>
                </div>
                {fila.error && <p className="mt-1 text-xs font-medium text-peligro">{fila.error}</p>}
                {!fila.error && fila.advertencias.length > 0 && (
                  <p className="mt-1 text-xs text-alerta">{fila.advertencias.join(' · ')}</p>
                )}
                {!fila.error && (
                  <p className="mt-1 text-xs text-texto-secundario">
                    ${fila.precioVenta.toFixed(2)} · stock {fila.stockActual} {fila.unidadMedida}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {resultadosImportacion.length > 0 && (
        <div className="rounded-lg border border-borde bg-tarjeta p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-texto-secundario">
              Resultado de la última importación ({resultadosImportacion.length})
            </h2>
            <button
              type="button"
              onClick={() => setResultadosImportacion([])}
              className={BOTON_SECUNDARIO}
            >
              Cerrar
            </button>
          </div>
          <ul className="flex max-h-64 flex-col gap-2 overflow-y-auto">
            {resultadosImportacion.map((resultado) => (
              <li
                key={resultado.fila}
                className={`flex items-center justify-between rounded-lg border p-3 text-sm ${
                  resultado.ok ? 'border-borde' : 'border-peligro bg-peligro/5'
                }`}
              >
                <span className="flex items-center gap-2 text-onix">
                  <span className={resultado.ok ? 'text-exito' : 'text-peligro'}>
                    {resultado.ok ? '✓' : '✗'}
                  </span>
                  Fila {resultado.fila} — {resultado.nombreProducto}
                </span>
                <span className={resultado.ok ? 'text-texto-secundario' : 'font-medium text-peligro'}>
                  {resultado.mensaje}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {mostrarFormulario && (
      <form
        ref={formularioRef}
        onSubmit={manejarEnviar}
        className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3 rounded-lg border border-borde bg-tarjeta p-4"
      >
        <h2 className="col-span-full text-sm font-semibold text-texto-secundario">
          {idEditando === null ? 'Nuevo producto' : 'Editar producto'}
        </h2>
        <label className="text-sm font-medium text-neutral-700">
          Nombre
          <input
            type="text"
            required
            value={formulario.nombreProducto}
            onChange={(evento) =>
              setFormulario({ ...formulario, nombreProducto: evento.target.value })
            }
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </label>
        <div className="col-span-full">
          <p className="text-sm font-medium text-neutral-700">
            Foto (opcional) — si no se sube, se muestra un color por categoría
          </p>
          <div className="mt-1 flex items-center gap-3">
            <input
              ref={inputImagenRef}
              type="file"
              accept="image/*"
              onChange={(e) => void manejarArchivoImagen(e)}
              className="hidden"
            />
            <button type="button" onClick={() => inputImagenRef.current?.click()} className={BOTON_SECUNDARIO}>
              {imagenDatos ? 'Cambiar foto...' : 'Elegir foto...'}
            </button>
            {imagenDatos ? (
              <img
                src={imagenDatos}
                alt=""
                className="h-12 w-12 rounded border border-neutral-200 object-cover"
              />
            ) : (
              <span className="text-xs text-texto-secundario">Ningún archivo seleccionado</span>
            )}
          </div>
        </div>
        <label className="text-sm font-medium text-neutral-700">
          Código de barras
          <input
            type="text"
            value={formulario.codigoBarras}
            onChange={(evento) =>
              setFormulario({ ...formulario, codigoBarras: evento.target.value })
            }
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm font-medium text-neutral-700">
          Categoría
          <select
            value={formulario.idCategoria}
            onChange={(evento) => setFormulario({ ...formulario, idCategoria: evento.target.value })}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          >
            <option value="">Sin categoría</option>
            {categorias.map((categoria) => (
              <option key={categoria.idCategoria} value={categoria.idCategoria}>
                {categoria.nombreCategoria}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium text-neutral-700">
          Precio de compra
          <input
            type="number"
            step="0.01"
            min="0"
            value={formulario.precioCompra}
            onChange={(evento) =>
              setFormulario({ ...formulario, precioCompra: evento.target.value })
            }
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm font-medium text-neutral-700">
          Precio de venta
          <input
            type="number"
            step="0.01"
            min="0"
            required
            value={formulario.precioVenta}
            onChange={(evento) => setFormulario({ ...formulario, precioVenta: evento.target.value })}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm font-medium text-neutral-700">
          Unidad de medida
          <select
            value={formulario.unidadMedida}
            onChange={(evento) =>
              setFormulario({ ...formulario, unidadMedida: evento.target.value as UnidadMedida })
            }
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          >
            <option value="pieza">Pieza</option>
            <option value="kg">Kilogramo (granel)</option>
          </select>
        </label>
        <label className="text-sm font-medium text-neutral-700">
          Stock actual
          <input
            type="number"
            step="0.001"
            min="0"
            required
            value={formulario.stockActual}
            onChange={(evento) => setFormulario({ ...formulario, stockActual: evento.target.value })}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm font-medium text-neutral-700">
          Stock mínimo (alerta)
          <input
            type="number"
            step="0.001"
            min="0"
            required
            value={formulario.stockMinimo}
            onChange={(evento) => setFormulario({ ...formulario, stockMinimo: evento.target.value })}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </label>
        {error && <p className="col-span-full text-sm text-red-600">{error}</p>}
        <div className="col-span-full flex gap-2">
          {idEditando !== null && (
            <button type="button" onClick={cancelarEdicion} className={BOTON_SECUNDARIO}>
              Cancelar
            </button>
          )}
          <button
            type="submit"
            disabled={enviando}
            className="rounded-md bg-cobre px-4 py-2 text-sm font-semibold text-white hover:bg-cobre-oscuro disabled:opacity-50"
          >
            {enviando ? 'Guardando...' : idEditando === null ? 'Agregar producto' : 'Guardar cambios'}
          </button>
        </div>
      </form>
      )}

      <div className="rounded-lg border border-borde bg-tarjeta p-4">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <h2 className="text-sm font-semibold text-texto-secundario">
            Productos registrados {productos.length > 0 && `(${productos.length})`}
          </h2>
          <input
            type="text"
            placeholder="Buscar por nombre..."
            value={buscar}
            onChange={(evento) => setBuscar(evento.target.value)}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
          />
          <label className="flex items-center gap-1.5 text-sm text-texto-secundario">
            <input
              type="checkbox"
              checked={soloStockBajo}
              onChange={(evento) => setSoloStockBajo(evento.target.checked)}
            />
            Solo stock bajo
          </label>
          <label className="flex items-center gap-1.5 text-sm text-texto-secundario">
            Ordenar por
            <select
              value={orden}
              onChange={(evento) => setOrden(evento.target.value as typeof orden)}
              className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
            >
              <option value="nombre-asc">Nombre (A-Z)</option>
              <option value="nombre-desc">Nombre (Z-A)</option>
              <option value="reciente">Más reciente primero</option>
              <option value="antiguo">Más antiguo primero</option>
            </select>
          </label>
        </div>

        {cargando ? (
          <p className="text-sm text-texto-secundario">Cargando...</p>
        ) : productos.length === 0 ? (
          <p className="text-sm text-texto-secundario">Aún no hay productos registrados.</p>
        ) : (
          <ul className="flex max-h-96 flex-col gap-2 overflow-y-auto">
            {productosOrdenados.map((producto) => {
              const stockBajo = producto.stockActual <= producto.stockMinimo
              return (
                <li
                  key={producto.idProducto}
                  className="flex items-center gap-3 rounded-lg border border-borde p-3 text-sm"
                >
                  {producto.imagenDatos ? (
                    <img
                      src={producto.imagenDatos}
                      alt=""
                      className="h-9 w-9 shrink-0 rounded object-cover"
                    />
                  ) : (
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded font-display text-sm font-semibold text-white"
                      style={{
                        backgroundColor:
                          categorias.find((c) => c.idCategoria === producto.idCategoria)
                            ?.colorCategoria ?? '#57534E'
                      }}
                    >
                      {producto.nombreProducto.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-onix">{producto.nombreProducto}</p>
                    <p className="text-xs text-texto-secundario">
                      {nombreCategoria(producto.idCategoria)} · ${producto.precioVenta.toFixed(2)} ·{' '}
                      <span className={stockBajo ? 'font-semibold text-peligro' : ''}>
                        stock: {producto.stockActual} {producto.unidadMedida}
                      </span>
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    {esAdmin && (
                      <button
                        type="button"
                        onClick={() => manejarEditar(producto)}
                        className={BOTON_SECUNDARIO}
                      >
                        Editar
                      </button>
                    )}
                    {esAdmin && (
                      <button
                        type="button"
                        onClick={() => void manejarEliminar(producto)}
                        className={BOTON_PELIGRO}
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
