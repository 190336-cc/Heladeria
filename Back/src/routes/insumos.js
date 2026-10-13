
const express = require("express");
const pool = require("../db");

const router = express.Router();

// GET /api/insumos
// Consultar todos los insumos
router.get("/", async (req, res) => {
  try {
    const resultado = await pool.query(`
      SELECT
        id,
        nombre,
        descripcion,
        unidad_medida,
        stock_actual,
        stock_minimo,
        costo_unitario,
        activo,
        created_at,
        updated_at
      FROM insumos
      ORDER BY nombre ASC
    `);

    res.json(resultado.rows);
  } catch (error) {
    console.error("Error al consultar insumos:", error.message);
    res.status(500).json({
      message: "No se pudieron consultar los insumos",
    });
  }
});

// GET /api/insumos/:id
// Consultar un insumo por su ID
router.get("/:id", async (req, res) => {
  const { id } = req.params;

  if (!/^\d+$/.test(id)) {
    return res.status(400).json({
      message: "El ID debe ser un número válido",
    });
  }

  try {
    const resultado = await pool.query(
      "SELECT * FROM insumos WHERE id = $1",
      [id]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({
        message: "No se encontró el insumo",
      });
    }

    res.json(resultado.rows[0]);
  } catch (error) {
    console.error("Error al consultar el insumo:", error.message);
    res.status(500).json({
      message: "No se pudo consultar el insumo",
    });
  }
});

// POST /api/insumos
// Registrar un nuevo insumo
router.post("/", async (req, res) => {
  const {
    nombre,
    descripcion,
    unidad_medida,
    stock_minimo,
    costo_unitario,
  } = req.body;

  const unidadesPermitidas = ["g", "ml", "pieza"];

  if (
    typeof nombre !== "string" ||
    !nombre.trim() ||
    typeof unidad_medida !== "string" ||
    !unidadesPermitidas.includes(unidad_medida) ||
    stock_minimo === undefined ||
    costo_unitario === undefined
  ) {
    return res.status(400).json({
      message:
        "Proporciona nombre, unidad_medida, stock_minimo y costo_unitario válidos",
    });
  }

  if (
    !Number.isFinite(Number(stock_minimo)) ||
    !Number.isFinite(Number(costo_unitario)) ||
    Number(stock_minimo) < 0 ||
    Number(costo_unitario) < 0
  ) {
    return res.status(400).json({
      message: "El stock mínimo y el costo deben ser números no negativos",
    });
  }

  try {
    const resultado = await pool.query(
      `INSERT INTO insumos (
        nombre,
        descripcion,
        unidad_medida,
        stock_actual,
        stock_minimo,
        costo_unitario,
        activo,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, 0, $4, $5, TRUE, NOW(), NOW())
      RETURNING *`,
      [
        nombre.trim(),
        descripcion?.trim() || null,
        unidad_medida,
        stock_minimo,
        costo_unitario,
      ]
    );

    res.status(201).json({
      message: "Insumo registrado correctamente",
      insumo: resultado.rows[0],
    });
  } catch (error) {
    console.error("Error al registrar el insumo:", error.message);
    res.status(500).json({
      message: "No se pudo registrar el insumo",
    });
  }
});


/* PUT /api/insumos/:id
   Editar los datos de un insumo */
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion, stock_minimo, costo_unitario } = req.body;

  if (!/^\d+$/.test(id)) {
    return res.status(400).json({
      message: "El ID debe ser un número válido",
    });
  }

  if (
    typeof nombre !== "string" ||
    !nombre.trim() ||
    stock_minimo === undefined ||
    costo_unitario === undefined ||
    !Number.isFinite(Number(stock_minimo)) ||
    !Number.isFinite(Number(costo_unitario)) ||
    Number(stock_minimo) < 0 ||
    Number(costo_unitario) < 0 ||
    (descripcion !== undefined &&
      descripcion !== null &&
      typeof descripcion !== "string")
  ) {
    return res.status(400).json({
      message: "Verifica los datos enviados",
    });
  }

  try {
    const resultado = await pool.query(
      `UPDATE insumos
       SET nombre = $1,
           descripcion = $2,
           stock_minimo = $3,
           costo_unitario = $4,
           updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [
        nombre.trim(),
        descripcion?.trim() || null,
        stock_minimo,
        costo_unitario,
        id,
      ]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({
        message: "No se encontró el insumo",
      });
    }

    res.json({
      message: "Insumo actualizado correctamente",
      insumo: resultado.rows[0],
    });
  } catch (error) {
    console.error("Error al editar el insumo:", error.message);

    if (error.code === "23505") {
      return res.status(409).json({
        message: "Ya existe un insumo con esos datos únicos",
      });
    }

    res.status(500).json({
      message: "No se pudo actualizar el insumo",
    });
  }
});


/* PATCH /api/insumos/:id/estado
   Activar o desactivar un insumo */
router.patch("/:id/estado", async (req, res) => {
  const { id } = req.params;
  const { activo } = req.body;

  if (!/^\d+$/.test(id)) {
    return res.status(400).json({
      message: "El ID debe ser un número válido",
    });
  }

  if (typeof activo !== "boolean") {
    return res.status(400).json({
      message: "El campo activo debe ser true o false",
    });
  }

  try {
    const resultado = await pool.query(
      `UPDATE insumos
       SET activo = $1,
           updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [activo, id]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({
        message: "No se encontró el insumo",
      });
    }

    res.json({
      message: activo
        ? "Insumo activado correctamente"
        : "Insumo desactivado correctamente",
      insumo: resultado.rows[0],
    });
  } catch (error) {
    console.error("Error al cambiar el estado:", error.message);

    res.status(500).json({
      message: "No se pudo cambiar el estado del insumo",
    });
  }
});


module.exports = router;
