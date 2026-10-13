
const express = require("express");
const cors = require("cors");
const pool = require("./db");
const insumosRoutes = require("./routes/insumos");
const inventarioRoutes = require("./routes/inventario");
const productosRoutes = require("./routes/productos");
const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/insumos", insumosRoutes);
app.use("/api/inventario", inventarioRoutes);
app.use("/api/productos", productosRoutes);

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "API de Helados del Valle funcionando",
  });
});

app.get("/api/db-test", async (req, res) => {
  try {
    const resultado = await pool.query(`
      SELECT
        current_database() AS base_datos,
        NOW() AS fecha_servidor
    `);

    res.json({
      status: "ok",
      message: "Conexión con Neon exitosa",
      database: resultado.rows[0].base_datos,
      serverTime: resultado.rows[0].fecha_servidor,
    });
  } catch (error) {
    console.error("Error al conectar con PostgreSQL:", error.message);

    res.status(500).json({
      status: "error",
      message: "No se pudo conectar con la base de datos",
    });
  }
});

module.exports = app;
