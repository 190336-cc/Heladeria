import { useCallback, useEffect, useState } from 'react'
import { insumosApi } from '../services/api.js'
import Alerta from '../components/Alerta.jsx'
import InsumoForm from '../components/InsumoForm.jsx'
import InsumosTable from '../components/InsumosTable.jsx'
import Spinner from '../components/Spinner.jsx'

const FILTROS_ESTADO = [
  { valor: 'todos', etiqueta: 'Todos' },
  { valor: 'activos', etiqueta: 'Activos' },
  { valor: 'inactivos', etiqueta: 'Inactivos' },
]

const FILTROS_NIVEL = [
  { valor: 'todos', etiqueta: 'Cualquier nivel' },
  { valor: 'agotado', etiqueta: 'Agotados' },
  { valor: 'bajo', etiqueta: 'Stock bajo' },
  { valor: 'ok', etiqueta: 'Stock suficiente' },
]

/**
 * Página principal del módulo de Insumos.
 */
export default function InsumosPage() {
  const [insumos, setInsumos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [errorGlobal, setErrorGlobal] = useState(null)
  const [exitoGlobal, setExitoGlobal] = useState(null)

  // Formulario
  const [insumoEditando, setInsumoEditando] = useState(null) // null = creación, objeto = edición
  const [mostrarForm, setMostrarForm] = useState(false)

  // Filtros
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('activos')
  const [filtroNivel, setFiltroNivel] = useState('todos')

  // ---------------------------------------------------------------------------
  // Carga de datos
  // ---------------------------------------------------------------------------
  const cargarInsumos = useCallback(async () => {
    setCargando(true)
    setErrorGlobal(null)
    try {
      const datos = await insumosApi.listar()
      setInsumos(datos)
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
        if (!cancelado) setInsumos(datos)
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
  // Filtrado local (evita roundtrips innecesarios al backend)
  // ---------------------------------------------------------------------------
  const insumosFiltrados = insumos.filter((ins) => {
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase()
      if (!ins.nombre.toLowerCase().includes(q)) return false
    }
    if (filtroEstado === 'activos' && !ins.activo) return false
    if (filtroEstado === 'inactivos' && ins.activo) return false

    const actual = Number(ins.stock_actual)
    const minimo = Number(ins.stock_minimo)
    if (filtroNivel === 'agotado' && actual !== 0) return false
    if (filtroNivel === 'bajo' && !(actual > 0 && actual <= minimo)) return false
    if (filtroNivel === 'ok' && !(actual > minimo)) return false

    return true
  })

  // ---------------------------------------------------------------------------
  // Acciones CRUD
  // ---------------------------------------------------------------------------
  async function handleGuardar(payload) {
    setGuardando(true)
    setExitoGlobal(null)
    try {
      if (insumoEditando) {
        await insumosApi.editar(insumoEditando.id, payload)
        setExitoGlobal(`Insumo "${payload.nombre}" actualizado correctamente.`)
      } else {
        await insumosApi.crear(payload)
        setExitoGlobal(`Insumo "${payload.nombre}" creado correctamente.`)
      }
      setMostrarForm(false)
      setInsumoEditando(null)
      await cargarInsumos()
    } finally {
      setGuardando(false)
    }
    // Si hay error, handleGuardar lanza y el form lo captura
  }

  async function handleCambiarEstado(ins) {
    setGuardando(true)
    setExitoGlobal(null)
    setErrorGlobal(null)
    try {
      await insumosApi.cambiarEstado(ins.id, !ins.activo)
      setExitoGlobal(
        `Insumo "${ins.nombre}" ${!ins.activo ? 'activado' : 'desactivado'} correctamente.`
      )
      await cargarInsumos()
    } catch (err) {
      setErrorGlobal(err.message || 'No se pudo cambiar el estado.')
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
    setMostrarForm(false)
    setInsumoEditando(null)
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="pagina">
      <div className="pagina-header">
        <h2>Insumos</h2>
        <button type="button" className="btn btn-primario" onClick={abrirCrear}>
          + Nuevo insumo
        </button>
      </div>

      <Alerta mensaje={errorGlobal} tipo="error" onCerrar={() => setErrorGlobal(null)} />
      <Alerta mensaje={exitoGlobal} tipo="exito" onCerrar={() => setExitoGlobal(null)} />

      {mostrarForm && (
        <div className="form-panel">
          <InsumoForm
            insumo={insumoEditando}
            onGuardar={handleGuardar}
            onCancelar={cerrarForm}
            cargando={guardando}
          />
        </div>
      )}

      {/* Filtros */}
      <div className="filtros-barra">
        <input
          type="search"
          className="filtro-busqueda"
          placeholder="Buscar por nombre…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          aria-label="Buscar insumo por nombre"
        />

        <div className="filtro-grupo">
          <span className="filtro-label">Estado:</span>
          {FILTROS_ESTADO.map((f) => (
            <button
              key={f.valor}
              type="button"
              className={`btn btn-sm ${filtroEstado === f.valor ? 'btn-primario' : 'btn-ghost'}`}
              onClick={() => setFiltroEstado(f.valor)}
            >
              {f.etiqueta}
            </button>
          ))}
        </div>

        <div className="filtro-grupo">
          <span className="filtro-label">Stock:</span>
          {FILTROS_NIVEL.map((f) => (
            <button
              key={f.valor}
              type="button"
              className={`btn btn-sm ${filtroNivel === f.valor ? 'btn-primario' : 'btn-ghost'}`}
              onClick={() => setFiltroNivel(f.valor)}
            >
              {f.etiqueta}
            </button>
          ))}
        </div>

        <span className="filtro-contador">
          {insumosFiltrados.length} de {insumos.length}
        </span>
      </div>

      {cargando ? (
        <Spinner texto="Cargando insumos…" />
      ) : (
        <InsumosTable
          insumos={insumosFiltrados}
          onEditar={abrirEditar}
          onCambiarEstado={handleCambiarEstado}
          cargando={guardando}
        />
      )}
    </div>
  )
}

