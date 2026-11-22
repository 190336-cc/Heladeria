import { Pencil, Check, X, BookOpen } from 'lucide-react'

export default function ProductosTable({
  productos,
  onEditar,
  onCambiarEstado,
  cargando,
}) {
  if (!productos.length && !cargando) {
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
          No se encontraron productos
        </p>
        <p style={{ fontSize: 13 }}>
          Ajusta los filtros de búsqueda o registra un nuevo producto en el catálogo.
        </p>
      </div>
    )
  }

  const fmtMoneda = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 20,
      }}
    >
      {productos.map((prod) => {
        const precio = Number(prod.precio_venta ?? prod.precio ?? 0)
        const costoReceta = Number(prod.costo_receta_estimado ?? 0)
        const margen = precio > 0 && costoReceta > 0 ? ((precio - costoReceta) / precio) * 100 : null
        const esActivo = prod.activo === true || prod.estado === 'activo'
        const emoji = prod.emoji || '🍦'
        const categoria = prod.categoria || 'Helados'

        return (
          <div
            key={prod.id}
            style={{
              background: '#ffffff',
              borderRadius: 14,
              border: '1px solid #e7e5e4',
              boxShadow: '0 1px 4px rgba(0, 0, 0, 0.04)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              opacity: esActivo ? 1 : 0.75,
            }}
          >
            {/* Cabecera crema con Emoji/Ilustración */}
            <div
              style={{
                background: '#FFF8F2',
                height: 110,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderBottom: '1px solid #fcefe7',
                position: 'relative',
              }}
            >
              <span style={{ fontSize: 46, userSelect: 'none' }}>{emoji}</span>

              {!esActivo && (
                <span
                  style={{
                    position: 'absolute',
                    top: 10,
                    right: 10,
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#dc2626',
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: 6,
                    letterSpacing: '0.04em',
                  }}
                >
                  INACTIVO
                </span>
              )}
            </div>

            {/* Contenido de la tarjeta */}
            <div
              style={{
                padding: '16px 18px',
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                gap: 8,
              }}
            >
              {/* Nombre y Categoría */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 8,
                }}
              >
                <h4
                  style={{
                    margin: 0,
                    fontSize: 15,
                    fontWeight: 700,
                    color: '#1c1917',
                    lineHeight: 1.25,
                  }}
                >
                  {prod.nombre}
                </h4>
                <span
                  style={{
                    background: '#f5f5f4',
                    color: '#78716c',
                    borderRadius: 6,
                    padding: '2px 8px',
                    fontSize: 11,
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  {categoria}
                </span>
              </div>

              {/* Precio grande */}
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 22,
                  fontWeight: 700,
                  color: '#1c1917',
                  lineHeight: 1,
                  marginTop: 2,
                }}
              >
                {fmtMoneda.format(precio)}
              </div>

              {/* Indicador de Receta y Margen */}
              <div
                style={{
                  fontSize: 11,
                  lineHeight: 1.35,
                  padding: '6px 8px',
                  borderRadius: 6,
                  background: costoReceta > 0 ? '#f0fdf4' : '#fafaf9',
                  border: `1px solid ${costoReceta > 0 ? '#bbf7d0' : '#f0eee9'}`,
                  color: '#57534e',
                  marginTop: 2,
                }}
              >
                {prod.receta_nombre ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600, color: '#166534' }}>
                    <BookOpen size={12} style={{ flexShrink: 0 }} />
                    <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {prod.receta_nombre}
                    </span>
                  </div>
                ) : costoReceta > 0 ? (
                  <span style={{ color: '#166534', fontWeight: 600 }}>Receta formulada</span>
                ) : (
                  <span style={{ color: '#a8a29e', fontStyle: 'italic' }}>Sin receta formulada</span>
                )}

                {costoReceta > 0 && margen !== null && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: 3,
                      fontFamily: 'var(--font-mono)',
                      fontSize: 11,
                    }}
                  >
                    <span>Costo: {fmtMoneda.format(costoReceta)}</span>
                    <span
                      style={{
                        fontWeight: 700,
                        color: margen >= 50 ? '#15803d' : margen >= 30 ? '#b45309' : '#b91c1c',
                      }}
                    >
                      {margen.toFixed(0)}% margen
                    </span>
                  </div>
                )}
              </div>

              {/* Barra inferior: Editar y Disponibilidad */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: 12,
                  borderTop: '1px solid #f5f5f4',
                  marginTop: 'auto',
                }}
              >
                <button
                  type="button"
                  onClick={() => onEditar(prod)}
                  disabled={cargando}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '5px 8px',
                    borderRadius: 6,
                    border: 'none',
                    background: 'transparent',
                    color: '#57534e',
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: cargando ? 'not-allowed' : 'pointer',
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f5f5f4')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <Pencil size={14} color="#78716c" />
                  <span>Editar</span>
                </button>

                <button
                  type="button"
                  onClick={() => onCambiarEstado(prod)}
                  disabled={cargando}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '4px 10px',
                    borderRadius: 6,
                    border: `1px solid ${esActivo ? '#a7f3d0' : '#e5e7eb'}`,
                    background: esActivo ? '#d1fae5' : '#f3f4f6',
                    color: esActivo ? '#059669' : '#6b7280',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: cargando ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s',
                  }}
                  title={esActivo ? 'Desactivar disponibilidad' : 'Activar disponibilidad'}
                >
                  {esActivo ? <Check size={13} /> : <X size={13} />}
                  <span>{esActivo ? 'Disponible' : 'No disponible'}</span>
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
