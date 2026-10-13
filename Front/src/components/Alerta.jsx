/**
 * Alerta de error o información reutilizable.
 * tipo: 'error' | 'exito' | 'info'
 */
export default function Alerta({ mensaje, tipo = 'error', onCerrar }) {
  if (!mensaje) return null
  return (
    <div className={`alerta alerta-${tipo}`} role="alert">
      <span>{mensaje}</span>
      {onCerrar && (
        <button
          type="button"
          className="alerta-cerrar"
          onClick={onCerrar}
          aria-label="Cerrar alerta"
        >
          ×
        </button>
      )}
    </div>
  )
}

