import { useState } from 'react'
import Alerta from './Alerta.jsx'

const CAMPOS_INICIALES = {
  nombre: '',
  descripcion: '',
  precio: '',
}

/**
 * Formulario para registrar o editar un producto.
 *
 * Props:
 *   producto    – objeto producto para edición o null para nuevo producto
 *   onGuardar   – async (payload) => void
 *   onCancelar  – () => void
 *   cargando    – boolean
 */
export default function ProductoForm({ producto, onGuardar, onCancelar, cargando }) {
  const esEdicion = Boolean(producto)

  const [campos, setCampos] = useState(() =>
    producto
      ? {
          nombre: producto.nombre ?? '',
          descripcion: producto.descripcion ?? '',
          precio: producto.precio ?? producto.precio_venta ?? '',
        }
      : CAMPOS_INICIALES
  )

  const [error, setError] = useState(null)

  function handleChange(e) {
    const { name, value } = e.target
    setCampos((prev) => ({ ...prev, [name]: value }))
    setError(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (!campos.nombre.trim()) {
      setError('El nombre del producto es obligatorio.')
      return
    }

    const precioNum = Number(campos.precio)
    if (campos.precio === '' || !Number.isFinite(precioNum) || precioNum <= 0) {
      setError('El precio debe ser un número válido mayor a cero.')
      return
    }

    const payload = {
      nombre: campos.nombre.trim(),
      descripcion: campos.descripcion.trim() || null,
      precio: precioNum,
    }

    try {
      await onGuardar(payload)
    } catch (err) {
      setError(err.message || 'Error al guardar el producto.')
    }
  }

  return (
    <form className="formulario" onSubmit={handleSubmit} noValidate>
      <h3 className="formulario-titulo">
        {esEdicion ? `Editar: ${producto.nombre}` : 'Nuevo producto'}
      </h3>

      <Alerta mensaje={error} tipo="error" onCerrar={() => setError(null)} />

      <div className="campo">
        <label htmlFor="prod-nombre">Nombre del producto *</label>
        <input
          id="prod-nombre"
          name="nombre"
          type="text"
          value={campos.nombre}
          onChange={handleChange}
          maxLength={120}
          required
          disabled={cargando}
          placeholder="Ej. Cono Doble Vainilla y Fresa"
        />
      </div>

      <div className="campo">
        <label htmlFor="prod-descripcion">Descripción</label>
        <textarea
          id="prod-descripcion"
          name="descripcion"
          value={campos.descripcion}
          onChange={handleChange}
          rows={2}
          disabled={cargando}
          placeholder="Breve detalle del producto o presentación"
        />
      </div>

      <div className="campo">
        <label htmlFor="prod-precio">Precio de venta ($ MXN) *</label>
        <input
          id="prod-precio"
          name="precio"
          type="number"
          step="0.01"
          min="0.01"
          value={campos.precio}
          onChange={handleChange}
          required
          disabled={cargando}
          placeholder="0.00"
        />
      </div>

      <div className="formulario-acciones">
        <button type="submit" className="btn btn-primario" disabled={cargando}>
          {cargando ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Crear producto'}
        </button>
        <button
          type="button"
          className="btn btn-secundario"
          onClick={onCancelar}
          disabled={cargando}
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}

