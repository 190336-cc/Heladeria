import { useState } from 'react'
import { Check, Info, AlertTriangle } from 'lucide-react'
import Alerta from './Alerta.jsx'

const TIPOS_MOVIMIENTO = [
  {
    valor: 'entrada',
    etiqueta: 'Entrada',
    sentido: '+',
    guia: '📥 Aumenta el stock. Usar al recibir compras de proveedores o producción interna.',
    placeholder: 'Ej. Factura #1084 — Compra semanal proveedor Lácteos del Norte',
  },
  {
    valor: 'merma',
    etiqueta: 'Merma',
    sentido: '-',
    guia: '🗑️ Descuenta existencias por caducidad, descomposición, merma o rotura.',
    placeholder: 'Ej. Producto caducado por falla en cámara de refrigeración',
  },
  {
    valor: 'ajuste_entrada',
    etiqueta: 'Ajuste de entrada',
    sentido: '+',
    guia: '⚖️ Aumenta el stock. Usar cuando el inventario físico detecta más piezas que el sistema.',
    placeholder: 'Ej. Corrección por auditoría de inventario físico mensual (sobrante)',
  },
  {
    valor: 'ajuste_salida',
    etiqueta: 'Ajuste de salida',
    sentido: '-',
    guia: '⚖️ Descuenta existencias por descuadre detectado en el conteo físico de almacén.',
    placeholder: 'Ej. Corrección inventario físico — faltante detectado en turno matutino',
  },
]

export default function MovimientoForm({ insumos, onRegistrar, cargando }) {
  const [campos, setCampos] = useState({
    insumo_id: '',
    tipo: 'entrada',
    cantidad: '',
    motivo: '',
  })
  const [error, setError] = useState(null)
  const [exito, setExito] = useState(null)

  const insumosActivos = (insumos || []).filter((i) => i.activo)
  const insumoSeleccionado = insumosActivos.find((i) => String(i.id) === String(campos.insumo_id))
  const tipoSeleccionado = TIPOS_MOVIMIENTO.find((t) => t.valor === campos.tipo) || TIPOS_MOVIMIENTO[0]

  const fmtStock = new Intl.NumberFormat('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 3,
  })

  // Validación de stock insuficiente para mermas o ajustes de salida
  const stockInsuficiente =
    insumoSeleccionado &&
    tipoSeleccionado.sentido === '-' &&
    Number(campos.cantidad) > Number(insumoSeleccionado.stock_actual || 0)

  function handleChange(e) {
    const { name, value } = e.target
    setCampos((prev) => ({ ...prev, [name]: value }))
    setError(null)
    setExito(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setExito(null)

    if (!campos.insumo_id) {
      setError('Selecciona un insumo de la lista.')
      return
    }

    const cantidadNum = Number(campos.cantidad)
    if (isNaN(cantidadNum) || cantidadNum <= 0) {
      setError('La cantidad debe ser un número positivo mayor que cero.')
      return
    }

    if (!campos.motivo.trim()) {
      setError('Indica el motivo o referencia del movimiento.')
      return
    }

    if (stockInsuficiente) {
      setError(
        `Stock insuficiente: Intentas descontar ${cantidadNum} ${insumoSeleccionado.unidad_medida}, pero solo hay ${fmtStock.format(Number(insumoSeleccionado.stock_actual))} ${insumoSeleccionado.unidad_medida} en existencia.`
      )
      return
    }

    const payload = {
      insumo_id: Number(campos.insumo_id),
      usuario_id: 1, // Usuario administrador activo
      tipo: campos.tipo,
      cantidad: cantidadNum,
      motivo: campos.motivo.trim(),
    }

    try {
      await onRegistrar(payload)
      setExito(
        `Movimiento de ${tipoSeleccionado.etiqueta.toLowerCase()} registrado correctamente para "${insumoSeleccionado.nombre}".`
      )
      setCampos((prev) => ({ ...prev, cantidad: '', motivo: '' }))
    } catch (err) {
      setError(err.message || 'No se pudo registrar el movimiento.')
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '9px 12px',
    borderRadius: 8,
    border: '1px solid #e7e5e4',
    background: '#ffffff',
    fontSize: 13,
    color: '#1c1917',
    outline: 'none',
    boxSizing: 'border-box',
  }

  const labelStyle = {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    color: '#44403c',
    marginBottom: 5,
  }

  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: 12,
        border: '1px solid #e7e5e4',
        padding: '20px 24px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
      }}
    >
      <h3
        style={{
          margin: '0 0 16px',
          fontSize: 16,
          fontWeight: 700,
          color: '#1c1917',
        }}
      >
        Registrar movimiento
      </h3>

      <Alerta mensaje={error} tipo="error" onCerrar={() => setError(null)} />
      <Alerta mensaje={exito} tipo="exito" onCerrar={() => setExito(null)} />

      <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Selector de Tipo de movimiento */}
        <div>
          <label htmlFor="mv-tipo" style={labelStyle}>
            Tipo de movimiento <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <select
            id="mv-tipo"
            name="tipo"
            value={campos.tipo}
            onChange={handleChange}
            disabled={cargando}
            style={inputStyle}
          >
            {TIPOS_MOVIMIENTO.map((t) => (
              <option key={t.valor} value={t.valor}>
                {t.etiqueta}
              </option>
            ))}
          </select>
          <div
            style={{
              marginTop: 6,
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 6,
              padding: '6px 10px',
              fontSize: 11,
              color: '#475569',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Info size={13} style={{ flexShrink: 0, color: '#0284c7' }} />
            <span>{tipoSeleccionado.guia}</span>
          </div>
        </div>

        {/* Insumo */}
        <div>
          <label htmlFor="mv-insumo_id" style={labelStyle}>
            Insumo <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <select
            id="mv-insumo_id"
            name="insumo_id"
            value={campos.insumo_id}
            onChange={handleChange}
            disabled={cargando}
            style={inputStyle}
          >
            <option value="">Selecciona un insumo...</option>
            {insumosActivos.map((i) => (
              <option key={i.id} value={i.id}>
                {i.nombre} — Stock: {fmtStock.format(Number(i.stock_actual || 0))} {i.unidad_medida}
              </option>
            ))}
          </select>
          {insumoSeleccionado && (
            <div
              style={{
                marginTop: 5,
                fontSize: 11,
                color: '#78716c',
                display: 'flex',
                gap: 12,
                fontFamily: 'var(--font-mono)',
              }}
            >
              <span>Existencia: {fmtStock.format(Number(insumoSeleccionado.stock_actual || 0))} {insumoSeleccionado.unidad_medida}</span>
              <span>Mínimo: {fmtStock.format(Number(insumoSeleccionado.stock_minimo || 0))} {insumoSeleccionado.unidad_medida}</span>
            </div>
          )}
        </div>

        {/* Cantidad */}
        <div>
          <label htmlFor="mv-cantidad" style={labelStyle}>
            Cantidad {insumoSeleccionado ? `(${insumoSeleccionado.unidad_medida})` : '(unidades)'} <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <input
            id="mv-cantidad"
            name="cantidad"
            type="number"
            step="0.001"
            min="0.001"
            value={campos.cantidad}
            onChange={handleChange}
            disabled={cargando}
            placeholder="0.00"
            style={{
              ...inputStyle,
              borderColor: stockInsuficiente ? '#f87171' : '#e7e5e4',
              fontFamily: 'var(--font-mono)',
            }}
          />
          {stockInsuficiente && (
            <div
              style={{
                marginTop: 5,
                fontSize: 11,
                color: '#b91c1c',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <AlertTriangle size={13} />
              <span>Supera el stock actual disponible ({fmtStock.format(Number(insumoSeleccionado.stock_actual))} {insumoSeleccionado.unidad_medida}). El servidor rechazará la operación.</span>
            </div>
          )}
        </div>

        {/* Motivo */}
        <div>
          <label htmlFor="mv-motivo" style={labelStyle}>
            Motivo <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <input
            id="mv-motivo"
            name="motivo"
            type="text"
            value={campos.motivo}
            onChange={handleChange}
            disabled={cargando}
            placeholder={tipoSeleccionado.placeholder}
            maxLength={250}
            style={inputStyle}
          />
        </div>

        {/* Botón registrar */}
        <div style={{ paddingTop: 6 }}>
          <button
            type="submit"
            disabled={cargando || Boolean(stockInsuficiente)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '10px 20px',
              borderRadius: 8,
              border: 'none',
              background: '#6B3F1C',
              color: '#FFF8F2',
              fontSize: 13,
              fontWeight: 600,
              cursor: cargando || stockInsuficiente ? 'not-allowed' : 'pointer',
              opacity: cargando || stockInsuficiente ? 0.6 : 1,
              boxShadow: '0 2px 4px rgba(107, 63, 28, 0.2)',
              transition: 'background 0.15s',
            }}
          >
            <Check size={16} />
            {cargando ? 'Registrando movimiento...' : 'Registrar movimiento'}
          </button>
        </div>
      </form>
    </div>
  )
}
