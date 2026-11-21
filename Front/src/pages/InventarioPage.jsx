import { useCallback, useEffect, useState } from 'react'
import { ChevronRight, RotateCw } from 'lucide-react'
import { insumosApi, inventarioApi } from '../services/api.js'
import Alerta from '../components/Alerta.jsx'
import AlertasInventario from '../components/AlertasInventario.jsx'
import InventarioResumen from '../components/InventarioResumen.jsx'
import MovimientoForm from '../components/MovimientoForm.jsx'
import MovimientosTable from '../components/MovimientosTable.jsx'

export default function InventarioPage() {
  const [resumen, setResumen] = useState(null)
  const [alertas, setAlertas] = useState(null)
  const [movimientos, setMovimientos] = useState([])
  const [insumos, setInsumos] = useState([])

  const [cargandoResumen, setCargandoResumen] = useState(true)
  const [cargandoAlertas, setCargandoAlertas] = useState(true)
  const [cargandoMovimientos, setCargandoMovimientos] = useState(true)
  const [registrando, setRegistrando] = useState(false)
  const [refrescando, setRefrescando] = useState(false)

  const [errorGlobal, setErrorGlobal] = useState(null)

  // ---------------------------------------------------------------------------
  // Carga y Refresco de Datos
  // ---------------------------------------------------------------------------
  const refrescarTodo = useCallback(async () => {
    setRefrescando(true)
    setErrorGlobal(null)

    try {
      const [resumenData, alertasData, movsData, insumosData] = await Promise.all([
        inventarioApi.resumen(),
        inventarioApi.alertas(),
        inventarioApi.movimientos(),
        insumosApi.listar(),
      ])

      setResumen(resumenData?.resumen ?? null)
      setAlertas(alertasData?.alertas ?? [])
      setMovimientos(Array.isArray(movsData) ? movsData : [])
      setInsumos(Array.isArray(insumosData) ? insumosData : [])
    } catch (err) {
      setErrorGlobal(err.message || 'Error al actualizar los datos de inventario.')
    } finally {
      setRefrescando(false)
      setCargandoResumen(false)
      setCargandoAlertas(false)
      setCargandoMovimientos(false)
    }
  }, [])

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
        setResumen(resumenRes.value?.resumen ?? null)
      } else {
        setErrorGlobal(resumenRes.reason?.message || 'No se pudo cargar el resumen.')
      }
      setCargandoResumen(false)

      if (alertasRes.status === 'fulfilled') {
        setAlertas(alertasRes.value?.alertas ?? [])
      }
      setCargandoAlertas(false)

      if (movsRes.status === 'fulfilled') {
        setMovimientos(Array.isArray(movsRes.value) ? movsRes.value : [])
      }
      setCargandoMovimientos(false)

      if (insumosRes.status === 'fulfilled') {
        setInsumos(Array.isArray(insumosRes.value) ? insumosRes.value : [])
      }
    })

    return () => {
      cancelado = true
    }
  }, [])

  // ---------------------------------------------------------------------------
  // Registro de Movimiento
  // ---------------------------------------------------------------------------
  async function handleRegistrar(payload) {
    setRegistrando(true)
    setErrorGlobal(null)
    try {
      const respuesta = await inventarioApi.registrarMovimiento(payload)
      // Refresco inmediato de KPIs, alertas, insumos e historial
      await refrescarTodo()
      return respuesta
    } finally {
      setRegistrando(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#a8a29e' }}>
        <span>Sistema</span>
        <ChevronRight size={13} />
        <span style={{ color: '#57534e', fontWeight: 500 }}>Inventario</span>
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
            Inventario y Movimientos
          </h2>
          <p style={{ fontSize: 13, color: '#78716c', marginTop: 4 }}>
            Control de stock y registro de entradas, mermas y ajustes
          </p>
        </div>

        <button
          type="button"
          onClick={refrescarTodo}
          disabled={refrescando || cargandoResumen}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 14px',
            borderRadius: 8,
            border: '1px solid #e7e5e4',
            background: '#ffffff',
            color: '#57534e',
            fontSize: 13,
            fontWeight: 500,
            cursor: refrescando ? 'not-allowed' : 'pointer',
            transition: 'background 0.15s',
          }}
          title="Actualizar datos del inventario"
        >
          <RotateCw size={14} className={refrescando ? 'animate-spin' : ''} />
          {refrescando ? 'Actualizando...' : 'Actualizar'}
        </button>
      </div>

      <Alerta mensaje={errorGlobal} tipo="error" onCerrar={() => setErrorGlobal(null)} />

      {/* 1. Tarjetas de Resumen (KPIs) */}
      <InventarioResumen resumen={resumen} cargando={cargandoResumen} />

      {/* 2. Alertas de Stock Mínimo */}
      <AlertasInventario alertas={alertas} cargando={cargandoAlertas} />

      {/* 3. Cuadrícula de 2 columnas: Registro a la izquierda, Historial a la derecha */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: 20,
          alignItems: 'start',
        }}
      >
        <MovimientoForm
          insumos={insumos}
          onRegistrar={handleRegistrar}
          cargando={registrando || refrescando}
        />

        <MovimientosTable
          movimientos={movimientos}
          cargando={cargandoMovimientos}
        />
      </div>
    </div>
  )
}
