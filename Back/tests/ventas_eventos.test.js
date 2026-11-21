/**
 * Pruebas de integración para Ventas, Eventos y Dashboard.
 *
 * Ejecución:
 *   node Back/tests/ventas_eventos.test.js
 *
 * Requiere el backend corriendo en localhost:3000
 */

const fetch = require("node-fetch");
const BASE = "http://localhost:3000/api";

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

async function run() {
  console.log("🧪 Pruebas de integración: Ventas, Eventos y Dashboard\n");

  // Verificar conexión inicial
  try {
    const salud = await get("/health");
    assert(salud.status === 200, "El servidor debe responder 200 en /health");
  } catch (e) {
    console.error("❌ El servidor no está respondiendo en http://localhost:3000. Inicia el backend antes de correr las pruebas.");
    process.exit(1);
  }

  // 1. Dashboard
  await test("GET /dashboard/resumen responde 200 con estructura de KPIs completa", async () => {
    const { status, body } = await get("/dashboard/resumen");
    assert(status === 200, `Status esperado 200, recibido ${status}`);
    assert(body.success === true, "success debe ser true");
    assert(body.kpis !== undefined, "debe contener kpis");
    assert(Array.isArray(body.ventas_ultimos_7_dias), "ventas_ultimos_7_dias debe ser un arreglo");
    assert(Array.isArray(body.top_productos), "top_productos debe ser un arreglo");
    assert(Array.isArray(body.eventos_recientes), "eventos_recientes debe ser un arreglo");
  });

  // 2. Eventos
  let eventoCreadoId = null;

  await test("GET /eventos/tipos responde 200 con tipos de eventos", async () => {
    const { status, body } = await get("/eventos/tipos");
    assert(status === 200, `Status esperado 200, recibido ${status}`);
    assert(Array.isArray(body), "debe responder un arreglo de tipos");
    assert(body.length > 0, "debe haber al menos un tipo de evento");
  });

  await test("POST /eventos valida nombre obligatorio", async () => {
    const { status } = await post("/eventos", {
      nombre: "   ",
      fecha_inicio: "2026-12-01",
    });
    assert(status === 400, `Status esperado 400, recibido ${status}`);
  });

  await test("POST /eventos registra un nuevo evento correctamente", async () => {
    const { status, body } = await post("/eventos", {
      nombre: "Feria de Prueba Test Runner",
      fecha_inicio: "2026-12-15T10:00:00Z",
      ubicacion: "Parque Central",
      observaciones: "Prueba automatizada",
      costo_evento: 500,
      estado: "programado",
    });

    assert(status === 201, `Status esperado 201, recibido ${status}`);
    assert(body.success === true, "success debe ser true");
    assert(body.evento?.id, "debe devolver el ID del evento");
    eventoCreadoId = body.evento.id;
  });

  await test("GET /eventos lista eventos con cálculo de ventas totales", async () => {
    const { status, body } = await get("/eventos");
    assert(status === 200, `Status esperado 200, recibido ${status}`);
    assert(Array.isArray(body), "debe responder un arreglo");
    const ev = body.find((e) => e.id === eventoCreadoId);
    assert(ev !== undefined, "el evento creado debe estar en la lista");
    assert(ev.ventas_totales !== undefined, "debe incluir ventas_totales");
    assert(ev.es_vigente !== undefined, "debe indicar si es_vigente");
  });

  await test("GET /eventos?vigentes=true filtra sólo eventos que ocurren en la fecha actual", async () => {
    // 1. Crear evento vigente hoy
    const hoyStr = new Date().toISOString();
    const evHoy = await post("/eventos", {
      nombre: "Feria Hoy Activa Test",
      fecha_inicio: hoyStr,
      fecha_fin: hoyStr,
      ubicacion: "Plaza Central",
      costo_evento: 0,
      estado: "programado",
    });
    assert(evHoy.status === 201, "evento hoy debe crearse");

    // 2. Consultar con ?vigentes=true
    const { status, body } = await get("/eventos?vigentes=true");
    assert(status === 200, `Status esperado 200, recibido ${status}`);
    assert(Array.isArray(body), "debe devolver arreglo");
    const encontrado = body.find((e) => e.id === evHoy.body.evento.id);
    assert(encontrado !== undefined, "el evento de hoy debe estar incluido en vigentes");

    // El evento futuro (2026-12-15) NO debe estar en vigentes hoy
    const noVigente = body.find((e) => e.id === eventoCreadoId);
    assert(noVigente === undefined, "el evento futuro no debe estar incluido en vigentes");
  });

  // 3. Recetas con nombre
  await test("PUT y GET /productos/:id/receta soporta asignar y consultar nombre de receta", async () => {
    // Obtener un producto existente
    const prods = await get("/productos");
    assert(prods.status === 200 && prods.body.length > 0, "debe haber al menos un producto");
    const prodId = prods.body[0].id;

    // Asignar receta con nombre
    const putRes = await put(`/productos/${prodId}/receta`, {
      receta_nombre: "Fórmula de Prueba Automatizada",
      insumos: [],
    });
    assert(putRes.status === 200, `Status esperado 200, recibido ${putRes.status}`);
    assert(putRes.body.receta_nombre === "Fórmula de Prueba Automatizada", "debe retornar receta_nombre en PUT");

    // Consultar receta
    const getRes = await get(`/productos/${prodId}/receta`);
    assert(getRes.status === 200, "debe responder 200 en GET receta");
    assert(getRes.body.receta_nombre === "Fórmula de Prueba Automatizada", "GET debe incluir receta_nombre persistido");
  });

  // 4. Ventas
  await test("POST /ventas rechaza método de pago inválido", async () => {
    const { status } = await post("/ventas", {
      metodo_pago: "cripto",
      items: [{ producto_id: 1, cantidad: 1 }],
    });
    assert(status === 400, `Status esperado 400, recibido ${status}`);
  });

  await test("POST /ventas rechaza orden sin items", async () => {
    const { status } = await post("/ventas", {
      metodo_pago: "efectivo",
      items: [],
    });
    assert(status === 400, `Status esperado 400, recibido ${status}`);
  });

  await test("POST /ventas rechaza productos inexistentes", async () => {
    const { status } = await post("/ventas", {
      metodo_pago: "efectivo",
      items: [{ producto_id: 999999, cantidad: 1 }],
    });
    assert(status === 400, `Status esperado 400, recibido ${status}`);
  });

  await test("GET /ventas lista ventas con items agregados", async () => {
    const { status, body } = await get("/ventas");
    assert(status === 200, `Status esperado 200, recibido ${status}`);
    assert(Array.isArray(body), "debe responder un arreglo");
  });

  console.log(`\n🏁 Resultado: ${passed} pasadas, ${failed} fallidas`);
  if (failed > 0) process.exit(1);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});

