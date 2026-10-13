/**
 * Suite de pruebas de integración para la API de Helados del Valle.
 *
 * Ejecutar:
 *   node Back/tests/api.test.js
 *
 * Requisitos:
 *   - El servidor debe estar corriendo en localhost:3000 (npm run dev / npm start en ./Back)
 *   - Las variables de entorno deben estar cargadas (.env.local en la raíz)
 *   - La base de datos debe ser accesible
 *
 * IMPORTANTE: las pruebas de escritura crean y eliminan datos reales en la BD.
 * No ejecutar sobre producción con datos importantes sin antes confirmar.
 * Los productos y recetas creados durante las pruebas se limpian al final.
 */

const fetch = require("node-fetch");

const BASE = "http://localhost:3000/api";
let productoId = null; // ID del producto creado durante las pruebas

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------
let passed = 0;
let failed = 0;
const errores = [];

async function test(nombre, fn) {
  try {
    await fn();
    console.log(`  ✅ ${nombre}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ ${nombre}`);
    console.error(`     ${err.message}`);
    errores.push({ nombre, error: err.message });
    failed++;
  }
}

function assert(condicion, mensaje) {
  if (!condicion) throw new Error(mensaje || "Aserción fallida");
}

async function get(path) {
  const res = await fetch(`${BASE}${path}`);
  return { status: res.status, body: await res.json() };
}

async function post(path, data) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return { status: res.status, body: await res.json() };
}

async function put(path, data) {
  const res = await fetch(`${BASE}${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return { status: res.status, body: await res.json() };
}

async function patch(path, data) {
  const res = await fetch(`${BASE}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return { status: res.status, body: await res.json() };
}

// ---------------------------------------------------------------------------
// Limpieza al final
// ---------------------------------------------------------------------------
async function limpiar(pool) {
  if (productoId) {
    try {
      await pool.query("DELETE FROM producto_insumos WHERE producto_id = $1", [productoId]);
      await pool.query("DELETE FROM productos WHERE id = $1", [productoId]);
      console.log(`\n  🧹 Limpieza: producto de prueba ID ${productoId} eliminado`);
    } catch (e) {
      console.warn(`  ⚠️  No se pudo limpiar el producto de prueba: ${e.message}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Pruebas de salud y conexión
// ---------------------------------------------------------------------------
async function pruebasSalud() {
  console.log("\n📋 Salud y conexión");

  await test("GET /health responde 200 con status ok", async () => {
    const { status, body } = await get("/health");
    assert(status === 200, `Esperaba 200, recibí ${status}`);
    assert(body.status === "ok", "status no es 'ok'");
  });

  await test("GET /db-test conecta con Neon correctamente", async () => {
    const { status, body } = await get("/db-test");
    assert(status === 200, `Esperaba 200, recibí ${status}`);
    assert(body.status === "ok", "No pudo conectar con Neon");
  });
}

// ---------------------------------------------------------------------------
// Pruebas de insumos
// ---------------------------------------------------------------------------
async function pruebasInsumos() {
  console.log("\n📋 Insumos");

  await test("GET /insumos devuelve arreglo", async () => {
    const { status, body } = await get("/insumos");
    assert(status === 200, `Esperaba 200, recibí ${status}`);
    assert(Array.isArray(body), "La respuesta no es un arreglo");
  });

  await test("GET /insumos/:id con ID inválido devuelve 400", async () => {
    const { status } = await get("/insumos/abc");
    assert(status === 400, `Esperaba 400, recibí ${status}`);
  });

  await test("GET /insumos/:id inexistente devuelve 404", async () => {
    const { status } = await get("/insumos/999999999");
    assert(status === 404, `Esperaba 404, recibí ${status}`);
  });

  await test("POST /insumos rechaza nombre vacío", async () => {
    const { status } = await post("/insumos", {
      nombre: "  ",
      unidad_medida: "g",
      stock_minimo: 100,
      costo_unitario: 5,
    });
    assert(status === 400, `Esperaba 400, recibí ${status}`);
  });

  await test("POST /insumos rechaza unidad_medida inválida", async () => {
    const { status } = await post("/insumos", {
      nombre: "Azúcar test",
      unidad_medida: "kg",
      stock_minimo: 100,
      costo_unitario: 5,
    });
    assert(status === 400, `Esperaba 400, recibí ${status}`);
  });

  await test("POST /insumos rechaza costo negativo", async () => {
    const { status } = await post("/insumos", {
      nombre: "Azúcar test",
      unidad_medida: "g",
      stock_minimo: 100,
      costo_unitario: -1,
    });
    assert(status === 400, `Esperaba 400, recibí ${status}`);
  });
}

// ---------------------------------------------------------------------------
// Pruebas de inventario
// ---------------------------------------------------------------------------
async function pruebasInventario() {
  console.log("\n📋 Inventario");

  await test("GET /inventario/movimientos devuelve arreglo", async () => {
    const { status, body } = await get("/inventario/movimientos");
    assert(status === 200, `Esperaba 200, recibí ${status}`);
    assert(Array.isArray(body), "La respuesta no es un arreglo");
  });

  await test("GET /inventario/alertas devuelve objeto con total y alertas", async () => {
    const { status, body } = await get("/inventario/alertas");
    assert(status === 200, `Esperaba 200, recibí ${status}`);
    assert(typeof body.total === "number", "total no es número");
    assert(Array.isArray(body.alertas), "alertas no es arreglo");
  });

  await test("GET /inventario/resumen devuelve totales", async () => {
    const { status, body } = await get("/inventario/resumen");
    assert(status === 200, `Esperaba 200, recibí ${status}`);
    assert(body.resumen, "No hay campo 'resumen'");
    assert("total_insumos" in body.resumen, "Falta total_insumos");
    assert("valor_inventario" in body.resumen, "Falta valor_inventario");
  });

  await test("POST /inventario/movimientos rechaza tipo inválido", async () => {
    const { status } = await post("/inventario/movimientos", {
      insumo_id: 1,
      usuario_id: 1,
      tipo: "consumo", // reservado para ventas
      cantidad: 10,
      motivo: "test",
    });
    assert(status === 400, `Esperaba 400, recibí ${status}`);
  });

  await test("POST /inventario/movimientos rechaza cantidad negativa", async () => {
    const { status } = await post("/inventario/movimientos", {
      insumo_id: 1,
      usuario_id: 1,
      tipo: "entrada",
      cantidad: -5,
      motivo: "test",
    });
    assert(status === 400, `Esperaba 400, recibí ${status}`);
  });

  await test("POST /inventario/movimientos rechaza cantidad cero", async () => {
    const { status } = await post("/inventario/movimientos", {
      insumo_id: 1,
      usuario_id: 1,
      tipo: "entrada",
      cantidad: 0,
      motivo: "test",
    });
    assert(status === 400, `Esperaba 400, recibí ${status}`);
  });

  await test("POST /inventario/movimientos rechaza insumo inexistente", async () => {
    const { status } = await post("/inventario/movimientos", {
      insumo_id: 999999999,
      usuario_id: 1,
      tipo: "entrada",
      cantidad: 10,
      motivo: "test insumo inexistente",
    });
    // 404 (insumo no encontrado en SELECT FOR UPDATE) o 400 (FK violation)
    assert(status === 404 || status === 400, `Esperaba 404 o 400, recibí ${status}`);
  });

  await test("POST /inventario/movimientos rechaza motivo vacío", async () => {
    const { status } = await post("/inventario/movimientos", {
      insumo_id: 1,
      usuario_id: 1,
      tipo: "entrada",
      cantidad: 10,
      motivo: "  ",
    });
    assert(status === 400, `Esperaba 400, recibí ${status}`);
  });
}

// ---------------------------------------------------------------------------
// Pruebas de productos
// ---------------------------------------------------------------------------
async function pruebasProductos() {
  console.log("\n📋 Productos — CRUD básico");

  await test("GET /productos devuelve arreglo", async () => {
    const { status, body } = await get("/productos");
    assert(status === 200, `Esperaba 200, recibí ${status}`);
    assert(Array.isArray(body), "La respuesta no es un arreglo");
    if (body.length > 0) {
      assert("costo_receta_estimado" in body[0], "Falta costo_receta_estimado");
    }
  });

  await test("GET /productos/:id con ID inválido devuelve 400", async () => {
    const { status } = await get("/productos/abc");
    assert(status === 400, `Esperaba 400, recibí ${status}`);
  });

  await test("GET /productos/:id inexistente devuelve 404", async () => {
    const { status } = await get("/productos/999999999");
    assert(status === 404, `Esperaba 404, recibí ${status}`);
  });

  await test("POST /productos rechaza nombre vacío", async () => {
    const { status } = await post("/productos", {
      nombre: "  ",
      precio_venta: 25,
    });
    assert(status === 400, `Esperaba 400, recibí ${status}`);
  });

  await test("POST /productos rechaza precio negativo", async () => {
    const { status } = await post("/productos", {
      nombre: "Helado de prueba",
      precio_venta: -10,
    });
    assert(status === 400, `Esperaba 400, recibí ${status}`);
  });

  await test("POST /productos crea un producto válido", async () => {
    const nombre = `Helado Test ${Date.now()}`;
    const { status, body } = await post("/productos", {
      nombre,
      descripcion: "Producto de prueba automatizada",
      precio_venta: 35.5,
    });
    assert(status === 201, `Esperaba 201, recibí ${status}: ${JSON.stringify(body)}`);
    assert(body.producto, "No hay 'producto' en la respuesta");
    assert(body.producto.id, "El producto no tiene ID");
    assert(body.producto.nombre === nombre, "El nombre no coincide");
    assert(Number(body.producto.precio_venta) === 35.5, "El precio no coincide");
    productoId = body.producto.id;
  });

  await test("GET /productos/:id devuelve el producto creado", async () => {
    if (!productoId) throw new Error("No hay producto creado (prueba anterior falló)");
    const { status, body } = await get(`/productos/${productoId}`);
    assert(status === 200, `Esperaba 200, recibí ${status}`);
    assert(body.id === productoId, "El ID no coincide");
    assert("costo_receta_estimado" in body, "Falta costo_receta_estimado");
  });

  await test("PUT /productos/:id edita el producto correctamente", async () => {
    if (!productoId) throw new Error("No hay producto creado");
    const nombre = `Helado Editado ${Date.now()}`;
    const { status, body } = await put(`/productos/${productoId}`, {
      nombre,
      descripcion: "Descripción editada",
      precio_venta: 42,
    });
    assert(status === 200, `Esperaba 200, recibí ${status}`);
    assert(body.producto.nombre === nombre, "El nombre editado no coincide");
    assert(Number(body.producto.precio_venta) === 42, "El precio editado no coincide");
  });

  await test("PUT /productos/:id rechaza precio negativo", async () => {
    if (!productoId) throw new Error("No hay producto creado");
    const { status } = await put(`/productos/${productoId}`, {
      nombre: "Válido",
      precio_venta: -5,
    });
    assert(status === 400, `Esperaba 400, recibí ${status}`);
  });

  await test("PATCH /productos/:id/estado desactiva el producto", async () => {
    if (!productoId) throw new Error("No hay producto creado");
    const { status, body } = await patch(`/productos/${productoId}/estado`, {
      activo: false,
    });
    assert(status === 200, `Esperaba 200, recibí ${status}`);
    assert(body.producto.activo === false, "El producto no fue desactivado");
  });

  await test("PATCH /productos/:id/estado reactiva el producto", async () => {
    if (!productoId) throw new Error("No hay producto creado");
    const { status, body } = await patch(`/productos/${productoId}/estado`, {
      activo: true,
    });
    assert(status === 200, `Esperaba 200, recibí ${status}`);
    assert(body.producto.activo === true, "El producto no fue reactivado");
  });

  await test("PATCH /productos/:id/estado con valor no-booleano devuelve 400", async () => {
    if (!productoId) throw new Error("No hay producto creado");
    const { status } = await patch(`/productos/${productoId}/estado`, {
      activo: "si",
    });
    assert(status === 400, `Esperaba 400, recibí ${status}`);
  });
}

// ---------------------------------------------------------------------------
// Pruebas de recetas
// ---------------------------------------------------------------------------
async function pruebasRecetas(insumoIds) {
  console.log("\n📋 Recetas");

  await test("GET /productos/:id/receta del producto creado (sin receta aún)", async () => {
    if (!productoId) throw new Error("No hay producto creado");
    const { status, body } = await get(`/productos/${productoId}/receta`);
    assert(status === 200, `Esperaba 200, recibí ${status}`);
    assert(Array.isArray(body.insumos), "insumos no es arreglo");
    assert(body.insumos.length === 0, "Debería estar vacío inicialmente");
    assert(Number(body.costo_receta_estimado) === 0, "Costo debe ser 0 sin insumos");
  });

  await test("GET /productos/999999999/receta devuelve 404", async () => {
    const { status } = await get("/productos/999999999/receta");
    assert(status === 404, `Esperaba 404, recibí ${status}`);
  });

  await test("PUT /productos/:id/receta rechaza insumos inexistentes", async () => {
    if (!productoId) throw new Error("No hay producto creado");
    const { status } = await put(`/productos/${productoId}/receta`, {
      insumos: [{ insumo_id: 999999999, cantidad: 100 }],
    });
    assert(status === 400, `Esperaba 400, recibí ${status}`);
  });

  await test("PUT /productos/:id/receta rechaza cantidad cero", async () => {
    if (!productoId) throw new Error("No hay producto creado");
    const { status } = await put(`/productos/${productoId}/receta`, {
      insumos: [{ insumo_id: insumoIds[0], cantidad: 0 }],
    });
    assert(status === 400, `Esperaba 400, recibí ${status}`);
  });

  await test("PUT /productos/:id/receta rechaza cantidad negativa", async () => {
    if (!productoId) throw new Error("No hay producto creado");
    const { status } = await put(`/productos/${productoId}/receta`, {
      insumos: [{ insumo_id: insumoIds[0], cantidad: -50 }],
    });
    assert(status === 400, `Esperaba 400, recibí ${status}`);
  });

  await test("PUT /productos/:id/receta rechaza insumos duplicados", async () => {
    if (!productoId) throw new Error("No hay producto creado");
    const { status } = await put(`/productos/${productoId}/receta`, {
      insumos: [
        { insumo_id: insumoIds[0], cantidad: 100 },
        { insumo_id: insumoIds[0], cantidad: 50 },
      ],
    });
    assert(status === 400, `Esperaba 400, recibí ${status}`);
  });

  let stockAntesDe = null;

  await test("Registra stock antes de crear receta (para verificar inmutabilidad)", async () => {
    const { body } = await get("/insumos");
    if (body.length > 0) {
      stockAntesDe = body.find((i) => String(i.id) === String(insumoIds[0]));
    }
    assert(true, "ok");
  });

  await test("PUT /productos/:id/receta crea receta con varios insumos", async () => {
    if (!productoId) throw new Error("No hay producto creado");
    if (insumoIds.length < 2) throw new Error("Se necesitan al menos 2 insumos para esta prueba");

    const { status, body } = await put(`/productos/${productoId}/receta`, {
      insumos: [
        { insumo_id: insumoIds[0], cantidad: 100 },
        { insumo_id: insumoIds[1], cantidad: 50 },
      ],
    });
    assert(status === 200, `Esperaba 200, recibí ${status}: ${JSON.stringify(body)}`);
    assert(body.insumos.length === 2, `Esperaba 2 insumos, hay ${body.insumos.length}`);
    assert("costo_receta_estimado" in body, "Falta costo_receta_estimado");
    assert(Number(body.costo_receta_estimado) > 0, "Costo estimado debe ser > 0 si hay insumos con costo");
    assert(body.nota, "Debe incluir nota sobre estimación de costos");
  });

  await test("Modificar receta NO altera el stock de los insumos", async () => {
    if (!stockAntesDe) throw new Error("No se registró stock anterior");
    const { body } = await get("/insumos");
    const stockDespues = body.find((i) => String(i.id) === String(insumoIds[0]));
    assert(
      stockDespues &&
        Number(stockDespues.stock_actual) === Number(stockAntesDe.stock_actual),
      `El stock cambió: antes=${stockAntesDe.stock_actual}, después=${stockDespues?.stock_actual}`
    );
  });

  await test("GET /productos/:id/receta muestra los insumos recién guardados", async () => {
    if (!productoId) throw new Error("No hay producto creado");
    const { status, body } = await get(`/productos/${productoId}/receta`);
    assert(status === 200, `Esperaba 200, recibí ${status}`);
    assert(body.insumos.length === 2, `Esperaba 2 insumos, hay ${body.insumos.length}`);
    // Verificar que cada insumo tiene costo_parcial
    body.insumos.forEach((ins, i) => {
      assert("costo_parcial" in ins, `Insumo ${i + 1} no tiene costo_parcial`);
    });
  });

  await test("PUT /productos/:id/receta actualiza la receta de forma atómica (reemplaza)", async () => {
    if (!productoId) throw new Error("No hay producto creado");
    // Actualizar a solo 1 insumo
    const { status, body } = await put(`/productos/${productoId}/receta`, {
      insumos: [{ insumo_id: insumoIds[0], cantidad: 200 }],
    });
    assert(status === 200, `Esperaba 200, recibí ${status}`);
    assert(body.insumos.length === 1, "Debería quedar solo 1 insumo");
    assert(Number(body.insumos[0].cantidad) === 200, "La cantidad no fue actualizada");
  });

  await test("PUT /productos/:id/receta con arreglo vacío borra todos los insumos", async () => {
    if (!productoId) throw new Error("No hay producto creado");
    const { status, body } = await put(`/productos/${productoId}/receta`, {
      insumos: [],
    });
    assert(status === 200, `Esperaba 200, recibí ${status}`);
    assert(body.insumos.length === 0, "La receta debería quedar vacía");
    assert(Number(body.costo_receta_estimado) === 0, "Costo debe ser 0");
  });

  await test("Costo estimado se calcula correctamente en PostgreSQL", async () => {
    if (!productoId) throw new Error("No hay producto creado");
    if (insumoIds.length < 1) throw new Error("Se necesita al menos 1 insumo");

    // Obtener el costo unitario real del insumo
    const { body: insumoBody } = await get(`/insumos/${insumoIds[0]}`);
    const costoUnitario = Number(insumoBody.costo_unitario);
    const cantidad = 100;

    await put(`/productos/${productoId}/receta`, {
      insumos: [{ insumo_id: insumoIds[0], cantidad }],
    });

    const { body } = await get(`/productos/${productoId}/receta`);
    const costoEsperado = costoUnitario * cantidad;
    const costoReal = Number(body.costo_receta_estimado);

    assert(
      Math.abs(costoReal - costoEsperado) < 0.01,
      `Costo incorrecto: esperaba ~${costoEsperado}, recibí ${costoReal}`
    );
  });
}

// ---------------------------------------------------------------------------
// Ejecución principal
// ---------------------------------------------------------------------------
async function main() {
  console.log("🧪 Iniciando suite de pruebas — Helados del Valle");
  console.log(`   Base URL: ${BASE}`);

  // Verificar que el servidor esté disponible
  try {
    await fetch(`${BASE}/health`, { timeout: 5000 });
  } catch {
    console.error(
      "\n❌ ERROR: No se pudo conectar con el servidor.\n" +
        "   Asegúrate de que el servidor esté corriendo:\n" +
        "   cd Back && npm run dev\n"
    );
    process.exitCode = 1;
    return;
  }

  await pruebasSalud();
  await pruebasInsumos();
  await pruebasInventario();
  await pruebasProductos();

  // Obtener insumos reales para las pruebas de recetas
  const { body: insumos } = await get("/insumos");
  const insumoIds = insumos
    .filter((i) => i.activo && Number(i.costo_unitario) > 0)
    .slice(0, 3)
    .map((i) => i.id);

  if (insumoIds.length < 2) {
    console.log(
      "\n⚠️  Se necesitan al menos 2 insumos activos con costo_unitario > 0 para las pruebas de recetas."
    );
    console.log("   Las pruebas de recetas se omitirán parcialmente.");
  }

  await pruebasRecetas(insumoIds);

  // Limpieza
  const path = require("path");
  const fs = require("fs");
  const dotenv = require("dotenv");
  const envPaths = [
    path.resolve(__dirname, "../../.env.local"),
    path.resolve(__dirname, "../../.env"),
    path.resolve(__dirname, "../.env.local"),
    path.resolve(__dirname, "../.env"),
  ];
  for (const p of envPaths) {
    if (fs.existsSync(p)) {
      dotenv.config({ path: p });
      break;
    }
  }
  const { Pool } = require("pg");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  await limpiar(pool);
  await pool.end();

  // Resumen
  console.log("\n" + "─".repeat(50));
  console.log(`  Resultado: ${passed} pasadas, ${failed} fallidas`);
  if (errores.length > 0) {
    console.log("\n  Pruebas que fallaron:");
    errores.forEach((e) => console.log(`    • ${e.nombre}: ${e.error}`));
  }
  console.log("─".repeat(50));

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("\n❌ Error inesperado en la suite:", err.message);
  process.exitCode = 1;
});

