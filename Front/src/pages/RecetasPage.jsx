/**
 * RecetasPage — Gestión de recetas de productos.
 * Permite asignar nombre a la receta, agregar/editar cantidades inline,
 * quitar ingredientes y calcular en tiempo real costo y margen de ganancia.
 */
import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2, Save, BookOpen, AlertCircle, CheckCircle } from 'lucide-react'
import { productosApi, insumosApi, recetasApi } from '../services/api.js'

const EMOJIS = {
  'Helado de Vainilla': '🍦', 'Helado de Chocolate': '🍫',
  'Helado de Fresa': '🍓', 'Helado de Mango': '🥭',
  'Helado de Limón': '🍋', 'Paleta de Cajeta': '🍮',
  'Sundae Oreo': '🍪', 'Helado de Guanábana': '🌿',
}

function fmtCur(n) {
  return `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function RecetasPage() {
  const [productos, setProductos] = useState([])
  const [insumos, setInsumos] = useState([])
  const [selectedId, setSelectedId] = useState(null)

  // Datos de la receta del producto seleccionado
  const [recetaNombre, setRecetaNombre] = useState('')
  const [ingredientes, setIngredientes] = useState([]) // [{ insumo_id, cantidad, ... }]
  const [recetaCargando, setRecetaCargando] = useState(false)
  const [guardando, setGuardando] = useState(false)

  // Agregar nuevo ingrediente
  const [addInsumoId, setAddInsumoId] = useState('')
  const [addQty, setAddQty] = useState('')

  const [cargando, setCargando] = useState(true)
  const [msg, setMsg] = useState(null) // { texto, tipo: 'ok'|'err' }

  // ── Carga inicial de catálogo e insumos ──────────────────────────
  useEffect(() => {
    let cancelado = false
    Promise.allSettled([productosApi.listar(), insumosApi.listar()]).then(([prodRes, insRes]) => {
      if (cancelado) return
      if (prodRes.status === 'fulfilled') {
        const data = prodRes.value
        const lista = Array.isArray(data) ? data : data.data || []
        setProductos(lista)
        if (lista.length > 0) setSelectedId(lista[0].id)
      }
      if (insRes.status === 'fulfilled') {
        setInsumos(Array.isArray(insRes.value) ? insRes.value : [])
      }
      setCargando(false)
    })
    return () => { cancelado = true }
  }, [])

  // ── Cargar receta al cambiar de producto ─────────────────────────
  useEffect(() => {
    if (!selectedId) return
    let cancelado = false

    recetasApi.obtener(selectedId)
      .then((data) => {
        if (cancelado) return
        const lista = data?.insumos || data?.receta || (Array.isArray(data) ? data : [])
        setIngredientes(lista)
        setRecetaNombre(data?.receta_nombre || '')
        setRecetaCargando(false)
        setMsg(null)
      })
      .catch(() => {
        if (!cancelado) {
          setIngredientes([])
          setRecetaNombre('')
          setRecetaCargando(false)
        }
      })
    return () => { cancelado = true }
  }, [selectedId])

  // ── Producto seleccionado y cálculos ─────────────────────────────
  const producto = productos.find((p) => p.id === selectedId)
  const precioVenta = Number(producto?.precio_venta ?? producto?.precio ?? 0)

  // Mapa de insumos para accesos rápidos
  const mapaInsumos = useMemo(() => {
    return new Map(insumos.map((i) => [i.id, i]))
  }, [insumos])

  // Costo total estimado sumando cada ingrediente
  const costoTotalEstimado = useMemo(() => {
    return ingredientes.reduce((acc, ing) => {
      const insId = ing.insumo_id ?? ing.insumoId
      const ins = mapaInsumos.get(insId)
      const costoUnit = Number(ins?.costo_unitario ?? 0)
      const cant = Number(ing.cantidad ?? 0)
      return acc + (costoUnit * cant)
    }, 0)
  }, [ingredientes, mapaInsumos])

  // Margen de ganancia bruto
  const margenPorcentaje = useMemo(() => {
    if (precioVenta <= 0) return 0
    return ((precioVenta - costoTotalEstimado) / precioVenta) * 100
  }, [precioVenta, costoTotalEstimado])

  const gananciaNetaEstimada = Math.max(0, precioVenta - costoTotalEstimado)

  // ── Manejo de ingredientes ───────────────────────────────────────
  function handleAgregarIngrediente() {
    if (!addInsumoId || !addQty || Number(addQty) <= 0) return
    const idNum = parseInt(addInsumoId, 10)
    const ins = mapaInsumos.get(idNum)

    if (ingredientes.some((i) => (i.insumo_id ?? i.insumoId) === idNum)) {
      setMsg({ tipo: 'err', texto: 'Este insumo ya está en la receta. Modifica su cantidad directamente en la tabla.' })
      return
    }

    setIngredientes((prev) => [
      ...prev,
      {
        insumo_id: idNum,
        insumo: ins?.nombre || `Insumo #${idNum}`,
        unidad_medida: ins?.unidad_medida || 'g',
        costo_unitario: Number(ins?.costo_unitario || 0),
        cantidad: Number(addQty),
      },
    ])

    setAddInsumoId('')
    setAddQty('')
    setMsg(null)
  }

  function handleModificarCantidad(insId, nuevaCantidad) {
    const cantNum = Math.max(0, Number(nuevaCantidad) || 0)
    setIngredientes((prev) =>
      prev.map((ing) => {
        const idActual = ing.insumo_id ?? ing.insumoId
        return idActual === insId ? { ...ing, cantidad: cantNum } : ing
      })
    )
  }

  function handleEliminarIngrediente(insId) {
    setIngredientes((prev) => prev.filter((i) => (i.insumo_id ?? i.insumoId) !== insId))
  }

  // ── Guardar receta en Backend ────────────────────────────────────
  async function handleGuardar() {
    if (!selectedId) return
    setGuardando(true)
    setMsg(null)

    // Validar que no haya cantidades en cero
    const tieneCeros = ingredientes.some((i) => Number(i.cantidad) <= 0)
    if (tieneCeros) {
      setMsg({ tipo: 'err', texto: 'Todos los ingredientes deben tener una cantidad mayor a cero.' })
      setGuardando(false)
      return
    }

    const payload = {
      receta_nombre: recetaNombre.trim() || null,
      insumos: ingredientes.map((ing) => ({
        insumo_id: ing.insumo_id ?? ing.insumoId,
        cantidad: Number(ing.cantidad),
      })),
    }

    try {
      const resp = await recetasApi.actualizar(selectedId, payload)
      setMsg({ tipo: 'ok', texto: 'Receta guardada exitosamente.' })
      if (resp?.receta_nombre !== undefined) {
        setRecetaNombre(resp.receta_nombre || '')
      }
      setTimeout(() => setMsg(null), 4000)
    } catch (err) {
      setMsg({ tipo: 'err', texto: err.message || 'Error al guardar la receta.' })
    } finally {
      setGuardando(false)
    }
  }

  // Insumos que aún no están en la receta
  const insumosDisponibles = useMemo(() => {
    return insumos.filter(
      (i) => i.activo && !ingredientes.some((ing) => (ing.insumo_id ?? ing.insumoId) === i.id)
    )
  }, [insumos, ingredientes])

  const insumoSeleccionadoObj = mapaInsumos.get(parseInt(addInsumoId, 10))

  if (cargando) {
    return <p style={{ fontSize: 13, color: '#a8a29e', padding: 24 }}>Cargando catálogo y almacén…</p>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Encabezado */}
      <div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, color: '#1c1917' }}>
          Fórmulas y Recetas
        </h2>
        <p style={{ fontSize: 13, color: '#78716c', marginTop: 2 }}>
          Define los insumos que componen cada producto para costear porciones y descontar inventario automáticamente en cada venta.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 18, alignItems: 'start' }}>

        {/* ── Columna Izquierda: Selector de Producto ── */}
        <div style={{
          background: 'white', borderRadius: 12, border: '1px solid #e7e5e4',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)', padding: 16,
        }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#78716c', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
            Seleccionar producto
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {productos.map((p) => {
              const activo = p.id === selectedId
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    if (p.id !== selectedId) {
                      setSelectedId(p.id)
                      setRecetaCargando(true)
                      setMsg(null)
                    }
                  }}
                  style={{
                    width: '100%', textAlign: 'left',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6,
                    padding: '9px 12px', borderRadius: 8, border: 'none',
                    background: activo ? '#6B3F1C' : 'transparent',
                    color: activo ? '#FFF8F2' : '#44403c',
                    fontSize: 13, fontWeight: 500, cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {EMOJIS[p.nombre] || '🍨'} {p.nombre}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Columna Derecha: Editor de Receta ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Tarjeta de Resumen Financiero y Nombre */}
          <div style={{
            background: 'white', borderRadius: 12, border: '1px solid #e7e5e4',
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)', padding: 20,
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
              <div>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#E8A44A', textTransform: 'uppercase' }}>
                  Receta para porción individual
                </span>
                <h3 style={{ fontSize: 20, fontWeight: 700, color: '#1c1917', marginTop: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>{EMOJIS[producto?.nombre || ''] || '🍨'}</span>
                  <span>{producto?.nombre}</span>
                </h3>
              </div>

              {/* Métricas clave */}
              <div style={{ display: 'flex', gap: 20, background: '#fafaf9', padding: '10px 16px', borderRadius: 10, border: '1px solid #f0ebe0' }}>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 11, color: '#78716c', fontWeight: 500 }}>Costo insumos</p>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700, color: '#6B3F1C' }}>
                    {fmtCur(costoTotalEstimado)}
                  </p>
                </div>
                <div style={{ textAlign: 'right', borderLeft: '1px solid #e7e5e4', paddingLeft: 16 }}>
                  <p style={{ fontSize: 11, color: '#78716c', fontWeight: 500 }}>Precio venta</p>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700, color: '#1c1917' }}>
                    {fmtCur(precioVenta)}
                  </p>
                </div>
                <div style={{ textAlign: 'right', borderLeft: '1px solid #e7e5e4', paddingLeft: 16 }}>
                  <p style={{ fontSize: 11, color: '#78716c', fontWeight: 500 }}>Margen bruto</p>
                  <p style={{
                    fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700,
                    color: margenPorcentaje >= 50 ? '#059669' : margenPorcentaje >= 30 ? '#d97706' : '#dc2626',
                  }}>
                    {margenPorcentaje.toFixed(1)}%
                    <span style={{ fontSize: 11, color: '#78716c', fontWeight: 400, marginLeft: 4 }}>
                      ({fmtCur(gananciaNetaEstimada)})
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Campo: Nombre de la receta */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 6, borderTop: '1px solid #f5f5f4' }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#57534e', display: 'flex', alignItems: 'center', gap: 6 }}>
                <BookOpen size={13} style={{ color: '#E8A44A' }} /> Nombre o fórmula de la receta:
              </label>
              <input
                type="text"
                value={recetaNombre}
                onChange={(e) => setRecetaNombre(e.target.value)}
                placeholder="Ej. Fórmula Tradicional Cremosa, Receta de Temporada, etc."
                style={{
                  border: '1px solid #e7e5e4', borderRadius: 8,
                  padding: '8px 12px', fontSize: 13, background: 'white', outline: 'none',
                }}
              />
            </div>
          </div>

          {/* Tabla de Ingredientes Actuales */}
          <div style={{
            background: 'white', borderRadius: 12, border: '1px solid #e7e5e4',
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)', padding: 20,
          }}>
            <h4 style={{ fontSize: 14, fontWeight: 600, color: '#1c1917', marginBottom: 12 }}>
              Ingredientes e insumos de la porción ({ingredientes.length})
            </h4>

            {recetaCargando ? (
              <p style={{ fontSize: 13, color: '#a8a29e', padding: '20px 0', textAlign: 'center' }}>Cargando receta…</p>
            ) : ingredientes.length > 0 ? (
              <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e7e5e4' }}>
                    <th style={{ textAlign: 'left', paddingBottom: 8, fontSize: 11, fontWeight: 600, color: '#a8a29e', textTransform: 'uppercase' }}>Insumo</th>
                    <th style={{ textAlign: 'left', paddingBottom: 8, fontSize: 11, fontWeight: 600, color: '#a8a29e', textTransform: 'uppercase' }}>Costo unit.</th>
                    <th style={{ textAlign: 'right', paddingBottom: 8, fontSize: 11, fontWeight: 600, color: '#a8a29e', textTransform: 'uppercase' }}>Cantidad porción</th>
                    <th style={{ textAlign: 'right', paddingBottom: 8, fontSize: 11, fontWeight: 600, color: '#a8a29e', textTransform: 'uppercase' }}>Costo parcial</th>
                    <th style={{ width: 40, paddingBottom: 8 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {ingredientes.map((ing) => {
                    const insId = ing.insumo_id ?? ing.insumoId
                    const ins = mapaInsumos.get(insId)
                    const costoUnit = Number(ins?.costo_unitario ?? ing.costo_unitario ?? 0)
                    const unidad = ins?.unidad_medida || ing.unidad_medida || 'g'
                    const parcial = costoUnit * Number(ing.cantidad || 0)

                    return (
                      <tr key={insId} style={{ borderBottom: '1px solid #f5f5f4' }}>
                        <td style={{ padding: '10px 0', color: '#1c1917', fontWeight: 500 }}>
                          {ins?.nombre || ing.insumo || `Insumo #${insId}`}
                        </td>
                        <td style={{ padding: '10px 0', color: '#78716c', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                          ${costoUnit.toFixed(4)} / {unidad}
                        </td>
                        <td style={{ padding: '8px 0', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <input
                              type="number"
                              min="0.001"
                              step="0.001"
                              value={ing.cantidad}
                              onChange={(e) => handleModificarCantidad(insId, e.target.value)}
                              style={{
                                width: 85, textAlign: 'right',
                                border: '1px solid #d6d3d1', borderRadius: 6,
                                padding: '4px 6px', fontSize: 13,
                                fontFamily: 'var(--font-mono)', outline: 'none',
                              }}
                            />
                            <span style={{ fontSize: 12, color: '#78716c', minWidth: 26, textAlign: 'left' }}>
                              {unidad}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '10px 0', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#1c1917' }}>
                          {fmtCur(parcial)}
                        </td>
                        <td style={{ padding: '10px 0', textAlign: 'center' }}>
                          <button
                            onClick={() => handleEliminarIngrediente(insId)}
                            style={{ background: 'none', border: 'none', color: '#a8a29e', cursor: 'pointer', padding: 4 }}
                            title="Quitar de la receta"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                  <tr style={{ background: '#fafaf9' }}>
                    <td colSpan={3} style={{ padding: '10px 8px', fontSize: 13, fontWeight: 600, color: '#57534e' }}>
                      Costo total estimado por porción
                    </td>
                    <td style={{ padding: '10px 0', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 15, color: '#6B3F1C' }}>
                      {fmtCur(costoTotalEstimado)}
                    </td>
                    <td />
                  </tr>
                </tbody>
              </table>
            ) : (
              <p style={{ fontSize: 13, color: '#a8a29e', textAlign: 'center', padding: '24px 0' }}>
                Este producto no tiene insumos asignados. Usa el formulario de abajo para agregar ingredientes.
              </p>
            )}
          </div>

          {/* Formulario para añadir ingrediente rápido */}
          <div style={{
            background: 'white', borderRadius: 12, border: '1px solid #e7e5e4',
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)', padding: 20,
          }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#1c1917', marginBottom: 10 }}>
              + Añadir insumo a la fórmula
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: 2, minWidth: 200, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 11, color: '#78716c' }}>Insumo disponible:</label>
                <select
                  value={addInsumoId}
                  onChange={(e) => setAddInsumoId(e.target.value)}
                  style={{
                    border: '1px solid #e7e5e4', borderRadius: 8,
                    padding: '8px 10px', fontSize: 13,
                    outline: 'none', background: 'white', width: '100%',
                  }}
                >
                  <option value="">Selecciona un insumo…</option>
                  {insumosDisponibles.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.nombre} ({i.unidad_medida}) — ${Number(i.costo_unitario).toFixed(4)}/{i.unidad_medida}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ width: 140, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 11, color: '#78716c' }}>
                  Cantidad {insumoSeleccionadoObj ? `(${insumoSeleccionadoObj.unidad_medida})` : ''}:
                </label>
                <input
                  type="number"
                  min="0.001"
                  step="0.001"
                  value={addQty}
                  onChange={(e) => setAddQty(e.target.value)}
                  placeholder="0.000"
                  style={{
                    border: '1px solid #e7e5e4', borderRadius: 8,
                    padding: '8px 10px', fontSize: 13, outline: 'none',
                    fontFamily: 'var(--font-mono)', width: '100%',
                  }}
                />
              </div>

              <button
                type="button"
                onClick={handleAgregarIngrediente}
                disabled={!addInsumoId || !addQty}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '9px 18px', borderRadius: 8, border: 'none',
                  background: '#6B3F1C', color: '#FFF8F2',
                  fontSize: 13, fontWeight: 500, cursor: 'pointer',
                  opacity: (!addInsumoId || !addQty) ? 0.45 : 1,
                }}
              >
                <Plus size={15} /> Añadir a receta
              </button>
            </div>
          </div>

          {/* Mensajes y Guardado */}
          {msg && (
            <div style={{
              padding: '10px 14px', borderRadius: 8, fontSize: 13,
              display: 'flex', alignItems: 'center', gap: 8,
              background: msg.tipo === 'ok' ? '#d1fae5' : '#fee2e2',
              color: msg.tipo === 'ok' ? '#065f46' : '#991b1b',
              border: `1px solid ${msg.tipo === 'ok' ? '#6ee7b7' : '#fca5a5'}`,
            }}>
              {msg.tipo === 'ok' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
              <span>{msg.texto}</span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 6 }}>
            <button
              onClick={handleGuardar}
              disabled={guardando}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '10px 24px', borderRadius: 8, border: 'none',
                background: '#6B3F1C', color: '#FFF8F2',
                fontSize: 14, fontWeight: 600, cursor: 'pointer',
                opacity: guardando ? 0.5 : 1,
              }}
            >
              <Save size={16} />
              {guardando ? 'Guardando cambios…' : 'Guardar receta completa'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
