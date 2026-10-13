import { useCallback, useEffect, useState } from 'react'
import { insumosApi, inventarioApi } from '../services/api.js'
import Alerta from '../components/Alerta.jsx'
import AlertasInventario from '../components/AlertasInventario.jsx'
import InventarioResumen from '../components/InventarioResumen.jsx'
import MovimientoForm from '../components/MovimientoForm.jsx'
import MovimientosTable from '../components/MovimientosTable.jsx'
import Spinner from '../components/Spinner.jsx'

/**
 * Página de inventario: resumen, alertas, formulario de movimiento e historial.
 */
export default function InventarioPage() {
  const [resumen, setResumen] = useState(null)
  const [alertas, setAlertas] = useState(null)
  const [movimientos, setMovimientos] = useState([])
  const [insumos, setInsumos] = useState([])

  const [cargandoResumen, setCargandoResumen] = useState(true)
  const [cargandoAlertas, setCargandoAlertas] = useState(true)
  const [cargandoMovimientos, setCargandoMovimientos] = useState(true)
  const [registrando, setRegistrando] = useState(false)

  const [error, setError] = useState(null)

  // ---------------------------------------------------------------------------
  // Carga de datos
  // ---------------------------------------------------------------------------
  const cargarResumen = useCallback(async () => {
    setCargandoResumen(true)
    try {
      const datos = await inventarioApi.resumen()
      setResumen(datos.resumen)
    } catch (err) {
      setError(err.message || 'No se pudo cargar el resumen.')
    } finally {
      setCargandoResumen(false)
    }
  }, [])

  const cargarAlertas = useCallback(async () => {
    setCargandoAlertas(true)
    try {
      const datos = await inventarioApi.alertas()
      setAlertas(datos.alertas)
    } catch (err) {
      setError(err.message || 'No se pudo cargar las alertas.')
    } finally {
      setCargandoAlertas(false)
    }
  }, [])

  const cargarMovimientos = useCallback(async () => {
    setCargandoMovimientos(true)
    try {
      const datos = await inventarioApi.movimientos()
      setMovimientos(datos)
    } catch (err) {
      setError(err.message || 'No se pudo cargar el historial.')
    } finally {
      setCargandoMovimientos(false)
    }
  }, [])

  const cargarInsumos = useCallback(async () => {
    try {
      const datos = await insumosApi.listar()
      setInsumos(datos)
    } catch {
      // silencioso, el error se muestra en InsumosPage si corresponde
    }
  }, [])

  // Refresco completo del inventario tras un movimiento
  const refrescarTodo = useCallback(() => {
    return Promise.all([cargarResumen(), cargarAlertas(), cargarMovimientos(), cargarInsumos()])
  }, [cargarResumen, cargarAlertas, cargarMovimientos, cargarInsumos])

  useEffect(() => {
    let cancelado = false

    Promise.allSettled([
      inventarioApi.resumen(),
      inventarioApi.alertas(),
      inventarioApi.movimientos(),
      insumosApi.listar(),
    ]).then(([resumenRes, alertasRes, movsRes, insumosRes]) => {
      if (cancelado) return

      if (resumenRes.status === 'fulfilled') {
        setResumen(resumenRes.value.resumen)
      } else {
        setError(resumenRes.reason.message || 'No se pudo cargar el resumen.')
      }
      setCargandoResumen(false)

      if (alertasRes.status === 'fulfilled') {
        setAlertas(alertasRes.value.alertas)
      } else {
        setError((prev) => prev || alertasRes.reason.message || 'No se pudo cargar las alertas.')
      }
      setCargandoAlertas(false)

      if (movsRes.status === 'fulfilled') {
        setMovimientos(movsRes.value)
      } else {
        setError((prev) => prev || movsRes.reason.message || 'No se pudo cargar el historial.')
      }
      setCargandoMovimientos(false)

      if (insumosRes.status === 'fulfilled') {
        setInsumos(insumosRes.value)
      }
    })

    return () => {
      cancelado = true
    }
  }, [])

  // ---------------------------------------------------------------------------
  // Registrar movimiento
  // ---------------------------------------------------------------------------
  async function handleRegistrar(payload) {
    setRegistrando(true)
    setError(null)
    try {
      const resultado = await inventarioApi.registrarMovimiento(payload)
      // Solo refrescamos si el servidor confirma el movimiento
      await refrescarTodo()
      return resultado
    } finally {
      setRegistrando(false)
    }
    // Si hay error, lanza y MovimientoForm lo captura y muestra
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="pagina">
      <div className="pagina-header">
        <h2>Inventario</h2>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={refrescarTodo}
          disabled={cargandoResumen || cargandoAlertas}
          title="Actualizar datos"
        >
          ↻ Actualizar
        </button>
      </div>

      <Alerta mensaje={error} tipo="error" onCerrar={() => setError(null)} />

      {/* Resumen */}
      <section className="seccion">
        <h3 className="seccion-titulo">Resumen</h3>
        {cargandoResumen ? (
          <Spinner texto="Cargando resumen…" />
        ) : (
          <InventarioResumen resumen={resumen} cargando={cargandoResumen} />
        )}
      </section>

      {/* Alertas */}
      <section className="seccion">
        <h3 className="seccion-titulo">
          Alertas de stock
          {alertas && alertas.length > 0 && (
            <span className="badge badge-agotado badge-count">{alertas.length}</span>
          )}
        </h3>
        {cargandoAlertas ? (
          <Spinner texto="Cargando alertas…" />
        ) : (
          <AlertasInventario alertas={alertas} cargando={cargandoAlertas} />
        )}
      </section>

      {/* Formulario de movimiento */}
      <section className="seccion">
        <h3 className="seccion-titulo">Registrar movimiento</h3>
        <MovimientoForm
          insumos={insumos}
          onRegistrar={handleRegistrar}
          cargando={registrando}
        />
      </section>

      {/* Historial */}
      <section className="seccion">
        <h3 className="seccion-titulo">
          Historial de movimientos
          <span className="seccion-nota">(últimos 100)</span>
        </h3>
        {cargandoMovimientos ? (
          <Spinner texto="Cargando historial…" />
        ) : (
          <MovimientosTable movimientos={movimientos} cargando={cargandoMovimientos} />
        )}
      </section>
    </div>
  )
}

