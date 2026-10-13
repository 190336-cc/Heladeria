
const express = require("express");
const pool = require("../db");

const router = express.Router();

// Los tipos válidos deben coincidir exactamente con el CHECK constraint de la BD.
// 'consumo' y 'reversion_venta' están reservados para el módulo de ventas (fase posterior).
const tiposPermitidos = [
  "entrada",
  "merma",
  "ajuste_entrada",
  "ajuste_salida",
];

// POST /api/inventario/movimientos
// Registrar una entrada, merma o ajuste
router.post("/movimientos", async (req, res) => {
  const { insumo_id, usuario_id, tipo, cantidad, motivo } = req.body;

  if (
    !/^\d+$/.test(String(insumo_id ?? "")) ||
    !/^\d+$/.test(String(usuario_id ?? "")) ||
    !tiposPermitidos.includes(tipo)
  ) {
    return res.status(400).json({
      message: "El insumo, usuario o tipo de movimiento no es válido",
      tiposPermitidos,
    });
  }

  // Aceptar cantidades decimales positivas sin notación exponencial.
  if (
    typeof cantidad !== "number" &&
    typeof cantidad !== "string"
  ) {
    return res.status(400).json({
      message: "La cantidad debe ser un número positivo",
    });
  }

  if (
    !/^\d+(\.\d+)?$/.test(String(cantidad)) ||
    !Number.isFinite(Number(cantidad)) ||
    Number(cantidad) <= 0
  ) {
    return res.status(400).json({
      message: "La cantidad debe ser mayor que cero",
    });
  }

  if (typeof motivo !== "string" || !motivo.trim()) {
    return res.status(400).json({
      message: "Debes indicar el motivo del movimiento",
    });
  }

  const esEntrada =
    tipo === "entrada" || tipo === "ajuste_entrada";

  const operacion = esEntrada ? "+" : "-";

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Bloquea el insumo mientras se procesa el movimiento.
    const insumo = await client.query(
      `SELECT id, nombre, stock_actual
       FROM insumos
       WHERE id = $1
       FOR UPDATE`,
      [insumo_id]
    );

    if (insumo.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        message: "No se encontró el insumo",
      });
    }

    // Verifica el stock usando NUMERIC en PostgreSQL para evitar errores de precisión.
    if (!esEntrada) {
      const comprobacion = await client.query(
        `SELECT stock_actual >= $1::numeric AS suficiente
         FROM insumos
         WHERE id = $2`,
        [String(cantidad), insumo_id]
      );

      if (!comprobacion.rows[0].suficiente) {
        await client.query("ROLLBACK");
        return res.status(409).json({
          message: "Stock insuficiente para este movimiento",
          stockActual: insumo.rows[0].stock_actual,
        });
      }
    }

    // Actualiza las existencias usando aritmética NUMERIC en PostgreSQL.
    const actualizacion = await client.query(
      `UPDATE insumos
       SET stock_actual = stock_actual ${operacion} $1::numeric,
           updated_at = NOW()
       WHERE id = $2
       RETURNING id, nombre, stock_actual, stock_minimo`,
      [String(cantidad), insumo_id]
    );

    // Registra el movimiento dentro de la misma transacción.
    const movimiento = await client.query(
      `INSERT INTO movimientos_inventario (
         insumo_id,
         usuario_id,
         tipo,
         cantidad,
         motivo,
         created_at
       )
       VALUES ($1, $2, $3, $4::numeric, $5, NOW())
       RETURNING *`,
      [
        insumo_id,
        usuario_id,
        tipo,
        String(cantidad),
        motivo.trim(),
      ]
    );

    await client.query("COMMIT");

    const actualizado = actualizacion.rows[0];

    res.status(201).json({
      message: "Movimiento registrado correctamente",
      movimiento: movimiento.rows[0],
      inventario: {
        insumo: actualizado.nombre,
        stockActual: actualizado.stock_actual,
        stockMinimo: actualizado.stock_minimo,
        stockBajo:
          Number(actualizado.stock_actual) <=
          Number(actualizado.stock_minimo),
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Error al registrar movimiento:", error.message);

    if (error.code === "23503") {
      return res.status(400).json({
        message: "El insumo o el usuario indicado no existe",
      });
    }

    res.status(500).json({
      message: "No se pudo registrar el movimiento",
    });
  } finally {
    client.release();
  }
});


// GET /api/inventario/movimientos
// Consultar historial de movimientos (últimos 100)
router.get("/movimientos", async (req, res) => {
  try {
    const resultado = await pool.query(`
      SELECT
        m.id,
        m.insumo_id,
        i.nombre AS insumo,
        m.usuario_id,
        u.nombre AS usuario,
        m.tipo,
        m.cantidad,
        m.motivo,
        m.created_at
      FROM movimientos_inventario m
      INNER JOIN insumos i ON i.id = m.insumo_id
      INNER JOIN usuarios u ON u.id = m.usuario_id
      ORDER BY m.created_at DESC, m.id DESC
      LIMIT 100
    `);

    res.json(resultado.rows);
  } catch (error) {
    console.error("Error al consultar movimientos:", error.message);

    res.status(500).json({
      message: "No se pudo consultar el historial",
    });
  }
});


// GET /api/inventario/alertas
// Insumos activos con stock igual o por debajo del mínimo
router.get("/alertas", async (req, res) => {
  try {
    const resultado = await pool.query(`
      SELECT
        id,
        nombre,
        unidad_medida,
        stock_actual,
        stock_minimo,
        CASE
          WHEN stock_actual = 0 THEN 'AGOTADO'
          ELSE 'STOCK_BAJO'
        END AS alerta
      FROM insumos
      WHERE activo = TRUE
        AND stock_actual <= stock_minimo
      ORDER BY stock_actual ASC, nombre ASC
    `);

    res.json({
      total: resultado.rows.length,
      alertas: resultado.rows,
    });
  } catch (error) {
    console.error("Error al consultar alertas:", error.message);

    res.status(500).json({
      message: "No se pudieron consultar las alertas",
    });
  }
});


// GET /api/inventario/resumen
// Resumen general de existencias y valor del inventario
router.get("/resumen", async (req, res) => {
  try {
    const resultado = await pool.query(`
      SELECT
        COUNT(*) FILTER (
          WHERE activo = TRUE
        ) AS total_insumos,

        COUNT(*) FILTER (
          WHERE activo = TRUE
            AND stock_actual = 0
        ) AS agotados,

        COUNT(*) FILTER (
          WHERE activo = TRUE
            AND stock_actual > 0
            AND stock_actual <= stock_minimo
        ) AS stock_bajo,

        COUNT(*) FILTER (
          WHERE activo = TRUE
            AND stock_actual > stock_minimo
        ) AS stock_suficiente,

        COALESCE(
          SUM(stock_actual * costo_unitario)
          FILTER (WHERE activo = TRUE),
          0
        ) AS valor_inventario

      FROM insumos
    `);

    res.json({
      message: "Resumen de inventario obtenido correctamente",
      resumen: resultado.rows[0],
    });
  } catch (error) {
    console.error("Error al obtener resumen:", error.message);

    res.status(500).json({
      message: "No se pudo obtener el resumen del inventario",
    });
  }
});


module.exports = router;
