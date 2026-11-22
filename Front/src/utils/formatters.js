/**
 * Utilerías centralizadas de formato para Helados del Valle.
 */

const mxnFormatter = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/**
 * Formatea un valor numérico a moneda mexicana ($1,234.50).
 * @param {number|string} valor
 * @returns {string}
 */
export function fmtMoneda(valor) {
  return mxnFormatter.format(Number(valor || 0))
}

/**
 * Formatea cantidades de inventario o insumos.
 * Si la unidad es 'pieza' o 'pza', no muestra decimales.
 * En caso contrario, formatea con al menos 2 decimales y hasta maxDecimals.
 * @param {number|string} valor
 * @param {string} [unidad]
 * @param {number} [maxDecimals=3]
 * @returns {string}
 */
export function fmtStock(valor, unidad = null, maxDecimals = 3) {
  const num = Number(valor || 0)
  if (unidad === 'pieza' || unidad === 'pza') {
    return num.toFixed(0)
  }
  return new Intl.NumberFormat('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: maxDecimals,
  }).format(num)
}

/**
 * Formatea una fecha ISO a texto amigable en español.
 * @param {string|Date} fechaStr
 * @param {Intl.DateTimeFormatOptions} [options]
 * @returns {string}
 */
export function fmtFecha(fechaStr, options = null) {
  if (!fechaStr) return ''
  const d = new Date(fechaStr)
  if (isNaN(d.getTime())) return String(fechaStr)

  const opts = options || {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }
  return d.toLocaleDateString('es-MX', opts)
}

/**
 * Formatea una fecha ISO con hora (ej: 12/10/2026, 16:40).
 * @param {string|Date} fechaStr
 * @returns {string}
 */
export function fmtFechaHora(fechaStr) {
  if (!fechaStr) return '—'
  const d = new Date(fechaStr)
  if (isNaN(d.getTime())) return String(fechaStr)
  return d.toLocaleString('es-MX', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Calcula el porcentaje de margen bruto entre precio de venta y costo.
 * Retorna número (ej: 45.5) o null si no hay precio o costo válido.
 * @param {number|string} precio
 * @param {number|string} costo
 * @returns {number|null}
 */
export function calcularMargen(precio, costo) {
  const p = Number(precio)
  const c = Number(costo)
  if (!p || p <= 0 || !c || c <= 0) return null
  return ((p - c) / p) * 100
}
