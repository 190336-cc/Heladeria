import { useState, useId } from 'react'
import { X, Check, Lock, AlertCircle, Info } from 'lucide-react'
import { fmtStock } from '../utils/formatters.js'

const UNIDADES_VALIDAS = [
  { valor: 'g', etiqueta: 'g (gramos — sólidos: azúcar, cacao, fruta, bases)' },
  { valor: 'ml', etiqueta: 'ml (mililitros — líquidos: leche, crema, extractos, jarabes)' },
  { valor: 'pieza', etiqueta: 'pieza (unidades — conos, barquillos, vasos, tapas)' },
]

export default function InsumoForm({ insumo, onGuardar, onCancelar, cargando }) {
  const esEdicion = Boolean(insumo)

  const [campos, setCampos] = useState(() => ({
    nombre: insumo?.nombre ?? '',
    descripcion: insumo?.descripcion ?? '',
    unidad_medida: insumo?.unidad_medida ?? 'g',
    stock_minimo: insumo?.stock_minimo != null ? String(insumo.stock_minimo) : '',
    costo_unitario: insumo?.costo_unitario != null ? String(insumo.costo_unitario) : '',
    activo: insumo?.activo ?? true,
  }))

  const [error, setError] = useState(null)
  const formId = useId()

  function handleChange(e) {
    const { name, value, type, checked } = e.target
    setCampos((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
    setError(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (!campos.nombre.trim()) {
      setError('El nombre del insumo es obligatorio.')
      return
    }

    if (!['g', 'ml', 'pieza'].includes(campos.unidad_medida)) {
      setError('Selecciona una unidad de medida válida (g, ml, pieza).')
      return
    }

    const stockMin = Number(campos.stock_minimo)
    if (isNaN(stockMin) || stockMin < 0 || campos.stock_minimo === '') {
      setError('El stock mínimo debe ser un número igual o mayor a 0.')
      return
    }

    const costoUnit = Number(campos.costo_unitario)
    if (isNaN(costoUnit) || costoUnit < 0 || campos.costo_unitario === '') {
      setError('El costo unitario debe ser un número igual o mayor a 0.')
      return
    }

    const payload = {
      nombre: campos.nombre.trim(),
      descripcion: campos.descripcion.trim() || null,
      stock_minimo: stockMin,
      costo_unitario: costoUnit,
      activo: Boolean(campos.activo),
    }

    if (!esEdicion) {
      payload.unidad_medida = campos.unidad_medida
    }

    try {
      await onGuardar(payload)
    } catch (err) {
      setError(err.message || 'Error al guardar el insumo.')
    }
  }

  // Guía de costo según unidad seleccionada
  const guiaCosto = {
    g: 'Ingresa el costo por cada 1 gramo. Ej: Si 1 kg cuesta $28.00, ingresa 0.0280 (28 ÷ 1,000).',
    ml: 'Ingresa el costo por cada 1 ml. Ej: Si 1 Litro cuesta $18.00, ingresa 0.0180 (18 ÷ 1,000).',
    pieza: 'Ingresa el costo por cada pieza individual. Ej: Caja de 100 conos a $200 = 2.00 por cono.',
  }[campos.unidad_medida] || ''

  const inputBaseStyle = {
    width: '100%',
    padding: '9px 12px',
    fontSize: 14,
    borderRadius: 8,
    border: '1px solid #e7e5e4',
    background: '#ffffff',
    outline: 'none',
    boxSizing: 'border-box',
    color: '#1c1917',
    transition: 'border-color 0.15s',
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
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(0, 0, 0, 0.45)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !cargando) onCancelar()
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${formId}-title`}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: 16,
          maxWidth: 520,
          width: '100%',
          boxShadow: '0 20px 45px rgba(0, 0, 0, 0.18)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '92vh',
          overflow: 'hidden',
        }}
      >
        {/* Cabecera del Modal */}
        <div
          style={{
            padding: '20px 24px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #f5f5f4',
          }}
        >
          <h3
            id={`${formId}-title`}
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 19,
              fontWeight: 700,
              color: '#1c1917',
              margin: 0,
            }}
          >
            {esEdicion ? `Editar insumo: ${insumo.nombre}` : 'Nuevo insumo'}
          </h3>
          <button
            type="button"
            onClick={onCancelar}
            disabled={cargando}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#78716c',
              padding: 6,
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Cuerpo del formulario con scroll si es necesario */}
        <form
          onSubmit={handleSubmit}
          noValidate
          style={{
            padding: '20px 24px 24px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          {error && (
            <div
              style={{
                background: '#fee2e2',
                border: '1px solid #fca5a5',
                borderRadius: 8,
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                color: '#991b1b',
                fontSize: 13,
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Nombre */}
          <div>
            <label htmlFor={`${formId}-nombre`} style={labelStyle}>
              Nombre <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              id={`${formId}-nombre`}
              name="nombre"
              type="text"
              value={campos.nombre}
              onChange={handleChange}
              maxLength={120}
              required
              disabled={cargando}
              placeholder="Ej. Leche entera pasteurizada, Azúcar estándar..."
              style={inputBaseStyle}
            />
          </div>

          {/* Descripción */}
          <div>
            <label htmlFor={`${formId}-descripcion`} style={labelStyle}>
              Descripción
            </label>
            <input
              id={`${formId}-descripcion`}
              name="descripcion"
              type="text"
              value={campos.descripcion}
              onChange={handleChange}
              disabled={cargando}
              placeholder="Marca, especificación, presentación o proveedor..."
              style={inputBaseStyle}
            />
          </div>

          {/* Fila 2 columnas: Unidad de medida y Costo unitario */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label htmlFor={`${formId}-unidad`} style={labelStyle}>
                Unidad de medida <span style={{ color: '#dc2626' }}>*</span>
              </label>
              {esEdicion ? (
                <div>
                  <input
                    id={`${formId}-unidad`}
                    type="text"
                    value={campos.unidad_medida}
                    disabled
                    style={{
                      ...inputBaseStyle,
                      background: '#f5f5f4',
                      color: '#78716c',
                      cursor: 'not-allowed',
                      fontWeight: 600,
                    }}
                  />
                  <span style={{ fontSize: 11, color: '#a8a29e', display: 'block', marginTop: 4 }}>
                    🔒 Inmutable para proteger recetas e inventario
                  </span>
                </div>
              ) : (
                <select
                  id={`${formId}-unidad`}
                  name="unidad_medida"
                  value={campos.unidad_medida}
                  onChange={handleChange}
                  disabled={cargando}
                  style={inputBaseStyle}
                >
                  {UNIDADES_VALIDAS.map((u) => (
                    <option key={u.valor} value={u.valor}>
                      {u.etiqueta}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label htmlFor={`${formId}-costo`} style={labelStyle}>
                Costo unitario ($) <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                id={`${formId}-costo`}
                name="costo_unitario"
                type="number"
                step="0.0001"
                min="0"
                value={campos.costo_unitario}
                onChange={handleChange}
                required
                disabled={cargando}
                placeholder={campos.unidad_medida === 'pieza' ? '2.50' : '0.0280'}
                style={inputBaseStyle}
              />
              <span style={{ fontSize: 11, color: '#78716c', display: 'block', marginTop: 4 }}>
                Por cada 1 {campos.unidad_medida}
              </span>
            </div>
          </div>

          {/* Guía explicativa de costo */}
          <div
            style={{
              background: '#fefce8',
              border: '1px solid #fef08a',
              borderRadius: 8,
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
              fontSize: 12,
              color: '#854d0e',
              lineHeight: 1.4,
            }}
          >
            <Info size={15} style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <strong>Guía de costo unitario:</strong> {guiaCosto}
            </div>
          </div>

          {/* Fila 2 columnas: Stock actual (SOLO LECTURA) y Stock mínimo */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label
                htmlFor={`${formId}-stock-actual`}
                style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 5 }}
              >
                Stock actual
                {esEdicion && <Lock size={12} style={{ color: '#a8a29e' }} />}
              </label>
              <input
                id={`${formId}-stock-actual`}
                type="text"
                disabled
                value={
                  esEdicion
                    ? `${fmtStock(insumo.stock_actual, insumo.unidad_medida, 3)} ${insumo.unidad_medida}`
                    : '0.000 (Inicial)'
                }
                style={{
                  ...inputBaseStyle,
                  background: '#f5f5f4',
                  color: '#78716c',
                  cursor: 'not-allowed',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 500,
                }}
              />
              <span style={{ fontSize: 11, color: '#a8a29e', display: 'block', marginTop: 4 }}>
                {esEdicion
                  ? '🔒 Se actualiza únicamente mediante movimientos en Inventario'
                  : 'Inicia en 0. Para existencias iniciales, registra una Entrada en Almacén'}
              </span>
            </div>

            <div>
              <label htmlFor={`${formId}-stock-minimo`} style={labelStyle}>
                Stock mínimo ({campos.unidad_medida}) <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                id={`${formId}-stock-minimo`}
                name="stock_minimo"
                type="number"
                step="0.001"
                min="0"
                value={campos.stock_minimo}
                onChange={handleChange}
                required
                disabled={cargando}
                placeholder="Ej. 1000"
                style={inputBaseStyle}
              />
              <span style={{ fontSize: 11, color: '#78716c', display: 'block', marginTop: 4 }}>
                Umbral para alertas de stock bajo
              </span>
            </div>
          </div>

          {/* Checkbox Insumo activo */}
          <div style={{ paddingTop: 4 }}>
            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
                color: '#1c1917',
              }}
            >
              <input
                type="checkbox"
                name="activo"
                checked={campos.activo}
                onChange={handleChange}
                disabled={cargando}
                style={{
                  width: 16,
                  height: 16,
                  accentColor: '#6B3F1C',
                  cursor: 'pointer',
                }}
              />
              Insumo activo
            </label>
            <p style={{ fontSize: 11, color: '#a8a29e', marginLeft: 24, marginTop: 2 }}>
              Los insumos inactivos no se pueden usar en nuevas recetas ni compras de almacén.
            </p>
          </div>

          {/* Botones de acción */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 10,
              paddingTop: 12,
              borderTop: '1px solid #f5f5f4',
            }}
          >
            <button
              type="button"
              onClick={onCancelar}
              disabled={cargando}
              style={{
                padding: '9px 18px',
                borderRadius: 8,
                border: '1px solid #e7e5e4',
                background: '#ffffff',
                color: '#57534e',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={cargando}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '9px 20px',
                borderRadius: 8,
                border: 'none',
                background: '#6B3F1C',
                color: '#FFF8F2',
                fontSize: 13,
                fontWeight: 600,
                cursor: cargando ? 'not-allowed' : 'pointer',
                opacity: cargando ? 0.6 : 1,
                boxShadow: '0 2px 4px rgba(107, 63, 28, 0.2)',
              }}
            >
              <Check size={16} />
              {cargando ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
