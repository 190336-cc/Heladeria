/**
 * Capa centralizada de comunicación con el backend.
 * Todos los componentes deben importar desde aquí; ninguno debe
 * hacer fetch() directamente.
 *
 * Los campos NUMERIC de PostgreSQL llegan como strings; las
 * funciones que los devuelven los convierten a Number cuando
 * es necesario para comparaciones o cálculos en JS.
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

// ---------------------------------------------------------------------------
// Helper interno
// ---------------------------------------------------------------------------

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })

  let data
  try {
    data = await res.json()
  } catch {
    data = { message: 'Respuesta inesperada del servidor' }
  }

  if (!res.ok) {
    const err = new Error(data?.message || `Error ${res.status}`)
    err.status = res.status
    err.data = data
    throw err
  }

  return data
}

// ---------------------------------------------------------------------------
// Insumos
// ---------------------------------------------------------------------------

export const insumosApi = {
  listar: () => request('/insumos'),

  obtener: (id) => request(`/insumos/${id}`),

  crear: (body) =>
    request('/insumos', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  editar: (id, body) =>
    request(`/insumos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  cambiarEstado: (id, activo) =>
    request(`/insumos/${id}/estado`, {
      method: 'PATCH',
      body: JSON.stringify({ activo }),
    }),
}

// ---------------------------------------------------------------------------
// Inventario
// ---------------------------------------------------------------------------

export const inventarioApi = {
  resumen: () => request('/inventario/resumen'),

  alertas: () => request('/inventario/alertas'),

  movimientos: () => request('/inventario/movimientos'),

  registrarMovimiento: (body) =>
    request('/inventario/movimientos', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
}

// ---------------------------------------------------------------------------
// Productos
// ---------------------------------------------------------------------------

export const productosApi = {
  listar: (params = {}) => {
    const query = new URLSearchParams()
    if (params.nombre) query.set('nombre', params.nombre)
    if (params.q) query.set('q', params.q)
    if (params.estado && params.estado !== 'todos') query.set('estado', params.estado)
    if (params.activo !== undefined) query.set('activo', params.activo)
    const qs = query.toString()
    return request(`/productos${qs ? `?${qs}` : ''}`)
  },

  obtener: (id) => request(`/productos/${id}`),

  crear: (body) =>
    request('/productos', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  editar: (id, body) =>
    request(`/productos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  cambiarEstado: (id, activo) =>
    request(`/productos/${id}/estado`, {
      method: 'PATCH',
      body: JSON.stringify(activo !== undefined ? { activo } : {}),
    }),
}

