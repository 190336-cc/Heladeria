import { useState } from 'react'
import Alerta from './Alerta.jsx'

const TIPOS_MOVIMIENTO = [
  { valor: 'entrada', etiqueta: 'Entrada de mercancía' },
  { valor: 'merma', etiqueta: 'Merma / pérdida' },
  { valor: 'ajuste_entrada', etiqueta: 'Ajuste de entrada' },
  { valor: 'ajuste_salida', etiqueta: 'Ajuste de salida' },
]

/**
 * Formulario para registrar un movimiento de inventario.
 *
 * Props:
 *   insumos     – array de insumos activos para el selector
 *   onRegistrar – async (datos) => void
 *   cargando    – boolean
 */
export default function MovimientoForm({ insumos, onRegistrar, cargando }) {
  const [campos, setCampos] = useState({
    insumo_id: '',
    tipo: 'entrada',
    cantidad: '',
    motivo: '',
  })
  const [error, setError] = useState(null)
  const [exito, setExito] = useState(null)

  function handleChange(e) {
    const { name, value } = e.target
    setCampos((prev) => ({ ...prev, [name]: value }))
    setError(null)
    setExito(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setExito(null)

    if (!campos.insumo_id) {
      setError('Selecciona un insumo.')
      return
    }
    if (!campos.cantidad || Number(campos.cantidad) <= 0) {
      setError('La cantidad debe ser mayor que cero.')
      return
    }
    if (!campos.motivo.trim()) {
      setError('El motivo es obligatorio.')
      return
    }

    // usuario_id = 1 provisional (sin módulo de auth implementado aún)
    const payload = {
      insumo_id: Number(campos.insumo_id),
      usuario_id: 1,
      tipo: campos.tipo,
      cantidad: Number(campos.cantidad),
      motivo: campos.motivo.trim(),
    }

    try {
      const respuesta = await onRegistrar(payload)
      setExito('Movimiento registrado correctamente.')
      // Reiniciar solo cantidad y motivo para facilitar entradas repetidas
      setCampos((prev) => ({ ...prev, cantidad: '', motivo: '' }))
      return respuesta
    } catch (err) {
      setError(err.message || 'Error al registrar el movimiento.')
    }
  }

  return (
    <form className="formulario" onSubmit={handleSubmit} noValidate>
      <h3 className="formulario-titulo">Registrar movimiento</h3>

      <Alerta mensaje={error} tipo="error" onCerrar={() => setError(null)} />
      <Alerta mensaje={exito} tipo="exito" onCerrar={() => setExito(null)} />

      <div className="campo">
        <label htmlFor="mv-insumo_id">Insumo *</label>
        <select
          id="mv-insumo_id"
          name="insumo_id"
          value={campos.insumo_id}
          onChange={handleChange}
          required
          disabled={cargando}
        >
          <option value="">— Selecciona un insumo —</option>
          {insumos
            .filter((i) => i.activo)
            .map((i) => (
              <option key={i.id} value={i.id}>
                {i.nombre} ({i.unidad_medida}) — stock: {Number(i.stock_actual).toFixed(3)}
              </option>
            ))}
        </select>
      </div>

      <div className="campo">
        <label htmlFor="mv-tipo">Tipo de movimiento *</label>
        <select
          id="mv-tipo"
          name="tipo"
          value={campos.tipo}
          onChange={handleChange}
          required
          disabled={cargando}
        >
          {TIPOS_MOVIMIENTO.map((t) => (
            <option key={t.valor} value={t.valor}>
              {t.etiqueta}
            </option>
          ))}
        </select>
      </div>

      <div className="campo">
        <label htmlFor="mv-cantidad">Cantidad *</label>
        <input
          id="mv-cantidad"
          name="cantidad"
          type="number"
          step="0.001"
          min="0.001"
          value={campos.cantidad}
          onChange={handleChange}
          required
          disabled={cargando}
          placeholder="0.000"
        />
      </div>

      <div className="campo">
        <label htmlFor="mv-motivo">Motivo *</label>
        <textarea
          id="mv-motivo"
          name="motivo"
          value={campos.motivo}
          onChange={handleChange}
          rows={2}
          required
          disabled={cargando}
          placeholder="Describe brevemente el motivo del movimiento"
        />
      </div>

      <p className="campo-nota">
        ℹ️ El usuario se asignará automáticamente una vez implementado el módulo de autenticación.
      </p>

      <div className="formulario-acciones">
        <button type="submit" className="btn btn-primario" disabled={cargando}>
          {cargando ? 'Registrando…' : 'Registrar movimiento'}
        </button>
      </div>
    </form>
  )
}

