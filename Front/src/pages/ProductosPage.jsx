import { useCallback, useEffect, useState } from 'react'
import { productosApi } from '../services/api.js'
import Alerta from '../components/Alerta.jsx'
import ProductoForm from '../components/ProductoForm.jsx'
import ProductosTable from '../components/ProductosTable.jsx'
import Spinner from '../components/Spinner.jsx'

const FILTROS_ESTADO = [
  { valor: 'todos', etiqueta: 'Todos' },
  { valor: 'activos', etiqueta: 'Activos' },
  { valor: 'inactivos', etiqueta: 'Inactivos' },
]

/**
 * Página principal del módulo de Productos.
 */
export default function ProductosPage() {
  const [productos, setProductos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [errorGlobal, setErrorGlobal] = useState(null)
  const [exitoGlobal, setExitoGlobal] = useState(null)

  // Formulario (crear / editar)
  const [productoEditando, setProductoEditando] = useState(null)
  const [mostrarForm, setMostrarForm] = useState(false)

  // Filtros
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todos')

  // ---------------------------------------------------------------------------
  // Carga de datos
  // ---------------------------------------------------------------------------
  const cargarProductos = useCallback(async () => {
    setCargando(true)
    setErrorGlobal(null)
    try {
      const datos = await productosApi.listar()
      setProductos(Array.isArray(datos) ? datos : datos.data || [])
    } catch (err) {
      setErrorGlobal(err.message || 'No se pudo cargar el catálogo de productos.')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    let cancelado = false
    productosApi
      .listar()
      .then((datos) => {
        if (!cancelado) {
          setProductos(Array.isArray(datos) ? datos : datos.data || [])
        }
      })
      .catch((err) => {
        if (!cancelado) {
          setErrorGlobal(err.message || 'No se pudo cargar el catálogo de productos.')
        }
      })
      .finally(() => {
        if (!cancelado) {
          setCargando(false)
        }
      })

    return () => {
      cancelado = true
    }
  }, [])

  // ---------------------------------------------------------------------------
  // Filtrado local en memoria
  // ---------------------------------------------------------------------------
  const productosFiltrados = productos.filter((prod) => {
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase()
      const coincide =
        prod.nombre.toLowerCase().includes(q) ||
        (prod.descripcion && prod.descripcion.toLowerCase().includes(q))
      if (!coincide) return false
    }

    const esActivo = prod.activo === true || prod.estado === 'activo'
    if (filtroEstado === 'activos' && !esActivo) return false
    if (filtroEstado === 'inactivos' && esActivo) return false

    return true
  })

  // ---------------------------------------------------------------------------
  // Acciones CRUD
  // ---------------------------------------------------------------------------
  async function handleGuardar(payload) {
    setGuardando(true)
    setExitoGlobal(null)
    try {
      if (productoEditando) {
        await productosApi.editar(productoEditando.id, payload)
        setExitoGlobal(`Producto "${payload.nombre}" actualizado correctamente.`)
      } else {
        await productosApi.crear(payload)
        setExitoGlobal(`Producto "${payload.nombre}" registrado correctamente.`)
      }
      setMostrarForm(false)
      setProductoEditando(null)
      await cargarProductos()
    } finally {
      setGuardando(false)
    }
  }

  async function handleCambiarEstado(prod) {
    setGuardando(true)
    setExitoGlobal(null)
    setErrorGlobal(null)

    const esActivo = prod.activo === true || prod.estado === 'activo'
    const nuevoActivo = !esActivo

    try {
      await productosApi.cambiarEstado(prod.id, nuevoActivo)
      setExitoGlobal(
        `Producto "${prod.nombre}" ${nuevoActivo ? 'activado' : 'desactivado'} con éxito.`
      )
      await cargarProductos()
    } catch (err) {
      setErrorGlobal(err.message || 'No se pudo cambiar el estado del producto.')
    } finally {
      setGuardando(false)
    }
  }

  function abrirCrear() {
    setProductoEditando(null)
    setMostrarForm(true)
    setExitoGlobal(null)
    setErrorGlobal(null)
  }

  function abrirEditar(prod) {
    setProductoEditando(prod)
    setMostrarForm(true)
    setExitoGlobal(null)
    setErrorGlobal(null)
  }

  function cerrarForm() {
    setMostrarForm(false)
    setProductoEditando(null)
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="pagina">
      <div className="pagina-header">
        <h2>Catálogo de Productos</h2>
        <button type="button" className="btn btn-primario" onClick={abrirCrear}>
          + Nuevo producto
        </button>
      </div>

      <Alerta mensaje={errorGlobal} tipo="error" onCerrar={() => setErrorGlobal(null)} />
      <Alerta mensaje={exitoGlobal} tipo="exito" onCerrar={() => setExitoGlobal(null)} />

      {mostrarForm && (
        <div className="form-panel">
          <ProductoForm
            producto={productoEditando}
            onGuardar={handleGuardar}
            onCancelar={cerrarForm}
            cargando={guardando}
          />
        </div>
      )}

      {/* Barra de Búsqueda y Filtros */}
      <div className="filtros-barra">
        <input
          type="search"
          className="filtro-busqueda"
          placeholder="Buscar producto por nombre o descripción…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          aria-label="Buscar producto"
        />

        <div className="filtro-grupo">
          <span className="filtro-label">Estado:</span>
          {FILTROS_ESTADO.map((f) => (
            <button
              key={f.valor}
              type="button"
              className={`btn btn-sm ${
                filtroEstado === f.valor ? 'btn-primario' : 'btn-ghost'
              }`}
              onClick={() => setFiltroEstado(f.valor)}
            >
              {f.etiqueta}
            </button>
          ))}
        </div>

        <span className="filtro-contador">
          Mostrando {productosFiltrados.length} de {productos.length} productos
        </span>
      </div>

      {cargando ? (
        <Spinner texto="Cargando productos…" />
      ) : (
        <ProductosTable
          productos={productosFiltrados}
          onEditar={abrirEditar}
          onCambiarEstado={handleCambiarEstado}
          cargando={guardando}
        />
      )}
    </div>
  )
}

