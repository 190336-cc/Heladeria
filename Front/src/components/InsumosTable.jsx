/**
 * Tabla de insumos con acciones de editar y activar/desactivar.
 *
 * Props:
 *   insumos      – array de insumos
 *   onEditar     – (insumo) => void
 *   onCambiarEstado – (insumo) => void
 *   cargando     – boolean
 */
export default function InsumosTable({ insumos, onEditar, onCambiarEstado, cargando }) {
  if (!insumos.length && !cargando) {
    return <p className="sin-datos">No hay insumos que coincidan con los filtros.</p>
  }

  const fmt = new Intl.NumberFormat('es-MX', { minimumFractionDigits: 3, maximumFractionDigits: 3 })
  const fmtCosto = new Intl.NumberFormat('es-MX', { minimumFractionDigits: 4, maximumFractionDigits: 4 })

  function nivelStock(insumo) {
    const actual = Number(insumo.stock_actual)
    const minimo = Number(insumo.stock_minimo)
    if (actual === 0) return { etiqueta: 'Agotado', clase: 'badge-agotado' }
    if (actual <= minimo) return { etiqueta: 'Stock bajo', clase: 'badge-bajo' }
    return { etiqueta: 'OK', clase: 'badge-ok' }
  }

  return (
    <div className="tabla-wrap">
      <table className="tabla">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Unidad</th>
            <th className="texto-derecha">Stock actual</th>
            <th className="texto-derecha">Stock mínimo</th>
            <th className="texto-derecha">Costo unitario</th>
            <th>Estado</th>
            <th>Nivel</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {insumos.map((ins) => {
            const nivel = nivelStock(ins)
            return (
              <tr key={ins.id} className={ins.activo ? '' : 'fila-inactiva'}>
                <td>
                  <span className="nombre-principal">{ins.nombre}</span>
                  {ins.descripcion && (
                    <span className="nombre-desc">{ins.descripcion}</span>
                  )}
                </td>
                <td>{ins.unidad_medida}</td>
                <td className="texto-derecha num">{fmt.format(Number(ins.stock_actual))}</td>
                <td className="texto-derecha num">{fmt.format(Number(ins.stock_minimo))}</td>
                <td className="texto-derecha num">${fmtCosto.format(Number(ins.costo_unitario))}</td>
                <td>
                  <span className={`badge ${ins.activo ? 'badge-activo' : 'badge-inactivo'}`}>
                    {ins.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td>
                  <span className={`badge ${nivel.clase}`}>{nivel.etiqueta}</span>
                </td>
                <td className="acciones-celda">
                  <button
                    type="button"
                    className="btn btn-sm btn-secundario"
                    onClick={() => onEditar(ins)}
                    disabled={cargando}
                    title="Editar insumo"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${ins.activo ? 'btn-danger' : 'btn-primario'}`}
                    onClick={() => onCambiarEstado(ins)}
                    disabled={cargando}
                    title={ins.activo ? 'Desactivar' : 'Activar'}
                  >
                    {ins.activo ? 'Desactivar' : 'Activar'}
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

