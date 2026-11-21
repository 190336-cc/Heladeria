const express = require("express");
const pool = require("../db");

const router = express.Router();

const METODOS_PAGO_VALIDOS = ["efectivo", "tarjeta", "transferencia"];

// ---------------------------------------------------------------------------
// GET /api/ventas
// Listado de ventas recientes con detalle de productos y evento
// ---------------------------------------------------------------------------
router.get("/", async (req, res) => {
  const { limite = 50, evento_id } = req.query;

  try {
    let query = `
      SELECT
        v.id,
        v.usuario_id,
        u.nombre AS usuario_nombre,
        v.evento_id,
        e.nombre AS evento_nombre,
        v.fecha,
        v.metodo_pago,
        v.estado,
        v.total,
        v.created_at,
        COALESCE(
          json_agg(
            json_build_object(
              'producto_id', dv.producto_id,
              'producto_nombre', p.nombre,
              'cantidad', dv.cantidad,
              'precio_unitario', dv.precio_unitario,
              'subtotal', dv.subtotal
            )
          ) FILTER (WHERE dv.id IS NOT NULL),
          '[]'::json
        ) AS items
      FROM ventas v
      JOIN usuarios u ON u.id = v.usuario_id
      LEFT JOIN eventos e ON e.id = v.evento_id
      LEFT JOIN detalle_ventas dv ON dv.venta_id = v.id
      LEFT JOIN productos p ON p.id = dv.producto_id
    `;

    const params = [];
    if (evento_id && /^\d+$/.test(String(evento_id))) {
      params.push(evento_id);
      query += ` WHERE v.evento_id = $${params.length}`;
    }

    query += `
      GROUP BY v.id, u.nombre, e.nombre
      ORDER BY v.fecha DESC
      LIMIT $${params.length + 1}
    `;
    params.push(Math.min(parseInt(limite, 10) || 50, 100));

    const resultado = await pool.query(query, params);
    res.json(resultado.rows);
  } catch (error) {
    console.error("Error al consultar ventas:", error.message);
    res.status(500).json({ message: "No se pudieron consultar las ventas" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/ventas/:id
// Detalle de una venta específica
// ---------------------------------------------------------------------------
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  if (!/^\d+$/.test(id)) {
    return res.status(400).json({ message: "El ID de la venta debe ser numérico" });
  }

  try {
    const ventaRes = await pool.query(
      `SELECT v.*, u.nombre AS usuario_nombre, e.nombre AS evento_nombre
       FROM ventas v
       JOIN usuarios u ON u.id = v.usuario_id
       LEFT JOIN eventos e ON e.id = v.evento_id
       WHERE v.id = $1`,
      [id]
    );

    if (ventaRes.rows.length === 0) {
      return res.status(404).json({ message: "Venta no encontrada" });
    }

    const itemsRes = await pool.query(
      `SELECT dv.*, p.nombre AS producto_nombre
       FROM detalle_ventas dv
       JOIN productos p ON p.id = dv.producto_id
       WHERE dv.venta_id = $1`,
      [id]
    );

    const venta = ventaRes.rows[0];
    venta.items = itemsRes.rows;

    res.json(venta);
  } catch (error) {
    console.error("Error al obtener detalle de venta:", error.message);
    res.status(500).json({ message: "No se pudo obtener el detalle de la venta" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/ventas
// Registrar venta con validación y descuento atómico de stock por receta
// ---------------------------------------------------------------------------
router.post("/", async (req, res) => {
  const {
    usuario_id = 1,
    evento_id = null,
    metodo_pago,
    items,
  } = req.body;

  if (!metodo_pago || !METODOS_PAGO_VALIDOS.includes(metodo_pago)) {
    return res.status(400).json({
      message: `El método de pago es inválido. Opciones: ${METODOS_PAGO_VALIDOS.join(", ")}`,
    });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: "La orden debe incluir al menos un producto" });
  }

  // Validar formato de items
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const pid = it?.producto_id ?? it?.productoId;
    const qty = it?.cantidad;

    if (!/^\d+$/.test(String(pid ?? ""))) {
      return res.status(400).json({ message: `El producto en la posición ${i + 1} no es válido` });
    }
    if (!Number.isInteger(Number(qty)) || Number(qty) <= 0) {
      return res.status(400).json({ message: `La cantidad del producto en la posición ${i + 1} debe ser un entero positivo` });
    }
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Validar que el usuario existe
    const userRes = await client.query("SELECT id FROM usuarios WHERE id = $1 AND activo = TRUE", [usuario_id]);
    if (userRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Usuario no autorizado o inactivo" });
    }

    // 2. Validar evento si fue proporcionado
    if (evento_id !== null && evento_id !== undefined && evento_id !== "") {
      const evRes = await client.query("SELECT id FROM eventos WHERE id = $1", [evento_id]);
      if (evRes.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: "El evento especificado no existe" });
      }
    }

    // 3. Obtener precios y recetas de cada producto
    const prodIds = [...new Set(items.map((it) => it.producto_id ?? it.productoId))];
    const prodRes = await client.query(
      `SELECT id, nombre, precio_venta, activo FROM productos WHERE id = ANY($1::bigint[])`,
      [prodIds]
    );

    if (prodRes.rows.length !== prodIds.length) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Uno o más productos no existen en el catálogo" });
    }

    const mapaProductos = new Map(prodRes.rows.map((p) => [String(p.id), p]));

    // Verificar que los productos estén activos
    for (const p of prodRes.rows) {
      if (!p.activo) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: `El producto '${p.nombre}' no está disponible para venta` });
      }
    }

    // 4. Calcular el total de la venta y acumular consumo de insumos por receta
    let totalVenta = 0;
    const mapaConsumoInsumos = new Map(); // insumo_id -> cantidad_total_a_descontar

    // Consultar todas las recetas de los productos involucrados
    const recetasRes = await client.query(
      `SELECT pi.producto_id, pi.insumo_id, pi.cantidad, i.nombre AS insumo_nombre, i.unidad_medida
       FROM producto_insumos pi
       JOIN insumos i ON i.id = pi.insumo_id
       WHERE pi.producto_id = ANY($1::bigint[])`,
      [prodIds]
    );

    const recetasPorProducto = new Map();
    for (const r of recetasRes.rows) {
      const pid = String(r.producto_id);
      if (!recetasPorProducto.has(pid)) {
        recetasPorProducto.set(pid, []);
      }
      recetasPorProducto.get(pid).push(r);
    }

    const itemsProcesados = [];
    for (const it of items) {
      const pid = String(it.producto_id ?? it.productoId);
      const cantidad = Number(it.cantidad);
      const prod = mapaProductos.get(pid);
      const precioUnitario = Number(prod.precio_venta);
      const subtotal = precioUnitario * cantidad;

      totalVenta += subtotal;
      itemsProcesados.push({
        producto_id: prod.id,
        producto_nombre: prod.nombre,
        cantidad,
        precio_unitario: precioUnitario,
        subtotal,
      });

      // Sumar consumo de insumos
      const ingredientes = recetasPorProducto.get(pid) || [];
      for (const ing of ingredientes) {
        const iId = String(ing.insumo_id);
        const consumoTotal = Number(ing.cantidad) * cantidad;
        const actual = mapaConsumoInsumos.get(iId) || {
          insumo_id: ing.insumo_id,
          nombre: ing.insumo_nombre,
          unidad_medida: ing.unidad_medida,
          cantidad: 0,
        };
        actual.cantidad += consumoTotal;
        mapaConsumoInsumos.set(iId, actual);
      }
    }

    // 5. Validar y descontar stock de insumos con bloqueo FOR UPDATE
    const insumoIds = Array.from(mapaConsumoInsumos.keys()).map(Number);
    if (insumoIds.length > 0) {
      const insumosBloqueados = await client.query(
        `SELECT id, nombre, stock_actual, unidad_medida
         FROM insumos
         WHERE id = ANY($1::bigint[])
         FOR UPDATE`,
        [insumoIds]
      );

      const mapaInsumosBD = new Map(insumosBloqueados.rows.map((i) => [String(i.id), i]));

      for (const [iId, reqIns] of mapaConsumoInsumos.entries()) {
        const insumoBD = mapaInsumosBD.get(iId);
        if (!insumoBD) {
          await client.query("ROLLBACK");
          return res.status(404).json({ message: `Insumo #${iId} no encontrado en almacén` });
        }

        const stockActual = Number(insumoBD.stock_actual);
        if (stockActual < reqIns.cantidad) {
          await client.query("ROLLBACK");
          return res.status(409).json({
            message: `Stock insuficiente para '${insumoBD.nombre}'. Requerido: ${reqIns.cantidad.toFixed(3)} ${insumoBD.unidad_medida}, disponible: ${stockActual.toFixed(3)} ${insumoBD.unidad_medida}`,
            insumo: insumoBD.nombre,
            requerido: reqIns.cantidad,
            disponible: stockActual,
            unidad_medida: insumoBD.unidad_medida,
          });
        }
      }

      // Si todo el stock es suficiente, descontar de insumos
      for (const [iId, reqIns] of mapaConsumoInsumos.entries()) {
        await client.query(
          `UPDATE insumos
           SET stock_actual = stock_actual - $1::numeric,
               updated_at = NOW()
           WHERE id = $2`,
          [String(reqIns.cantidad), iId]
        );
      }
    }

    // 6. Insertar Venta
    const ventaInsert = await client.query(
      `INSERT INTO ventas (
         usuario_id,
         evento_id,
         fecha,
         metodo_pago,
         estado,
         total,
         created_at
       ) VALUES ($1, $2, NOW(), $3, 'activa', $4::numeric, NOW())
       RETURNING *`,
      [
        usuario_id,
        (evento_id && evento_id !== '') ? evento_id : null,
        metodo_pago,
        totalVenta.toFixed(2),
      ]
    );

    const ventaId = ventaInsert.rows[0].id;

    // 7. Insertar detalle_ventas
    for (const it of itemsProcesados) {
      await client.query(
        `INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio_unitario)
         VALUES ($1, $2, $3, $4::numeric)`,
        [ventaId, it.producto_id, it.cantidad, it.precio_unitario.toFixed(2)]
      );
    }

    // 8. Registrar movimientos de inventario con tipo 'consumo' y venta_id
    for (const [iId, reqIns] of mapaConsumoInsumos.entries()) {
      await client.query(
        `INSERT INTO movimientos_inventario (
           insumo_id,
           usuario_id,
           venta_id,
           tipo,
           cantidad,
           motivo,
           created_at
         ) VALUES ($1, $2, $3, 'consumo', $4::numeric, $5, NOW())`,
        [
          iId,
          usuario_id,
          ventaId,
          String(reqIns.cantidad),
          `Consumo por Venta #${ventaId}`,
        ]
      );
    }

    await client.query("COMMIT");

    res.status(201).json({
      success: true,
      message: "Venta registrada exitosamente",
      venta: {
        ...ventaInsert.rows[0],
        items: itemsProcesados,
        insumos_descontados: Array.from(mapaConsumoInsumos.values()),
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error al procesar la venta:", error.message);
    res.status(500).json({ message: "No se pudo procesar la venta" });
  } finally {
    client.release();
  }
});

module.exports = router;

