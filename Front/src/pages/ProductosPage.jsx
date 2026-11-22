import { useCallback, useEffect, useState } from 'react'
import { Plus, Search, ChevronRight } from 'lucide-react'
import { productosApi } from '../services/api.js'
import Alerta from '../components/Alerta.jsx'
import ProductoForm from '../components/ProductoForm.jsx'
import ProductosTable from '../components/ProductosTable.jsx'
import Spinner from '../components/Spinner.jsx'

export default function ProductosPage() {
  const [productos, setProductos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [errorGlobal, setErrorGlobal] = useState(null)
  const [exitoGlobal, setExitoGlobal] = useState(null)

  // Formulario (crear / editar modal)
  const [productoEditando, setProductoEditando] = useState(null)
  const [mostrarForm, setMostrarForm] = useState(false)

  // Filtros
  const [busqueda, setBusqueda] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('todas')
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
  // Categorías dinámicas detectadas
  // ---------------------------------------------------------------------------
  const categorias = Array.from(
    new Set(productos.map((p) => p.categoria || 'Helados'))
  ).filter(Boolean)

  // ---------------------------------------------------------------------------
  // Filtrado local en memoria
  // ---------------------------------------------------------------------------
  const productosFiltrados = productos.filter((prod) => {
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase().trim()
      const matchNombre = (prod.nombre || '').toLowerCase().includes(q)
      const matchDesc = (prod.descripcion || '').toLowerCase().includes(q)
      const matchCat = (prod.categoria || '').toLowerCase().includes(q)
      if (!matchNombre && !matchDesc && !matchCat) return false
    }

    const esActivo = prod.activo === true || prod.estado === 'activo'
    if (filtroEstado === 'activos' && !esActivo) return false
    if (filtroEstado === 'inactivos' && esActivo) return false

    if (filtroCategoria !== 'todas') {
      const cat = prod.categoria || 'Helados'
      if (cat.toLowerCase() !== filtroCategoria.toLowerCase()) return false
    }

    return true
  })

  const disponiblesCount = productos.filter(
    (p) => p.activo === true || p.estado === 'activo'
  ).length

  // ---------------------------------------------------------------------------
  // Acciones CRUD
  // ---------------------------------------------------------------------------
  async function handleGuardar(payload) {
    setGuardando(true)
    setExitoGlobal(null)
    setErrorGlobal(null)

    try {
      if (productoEditando) {
        await productosApi.editar(productoEditando.id, payload)
        setExitoGlobal(`Producto "${payload.nombre}" actualizado correctamente.`)
      } else {
        await productosApi.crear(payload)
        setExitoGlobal(`Producto "${payload.nombre}" registrado exitosamente en el catálogo.`)
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
        `Producto "${prod.nombre}" marcado como ${nuevoActivo ? 'disponible' : 'no disponible'}.`
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
    if (guardando) return
    setMostrarForm(false)
    setProductoEditando(null)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#a8a29e' }}>
        <span>Sistema</span>
        <ChevronRight size={13} />
        <span style={{ color: '#57534e', fontWeight: 500 }}>Productos</span>
      </div>

      {/* Cabecera Principal */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 28,
              fontWeight: 700,
              color: '#1c1917',
              margin: 0,
              letterSpacing: '-0.02em',
            }}
          >
            Productos
          </h2>
          <p style={{ fontSize: 13, color: '#78716c', marginTop: 4 }}>
            {disponiblesCount} disponibles · {productos.length} en catálogo
          </p>
        </div>

        <button
          type="button"
          onClick={abrirCrear}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '9px 18px',
            borderRadius: 8,
            border: 'none',
            background: '#6B3F1C',
            color: '#FFF8F2',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(107, 63, 28, 0.2)',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#562f12')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#6B3F1C')}
        >
          <Plus size={16} />
          Nuevo producto
        </button>
      </div>

      {/* Alertas globales */}
      <Alerta mensaje={errorGlobal} tipo="error" onCerrar={() => setErrorGlobal(null)} />
      <Alerta mensaje={exitoGlobal} tipo="exito" onCerrar={() => setExitoGlobal(null)} />

      {/* Barra de Búsqueda y Filtros */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        {/* Buscador */}
        <div
          style={{
            flex: 1,
            minWidth: 260,
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Search
            size={16}
            color="#78716c"
            style={{ position: 'absolute', left: 12, pointerEvents: 'none' }}
          />
          <input
            type="search"
            placeholder="Buscar producto..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px 9px 36px',
              borderRadius: 8,
              border: '1px solid #e7e5e4',
              background: '#ffffff',
              fontSize: 13,
              color: '#1c1917',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Filtro por Categoría */}
        <select
          value={filtroCategoria}
          onChange={(e) => setFiltroCategoria(e.target.value)}
          style={selectStyle}
        >
          <option value="todas">Todas las categorías</option>
          {categorias.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        {/* Filtro por Disponibilidad */}
        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          style={selectStyle}
        >
          <option value="todos">Todos los estados</option>
          <option value="activos">Disponibles</option>
          <option value="inactivos">No disponibles</option>
        </select>
      </div>

      {/* Cuadrícula de tarjetas de productos */}
      {cargando ? (
        <Spinner texto="Cargando catálogo de productos..." />
      ) : (
        <ProductosTable
          productos={productosFiltrados}
          onEditar={abrirEditar}
          onCambiarEstado={handleCambiarEstado}
          cargando={guardando}
        />
      )}

      {/* Modal flotante (Nuevo / Editar producto) */}
      {mostrarForm && (
        <ProductoForm
          producto={productoEditando}
          onGuardar={handleGuardar}
          onCancelar={cerrarForm}
          cargando={guardando}
        />
      )}
    </div>
  )
}

const selectStyle = {
  padding: '9px 14px',
  borderRadius: 8,
  border: '1px solid #e7e5e4',
  background: '#ffffff',
  fontSize: 13,
  color: '#44403c',
  cursor: 'pointer',
  outline: 'none',
}
