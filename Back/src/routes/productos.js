
const express = require("express");
const pool = require("../db");

const router = express.Router();

// ---------------------------------------------------------------------------
// Helpers de validación de ID
// ---------------------------------------------------------------------------

/**
 * Devuelve true si el string representa un entero positivo.
 * Se usa para validar path params sin depender de parseInt (que acepta "12abc").
 */
function esIdValido(valor) {
  return /^\d+$/.test(String(valor ?? ""));
}

// ---------------------------------------------------------------------------
// GET /api/productos
// Listar todos los productos con su costo estimado de receta
// Filtros opcionales: ?nombre=... ó ?q=... (búsqueda parcial), ?estado=activo|inactivo ó ?activo=true|false
// ---------------------------------------------------------------------------
router.get("/", async (req, res) => {
  try {
    const { nombre, q, estado, activo } = req.query;
    const busqueda = (nombre || q || "").trim();
    let filtroActivo = null;

    if (activo !== undefined) {
      filtroActivo = activo === "true" || activo === true;
    } else if (estado !== undefined) {
      if (estado === "activo") filtroActivo = true;
      else if (estado === "inactivo") filtroActivo = false;
    }

    let query = `
      SELECT
        p.id,
        p.nombre,
        p.descripcion,
        p.precio_venta,
        p.precio_venta AS precio,
        p.activo,
        CASE WHEN p.activo THEN 'activo' ELSE 'inactivo' END AS estado,
        p.created_at,
        p.updated_at,
        COALESCE(
          (
            SELECT SUM(pi.cantidad * i.costo_unitario)
            FROM producto_insumos pi
            INNER JOIN insumos i ON i.id = pi.insumo_id
            WHERE pi.producto_id = p.id
          ),
          0
        ) AS costo_receta_estimado
      FROM productos p
      WHERE 1=1
    `;
    const params = [];

    if (busqueda) {
      params.push(`%${busqueda}%`);
      query += ` AND p.nombre ILIKE $${params.length}`;
    }

    if (filtroActivo !== null) {
      params.push(filtroActivo);
      query += ` AND p.activo = $${params.length}`;
    }

    query += ` ORDER BY p.nombre ASC`;

    const resultado = await pool.query(query, params);
    res.json(resultado.rows);
  } catch (error) {
    console.error("Error al consultar productos:", error.message);
    res.status(500).json({
      success: false,
      message: "No se pudieron consultar los productos",
    });
  }
});

// ---------------------------------------------------------------------------
// GET /api/productos/:id
// Consultar un producto por ID
// ---------------------------------------------------------------------------
router.get("/:id", async (req, res) => {
  const { id } = req.params;

  if (!esIdValido(id)) {
    return res.status(400).json({ success: false, message: "El ID debe ser un número válido" });
  }

  try {
    const resultado = await pool.query(
      `SELECT
         p.id,
         p.nombre,
         p.descripcion,
         p.precio_venta,
         p.precio_venta AS precio,
         p.activo,
         CASE WHEN p.activo THEN 'activo' ELSE 'inactivo' END AS estado,
         p.created_at,
         p.updated_at,
         COALESCE(
           (
             SELECT SUM(pi.cantidad * i.costo_unitario)
             FROM producto_insumos pi
             INNER JOIN insumos i ON i.id = pi.insumo_id
             WHERE pi.producto_id = p.id
           ),
           0
         ) AS costo_receta_estimado
       FROM productos p
       WHERE p.id = $1`,
      [id]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Producto no encontrado" });
    }

    const prod = resultado.rows[0];
    res.json({
      ...prod,
      success: true,
      data: prod,
    });
  } catch (error) {
    console.error("Error al consultar el producto:", error.message);
    res.status(500).json({ success: false, message: "No se pudo consultar el producto" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/productos
// Registrar un nuevo producto
// Acepta precio_venta o precio
// ---------------------------------------------------------------------------
router.post("/", async (req, res) => {
  const { nombre, descripcion } = req.body;
  const precioValor = req.body.precio_venta !== undefined ? req.body.precio_venta : req.body.precio;

  if (typeof nombre !== "string" || !nombre.trim()) {
    return res.status(400).json({ success: false, message: "El nombre es obligatorio" });
  }

  if (
    precioValor === undefined ||
    precioValor === null ||
    !Number.isFinite(Number(precioValor)) ||
    Number(precioValor) <= 0
  ) {
    return res.status(400).json({
      success: false,
      message: "El precio debe ser un número mayor a cero",
    });
  }

  if (
    descripcion !== undefined &&
    descripcion !== null &&
    typeof descripcion !== "string"
  ) {
    return res.status(400).json({
      success: false,
      message: "La descripción debe ser texto",
    });
  }

  try {
    const resultado = await pool.query(
      `INSERT INTO productos (nombre, descripcion, precio_venta, activo, created_at, updated_at)
       VALUES ($1, $2, $3::numeric, TRUE, NOW(), NOW())
       RETURNING *`,
      [nombre.trim(), descripcion?.trim() || null, String(precioValor)]
    );

    const fila = resultado.rows[0];
    const prod = {
      ...fila,
      precio: fila.precio_venta,
      estado: fila.activo ? "activo" : "inactivo",
    };

    res.status(201).json({
      success: true,
      message: "Producto registrado correctamente",
      producto: prod,
      data: prod,
    });
  } catch (error) {
    console.error("Error al registrar el producto:", error.message);

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "Ya existe un producto con ese nombre",
      });
    }

    if (error.code === "23514") {
      return res.status(400).json({
        success: false,
        message: "Los datos no cumplen las restricciones de la base de datos",
      });
    }

    res.status(500).json({ success: false, message: "No se pudo registrar el producto" });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/productos/:id
// Editar datos de un producto (nombre, descripción, precio / precio_venta)
// ---------------------------------------------------------------------------
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion } = req.body;
  const precioValor = req.body.precio_venta !== undefined ? req.body.precio_venta : req.body.precio;

  if (!esIdValido(id)) {
    return res.status(400).json({ success: false, message: "El ID debe ser un número válido" });
  }

  if (typeof nombre !== "string" || !nombre.trim()) {
    return res.status(400).json({ success: false, message: "El nombre es obligatorio" });
  }

  if (
    precioValor === undefined ||
    precioValor === null ||
    !Number.isFinite(Number(precioValor)) ||
    Number(precioValor) <= 0
  ) {
    return res.status(400).json({
      success: false,
      message: "El precio debe ser un número mayor a cero",
    });
  }

  if (
    descripcion !== undefined &&
    descripcion !== null &&
    typeof descripcion !== "string"
  ) {
    return res.status(400).json({ success: false, message: "La descripción debe ser texto" });
  }

  try {
    const resultado = await pool.query(
      `UPDATE productos
       SET nombre = $1,
           descripcion = $2,
           precio_venta = $3::numeric,
           updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [nombre.trim(), descripcion?.trim() || null, String(precioValor), id]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Producto no encontrado" });
    }

    const fila = resultado.rows[0];
    const prod = {
      ...fila,
      precio: fila.precio_venta,
      estado: fila.activo ? "activo" : "inactivo",
    };

    res.json({
      success: true,
      message: "Producto actualizado correctamente",
      producto: prod,
      data: prod,
    });
  } catch (error) {
    console.error("Error al editar el producto:", error.message);

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "Ya existe un producto con ese nombre",
      });
    }

    if (error.code === "23514") {
      return res.status(400).json({
        success: false,
        message: "Los datos no cumplen las restricciones de la base de datos",
      });
    }

    res.status(500).json({ success: false, message: "No se pudo actualizar el producto" });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/productos/:id/estado
// Alternar o establecer estado (activar / desactivar) de un producto
// ---------------------------------------------------------------------------
router.patch("/:id/estado", async (req, res) => {
  const { id } = req.params;

  if (!esIdValido(id)) {
    return res.status(400).json({ success: false, message: "El ID debe ser un número válido" });
  }

  let nuevoEstado = null;
  if (typeof req.body.activo === "boolean") {
    nuevoEstado = req.body.activo;
  } else if (typeof req.body.estado === "boolean") {
    nuevoEstado = req.body.estado;
  } else if (typeof req.body.estado === "string") {
    const est = req.body.estado.trim().toLowerCase();
    if (est === "activo" || est === "true") nuevoEstado = true;
    else if (est === "inactivo" || est === "false") nuevoEstado = false;
  }

  // Si no se proporcionó ni activo ni estado, alternamos (toggle)
  const esToggle = req.body.activo === undefined && req.body.estado === undefined;

  if (!esToggle && nuevoEstado === null) {
    return res.status(400).json({
      success: false,
      message: "El campo activo o estado debe ser true, false, 'activo' o 'inactivo'",
    });
  }

  try {
    let resultado;
    if (esToggle) {
      resultado = await pool.query(
        `UPDATE productos
         SET activo = NOT activo,
             updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [id]
      );
    } else {
      resultado = await pool.query(
        `UPDATE productos
         SET activo = $1,
             updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [nuevoEstado, id]
      );
    }

    if (resultado.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Producto no encontrado" });
    }

    const fila = resultado.rows[0];
    const prod = {
      ...fila,
      precio: fila.precio_venta,
      estado: fila.activo ? "activo" : "inactivo",
    };

    res.json({
      success: true,
      message: prod.activo
        ? "Producto activado correctamente"
        : "Producto desactivado correctamente",
      producto: prod,
      data: prod,
    });
  } catch (error) {
    console.error("Error al cambiar el estado del producto:", error.message);
    res.status(500).json({
      success: false,
      message: "No se pudo cambiar el estado del producto",
    });
  }
});


// ---------------------------------------------------------------------------
// GET /api/productos/:id/receta
// Consultar la receta (insumos y cantidades) de un producto,
// incluyendo el costo estimado total
// ---------------------------------------------------------------------------
router.get("/:id/receta", async (req, res) => {
  const { id } = req.params;

  if (!esIdValido(id)) {
    return res.status(400).json({ message: "El ID debe ser un número válido" });
  }

  try {
    // Verificar que el producto existe
    const producto = await pool.query(
      "SELECT id, nombre FROM productos WHERE id = $1",
      [id]
    );

    if (producto.rows.length === 0) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }

    // Obtener insumos de la receta con su costo parcial
    const receta = await pool.query(
      `SELECT
         pi.insumo_id,
         i.nombre AS insumo,
         i.unidad_medida,
         pi.cantidad,
         i.costo_unitario,
         -- Costo parcial calculado en PostgreSQL para evitar errores de precisión JS
         (pi.cantidad * i.costo_unitario) AS costo_parcial
       FROM producto_insumos pi
       INNER JOIN insumos i ON i.id = pi.insumo_id
       WHERE pi.producto_id = $1
       ORDER BY i.nombre ASC`,
      [id]
    );

    // Costo total calculado en PostgreSQL
    const costoTotal = await pool.query(
      `SELECT COALESCE(SUM(pi.cantidad * i.costo_unitario), 0) AS costo_total
       FROM producto_insumos pi
       INNER JOIN insumos i ON i.id = pi.insumo_id
       WHERE pi.producto_id = $1`,
      [id]
    );

    res.json({
      producto_id: Number(id),
      producto: producto.rows[0].nombre,
      insumos: receta.rows,
      costo_receta_estimado: costoTotal.rows[0].costo_total,
      nota: "El costo es una estimación basada en los costos unitarios actuales de cada insumo; no representa el costo histórico de producción.",
    });
  } catch (error) {
    console.error("Error al consultar la receta:", error.message);
    res.status(500).json({ message: "No se pudo consultar la receta" });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/productos/:id/receta
// Reemplazar la receta completa de un producto de forma atómica.
// Body: { insumos: [{ insumo_id, cantidad }, ...] }
//
// Esta operación NO modifica el stock de ningún insumo.
// Una lista vacía ( insumos: [] ) elimina todos los insumos de la receta.
// ---------------------------------------------------------------------------
router.put("/:id/receta", async (req, res) => {
  const { id } = req.params;
  const { insumos } = req.body;

  if (!esIdValido(id)) {
    return res.status(400).json({ message: "El ID debe ser un número válido" });
  }

  if (!Array.isArray(insumos)) {
    return res.status(400).json({
      message: "El campo 'insumos' debe ser un arreglo",
    });
  }

  // Validar cada elemento antes de abrir la transacción
  for (let i = 0; i < insumos.length; i++) {
    const item = insumos[i];

    if (!esIdValido(item?.insumo_id)) {
      return res.status(400).json({
        message: `El insumo_id del elemento ${i + 1} no es válido`,
      });
    }

    const cantidad = item?.cantidad;

    if (
      cantidad === undefined ||
      cantidad === null ||
      !/^\d+(\.\d+)?$/.test(String(cantidad)) ||
      !Number.isFinite(Number(cantidad)) ||
      Number(cantidad) <= 0
    ) {
      return res.status(400).json({
        message: `La cantidad del elemento ${i + 1} debe ser un número mayor que cero`,
      });
    }
  }

  // Detectar insumos duplicados en el body
  const idsInsumos = insumos.map((item) => String(item.insumo_id));
  const idsUnicos = new Set(idsInsumos);
  if (idsUnicos.size !== idsInsumos.length) {
    return res.status(400).json({
      message: "La receta contiene insumos duplicados. Cada insumo solo puede aparecer una vez por receta.",
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Verificar que el producto existe (con bloqueo para evitar condiciones de carrera)
    const producto = await client.query(
      "SELECT id, nombre FROM productos WHERE id = $1 FOR UPDATE",
      [id]
    );

    if (producto.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Producto no encontrado" });
    }

    // 2. Verificar que todos los insumos indicados existen y están activos
    if (insumos.length > 0) {
      const insumoIds = insumos.map((item) => String(item.insumo_id));

      const insumosExistentes = await client.query(
        `SELECT id FROM insumos WHERE id = ANY($1::bigint[]) AND activo = TRUE`,
        [insumoIds]
      );

      const idsEncontrados = insumosExistentes.rows.map((r) => String(r.id));
      const idsFaltantes = insumoIds.filter((rid) => !idsEncontrados.includes(rid));

      if (idsFaltantes.length > 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          message: "Uno o más insumos no existen o están inactivos",
          insumos_invalidos: idsFaltantes.map(Number),
        });
      }
    }

    // 3. Borrar los insumos actuales de la receta
    await client.query(
      "DELETE FROM producto_insumos WHERE producto_id = $1",
      [id]
    );

    // 4. Insertar los nuevos insumos (si los hay)
    let insumosDeLaReceta = [];

    if (insumos.length > 0) {
      // Construir la query con múltiples VALUES para mayor eficiencia
      const valores = insumos
        .map((_, idx) => `($1, $${idx * 2 + 2}::bigint, $${idx * 2 + 3}::numeric)`)
        .join(", ");

      const parametros = [id];
      insumos.forEach((item) => {
        parametros.push(String(item.insumo_id));
        parametros.push(String(item.cantidad));
      });

      const insertado = await client.query(
        `INSERT INTO producto_insumos (producto_id, insumo_id, cantidad)
         VALUES ${valores}
         RETURNING insumo_id, cantidad`,
        parametros
      );

      insumosDeLaReceta = insertado.rows;
    }

    await client.query("COMMIT");

    // 5. Responder con la receta actualizada (incluyendo nombres e insumos)
    const recetaFinal = await pool.query(
      `SELECT
         pi.insumo_id,
         i.nombre AS insumo,
         i.unidad_medida,
         pi.cantidad,
         i.costo_unitario,
         (pi.cantidad * i.costo_unitario) AS costo_parcial
       FROM producto_insumos pi
       INNER JOIN insumos i ON i.id = pi.insumo_id
       WHERE pi.producto_id = $1
       ORDER BY i.nombre ASC`,
      [id]
    );

    const costoTotal = await pool.query(
      `SELECT COALESCE(SUM(pi.cantidad * i.costo_unitario), 0) AS costo_total
       FROM producto_insumos pi
       INNER JOIN insumos i ON i.id = pi.insumo_id
       WHERE pi.producto_id = $1`,
      [id]
    );

    res.json({
      message: "Receta actualizada correctamente",
      producto_id: Number(id),
      producto: producto.rows[0].nombre,
      insumos: recetaFinal.rows,
      costo_receta_estimado: costoTotal.rows[0].costo_total,
      nota: "El costo es una estimación basada en los costos unitarios actuales de cada insumo; no representa el costo histórico de producción.",
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error al actualizar la receta:", error.message);

    if (error.code === "23503") {
      return res.status(400).json({
        message: "Uno o más insumos indicados no existen",
      });
    }

    if (error.code === "23514") {
      return res.status(400).json({
        message: "Los datos no cumplen las restricciones de la base de datos (ej: cantidad debe ser > 0)",
      });
    }

    res.status(500).json({ message: "No se pudo actualizar la receta" });
  } finally {
    client.release();
  }
});

module.exports = router;

