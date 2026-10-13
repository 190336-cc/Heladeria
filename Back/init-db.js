const fs = require("node:fs");
const path = require("node:path");
const { Client } = require("pg");
const dotenv = require("dotenv");

const envCandidates = [
  path.resolve(__dirname, "..", ".env.local"),
  path.resolve(__dirname, "..", ".env"),
  path.resolve(__dirname, ".env.local"),
  path.resolve(__dirname, ".env"),
];
const schemaPath = path.resolve(__dirname, "..", "Bd", "schema.sql");
const expectedTables = [
  "usuarios",
  "insumos",
  "productos",
  "producto_insumos",
  "tipos_evento",
  "eventos",
  "ventas",
  "detalle_ventas",
  "movimientos_inventario",
];
const expectedEventTypes = [
  "Cumpleaños",
  "Exposición",
  "Feria",
  "Evento empresarial",
  "Evento escolar",
  "Venta habitual",
  "Otro",
];

async function initializeDatabase() {
  let env = {};
  for (const candidate of envCandidates) {
    if (fs.existsSync(candidate)) {
      try {
        const parsed = dotenv.parse(fs.readFileSync(candidate, "utf8"));
        env = { ...env, ...parsed };
      } catch (err) {
        console.warn(`Advertencia al leer ${candidate}: ${err.message}`);
      }
    }
  }
  // Sobrescribir con process.env si ya existen
  env = { ...env, ...process.env };

  const connectionString =
    env.DATABASE_URL_UNPOOLED || env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "Falta DATABASE_URL_UNPOOLED o DATABASE_URL en el archivo de entorno (.env.local o .env). Consulta .env.example para ver la plantilla.",
    );
  }

  const databaseUrl = new URL(connectionString);
  if (databaseUrl.hostname.includes("-pooler.")) {
    throw new Error(
      "La inicialización requiere una conexión directa (sin pooler). Por favor configura DATABASE_URL_UNPOOLED en tu .env o .env.local",
    );
  }

  const schemaSql = fs.readFileSync(schemaPath, "utf8");
  const client = new Client({ connectionString });
  let connected = false;
  let schemaApplied = false;

  try {
    await client.connect();
    connected = true;
    await client.query(schemaSql);
    schemaApplied = true;

    const tableResult = await client.query(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = current_schema()
         AND table_type = 'BASE TABLE'
         AND table_name = ANY($1::text[])
       ORDER BY table_name`,
      [expectedTables],
    );
    const createdTables = tableResult.rows.map((row) => row.table_name);
    const missingTables = expectedTables.filter(
      (table) => !createdTables.includes(table),
    );

    if (missingTables.length > 0) {
      throw new Error(`Faltan tablas: ${missingTables.join(", ")}`);
    }

    const eventTypeResult = await client.query(
      `SELECT nombre
       FROM tipos_evento
       WHERE nombre = ANY($1::text[])`,
      [expectedEventTypes],
    );
    const createdEventTypes = eventTypeResult.rows.map((row) => row.nombre);
    const missingEventTypes = expectedEventTypes.filter(
      (eventType) => !createdEventTypes.includes(eventType),
    );

    if (missingEventTypes.length > 0) {
      throw new Error(
        `Faltan tipos de evento iniciales: ${missingEventTypes.join(", ")}`,
      );
    }

    console.log(
      `Tablas verificadas (${createdTables.length}/${expectedTables.length}): ${createdTables.join(", ")}`,
    );
    console.log(
      `Tipos de evento iniciales verificados (${createdEventTypes.length}/${expectedEventTypes.length}).`,
    );
    console.log("Esquema de la base de datos aplicado correctamente.");
  } catch (error) {
    if (connected && !schemaApplied) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        throw new AggregateError(
          [error, rollbackError],
          "No se pudo aplicar el esquema y también falló ROLLBACK",
        );
      }
    }
    throw error;
  } finally {
    if (connected) {
      await client.end();
    }
  }
}

initializeDatabase().catch((error) => {
  console.error(`Error al inicializar la base de datos: ${error.message}`);
  process.exitCode = 1;
});
