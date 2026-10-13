/**
 * Tabla del historial de movimientos de inventario.
 *
 * Props:
 *   movimientos – array de movimientos
 *   cargando    – boolean
 */
export default function MovimientosTable({ movimientos, cargando }) {
  if (cargando) return <p className="texto-cargando">Cargando historial…</p>
  if (!movimientos.length) {
    return <p className="sin-datos">No hay movimientos registrados aún.</p>
  }

  const ETIQUETAS_TIPO = {
    entrada: 'Entrada',
    merma: 'Merma',
    ajuste_entrada: 'Ajuste (+)',
    ajuste_salida: 'Ajuste (−)',
    consumo: 'Consumo',
    reversion_venta: 'Reversión',
  }

  const CLASES_TIPO = {
    entrada: 'badge-ok',
    ajuste_entrada: 'badge-ok',
    merma: 'badge-bajo',
    ajuste_salida: 'badge-bajo',
    consumo: 'badge-bajo',
    reversion_venta: 'badge-neutral',
  }

  const fmtFecha = new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
  const fmtNum = new Intl.NumberFormat('es-MX', { minimumFractionDigits: 3 })

  return (
    <div className="tabla-wrap">
      <table className="tabla tabla-compacta">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Insumo</th>
            <th>Tipo</th>
            <th className="texto-derecha">Cantidad</th>
            <th>Motivo</th>
            <th>Usuario</th>
          </tr>
        </thead>
        <tbody>
          {movimientos.map((m) => (
            <tr key={m.id}>
              <td className="fecha-celda">
                {fmtFecha.format(new Date(m.created_at))}
              </td>
              <td>{m.insumo}</td>
              <td>
                <span className={`badge ${CLASES_TIPO[m.tipo] ?? 'badge-neutral'}`}>
                  {ETIQUETAS_TIPO[m.tipo] ?? m.tipo}
                </span>
              </td>
              <td className="texto-derecha num">{fmtNum.format(Number(m.cantidad))}</td>
              <td className="motivo-celda">{m.motivo}</td>
              <td>{m.usuario ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

