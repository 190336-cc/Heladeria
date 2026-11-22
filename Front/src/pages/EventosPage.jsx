/**
 * EventosPage — Gestión de eventos externos (ferias, cumpleaños, eventos corporativos).
 * Conectado en vivo al backend: persiste eventos y calcula en tiempo real
 * las ventas generadas por cada evento.
 */
import { useEffect, useState, useMemo } from 'react'
import { Plus, Calendar, MapPin, CheckCircle, AlertTriangle } from 'lucide-react'
import { eventosApi } from '../services/api.js'
import { fmtMoneda, fmtFecha } from '../utils/formatters.js'

function FieldRow({ label, children, required }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 13, fontWeight: 500, color: '#57534e' }}>
        {label}{required && <span style={{ color: '#ef4444', marginLeft: 2 }}>*</span>}
      </label>
      {children}
    </div>
  )
}

const inputStyle = {
  border: '1px solid #e7e5e4', borderRadius: 8, padding: '7px 10px',
  fontSize: 13, outline: 'none', width: '100%', background: 'white',
}

export default function EventosPage() {
  const [eventos, setEventos] = useState([])
  const [tipos, setTipos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [agregando, setAgregando] = useState(false)
  const [mensaje, setMensaje] = useState(null)
  const [error, setError] = useState(null)

  const [form, setForm] = useState({
    nombre: '',
    tipo_evento_id: '',
    fecha_inicio: '',
    fecha_fin: '',
    ubicacion: '',
    observaciones: '',
    costo_evento: '',
    estado: 'programado',
  })

  useEffect(() => {
    let cancelado = false
    Promise.allSettled([eventosApi.listar(), eventosApi.tipos()])
      .then(([evRes, tipRes]) => {
        if (cancelado) return
        if (evRes.status === 'fulfilled') {
          setEventos(Array.isArray(evRes.value) ? evRes.value : [])
        }
        if (tipRes.status === 'fulfilled') {
          const tList = Array.isArray(tipRes.value) ? tipRes.value : []
          setTipos(tList)
          if (tList.length > 0) {
            setForm((prev) => (prev.tipo_evento_id ? prev : { ...prev, tipo_evento_id: tList[0].id }))
          }
        }
        setCargando(false)
      })
      .catch(() => {
        if (!cancelado) setCargando(false)
      })
    return () => { cancelado = true }
  }, [])

  const totalVentas = useMemo(() =>
    eventos.reduce((s, e) => s + Number(e.ventas_totales || 0), 0),
    [eventos]
  )

  function handleChange(campo, valor) {
    setForm((prev) => ({ ...prev, [campo]: valor }))
    setError(null)
  }

  async function handleGuardar() {
    if (!form.nombre.trim() || !form.fecha_inicio) {
      setError('El nombre y la fecha de inicio son requeridos.')
      return
    }

    setGuardando(true)
    setError(null)
    setMensaje(null)

    const payload = {
      tipo_evento_id: form.tipo_evento_id ? Number(form.tipo_evento_id) : undefined,
      nombre: form.nombre.trim(),
      fecha_inicio: form.fecha_inicio,
      fecha_fin: form.fecha_fin || null,
      ubicacion: form.ubicacion.trim() || null,
      observaciones: form.observaciones.trim() || null,
      costo_evento: Number(form.costo_evento) || 0,
      estado: form.estado || 'programado',
    }

    try {
      await eventosApi.crear(payload)
      setMensaje({ tipo: 'ok', texto: `Evento "${payload.nombre}" registrado exitosamente.` })
      setAgregando(false)
      setForm({
        nombre: '',
        tipo_evento_id: tipos[0]?.id || '',
        fecha_inicio: '',
        fecha_fin: '',
        ubicacion: '',
        observaciones: '',
        costo_evento: '',
        estado: 'programado',
      })
      const eventosActualizados = await eventosApi.listar()
      setEventos(Array.isArray(eventosActualizados) ? eventosActualizados : [])
    } catch (err) {
      setError(err.message || 'Error al guardar el evento.')
    } finally {
      setGuardando(false)
    }
  }

  function cancelar() {
    setAgregando(false)
    setError(null)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Cabecera */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, color: '#1c1917' }}>
              Eventos y Festivales
            </h2>
            <span style={{
              background: '#d1fae5', color: '#065f46',
              border: '1px solid #a7f3d0',
              borderRadius: 6, padding: '3px 10px',
              fontSize: 11, fontWeight: 700, letterSpacing: '0.05em',
            }}>SISTEMA EN VIVO</span>
          </div>
          <p style={{ fontSize: 13, color: '#78716c' }}>
            {eventos.length} eventos registrados · {fmtMoneda(totalVentas)} acumulado en ventas
          </p>
        </div>
        <button
          onClick={() => { setAgregando(true); setError(null); setMensaje(null); }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 8, border: 'none',
            background: '#6B3F1C', color: '#FFF8F2',
            fontSize: 13, fontWeight: 500, cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <Plus size={14} /> Nuevo evento
        </button>
      </div>

      {mensaje && (
        <div style={{
          background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: 10,
          padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <CheckCircle size={18} style={{ color: '#059669', flexShrink: 0 }} />
          <p style={{ fontSize: 13, fontWeight: 500, color: '#065f46' }}>{mensaje.texto}</p>
        </div>
      )}

      {/* Formulario de nuevo evento */}
      {agregando && (
        <div style={{
          background: 'white', borderRadius: 12, border: '1px solid #e7e5e4',
          boxShadow: '0 4px 16px rgba(0,0,0,0.06)', padding: 24,
        }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: '#1c1917', marginBottom: 16 }}>Nuevo evento</h3>

          {error && (
            <div style={{
              background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8,
              padding: '10px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <AlertTriangle size={16} style={{ color: '#dc2626' }} />
              <p style={{ fontSize: 13, color: '#991b1b' }}>{error}</p>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
              <FieldRow label="Nombre del evento" required>
                <input style={inputStyle} value={form.nombre} onChange={(e) => handleChange('nombre', e.target.value)} placeholder="Ej. Feria de Primavera 2027" />
              </FieldRow>
              <FieldRow label="Categoría de evento" required>
                <select
                  style={inputStyle}
                  value={form.tipo_evento_id}
                  onChange={(e) => handleChange('tipo_evento_id', e.target.value)}
                >
                  {tipos.map((t) => (
                    <option key={t.id} value={t.id}>{t.nombre}</option>
                  ))}
                </select>
              </FieldRow>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <FieldRow label="Fecha de inicio" required>
                <input type="date" style={inputStyle} value={form.fecha_inicio} onChange={(e) => handleChange('fecha_inicio', e.target.value)} />
              </FieldRow>
              <FieldRow label="Fecha de fin">
                <input type="date" style={inputStyle} value={form.fecha_fin} onChange={(e) => handleChange('fecha_fin', e.target.value)} />
              </FieldRow>
              <FieldRow label="Costo operativo ($)">
                <input type="number" min="0" step="0.01" style={inputStyle} value={form.costo_evento} onChange={(e) => handleChange('costo_evento', e.target.value)} placeholder="0.00" />
              </FieldRow>
            </div>

            <FieldRow label="Ubicación">
              <input style={inputStyle} value={form.ubicacion} onChange={(e) => handleChange('ubicacion', e.target.value)} placeholder="Dirección o punto de venta" />
            </FieldRow>

            <FieldRow label="Observaciones">
              <textarea
                rows={2} style={{ ...inputStyle, resize: 'vertical' }}
                value={form.observaciones}
                onChange={(e) => handleChange('observaciones', e.target.value)}
                placeholder="Notas de logística o requerimientos especiales…"
              />
            </FieldRow>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={cancelar} disabled={guardando} style={{
                padding: '8px 16px', borderRadius: 8, border: '1px solid #e7e5e4',
                background: 'white', fontSize: 13, fontWeight: 500, color: '#57534e', cursor: 'pointer',
              }}>Cancelar</button>
              <button
                onClick={handleGuardar}
                disabled={guardando || !form.nombre.trim() || !form.fecha_inicio}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '8px 18px', borderRadius: 8, border: 'none',
                  background: '#6B3F1C', color: '#FFF8F2',
                  fontSize: 13, fontWeight: 500, cursor: 'pointer',
                  opacity: (guardando || !form.nombre.trim() || !form.fecha_inicio) ? 0.45 : 1,
                }}
              >
                {guardando ? 'Guardando…' : 'Guardar evento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grid de eventos */}
      {cargando ? (
        <p style={{ fontSize: 13, color: '#a8a29e' }}>Cargando eventos…</p>
      ) : eventos.length === 0 ? (
        <div style={{
          background: 'white', borderRadius: 12, border: '1px solid #e7e5e4',
          padding: 40, textAlign: 'center', color: '#78716c',
        }}>
          <Calendar size={32} style={{ margin: '0 auto 10px', color: '#d6d3d1' }} />
          <p style={{ fontWeight: 600 }}>No hay eventos registrados aún</p>
          <p style={{ fontSize: 12, color: '#a8a29e', marginTop: 4 }}>
            Haz clic en "Nuevo evento" para registrar una feria, cumpleaños o exposición.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 16 }}>
          {eventos.map((ev) => {
            const esFuturo = ev.fecha_inicio ? new Date(ev.fecha_inicio) > new Date() : false
            const ventasTotal = Number(ev.ventas_totales || 0)
            return (
              <div key={ev.id} style={{
                background: 'white', borderRadius: 12,
                border: '1px solid #e7e5e4',
                boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                overflow: 'hidden',
              }}>
                <div style={{ height: 4, background: esFuturo ? '#E8A44A' : '#6B3F1C' }} />
                <div style={{ padding: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                    <div>
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#E8A44A', textTransform: 'uppercase' }}>
                        {ev.tipo_evento_nombre || 'Evento'}
                      </span>
                      <h3 style={{ fontSize: 15, fontWeight: 600, color: '#1c1917', lineHeight: 1.3, marginTop: 2 }}>{ev.nombre}</h3>
                    </div>
                    <span style={{
                      flexShrink: 0,
                      background: esFuturo ? '#fef3c7' : '#f5f5f4',
                      color: esFuturo ? '#92400e' : '#57534e',
                      border: esFuturo ? '1px solid #fcd34d' : '1px solid #e7e5e4',
                      borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600,
                    }}>
                      {ev.estado === 'programado' ? (esFuturo ? 'Próximo' : 'En fecha') : ev.estado}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
                    <p style={{ fontSize: 12, color: '#78716c', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Calendar size={12} /> {fmtFecha(ev.fecha_inicio)}
                    </p>
                    {ev.ubicacion && (
                      <p style={{ fontSize: 12, color: '#78716c', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <MapPin size={12} /> {ev.ubicacion}
                      </p>
                    )}
                  </div>

                  {ev.observaciones && (
                    <p style={{ fontSize: 12, color: '#a8a29e', fontStyle: 'italic', marginBottom: 12 }}>
                      "{ev.observaciones}"
                    </p>
                  )}

                  <div style={{ borderTop: '1px solid #f5f5f4', paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div>
                      <p style={{ fontSize: 11, color: '#a8a29e' }}>Ventas generadas</p>
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, color: ventasTotal > 0 ? '#059669' : '#78716c' }}>
                        {fmtMoneda(ventasTotal)}
                      </p>
                    </div>
                    <span style={{ fontSize: 11, color: '#a8a29e' }}>
                      {ev.transacciones_count || 0} tickets
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
