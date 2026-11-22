import { fmtMoneda } from '../utils/formatters.js'

export default function InventarioResumen({ resumen, cargando }) {
  if (cargando && !resumen) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            style={{
              background: '#ffffff',
              borderRadius: 12,
              border: '1px solid #e7e5e4',
              padding: '18px 20px',
              height: 78,
              boxSizing: 'border-box',
            }}
          />
        ))}
      </div>
    )
  }

  const cards = [
    {
      etiqueta: 'TOTAL INSUMOS',
      valor: Number(resumen?.total_insumos || 0),
      color: '#1c1917',
    },
    {
      etiqueta: 'AGOTADOS',
      valor: Number(resumen?.agotados || 0),
      color: '#dc2626',
    },
    {
      etiqueta: 'STOCK BAJO',
      valor: Number(resumen?.stock_bajo || 0),
      color: '#d97706',
    },
    {
      etiqueta: 'SUFICIENTE',
      valor: Number(resumen?.stock_suficiente || 0),
      color: '#059669',
    },
    {
      etiqueta: 'VALOR ESTIMADO',
      valor: fmtMoneda(resumen?.valor_inventario || 0),
      color: '#1c1917',
      isMono: true,
    },
  ]

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
        gap: 14,
      }}
    >
      {cards.map((c) => (
        <div
          key={c.etiqueta}
          style={{
            background: '#ffffff',
            borderRadius: 12,
            border: '1px solid #e7e5e4',
            padding: '16px 20px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#78716c',
              letterSpacing: '0.05em',
            }}
          >
            {c.etiqueta}
          </span>
          <span
            style={{
              fontSize: c.isMono ? 22 : 28,
              fontWeight: 700,
              color: c.color,
              fontFamily: c.isMono ? 'var(--font-mono)' : 'inherit',
              lineHeight: 1.1,
            }}
          >
            {c.valor}
          </span>
        </div>
      ))}
    </div>
  )
}
