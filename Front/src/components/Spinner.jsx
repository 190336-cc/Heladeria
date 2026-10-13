/**
 * Spinner de carga reutilizable.
 */
export default function Spinner({ texto = 'Cargando…' }) {
  return (
    <div className="spinner-wrap" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <span className="spinner-texto">{texto}</span>
    </div>
  )
}

