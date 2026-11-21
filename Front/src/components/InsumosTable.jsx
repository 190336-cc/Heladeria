import { Pencil, Power } from 'lucide-react'

export default function InsumosTable({ insumos, onEditar, onCambiarEstado, cargando }) {
  if (!insumos.length && !cargando) {
    return (
      <div
        style={{
          background: '#ffffff',
          borderRadius: 12,
          border: '1px solid #e7e5e4',
          padding: '48px 24px',
          textAlign: 'center',
          color: '#78716c',
        }}
      >
        <p style={{ fontSize: 15, fontWeight: 500, color: '#44403c', marginBottom: 4 }}>
          No se encontraron insumos
        </p>
        <p style={{ fontSize: 13 }}>
          Ajusta los filtros de búsqueda o registra un nuevo insumo en el catálogo.
        </p>
      </div>
    )
  }

  const fmtStock = new Intl.NumberFormat('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 3,
  })

  const fmtCosto = new Intl.NumberFormat('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  })

  function nivelStock(ins) {
    const actual = Number(ins.stock_actual || 0)
    const minimo = Number(ins.stock_minimo || 0)

    if (actual <= 0) {
      return {
        etiqueta: 'Agotado',
        bg: '#fee2e2',
        color: '#dc2626',
        border: '#fca5a5',
      }
    }
    if (actual <= minimo) {
      return {
        etiqueta: 'Stock bajo',
        bg: '#fef3c7',
        color: '#d97706',
        border: '#fcd34d',
      }
    }
    return {
      etiqueta: 'Suficiente',
      bg: '#d1fae5',
      color: '#059669',
      border: '#a7f3d0',
    }
  }

  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: 12,
        border: '1px solid #e7e5e4',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        overflow: 'hidden',
      }}
    >
      <div style={{ overflowX: 'auto' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            textAlign: 'left',
            fontSize: 13,
          }}
        >
          <thead>
            <tr
              style={{
                borderBottom: '1px solid #f0eee9',
                background: '#faf9f6',
              }}
            >
              <th style={thStyle}>NOMBRE</th>
              <th style={thStyle}>DESCRIPCIÓN</th>
              <th style={thStyle}>UNIDAD</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>STOCK ACTUAL</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>STOCK MÍN.</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>COSTO UNIT.</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>ESTADO</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>ACTIVO</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            {insumos.map((ins, idx) => {
              const nivel = nivelStock(ins)
              const actual = Number(ins.stock_actual || 0)
              const minimo = Number(ins.stock_minimo || 0)
              const costo = Number(ins.costo_unitario || 0)

              return (
                <tr
                  key={ins.id}
                  style={{
                    borderBottom: idx === insumos.length - 1 ? 'none' : '1px solid #f5f5f4',
                    background: ins.activo ? '#ffffff' : '#fafaf9',
                    opacity: ins.activo ? 1 : 0.72,
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={(e) => {
                    if (ins.activo) e.currentTarget.style.background = '#fdfcf9'
                  }}
                  onMouseLeave={(e) => {
                    if (ins.activo) e.currentTarget.style.background = '#ffffff'
                  }}
                >
                  {/* Nombre */}
                  <td style={tdStyle}>
                    <span
                      style={{
                        fontWeight: 600,
                        color: ins.activo ? '#1c1917' : '#78716c',
                        display: 'block',
                      }}
                    >
                      {ins.nombre}
                    </span>
                  </td>

                  {/* Descripción */}
                  <td style={tdStyle}>
                    <span
                      style={{
                        color: '#78716c',
                        display: 'block',
                        maxWidth: 240,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={ins.descripcion || ''}
                    >
                      {ins.descripcion || '—'}
                    </span>
                  </td>

                  {/* Unidad */}
                  <td style={tdStyle}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        background: '#f5f5f4',
                        color: '#57534e',
                        borderRadius: 6,
                        fontFamily: 'var(--font-mono)',
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      {ins.unidad_medida}
                    </span>
                  </td>

                  {/* Stock actual */}
                  <td style={{ ...tdStyle, textAlign: 'right' }}>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 600,
                        color: actual <= minimo ? (actual === 0 ? '#dc2626' : '#d97706') : '#1c1917',
                        fontSize: 13,
                      }}
                    >
                      {fmtStock.format(actual)}
                    </span>
                  </td>

                  {/* Stock mínimo */}
                  <td style={{ ...tdStyle, textAlign: 'right' }}>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        color: '#78716c',
                        fontSize: 13,
                      }}
                    >
                      {fmtStock.format(minimo)}
                    </span>
                  </td>

                  {/* Costo unitario */}
                  <td style={{ ...tdStyle, textAlign: 'right' }}>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 600,
                        color: '#1c1917',
                        fontSize: 13,
                      }}
                    >
                      ${fmtCosto.format(costo)}
                    </span>
                  </td>

                  {/* Estado de stock */}
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '3px 10px',
                        borderRadius: 999,
                        background: nivel.bg,
                        color: nivel.color,
                        border: `1px solid ${nivel.border}`,
                        fontSize: 11,
                        fontWeight: 600,
                        letterSpacing: '0.02em',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {nivel.etiqueta}
                    </span>
                  </td>

                  {/* Activo / Inactivo */}
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: 12,
                        fontWeight: 500,
                        color: ins.activo ? '#059669' : '#a8a29e',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <span
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: '50%',
                          background: ins.activo ? '#10b981' : '#d1d5db',
                        }}
                      />
                      {ins.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>

                  {/* Acciones */}
                  <td style={{ ...tdStyle, textAlign: 'right' }}>
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        gap: 4,
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => onEditar(ins)}
                        disabled={cargando}
                        title="Editar insumo"
                        style={actionBtnStyle}
                      >
                        <Pencil size={15} color="#57534e" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onCambiarEstado(ins)}
                        disabled={cargando}
                        title={ins.activo ? 'Desactivar insumo' : 'Activar insumo'}
                        style={{
                          ...actionBtnStyle,
                          color: ins.activo ? '#dc2626' : '#059669',
                        }}
                      >
                        <Power size={14} color={ins.activo ? '#78716c' : '#10b981'} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const thStyle = {
  padding: '12px 16px',
  fontSize: 11,
  fontWeight: 700,
  color: '#78716c',
  letterSpacing: '0.05em',
  whiteSpace: 'nowrap',
}

const tdStyle = {
  padding: '13px 16px',
  verticalAlign: 'middle',
}

const actionBtnStyle = {
  background: 'transparent',
  border: '1px solid #e7e5e4',
  borderRadius: 6,
  padding: '6px 8px',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'background 0.15s, border-color 0.15s',
}
