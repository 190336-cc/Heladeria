import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { fmtStock } from '../utils/formatters.js'

export default function AlertasInventario({ alertas, cargando }) {
  if (cargando && !alertas) {
    return null
  }

  const listaAlertas = Array.isArray(alertas) ? alertas : []

  return (
    <div
      style={{
        background: '#fffdf5',
        border: '1px solid #fef08a',
        borderRadius: 12,
        padding: '16px 20px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: listaAlertas.length > 0 ? 12 : 0,
        }}
      >
        <AlertTriangle size={17} color="#d97706" />
        <h4
          style={{
            margin: 0,
            fontSize: 14,
            fontWeight: 700,
            color: '#854d0e',
          }}
        >
          Alertas de stock mínimo ({listaAlertas.length})
        </h4>
      </div>

      {listaAlertas.length === 0 ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            color: '#065f46',
            fontSize: 13,
            fontWeight: 500,
            padding: '4px 0',
          }}
        >
          <CheckCircle2 size={16} color="#059669" />
          <span>Todos los insumos activos cuentan con stock suficiente por encima de su umbral mínimo.</span>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 12,
          }}
        >
          {listaAlertas.map((a) => {
            const esAgotado = a.alerta === 'AGOTADO' || Number(a.stock_actual || 0) <= 0
            return (
              <div
                key={a.id}
                style={{
                  background: '#ffffff',
                  border: `1px solid ${esAgotado ? '#fecaca' : '#fed7aa'}`,
                  borderRadius: 10,
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                  boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                }}
              >
                <div>
                  <span
                    style={{
                      display: 'block',
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#1c1917',
                    }}
                  >
                    {a.nombre}
                  </span>
                  <span
                    style={{
                      display: 'block',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 12,
                      color: '#78716c',
                      marginTop: 2,
                    }}
                  >
                    {fmtStock(a.stock_actual, a.unidad_medida)} / {fmtStock(a.stock_minimo, a.unidad_medida)} {a.unidad_medida}
                  </span>
                </div>

                <span
                  style={{
                    padding: '3px 9px',
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: '0.02em',
                    whiteSpace: 'nowrap',
                    background: esAgotado ? '#fee2e2' : '#fef3c7',
                    color: esAgotado ? '#dc2626' : '#d97706',
                    border: `1px solid ${esAgotado ? '#fca5a5' : '#fcd34d'}`,
                  }}
                >
                  {esAgotado ? 'Agotado' : 'Stock bajo'}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
