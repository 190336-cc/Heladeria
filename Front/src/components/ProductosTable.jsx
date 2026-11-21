/**
 * Tabla para listar productos con detalles de precio, estado y acciones.
 *
 * Props:
 *   productos       – array de productos
 *   onEditar        – (producto) => void
 *   onCambiarEstado – (producto) => void
 *   cargando        – boolean
 */
export default function ProductosTable({
  productos,
  onEditar,
  onCambiarEstado,
  cargando,
}) {
  if (!productos.length && !cargando) {
    return <p className="sin-datos">No hay productos que coincidan con la búsqueda o filtros.</p>
  }

  const fmtMoneda = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
  })

  return (
    <div className="tabla-wrap">
      <table className="tabla">
        <thead>
          <tr>
            <th>Producto</th>
            <th>Fórmula / Receta</th>
            <th className="texto-derecha">Precio de venta</th>
            <th className="texto-derecha">Costo receta est.</th>
            <th className="texto-derecha">Margen est.</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {productos.map((prod) => {
            const precio = Number(prod.precio ?? prod.precio_venta ?? 0)
            const costoReceta = Number(prod.costo_receta_estimado ?? 0)
            const margen = precio > 0 && costoReceta > 0 ? ((precio - costoReceta) / precio) * 100 : null
            const esActivo = prod.activo === true || prod.estado === 'activo'

            return (
              <tr key={prod.id} className={esActivo ? '' : 'fila-inactiva'}>
                <td>
                  <span className="nombre-principal">{prod.nombre}</span>
                  {prod.descripcion && (
                    <span className="nombre-desc">{prod.descripcion}</span>
                  )}
                </td>
                <td>
                  {prod.receta_nombre ? (
                    <span style={{ fontSize: 13, color: '#6B3F1C', fontWeight: 500 }}>
                      📋 {prod.receta_nombre}
                    </span>
                  ) : costoReceta > 0 ? (
                    <span style={{ fontSize: 12, color: '#78716c' }}>Fórmula sin nombre</span>
                  ) : (
                    <span style={{ fontSize: 12, color: '#a8a29e', fontStyle: 'italic' }}>Sin receta</span>
                  )}
                </td>
                <td className="texto-derecha num font-semibold">
                  {fmtMoneda.format(precio)}
                </td>
                <td className="texto-derecha num">
                  {costoReceta > 0 ? (
                    fmtMoneda.format(costoReceta)
                  ) : (
                    <span className="campo-nota">—</span>
                  )}
                </td>
                <td className="texto-derecha num">
                  {margen !== null ? (
                    <span style={{
                      fontWeight: 600,
                      color: margen >= 50 ? '#059669' : margen >= 30 ? '#d97706' : '#dc2626',
                    }}>
                      {margen.toFixed(1)}%
                    </span>
                  ) : (
                    <span className="campo-nota">—</span>
                  )}
                </td>
                <td>
                  <span
                    className={`badge ${
                      esActivo ? 'badge-activo' : 'badge-inactivo'
                    }`}
                  >
                    {esActivo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="acciones-celda">
                  <button
                    type="button"
                    className="btn btn-sm btn-secundario"
                    onClick={() => onEditar(prod)}
                    disabled={cargando}
                    title="Editar producto"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${
                      esActivo ? 'btn-danger' : 'btn-primario'
                    }`}
                    onClick={() => onCambiarEstado(prod)}
                    disabled={cargando}
                    title={esActivo ? 'Desactivar producto' : 'Activar producto'}
                  >
                    {esActivo ? 'Desactivar' : 'Activar'}
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

