/**
 * Tarjetas con el resumen general del inventario.
 * Los valores NUMERIC de PostgreSQL llegan como strings → se convierten a Number.
 *
 * Props:
 *   resumen – objeto { total_insumos, agotados, stock_bajo, stock_suficiente, valor_inventario }
 *   cargando – boolean
 */
export default function InventarioResumen({ resumen, cargando }) {
  if (cargando) {
    return <p className="texto-cargando">Cargando resumen…</p>
  }
  if (!resumen) return null

  const fmtMoneda = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
  })

  const tarjetas = [
    {
      etiqueta: 'Total insumos activos',
      valor: Number(resumen.total_insumos),
      clase: 'tarjeta-neutral',
    },
    {
      etiqueta: 'Agotados',
      valor: Number(resumen.agotados),
      clase: Number(resumen.agotados) > 0 ? 'tarjeta-peligro' : 'tarjeta-ok',
    },
    {
      etiqueta: 'Stock bajo',
      valor: Number(resumen.stock_bajo),
      clase: Number(resumen.stock_bajo) > 0 ? 'tarjeta-advertencia' : 'tarjeta-ok',
    },
    {
      etiqueta: 'Stock suficiente',
      valor: Number(resumen.stock_suficiente),
      clase: 'tarjeta-ok',
    },
    {
      etiqueta: 'Valor estimado',
      valor: fmtMoneda.format(Number(resumen.valor_inventario)),
      clase: 'tarjeta-neutral',
    },
  ]

  return (
    <div className="resumen-grid">
      {tarjetas.map((t) => (
        <div key={t.etiqueta} className={`tarjeta-resumen ${t.clase}`}>
          <span className="tarjeta-valor">{t.valor}</span>
          <span className="tarjeta-etiqueta">{t.etiqueta}</span>
        </div>
      ))}
    </div>
  )
}

