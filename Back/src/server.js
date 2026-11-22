const path = require("path");
const fs = require("fs");
const http = require("http");
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

const app = require("./app");

const PORT = process.env.PORT || 3000;

// Usamos http.createServer explícito para evitar el bug de Express 5 donde
// app.listen() registra el callback también como handler de errores, lo que
// provoca que un fallo de binding (EADDRINUSE, sandbox, etc.) invoque el
// callback de éxito sin haber creado un TCP handle — el event loop drena
// y nodemon reporta "clean exit".
const server = http.createServer(app);

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `\n❌  Puerto ${PORT} ya está en uso. Cierra el proceso anterior e intenta de nuevo.\n`
    );
  } else {
    console.error("❌  Error al iniciar el servidor:", err.message);
  }
  process.exit(1);
});

server.listen(PORT, () => {
  console.log(`✅  Servidor ejecutándose en http://localhost:${PORT}`);
  console.log(`    Entorno: ${process.env.NODE_ENV || "development"}`);
});
