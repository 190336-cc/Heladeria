const express = require("express");
const pool = require("../db");

const router = express.Router();

const ESTADOS_VALIDOS = ["programado", "realizado", "cancelado"];

// ---------------------------------------------------------------------------
// GET /api/eventos/tipos
// Listar categorías de eventos (Cumpleaños, Feria, etc.)
// ---------------------------------------------------------------------------
router.get("/tipos", async (req, res) => {
  try {
    const resultado = await pool.query(
      "SELECT id, nombre, descripcion, activo FROM tipos_evento WHERE activo = TRUE ORDER BY nombre ASC"
    );
    res.json(resultado.rows);
  } catch (error) {
    console.error("Error al consultar tipos de evento:", error.message);
    res.status(500).json({ message: "No se pudieron consultar los tipos de evento" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/eventos
// Listar eventos con su tipo y cálculo automático de ventas generadas.
// Soporta filtro opcional ?vigentes=true para obtener sólo eventos que ocurren hoy.
// ---------------------------------------------------------------------------
router.get("/", async (req, res) => {
  const { vigentes } = req.query;

  try {
    let whereClause = "";
    if (vigentes === "true" || vigentes === "1") {
      whereClause = `
        WHERE e.estado != 'cancelado'
          AND DATE_TRUNC('day', e.fecha_inicio) <= CURRENT_DATE
          AND (
            (e.fecha_fin IS NOT NULL AND DATE_TRUNC('day', e.fecha_fin) >= CURRENT_DATE)
            OR
            (e.fecha_fin IS NULL AND DATE_TRUNC('day', e.fecha_inicio) = CURRENT_DATE)
          )
      `;
    }

    const resultado = await pool.query(`
      SELECT
        e.id,
        e.tipo_evento_id,
        te.nombre AS tipo_evento_nombre,
        e.nombre,
        e.fecha_inicio,
        e.fecha_fin,
        e.ubicacion,
        e.observaciones,
        e.costo_evento,
        e.estado,
        e.created_at,
        e.updated_at,
        (
          e.estado != 'cancelado'
          AND DATE_TRUNC('day', e.fecha_inicio) <= CURRENT_DATE
          AND (
            (e.fecha_fin IS NOT NULL AND DATE_TRUNC('day', e.fecha_fin) >= CURRENT_DATE)
            OR
            (e.fecha_fin IS NULL AND DATE_TRUNC('day', e.fecha_inicio) = CURRENT_DATE)
          )
        ) AS es_vigente,
        COALESCE(SUM(v.total) FILTER (WHERE v.estado = 'activa'), 0) AS ventas_totales,
        COUNT(v.id) FILTER (WHERE v.estado = 'activa') AS transacciones_count
      FROM eventos e
      JOIN tipos_evento te ON te.id = e.tipo_evento_id
      LEFT JOIN ventas v ON v.evento_id = e.id
      ${whereClause}
      GROUP BY e.id, te.nombre
      ORDER BY e.fecha_inicio DESC
    `);

    res.json(resultado.rows);
  } catch (error) {
    console.error("Error al consultar eventos:", error.message);
    res.status(500).json({ message: "No se pudieron consultar los eventos" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/eventos/:id
// Detalle de un evento y su lista de ventas asociadas
// ---------------------------------------------------------------------------
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  if (!/^\d+$/.test(id)) {
    return res.status(400).json({ message: "El ID de evento no es válido" });
  }

  try {
    const eventoRes = await pool.query(
      `SELECT
         e.*,
         te.nombre AS tipo_evento_nombre,
         COALESCE(SUM(v.total) FILTER (WHERE v.estado = 'activa'), 0) AS ventas_totales
       FROM eventos e
       JOIN tipos_evento te ON te.id = e.tipo_evento_id
       LEFT JOIN ventas v ON v.evento_id = e.id
       WHERE e.id = $1
       GROUP BY e.id, te.nombre`,
      [id]
    );

    if (eventoRes.rows.length === 0) {
      return res.status(404).json({ message: "Evento no encontrado" });
    }

    const ventasRes = await pool.query(
      `SELECT id, fecha, metodo_pago, total, estado, created_at
       FROM ventas
       WHERE evento_id = $1
       ORDER BY fecha DESC`,
      [id]
    );

    const evento = eventoRes.rows[0];
    evento.ventas = ventasRes.rows;

    res.json(evento);
  } catch (error) {
    console.error("Error al obtener detalle de evento:", error.message);
    res.status(500).json({ message: "No se pudo obtener el detalle del evento" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/eventos
// Registrar nuevo evento
// ---------------------------------------------------------------------------
router.post("/", async (req, res) => {
  const {
    tipo_evento_id,
    nombre,
    fecha_inicio,
    fecha_fin,
    ubicacion,
    observaciones,
    costo_evento = 0,
    estado = "programado",
  } = req.body;

  if (typeof nombre !== "string" || !nombre.trim()) {
    return res.status(400).json({ message: "El nombre del evento es obligatorio" });
  }

  if (!fecha_inicio || isNaN(Date.parse(fecha_inicio))) {
    return res.status(400).json({ message: "La fecha de inicio es inválida o requerida" });
  }

  if (fecha_fin && isNaN(Date.parse(fecha_fin))) {
    return res.status(400).json({ message: "La fecha de fin no tiene un formato válido" });
  }

  if (!ESTADOS_VALIDOS.includes(estado)) {
    return res.status(400).json({ message: `Estado inválido. Opciones: ${ESTADOS_VALIDOS.join(", ")}` });
  }

  try {
    // Si no enviaron tipo_evento_id, buscar o asignar el tipo 'Otro' o el primero disponible
    let tipoId = tipo_evento_id;
    if (!tipoId || !/^\d+$/.test(String(tipoId))) {
      const tipoDefault = await pool.query("SELECT id FROM tipos_evento ORDER BY id ASC LIMIT 1");
      if (tipoDefault.rows.length > 0) {
        tipoId = tipoDefault.rows[0].id;
      } else {
        return res.status(400).json({ message: "No hay categorías de evento configuradas" });
      }
    }

    const resultado = await pool.query(
      `INSERT INTO eventos (
         tipo_evento_id,
         nombre,
         fecha_inicio,
         fecha_fin,
         ubicacion,
         observaciones,
         costo_evento,
         estado,
         created_at,
         updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7::numeric, $8, NOW(), NOW())
       RETURNING *`,
      [
        tipoId,
        nombre.trim(),
        fecha_inicio,
        fecha_fin || null,
        ubicacion?.trim() || null,
        observaciones?.trim() || null,
        Math.max(0, Number(costo_evento) || 0).toFixed(2),
        estado,
      ]
    );

    res.status(201).json({
      success: true,
      message: "Evento registrado correctamente",
      evento: resultado.rows[0],
    });
  } catch (error) {
    console.error("Error al registrar evento:", error.message);
    res.status(500).json({ message: "No se pudo registrar el evento" });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/eventos/:id
// Editar datos de un evento
// ---------------------------------------------------------------------------
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const {
    tipo_evento_id,
    nombre,
    fecha_inicio,
    fecha_fin,
    ubicacion,
    observaciones,
    costo_evento,
    estado,
  } = req.body;

  if (!/^\d+$/.test(id)) {
    return res.status(400).json({ message: "ID de evento no válido" });
  }

  if (typeof nombre !== "string" || !nombre.trim()) {
    return res.status(400).json({ message: "El nombre es obligatorio" });
  }

  if (estado && !ESTADOS_VALIDOS.includes(estado)) {
    return res.status(400).json({ message: `Estado inválido. Opciones: ${ESTADOS_VALIDOS.join(", ")}` });
  }

  try {
    const resultado = await pool.query(
      `UPDATE eventos
       SET tipo_evento_id = COALESCE($1, tipo_evento_id),
           nombre = $2,
           fecha_inicio = COALESCE($3, fecha_inicio),
           fecha_fin = $4,
           ubicacion = $5,
           observaciones = $6,
           costo_evento = COALESCE($7::numeric, costo_evento),
           estado = COALESCE($8, estado),
           updated_at = NOW()
       WHERE id = $9
       RETURNING *`,
      [
        tipo_evento_id || null,
        nombre.trim(),
        fecha_inicio || null,
        fecha_fin || null,
        ubicacion?.trim() || null,
        observaciones?.trim() || null,
        costo_evento !== undefined ? Math.max(0, Number(costo_evento)).toFixed(2) : null,
        estado || null,
        id,
      ]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ message: "Evento no encontrado" });
    }

    res.json({
      success: true,
      message: "Evento actualizado correctamente",
      evento: resultado.rows[0],
    });
  } catch (error) {
    console.error("Error al actualizar evento:", error.message);
    res.status(500).json({ message: "No se pudo actualizar el evento" });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/eventos/:id/estado
// Cambiar el estado de un evento
// ---------------------------------------------------------------------------
router.patch("/:id/estado", async (req, res) => {
  const { id } = req.params;
  const { estado } = req.body;

  if (!/^\d+$/.test(id)) {
    return res.status(400).json({ message: "ID de evento inválido" });
  }

  if (!ESTADOS_VALIDOS.includes(estado)) {
    return res.status(400).json({
      message: `El estado '${estado}' no es válido. Opciones: ${ESTADOS_VALIDOS.join(", ")}`,
    });
  }

  try {
    const resultado = await pool.query(
      `UPDATE eventos
       SET estado = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [estado, id]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ message: "Evento no encontrado" });
    }

    res.json({
      success: true,
      message: `Estado del evento cambiado a '${estado}'`,
      evento: resultado.rows[0],
    });
  } catch (error) {
    console.error("Error al cambiar estado del evento:", error.message);
    res.status(500).json({ message: "No se pudo cambiar el estado del evento" });
  }
});

module.exports = router;

