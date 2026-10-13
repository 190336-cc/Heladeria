# API — Helados del Valle

Backend REST construido con **Node.js**, **Express 5** y **PostgreSQL** (Neon).

---

## Requisitos previos

- Node.js ≥ 20
- Archivo `.env.local` en la raíz del proyecto (al mismo nivel que `Back/` y `Front/`)

### Variables de entorno

| Variable | Descripción | Obligatoria |
|----------|-------------|-------------|
| `DATABASE_URL` | Connection string de Neon (pooled) | ✅ |
| `DATABASE_URL_UNPOOLED` | Connection string directa para migraciones (`db:init`) | Solo para `npm run db:init` |
| `PORT` | Puerto del servidor (default: `3000`) | No |

> **Nunca incluyas valores reales en el repositorio.** El archivo `.env.local` está en `.gitignore`.

---

## Instalación y ejecución

```bash
# Desde el directorio Back/
npm install

# Desarrollo (recarga automática)
npm run dev

# Producción
npm start

# Inicializar esquema en Neon (solo la primera vez)
npm run db:init

# Ejecutar pruebas de integración (el servidor debe estar corriendo)
npm test
```

---

## Endpoints implementados

### Salud

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/health` | Estado de la API |
| `GET` | `/api/db-test` | Verifica conexión con Neon |

---

### Insumos — `/api/insumos`

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/insumos` | Listar todos los insumos |
| `GET` | `/api/insumos/:id` | Consultar un insumo por ID |
| `POST` | `/api/insumos` | Crear un insumo |
| `PUT` | `/api/insumos/:id` | Editar nombre, descripción, stock_minimo, costo_unitario |
| `PATCH` | `/api/insumos/:id/estado` | Activar / desactivar |

> ⚠️ **`stock_actual` no puede modificarse directamente.** Solo cambia mediante movimientos de inventario.

#### POST / PUT `/api/insumos`

```json
{
  "nombre": "Azúcar",
  "descripcion": "Azúcar refinada",
  "unidad_medida": "g",
  "stock_minimo": 500,
  "costo_unitario": 0.012
}
```

`unidad_medida` acepta: `"g"`, `"ml"`, `"pieza"`.  
El PUT no incluye `unidad_medida` (no editable después de creación).

---

### Inventario — `/api/inventario`

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/inventario/resumen` | Totales y valor del inventario |
| `GET` | `/api/inventario/alertas` | Insumos con stock ≤ stock_minimo |
| `GET` | `/api/inventario/movimientos` | Historial (últimos 100) |
| `POST` | `/api/inventario/movimientos` | Registrar entrada, merma o ajuste |

#### POST `/api/inventario/movimientos`

```json
{
  "insumo_id": 1,
  "usuario_id": 1,
  "tipo": "entrada",
  "cantidad": 1000,
  "motivo": "Compra proveedor X"
}
```

**Tipos permitidos (fase actual):** `entrada`, `merma`, `ajuste_entrada`, `ajuste_salida`  
*(`consumo` y `reversion_venta` están reservados para el módulo de ventas)*

- Las salidas verifican stock suficiente antes de ejecutarse.
- Se usa `SELECT FOR UPDATE` para prevenir stock negativo en concurrencia.
- `cantidad` siempre debe ser > 0; el tipo determina si suma o resta.

---

### Productos — `/api/productos`

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/productos` | Listar productos con costo_receta_estimado |
| `GET` | `/api/productos/:id` | Consultar producto con costo estimado |
| `POST` | `/api/productos` | Crear un producto |
| `PUT` | `/api/productos/:id` | Editar nombre, descripción, precio_venta |
| `PATCH` | `/api/productos/:id/estado` | Activar / desactivar |

#### POST `/api/productos`

```json
{
  "nombre": "Helado de vainilla",
  "descripcion": "Helado artesanal de vainilla",
  "precio_venta": 35.50
}
```

**Respuesta 201:**
```json
{
  "message": "Producto registrado correctamente",
  "producto": {
    "id": 1,
    "nombre": "Helado de vainilla",
    "descripcion": "Helado artesanal de vainilla",
    "precio_venta": "35.50",
    "activo": true,
    "created_at": "2026-10-12T15:00:00Z",
    "updated_at": "2026-10-12T15:00:00Z"
  }
}
```

#### PATCH `/api/productos/:id/estado`

```json
{ "activo": false }
```

---

### Recetas — `/api/productos/:id/receta`

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/productos/:id/receta` | Consultar insumos, cantidades y costo estimado |
| `PUT` | `/api/productos/:id/receta` | Reemplazar la receta completa (atómico) |

#### GET `/api/productos/1/receta` — Respuesta 200

```json
{
  "producto_id": 1,
  "producto": "Helado de vainilla",
  "insumos": [
    {
      "insumo_id": 3,
      "insumo": "Leche entera",
      "unidad_medida": "ml",
      "cantidad": "500.000",
      "costo_unitario": "0.0150",
      "costo_parcial": "7.5000"
    }
  ],
  "costo_receta_estimado": "7.5000",
  "nota": "El costo es una estimación basada en los costos unitarios actuales..."
}
```

#### PUT `/api/productos/1/receta`

```json
{
  "insumos": [
    { "insumo_id": 3, "cantidad": 500 },
    { "insumo_id": 7, "cantidad": 200 }
  ]
}
```

- Enviar `insumos: []` elimina todos los insumos de la receta.
- La operación es **atómica**: o se guarda completa o no se guarda nada.
- Solo acepta insumos que existan y estén activos.
- Cantidades deben ser > 0.
- No se permiten insumos duplicados en el mismo cuerpo.
- **No modifica el stock de ningún insumo.**

---

## Códigos HTTP y errores

| Código | Significado |
|--------|-------------|
| `200` | Operación exitosa |
| `201` | Recurso creado |
| `400` | Datos inválidos o restricción de negocio |
| `404` | Recurso no encontrado |
| `409` | Conflicto (nombre duplicado, stock insuficiente) |
| `500` | Error interno del servidor |

Los errores devuelven siempre un objeto con `message`:

```json
{ "message": "Descripción del error" }
```

---

## Seguridad

> ⚠️ **Los endpoints no requieren autenticación en esta fase.** La API está abierta. No expongas el backend directamente a internet sin implementar auth primero.

- Todas las consultas usan parámetros (`$1`, `$2`, ...) — **sin interpolación de strings**.
- Los IDs de path params se validan con regex antes de llegar a la BD.
- Los errores de BD no exponen detalles técnicos al cliente.

---

## Pruebas

```bash
# 1. Levantar el servidor en una terminal
npm run dev

# 2. En otra terminal, ejecutar las pruebas
npm test
```

Las pruebas crean un producto temporal en la BD y lo eliminan al finalizar. **No ejecutar sobre datos de producción críticos sin respaldo.**

La suite requiere al menos 2 insumos activos con `costo_unitario > 0` en la base de datos para ejecutar todas las pruebas de recetas.

---

## Cambios en el esquema

No se realizaron cambios al esquema. El módulo de productos y recetas usa las tablas `productos` y `producto_insumos` ya definidas en `Bd/schema.sql`.

Si en el futuro se requieren migraciones, deben ser incrementales (`ALTER TABLE`, nunca `DROP TABLE`) y aplicarse manualmente con `DATABASE_URL_UNPOOLED`.

