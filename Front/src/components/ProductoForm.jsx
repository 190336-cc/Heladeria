import { useState, useId } from 'react'
import { X, Check, AlertCircle } from 'lucide-react'

const CATEGORIAS_DEFAULT = ['Helados', 'Paletas', 'Especialidades', 'Postres', 'Bebidas']

const EMOJIS_SUGERIDOS = ['🍦', '🍫', '🍓', '🥭', '🍋', '🍮', '🍨', '🍧', '🧁', '🥤', '🧇', '🍒']

export default function ProductoForm({ producto, onGuardar, onCancelar, cargando }) {
  const esEdicion = Boolean(producto)
  const formId = useId()

  const [campos, setCampos] = useState(() => ({
    nombre: producto?.nombre ?? '',
    descripcion: producto?.descripcion ?? '',
    precio: producto?.precio_venta ?? producto?.precio ?? '',
    categoria: producto?.categoria ?? 'Helados',
    emoji: producto?.emoji ?? '🍦',
    activo: producto?.activo ?? true,
  }))

  const [error, setError] = useState(null)

  function handleChange(e) {
    const { name, value, type, checked } = e.target
    setCampos((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
    setError(null)
  }

  function handleSelectEmoji(em) {
    setCampos((prev) => ({ ...prev, emoji: em }))
    setError(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (!campos.nombre.trim()) {
      setError('El nombre del producto es obligatorio.')
      return
    }

    const precioNum = Number(campos.precio)
    if (campos.precio === '' || !Number.isFinite(precioNum) || precioNum <= 0) {
      setError('El precio de venta debe ser un número mayor a cero.')
      return
    }

    const payload = {
      nombre: campos.nombre.trim(),
      descripcion: campos.descripcion.trim() || null,
      precio: precioNum,
      precio_venta: precioNum,
      categoria: campos.categoria.trim() || 'Helados',
      emoji: campos.emoji.trim() || '🍦',
      activo: Boolean(campos.activo),
    }

    try {
      await onGuardar(payload)
    } catch (err) {
      setError(err.message || 'Error al guardar el producto.')
    }
  }

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
            {esEdicion ? 'Editar producto' : 'Nuevo producto'}
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

        {/* Cuerpo del Formulario */}
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

          {/* Nombre del producto */}
          <div>
            <label htmlFor={`${formId}-nombre`} style={labelStyle}>
              Nombre del producto <span style={{ color: '#dc2626' }}>*</span>
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
              placeholder="Ej. Helado de Pistache, Sundae Especial..."
              style={inputBaseStyle}
            />
          </div>

          {/* Fila 2 columnas: Precio de venta y Categoría */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label htmlFor={`${formId}-precio`} style={labelStyle}>
                Precio de venta ($) <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                id={`${formId}-precio`}
                name="precio"
                type="number"
                step="0.01"
                min="0.01"
                value={campos.precio}
                onChange={handleChange}
                required
                disabled={cargando}
                placeholder="45.00"
                style={{ ...inputBaseStyle, fontFamily: 'var(--font-mono)' }}
              />
            </div>

            <div>
              <label htmlFor={`${formId}-categoria`} style={labelStyle}>
                Categoría
              </label>
              <select
                id={`${formId}-categoria`}
                name="categoria"
                value={campos.categoria}
                onChange={handleChange}
                disabled={cargando}
                style={inputBaseStyle}
              >
                {CATEGORIAS_DEFAULT.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Selector de Emoji / Ícono */}
          <div>
            <label style={labelStyle}>Ícono / Emoji ilustrativo</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  background: '#FFF8F2',
                  border: '1px solid #fed7aa',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 24,
                  flexShrink: 0,
                }}
              >
                {campos.emoji || '🍦'}
              </div>
              <input
                type="text"
                name="emoji"
                value={campos.emoji}
                onChange={handleChange}
                maxLength={8}
                disabled={cargando}
                placeholder="Escribe o pega un emoji..."
                style={{ ...inputBaseStyle, flex: 1 }}
                title="Escribe o pega cualquier emoji"
              />
            </div>

            {/* Sugerencias rápidas de emojis */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {EMOJIS_SUGERIDOS.map((em) => (
                <button
                  key={em}
                  type="button"
                  onClick={() => handleSelectEmoji(em)}
                  disabled={cargando}
                  style={{
                    background: campos.emoji === em ? '#fed7aa' : '#fafaf9',
                    border: `1px solid ${campos.emoji === em ? '#f97316' : '#e7e5e4'}`,
                    borderRadius: 8,
                    padding: '4px 8px',
                    fontSize: 16,
                    cursor: 'pointer',
                    transition: 'all 0.12s',
                  }}
                  title={`Seleccionar ${em}`}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>

          {/* Descripción opcional */}
          <div>
            <label htmlFor={`${formId}-desc`} style={labelStyle}>
              Descripción (opcional)
            </label>
            <input
              id={`${formId}-desc`}
              name="descripcion"
              type="text"
              value={campos.descripcion}
              onChange={handleChange}
              disabled={cargando}
              placeholder="Presentación, número de bolas, topping..."
              style={inputBaseStyle}
            />
          </div>

          {/* Checkbox Disponible para venta */}
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
              Disponible para venta
            </label>
            <p style={{ fontSize: 11, color: '#a8a29e', marginLeft: 24, marginTop: 2 }}>
              Los productos no disponibles se ocultan en el catálogo del punto de venta (POS).
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
