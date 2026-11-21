import { useCallback, useEffect, useState } from 'react'
import { Plus, Search, ChevronRight } from 'lucide-react'
import { insumosApi } from '../services/api.js'
import Alerta from '../components/Alerta.jsx'
import InsumoForm from '../components/InsumoForm.jsx'
import InsumosTable from '../components/InsumosTable.jsx'
import Spinner from '../components/Spinner.jsx'

export default function InsumosPage() {
  const [insumos, setInsumos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [errorGlobal, setErrorGlobal] = useState(null)
  const [exitoGlobal, setExitoGlobal] = useState(null)

  // Modal de creación / edición
  const [insumoEditando, setInsumoEditando] = useState(null)
  const [mostrarForm, setMostrarForm] = useState(false)

  // Filtros
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [filtroStock, setFiltroStock] = useState('todos')

  // ---------------------------------------------------------------------------
  // Carga de datos
  // ---------------------------------------------------------------------------
  const cargarInsumos = useCallback(async () => {
    setCargando(true)
    setErrorGlobal(null)
    try {
      const datos = await insumosApi.listar()
      setInsumos(Array.isArray(datos) ? datos : [])
    } catch (err) {
      setErrorGlobal(err.message || 'No se pudo cargar la lista de insumos.')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    let cancelado = false
    insumosApi
      .listar()
      .then((datos) => {
        if (!cancelado) setInsumos(Array.isArray(datos) ? datos : [])
      })
      .catch((err) => {
        if (!cancelado) setErrorGlobal(err.message || 'No se pudo cargar la lista de insumos.')
      })
      .finally(() => {
        if (!cancelado) setCargando(false)
      })

    return () => {
      cancelado = true
    }
  }, [])

  // ---------------------------------------------------------------------------
  // Filtrado local
  // ---------------------------------------------------------------------------
  const insumosFiltrados = insumos.filter((ins) => {
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase().trim()
      const matchNombre = (ins.nombre || '').toLowerCase().includes(q)
      const matchDesc = (ins.descripcion || '').toLowerCase().includes(q)
      if (!matchNombre && !matchDesc) return false
    }

    if (filtroEstado === 'activos' && !ins.activo) return false
    if (filtroEstado === 'inactivos' && ins.activo) return false

    const actual = Number(ins.stock_actual || 0)
    const minimo = Number(ins.stock_minimo || 0)

    if (filtroStock === 'agotado' && actual > 0) return false
    if (filtroStock === 'bajo' && !(actual > 0 && actual <= minimo)) return false
    if (filtroStock === 'ok' && !(actual > minimo)) return false

    return true
  })

  const activosCount = insumos.filter((i) => i.activo).length

  // ---------------------------------------------------------------------------
  // Acciones CRUD
  // ---------------------------------------------------------------------------
  async function handleGuardar(payload) {
    setGuardando(true)
    setExitoGlobal(null)
    setErrorGlobal(null)

    try {
      if (insumoEditando) {
        // 1. Actualizar datos base (nombre, descripción, stock mínimo, costo unitario)
        await insumosApi.editar(insumoEditando.id, {
          nombre: payload.nombre,
          descripcion: payload.descripcion,
          stock_minimo: payload.stock_minimo,
          costo_unitario: payload.costo_unitario,
        })

        // 2. Si el estado activo cambió en el formulario, sincronizar con el backend
        if (payload.activo !== insumoEditando.activo) {
          await insumosApi.cambiarEstado(insumoEditando.id, payload.activo)
        }

        setExitoGlobal(`Insumo "${payload.nombre}" actualizado correctamente.`)
      } else {
        // Crear nuevo insumo (stock_actual = 0, activo = true por omisión en BD)
        const res = await insumosApi.crear({
          nombre: payload.nombre,
          descripcion: payload.descripcion,
          unidad_medida: payload.unidad_medida,
          stock_minimo: payload.stock_minimo,
          costo_unitario: payload.costo_unitario,
        })

        // Si se indicó inactivo al crear
        if (!payload.activo && res?.insumo?.id) {
          await insumosApi.cambiarEstado(res.insumo.id, false)
        }

        setExitoGlobal(`Insumo "${payload.nombre}" registrado exitosamente en el catálogo.`)
      }

      setMostrarForm(false)
      setInsumoEditando(null)
      await cargarInsumos()
    } finally {
      setGuardando(false)
    }
  }

  async function handleCambiarEstado(ins) {
    setGuardando(true)
    setExitoGlobal(null)
    setErrorGlobal(null)

    const nuevoEstado = !ins.activo
    try {
      await insumosApi.cambiarEstado(ins.id, nuevoEstado)
      setExitoGlobal(
        `Insumo "${ins.nombre}" ${nuevoEstado ? 'activado' : 'desactivado'} correctamente.`
      )
      await cargarInsumos()
    } catch (err) {
      setErrorGlobal(err.message || 'No se pudo cambiar el estado del insumo.')
    } finally {
      setGuardando(false)
    }
  }

  function abrirCrear() {
    setInsumoEditando(null)
    setMostrarForm(true)
    setExitoGlobal(null)
    setErrorGlobal(null)
  }

  function abrirEditar(ins) {
    setInsumoEditando(ins)
    setMostrarForm(true)
    setExitoGlobal(null)
    setErrorGlobal(null)
  }

  function cerrarForm() {
    if (guardando) return
    setMostrarForm(false)
    setInsumoEditando(null)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#a8a29e' }}>
        <span>Sistema</span>
        <ChevronRight size={13} />
        <span style={{ color: '#57534e', fontWeight: 500 }}>Insumos</span>
      </div>

      {/* Cabecera principal */}
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
            Insumos
          </h2>
          <p style={{ fontSize: 13, color: '#78716c', marginTop: 4 }}>
            {activosCount} activos · {insumos.length} total
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
          Nuevo insumo
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
        {/* Input búsqueda */}
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
            placeholder="Buscar insumo..."
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

        {/* Selector de Estado */}
        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          style={selectStyle}
        >
          <option value="todos">Todos los estados</option>
          <option value="activos">Solo activos</option>
          <option value="inactivos">Solo inactivos</option>
        </select>

        {/* Selector de Nivel de Stock */}
        <select
          value={filtroStock}
          onChange={(e) => setFiltroStock(e.target.value)}
          style={selectStyle}
        >
          <option value="todos">Todo el stock</option>
          <option value="ok">Suficiente</option>
          <option value="bajo">Stock bajo</option>
          <option value="agotado">Agotado</option>
        </select>
      </div>

      {/* Tabla de insumos */}
      {cargando ? (
        <Spinner texto="Cargando insumos..." />
      ) : (
        <InsumosTable
          insumos={insumosFiltrados}
          onEditar={abrirEditar}
          onCambiarEstado={handleCambiarEstado}
          cargando={guardando}
        />
      )}

      {/* Modal flotante */}
      {mostrarForm && (
        <InsumoForm
          insumo={insumoEditando}
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
