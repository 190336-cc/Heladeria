const express = require("express");
const pool = require("../db");

const router = express.Router();

// ---------------------------------------------------------------------------
// GET /api/dashboard/resumen
// Retorna las métricas agregadas del negocio para el panel ejecutivo
// ---------------------------------------------------------------------------
router.get("/resumen", async (req, res) => {
  try {
    // 1. KPIs Generales
    // a) Total ventas de los últimos 7 días
    const ventasSemanaRes = await pool.query(`
      SELECT COALESCE(SUM(total), 0) AS total_ventas_semana, COUNT(id) AS total_transacciones
      FROM ventas
      WHERE estado = 'activa'
        AND fecha >= NOW() - INTERVAL '7 days'
    `);

    // b) Inventario y productos
    const inventarioRes = await pool.query(`
      SELECT
        COUNT(*) AS total_insumos,
        COALESCE(SUM(stock_actual * costo_unitario), 0) AS valor_inventario,
        COUNT(*) FILTER (WHERE stock_actual = 0 AND activo = TRUE) AS agotados,
        COUNT(*) FILTER (WHERE stock_actual > 0 AND stock_actual <= stock_minimo AND activo = TRUE) AS stock_bajo,
        COUNT(*) FILTER (WHERE stock_actual > stock_minimo AND activo = TRUE) AS stock_ok
      FROM insumos
    `);

    const productosRes = await pool.query(`
      SELECT
        COUNT(*) AS total_productos,
        COUNT(*) FILTER (WHERE activo = TRUE) AS productos_activos
      FROM productos
    `);

    // 2. Gráfica de Ventas — últimos 7 días desglosados por día
    const diasVentasRes = await pool.query(`
      WITH dias AS (
        SELECT generate_series(
          DATE_TRUNC('day', NOW() - INTERVAL '6 days'),
          DATE_TRUNC('day', NOW()),
          INTERVAL '1 day'
        )::date AS dia_fecha
      )
      SELECT
        d.dia_fecha,
        TO_CHAR(d.dia_fecha, 'TMDay') AS dia_nombre_completo,
        SUBSTRING(TO_CHAR(d.dia_fecha, 'TMDay') FROM 1 FOR 3) AS dia,
        COALESCE(SUM(v.total), 0) AS ventas
      FROM dias d
      LEFT JOIN ventas v
        ON DATE_TRUNC('day', v.fecha)::date = d.dia_fecha
        AND v.estado = 'activa'
      GROUP BY d.dia_fecha
      ORDER BY d.dia_fecha ASC
    `);

    // Mapear días a abreviaturas en español amigables
    const mapaDias = {
      Monday: 'Lun', Tuesday: 'Mar', Wednesday: 'Mié', Thursday: 'Jue',
      Friday: 'Vie', Saturday: 'Sáb', Sunday: 'Dom',
      Lunes: 'Lun', Martes: 'Mar', Miércoles: 'Mié', Jueves: 'Jue',
      Viernes: 'Vie', Sábado: 'Sáb', Domingo: 'Dom',
    };

    const ventasPorDia = diasVentasRes.rows.map((row) => {
      const limpia = (row.dia_nombre_completo || "").trim();
      return {
        fecha: row.dia_fecha,
        dia: mapaDias[limpia] || row.dia || 'Día',
        ventas: Number(row.ventas),
      };
    });

    // 3. Top productos más vendidos
    const topProdRes = await pool.query(`
      SELECT
        p.id,
        p.nombre,
        COALESCE(SUM(dv.cantidad), 0) AS unidades,
        COALESCE(SUM(dv.subtotal), 0) AS total_ingresos
      FROM productos p
      LEFT JOIN detalle_ventas dv ON dv.producto_id = p.id
      LEFT JOIN ventas v ON v.id = dv.venta_id AND v.estado = 'activa'
      GROUP BY p.id, p.nombre
      ORDER BY unidades DESC, p.nombre ASC
      LIMIT 5
    `);

    // 4. Eventos recientes / próximos
    const eventosRes = await pool.query(`
      SELECT
        e.id,
        e.nombre,
        TO_CHAR(e.fecha_inicio, 'YYYY-MM-DD') AS fecha,
        e.ubicacion,
        e.estado,
        COALESCE(SUM(v.total) FILTER (WHERE v.estado = 'activa'), 0) AS ventas
      FROM eventos e
      LEFT JOIN ventas v ON v.evento_id = e.id
      GROUP BY e.id
      ORDER BY e.fecha_inicio DESC
      LIMIT 5
    `);

    const inv = inventarioRes.rows[0];
    const prod = productosRes.rows[0];
    const venSem = ventasSemanaRes.rows[0];

    res.json({
      success: true,
      kpis: {
        total_ventas_semana: Number(venSem.total_ventas_semana),
        transacciones_semana: Number(venSem.total_transacciones),
        valor_inventario: Number(inv.valor_inventario),
        total_insumos: Number(inv.total_insumos),
        insumos_agotados: Number(inv.agotados),
        insumos_stock_bajo: Number(inv.stock_bajo),
        insumos_stock_ok: Number(inv.stock_ok),
        total_productos: Number(prod.total_productos),
        productos_activos: Number(prod.productos_activos),
      },
      ventas_ultimos_7_dias: ventasPorDia,
      top_productos: topProdRes.rows.map((r) => ({
        id: r.id,
        nombre: r.nombre,
        unidades: Number(r.unidades),
        total_ingresos: Number(r.total_ingresos),
      })),
      eventos_recientes: eventosRes.rows.map((e) => ({
        id: e.id,
        nombre: e.nombre,
        fecha: e.fecha,
        ubicacion: e.ubicacion || "Sin ubicación",
        estado: e.estado,
        ventas: Number(e.ventas),
      })),
    });
  } catch (error) {
    console.error("Error al generar resumen del dashboard:", error.message);
    res.status(500).json({ message: "No se pudieron obtener las métricas del dashboard" });
  }
});

module.exports = router;

