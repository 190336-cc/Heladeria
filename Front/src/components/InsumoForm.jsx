import { useState } from 'react'
import Alerta from './Alerta.jsx'

const UNIDADES = ['g', 'ml', 'pieza']

const CAMPOS_INICIALES = {
  nombre: '',
  descripcion: '',
  unidad_medida: 'g',
  stock_minimo: '',
  costo_unitario: '',
}

/**
 * Formulario para crear o editar un insumo.
 *
 * Props:
 *   insumo      – objeto con los datos actuales (modo edición) o null (modo creación)
 *   onGuardar   – async (datos) => void, debe lanzar si hay error
 *   onCancelar  – () => void
 *   cargando    – boolean
 */
export default function InsumoForm({ insumo, onGuardar, onCancelar, cargando }) {
  const esEdicion = Boolean(insumo)

  const [campos, setCampos] = useState(() =>
    insumo
      ? {
          nombre: insumo.nombre ?? '',
          descripcion: insumo.descripcion ?? '',
          unidad_medida: insumo.unidad_medida ?? 'g',
          stock_minimo: insumo.stock_minimo ?? '',
          costo_unitario: insumo.costo_unitario ?? '',
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

    // Validación local básica (el backend valida también)
    if (!campos.nombre.trim()) {
      setError('El nombre es obligatorio.')
      return
    }
    if (!UNIDADES.includes(campos.unidad_medida)) {
      setError('Unidad de medida inválida.')
      return
    }
    if (Number(campos.stock_minimo) < 0 || campos.stock_minimo === '') {
      setError('El stock mínimo debe ser 0 o mayor.')
      return
    }
    if (Number(campos.costo_unitario) < 0 || campos.costo_unitario === '') {
      setError('El costo unitario debe ser 0 o mayor.')
      return
    }

    const payload = {
      nombre: campos.nombre.trim(),
      descripcion: campos.descripcion.trim() || null,
      stock_minimo: Number(campos.stock_minimo),
      costo_unitario: Number(campos.costo_unitario),
    }

    // unidad_medida solo va en creación (no se edita)
    if (!esEdicion) {
      payload.unidad_medida = campos.unidad_medida
    }

    try {
      await onGuardar(payload)
    } catch (err) {
      setError(err.message || 'Error al guardar el insumo.')
    }
  }

  return (
    <form className="formulario" onSubmit={handleSubmit} noValidate>
      <h3 className="formulario-titulo">
        {esEdicion ? `Editar: ${insumo.nombre}` : 'Nuevo insumo'}
      </h3>

      <Alerta mensaje={error} tipo="error" onCerrar={() => setError(null)} />

      <div className="campo">
        <label htmlFor="nombre">Nombre *</label>
        <input
          id="nombre"
          name="nombre"
          type="text"
          value={campos.nombre}
          onChange={handleChange}
          maxLength={120}
          required
          disabled={cargando}
        />
      </div>

      <div className="campo">
        <label htmlFor="descripcion">Descripción</label>
        <textarea
          id="descripcion"
          name="descripcion"
          value={campos.descripcion}
          onChange={handleChange}
          rows={2}
          disabled={cargando}
        />
      </div>

      <div className="campo">
        <label htmlFor="unidad_medida">Unidad de medida *</label>
        <select
          id="unidad_medida"
          name="unidad_medida"
          value={campos.unidad_medida}
          onChange={handleChange}
          disabled={cargando || esEdicion}
          title={esEdicion ? 'La unidad de medida no se puede cambiar' : undefined}
        >
          <option value="g">g (gramos)</option>
          <option value="ml">ml (mililitros)</option>
          <option value="pieza">pieza</option>
        </select>
        {esEdicion && (
          <p className="campo-nota">La unidad de medida no se puede cambiar después de creado.</p>
        )}
      </div>

      <div className="campos-fila">
        <div className="campo">
          <label htmlFor="stock_minimo">Stock mínimo *</label>
          <input
            id="stock_minimo"
            name="stock_minimo"
            type="number"
            step="0.001"
            min="0"
            value={campos.stock_minimo}
            onChange={handleChange}
            required
            disabled={cargando}
          />
        </div>

        <div className="campo">
          <label htmlFor="costo_unitario">Costo unitario *</label>
          <input
            id="costo_unitario"
            name="costo_unitario"
            type="number"
            step="0.0001"
            min="0"
            value={campos.costo_unitario}
            onChange={handleChange}
            required
            disabled={cargando}
          />
        </div>
      </div>

      {esEdicion && (
        <p className="campo-nota alerta-info-inline">
          ℹ️ El stock actual no se puede modificar aquí. Usa el módulo de Movimientos de inventario.
        </p>
      )}

      <div className="formulario-acciones">
        <button type="submit" className="btn btn-primario" disabled={cargando}>
          {cargando ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Crear insumo'}
        </button>
        <button type="button" className="btn btn-secundario" onClick={onCancelar} disabled={cargando}>
          Cancelar
        </button>
      </div>
    </form>
  )
}

