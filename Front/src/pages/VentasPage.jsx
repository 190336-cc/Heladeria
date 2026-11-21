/**
 * VentasPage — Punto de venta (POS).
 * Totalmente conectado al backend: valida recetas, descuenta insumos
 * y registra la venta de manera atómica con transacción.
 */
import { useEffect, useMemo, useState } from 'react'
import { Plus, Minus, Check, CheckCircle, AlertTriangle, ShoppingCart, Calendar } from 'lucide-react'
import { productosApi, ventasApi, eventosApi } from '../services/api.js'

const EMOJIS = {
  'Helado de Vainilla': '🍦', 'Helado de Chocolate': '🍫',
  'Helado de Fresa': '🍓', 'Helado de Mango': '🥭',
  'Helado de Limón': '🍋', 'Paleta de Cajeta': '🍮',
  'Sundae Oreo': '🍪', 'Helado de Guanábana': '🌿',
}

function fmtCur(n) {
  return `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function VentasPage() {
  const [productos, setProductos] = useState([])
  const [eventos, setEventos] = useState([])
  const [eventoSeleccionado, setEventoSeleccionado] = useState('')
  const [cargando, setCargando] = useState(true)
  const [orden, setOrden] = useState([]) // [{productoId, cantidad}]
  const [pago, setPago] = useState('efectivo')
  const [procesando, setProcesando] = useState(false)
  const [exito, setExito] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelado = false
    Promise.allSettled([
      productosApi.listar(),
      eventosApi.listar({ vigentes: true }),
    ]).then(([prodRes, evRes]) => {
      if (cancelado) return
      if (prodRes.status === 'fulfilled') {
        const data = prodRes.value
        setProductos(Array.isArray(data) ? data : data.data || [])
      }
      if (evRes.status === 'fulfilled') {
        setEventos(Array.isArray(evRes.value) ? evRes.value : [])
      }
      setCargando(false)
    })
    return () => { cancelado = true }
  }, [])

  const disponibles = useMemo(() =>
    productos.filter((p) => p.activo === true || p.estado === 'activo'),
    [productos]
  )

  // Filtrar eventos estrictamente vigentes hoy (según rango fecha_inicio a fecha_fin)
  const eventosVigentes = useMemo(() => {
    const ahora = new Date()
    const hoyDate = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate())

    return eventos.filter((ev) => {
      if (ev.estado === 'cancelado') return false
      if (ev.es_vigente !== undefined) return Boolean(ev.es_vigente)

      if (!ev.fecha_inicio) return false
      const dIni = new Date(ev.fecha_inicio)
      const iniDate = new Date(dIni.getFullYear(), dIni.getMonth(), dIni.getDate())

      let finDate = iniDate
      if (ev.fecha_fin) {
        const dFin = new Date(ev.fecha_fin)
        finDate = new Date(dFin.getFullYear(), dFin.getMonth(), dFin.getDate())
      }

      return hoyDate >= iniDate && hoyDate <= finDate
    })
  }, [eventos])

  const total = useMemo(() =>
    orden.reduce((s, item) => {
      const p = productos.find((pr) => pr.id === item.productoId)
      return s + Number(p?.precio_venta || p?.precio || 0) * item.cantidad
    }, 0),
    [orden, productos]
  )

  function addItem(prodId) {
    setOrden((prev) => {
      const existe = prev.find((i) => i.productoId === prodId)
      return existe
        ? prev.map((i) => i.productoId === prodId ? { ...i, cantidad: i.cantidad + 1 } : i)
        : [...prev, { productoId: prodId, cantidad: 1 }]
    })
    setError(null)
    setExito(null)
  }

  function setQty(prodId, qty) {
    if (qty <= 0) setOrden((prev) => prev.filter((i) => i.productoId !== prodId))
    else setOrden((prev) => prev.map((i) => i.productoId === prodId ? { ...i, cantidad: qty } : i))
    setError(null)
    setExito(null)
  }

  async function confirmar() {
    if (orden.length === 0 || procesando) return
    setProcesando(true)
    setError(null)
    setExito(null)

    const payload = {
      usuario_id: 1,
      evento_id: eventoSeleccionado ? Number(eventoSeleccionado) : null,
      metodo_pago: pago,
      items: orden.map((it) => ({
        producto_id: it.productoId,
        cantidad: it.cantidad,
      })),
    }

    try {
      const resp = await ventasApi.crear(payload)
      const insumosAfectados = resp.venta?.insumos_descontados?.length || 0
      setExito({
        texto: `Venta #${resp.venta?.id} registrada exitosamente por ${fmtCur(resp.venta?.total || total)}. ${
          insumosAfectados > 0 ? `Se descontaron automáticamente ${insumosAfectados} insumo(s) del almacén.` : ''
        }`,
      })
      setOrden([])
    } catch (err) {
      setError(err.message || 'No se pudo procesar la venta.')
    } finally {
      setProcesando(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Cabecera */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, color: '#1c1917' }}>
            Punto de venta
          </h2>
          <span style={{
            background: '#d1fae5', color: '#065f46',
            border: '1px solid #a7f3d0',
            borderRadius: 6, padding: '3px 10px',
            fontSize: 11, fontWeight: 700, letterSpacing: '0.05em',
          }}>SISTEMA EN VIVO</span>
        </div>
        <p style={{ fontSize: 13, color: '#78716c' }}>
          Selecciona productos para cobrar. El stock de insumos se descuenta automáticamente del inventario según las recetas registradas.
        </p>
      </div>

      {exito && (
        <div style={{
          background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: 10,
          padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <CheckCircle size={18} style={{ color: '#059669', flexShrink: 0 }} />
          <p style={{ fontSize: 13, fontWeight: 500, color: '#065f46' }}>{exito.texto}</p>
        </div>
      )}

      {error && (
        <div style={{
          background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 10,
          padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <AlertTriangle size={18} style={{ color: '#dc2626', flexShrink: 0 }} />
          <p style={{ fontSize: 13, fontWeight: 500, color: '#991b1b' }}>{error}</p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16, alignItems: 'start' }}>

        {/* ── Catálogo ── */}
        <div>
          {cargando ? (
            <p style={{ fontSize: 13, color: '#a8a29e' }}>Cargando catálogo de productos…</p>
          ) : disponibles.length === 0 ? (
            <p style={{ fontSize: 13, color: '#a8a29e' }}>No hay productos activos en este momento.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 12 }}>
              {disponibles.map((prod) => (
                <button
                  key={prod.id}
                  onClick={() => addItem(prod.id)}
                  style={{
                    background: 'white', border: '1px solid #e7e5e4',
                    borderRadius: 12, padding: 16, textAlign: 'left',
                    cursor: 'pointer', transition: 'all 0.15s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#6B3F1C'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e7e5e4'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)' }}
                >
                  <div style={{ fontSize: 32, marginBottom: 8 }}>{EMOJIS[prod.nombre] || '🍦'}</div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#1c1917', lineHeight: 1.3 }}>{prod.nombre}</p>
                  <p style={{ fontSize: 20, fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#6B3F1C', marginTop: 6 }}>
                    {fmtCur(prod.precio_venta || prod.precio)}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Panel de Orden ── */}
        <div style={{
          background: 'white', borderRadius: 12, border: '1px solid #e7e5e4',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)', padding: 20,
          display: 'flex', flexDirection: 'column', gap: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #f5f5f4', paddingBottom: 12 }}>
            <ShoppingCart size={16} style={{ color: '#78716c' }} />
            <h3 style={{ fontSize: 15, fontWeight: 600, color: '#1c1917' }}>Orden actual</h3>
          </div>

          {/* Selector de Evento Vigente */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: '#78716c', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Calendar size={12} /> Asignar a evento vigente hoy:
            </label>
            <select
              value={eventoSeleccionado}
              onChange={(e) => setEventoSeleccionado(e.target.value)}
              style={{
                border: '1px solid #e7e5e4', borderRadius: 8,
                padding: '6px 8px', fontSize: 12, background: 'white', outline: 'none',
              }}
            >
              <option value="">Venta habitual / mostrador (sin evento)</option>
              {eventosVigentes.map((ev) => {
                const iniFmt = new Date(ev.fecha_inicio).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
                const finFmt = ev.fecha_fin ? new Date(ev.fecha_fin).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }) : null
                const rango = finFmt && finFmt !== iniFmt ? `${iniFmt} al ${finFmt}` : iniFmt
                return (
                  <option key={ev.id} value={ev.id}>
                    🎟️ {ev.nombre} ({rango})
                  </option>
                )
              })}
            </select>
            {eventosVigentes.length === 0 && (
              <span style={{ fontSize: 11, color: '#a8a29e', fontStyle: 'italic' }}>
                No hay eventos activos programados para el día de hoy.
              </span>
            )}
          </div>

          {orden.length === 0 ? (
            <p style={{ fontSize: 13, color: '#a8a29e', textAlign: 'center', padding: '24px 0' }}>
              Selecciona productos del catálogo
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {orden.map((item) => {
                const prod = productos.find((p) => p.id === item.productoId)
                const precio = Number(prod?.precio_venta || prod?.precio || 0)
                return (
                  <div key={item.productoId} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 500, color: '#1c1917', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {prod?.nombre}
                      </p>
                      <p style={{ fontSize: 11, color: '#a8a29e', fontFamily: 'var(--font-mono)' }}>
                        {fmtCur(precio)} c/u
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <button
                        onClick={() => setQty(item.productoId, item.cantidad - 1)}
                        style={{
                          width: 24, height: 24, borderRadius: '50%', border: 'none',
                          background: '#f5f5f4', color: '#57534e', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      ><Minus size={11} /></button>
                      <span style={{ width: 24, textAlign: 'center', fontSize: 13, fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                        {item.cantidad}
                      </span>
                      <button
                        onClick={() => setQty(item.productoId, item.cantidad + 1)}
                        style={{
                          width: 24, height: 24, borderRadius: '50%', border: 'none',
                          background: '#f5f5f4', color: '#57534e', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      ><Plus size={11} /></button>
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: '#1c1917', width: 60, textAlign: 'right' }}>
                      {fmtCur(precio * item.cantidad)}
                    </span>
                  </div>
                )
              })}
            </div>
          )}

          {/* Total y método de pago */}
          <div style={{ borderTop: '1px solid #f5f5f4', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, color: '#78716c' }}>Total a pagar</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700, color: '#6B3F1C' }}>{fmtCur(total)}</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
              {['efectivo', 'tarjeta', 'transferencia'].map((m) => (
                <button
                  key={m}
                  onClick={() => setPago(m)}
                  style={{
                    padding: '6px 4px', borderRadius: 8, border: 'none',
                    background: pago === m ? '#6B3F1C' : '#f5f5f4',
                    color: pago === m ? '#FFF8F2' : '#57534e',
                    fontSize: 11, fontWeight: 500, cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {m === 'transferencia' ? 'Transfer.' : m.charAt(0).toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>

            <button
              onClick={confirmar}
              disabled={orden.length === 0 || procesando}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                width: '100%', padding: '11px', borderRadius: 8, border: 'none',
                background: '#6B3F1C', color: '#FFF8F2',
                fontSize: 14, fontWeight: 600, cursor: 'pointer',
                opacity: (orden.length === 0 || procesando) ? 0.45 : 1,
              }}
            >
              <Check size={16} />
              {procesando ? 'Procesando venta…' : 'Cobrar y registrar venta'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
