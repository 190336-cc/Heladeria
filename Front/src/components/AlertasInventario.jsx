/**
 * Lista de insumos con stock igual o por debajo del mínimo.
 *
 * Props:
 *   alertas  – array { id, nombre, unidad_medida, stock_actual, stock_minimo, alerta }
 *   cargando – boolean
 */
export default function AlertasInventario({ alertas, cargando }) {
  if (cargando) return <p className="texto-cargando">Cargando alertas…</p>
  if (!alertas) return null

  const fmt = new Intl.NumberFormat('es-MX', { minimumFractionDigits: 3 })

  if (alertas.length === 0) {
    return (
      <div className="alertas-vacio">
        <span className="alertas-check">✓</span>
        <p>Todos los insumos tienen stock suficiente.</p>
      </div>
    )
  }

  return (
    <div className="tabla-wrap">
      <table className="tabla">
        <thead>
          <tr>
            <th>Insumo</th>
            <th>Unidad</th>
            <th className="texto-derecha">Stock actual</th>
            <th className="texto-derecha">Stock mínimo</th>
            <th>Alerta</th>
          </tr>
        </thead>
        <tbody>
          {alertas.map((a) => (
            <tr key={a.id}>
              <td>{a.nombre}</td>
              <td>{a.unidad_medida}</td>
              <td className="texto-derecha num">{fmt.format(Number(a.stock_actual))}</td>
              <td className="texto-derecha num">{fmt.format(Number(a.stock_minimo))}</td>
              <td>
                <span className={`badge ${a.alerta === 'AGOTADO' ? 'badge-agotado' : 'badge-bajo'}`}>
                  {a.alerta === 'AGOTADO' ? 'Agotado' : 'Stock bajo'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

