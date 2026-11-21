export default function MovimientosTable({ movimientos, cargando }) {
  if (cargando && (!movimientos || movimientos.length === 0)) {
    return (
      <div
        style={{
          background: '#ffffff',
          borderRadius: 12,
          border: '1px solid #e7e5e4',
          padding: '40px 20px',
          textAlign: 'center',
          color: '#78716c',
        }}
      >
        <p style={{ fontSize: 13, margin: 0 }}>Cargando historial de movimientos...</p>
      </div>
    )
  }

  const fmtNum = new Intl.NumberFormat('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 3,
  })

  function fmtFecha(fechaStr) {
    if (!fechaStr) return '—'
    const d = new Date(fechaStr)
    if (isNaN(d.getTime())) return fechaStr
    return d.toLocaleString('es-MX', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const TIPO_CONFIG = {
    entrada: {
      signo: '+',
      color: '#059669',
      etiqueta: 'Entrada',
      bgBadge: '#d1fae5',
      colorBadge: '#065f46',
    },
    ajuste_entrada: {
      signo: '+',
      color: '#0284c7',
      etiqueta: 'Ajuste entrada',
      bgBadge: '#e0f2fe',
      colorBadge: '#0369a1',
    },
    merma: {
      signo: '-',
      color: '#dc2626',
      etiqueta: 'Merma',
      bgBadge: '#fee2e2',
      colorBadge: '#991b1b',
    },
    ajuste_salida: {
      signo: '-',
      color: '#d97706',
      etiqueta: 'Ajuste salida',
      bgBadge: '#fef3c7',
      colorBadge: '#92400e',
    },
    consumo: {
      signo: '-',
      color: '#7c3aed',
      etiqueta: 'Consumo (Venta)',
      bgBadge: '#ede9fe',
      colorBadge: '#5b21b6',
    },
    reversion_venta: {
      signo: '+',
      color: '#2563eb',
      etiqueta: 'Reversión',
      bgBadge: '#dbeafe',
      colorBadge: '#1e40af',
    },
  }

  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: 12,
        border: '1px solid #e7e5e4',
        padding: '20px 24px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ marginBottom: 16 }}>
        <h3
          style={{
            margin: 0,
            fontSize: 16,
            fontWeight: 700,
            color: '#1c1917',
          }}
        >
          Historial de movimientos
        </h3>
        <p style={{ margin: '3px 0 0', fontSize: 12, color: '#78716c' }}>
          Registros en tiempo real de entradas, mermas, ajustes y consumos
        </p>
      </div>

      {!movimientos || movimientos.length === 0 ? (
        <div
          style={{
            padding: '36px 16px',
            textAlign: 'center',
            color: '#78716c',
            fontSize: 13,
          }}
        >
          No hay movimientos registrados en el inventario aún.
        </div>
      ) : (
        <div
          style={{
            maxHeight: 520,
            overflowY: 'auto',
            paddingRight: 4,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          {movimientos.map((m) => {
            const conf = TIPO_CONFIG[m.tipo] || {
              signo: '',
              color: '#44403c',
              etiqueta: m.tipo,
              bgBadge: '#f5f5f4',
              colorBadge: '#57534e',
            }

            return (
              <div
                key={m.id}
                style={{
                  background: '#fafaf9',
                  border: '1px solid #f0eee9',
                  borderRadius: 10,
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 12,
                  transition: 'background 0.15s',
                }}
              >
                {/* Lado izquierdo: Insumo, usuario, fecha y motivo */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: '#1c1917',
                      }}
                    >
                      {m.insumo}
                    </span>
                    {m.venta_id && (
                      <span
                        style={{
                          background: '#ede9fe',
                          color: '#6d28d9',
                          borderRadius: 4,
                          padding: '1px 6px',
                          fontSize: 11,
                          fontWeight: 600,
                        }}
                      >
                        Venta #{m.venta_id}
                      </span>
                    )}
                  </div>

                  <p
                    style={{
                      margin: '2px 0 0',
                      fontSize: 12,
                      color: '#78716c',
                    }}
                  >
                    {m.usuario || 'Sistema'} · {fmtFecha(m.created_at)}
                  </p>

                  {m.motivo && (
                    <p
                      style={{
                        margin: '4px 0 0',
                        fontSize: 12,
                        color: '#57534e',
                        fontStyle: 'italic',
                        lineHeight: 1.3,
                      }}
                    >
                      "{m.motivo}"
                    </p>
                  )}
                </div>

                {/* Lado derecho: Cantidad firmada y badge de tipo */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    flexShrink: 0,
                    gap: 4,
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 13,
                      fontWeight: 700,
                      color: conf.color,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {conf.signo}
                    {fmtNum.format(Number(m.cantidad || 0))} {m.unidad_medida || ''}
                  </span>

                  <span
                    style={{
                      background: conf.bgBadge,
                      color: conf.colorBadge,
                      borderRadius: 6,
                      padding: '2px 8px',
                      fontSize: 11,
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {conf.etiqueta}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
