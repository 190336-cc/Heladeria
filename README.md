# 🍦 Helados del Valle — Sistema de Gestión Comercial y Operativa

Sistema integral de gestión para heladerías artesanales, diseñado para administrar el catálogo de insumos, el control de inventario con trazabilidad transaccional y el catálogo de productos con estimación de costos de recetas.

---

## 🚀 Módulos Funcionales Implementados

### 🧂 1. Insumos
- Catálogo de materias primas con control de unidad de medida base (`g`, `ml`, `pieza`).
- Registro, edición y activación/desactivación lógica de insumos.
- Parámetros de control: costo unitario actual y umbral de stock mínimo.
- **Regla de integridad:** El `stock_actual` no se puede modificar manualmente mediante edición simple; solo se altera a través de movimientos formales de inventario.

### 📦 2. Inventario y Existencias
- Registro de movimientos de inventario: **entradas**, **mermas**, **ajustes de entrada** y **ajustes de salida**.
- **Concurrencia segura:** Bloqueo a nivel de fila (`SELECT ... FOR UPDATE`) y transacciones atómicas (`BEGIN/COMMIT/ROLLBACK`) para garantizar que nunca existan existencias negativas.
- **Resumen ejecutivo:** Indicadores en tiempo real de insumos totales, agotados, con stock bajo, suficientes y valor total estimado del almacén.
- **Alertas automáticas:** Detección de insumos cuyo stock es menor o igual al umbral mínimo.
- Historial auditable de los últimos movimientos con insumo, cantidad, motivo y fecha.

### 🍨 3. Productos y Recetas
- Catálogo comercial de productos terminados para venta al público con nombre, descripción, precio y estado.
- Relación muchos a muchos con insumos (`producto_insumos`) para la definición de recetas.
- Cálculo de costo estimado de producción por receta directamente en PostgreSQL con aritmética `NUMERIC` de alta precisión.
- Interfaz reactiva con buscador instantáneo, filtrado por estado y actualización automática.

---

## 🛠️ Stack Tecnológico

| Capa | Tecnologías |
| :--- | :--- |
| **Backend** | **Node.js** (v20+), **Express 5**, **PostgreSQL** (`pg`), **dotenv**, **cors** |
| **Frontend** | **React 19**, **Vite 8**, **CSS3 modular y responsivo** (con soporte de tema oscuro automático) |
| **Base de Datos** | **PostgreSQL 18** en la nube con **Neon Serverless** |
| **Testing** | Suite de integración automatizada en Node.js |

---

## 📁 Estructura del Proyecto

```text
Heladeria/
├── .env.example            # Plantilla global de variables de entorno
├── .gitignore              # Exclusiones de Git (seguridad y archivos generados)
├── Bd/
│   └── schema.sql          # DDL completo de PostgreSQL (tablas, FK, CHECKs e índices)
├── Back/                   # Backend API REST
│   ├── .env.example        # Plantilla de variables para el backend
│   ├── .gitignore          # Exclusiones específicas del backend
│   ├── init-db.js          # Script para inicializar tablas y catálogo en PostgreSQL
│   ├── package.json        # Dependencias y scripts del backend
│   ├── README.md           # Documentación técnica de endpoints y contratos JSON
│   ├── src/
│   │   ├── app.js          # Configuración de Express, middlewares y rutas
│   │   ├── db.js           # Pool de conexiones a PostgreSQL
│   │   ├── server.js       # Entrada y arranque del servidor HTTP
│   │   └── routes/
│   │       ├── insumos.js      # Rutas /api/insumos
│   │       ├── inventario.js   # Rutas /api/inventario
│   │       └── productos.js    # Rutas /api/productos y recetas
│   └── tests/
│       └── api.test.js     # Suite de 41 pruebas de integración end-to-end
└── Front/                  # Frontend SPA
    ├── .env.example        # Plantilla de variables para el frontend
    ├── .gitignore          # Exclusiones específicas del frontend
    ├── package.json        # Dependencias y scripts de React + Vite
    ├── index.html          # Entrada HTML
    ├── vite.config.js      # Configuración de Vite
    └── src/
        ├── App.css         # Estilos del sistema de diseño
        ├── App.jsx         # Layout principal y navegación por pestañas
        ├── index.css       # Reseteo y variables globales
        ├── main.jsx        # Montaje de React 19
        ├── components/     # Componentes UI reutilizables
        ├── pages/          # Vistas (InsumosPage, InventarioPage, ProductosPage)
        └── services/
            └── api.js      # Capa centralizada de peticiones HTTP
```

---

## ⚙️ Guía de Instalación y Puesta en Marcha

Sigue estos pasos para clonar el proyecto y tenerlo funcionando en tu entorno local en menos de 5 minutos:

### 1. Clonar el repositorio

```bash
git clone <URL_DEL_REPOSITORIO>
cd Heladeria
```

### 2. Configurar las variables de entorno

Copia la plantilla `.env.example` en la raíz del proyecto para crear tu archivo `.env.local`:

```bash
cp .env.example .env.local
```

Abre `.env.local` con tu editor y coloca tus credenciales de PostgreSQL (disponibles en tu consola de [Neon Console](https://console.neon.tech)):

```env
# Conexión agrupada (Pooled) para la API
DATABASE_URL=postgresql://neondb_owner:tu_password@ep-ejemplo-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require

# Conexión directa (Unpooled) para inicializar el esquema y DDL
DATABASE_URL_UNPOOLED=postgresql://neondb_owner:tu_password@ep-ejemplo.us-east-2.aws.neon.tech/neondb?sslmode=require

# Puerto del servidor backend (opcional, default 3000)
PORT=3000
```

> 🔒 **Seguridad:** Los archivos `.env` y `.env.local` están ignorados en `.gitignore`. Nunca compartas ni hagas commit de credenciales reales.

---

### 3. Configurar e Iniciar el Backend

Abre una terminal y entra en la carpeta `Back/`:

```bash
cd Back
npm install
```

#### A. Inicializar la Base de Datos (solo la primera vez)
Ejecuta el script que aplica el esquema DDL y valida las 9 tablas requeridas:

```bash
npm run db:init
```

#### B. Ejecutar la Suite de Pruebas
Verifica que la conexión a Neon y las reglas de negocio respondan correctamente:

```bash
npm test
```
*(Deberás ver 41 pruebas pasadas exitosamente).*

#### C. Iniciar el Servidor en Desarrollo
```bash
npm run dev
```
El servidor backend se iniciará en `http://localhost:3000`. Puedes verificarlo visitando `http://localhost:3000/api/health`.

---

### 4. Configurar e Iniciar el Frontend

En una **segunda terminal**, dirígete a la carpeta `Front/`:

```bash
cd Front
npm install
```

Verifica o crea el archivo `Front/.env.local` (opcional si usas el puerto por defecto):
```bash
cp .env.example .env.local
```
*(Asegúrate de que contenga `VITE_API_URL=http://localhost:3000/api`)*.

Inicia el servidor de desarrollo de Vite:

```bash
npm run dev
```

Abre tu navegador en `http://localhost:5173`. ¡Listo! Podrás navegar entre los módulos de **Inventario**, **Insumos** y **Productos**.

---

## 📡 Resumen de Endpoints Principales

| Módulo | Método | Endpoint | Descripción |
| :--- | :--- | :--- | :--- |
| **Salud** | `GET` | `/api/health` | Estado del backend |
| | `GET` | `/api/db-test` | Conexión con PostgreSQL / Neon |
| **Insumos** | `GET` | `/api/insumos` | Listar insumos |
| | `GET` | `/api/insumos/:id` | Detalle de un insumo |
| | `POST` | `/api/insumos` | Registrar nuevo insumo |
| | `PUT` | `/api/insumos/:id` | Editar insumo (sin alterar stock) |
| | `PATCH` | `/api/insumos/:id/estado` | Activar / desactivar insumo |
| **Inventario** | `GET` | `/api/inventario/resumen` | Métricas y valor del inventario |
| | `GET` | `/api/inventario/alertas` | Insumos en o por debajo del stock mínimo |
| | `GET` | `/api/inventario/movimientos` | Historial de movimientos recientes |
| | `POST` | `/api/inventario/movimientos` | Registrar entrada, merma o ajuste |
| **Productos** | `GET` | `/api/productos` | Listar catálogo (con búsqueda y filtros) |
| | `GET` | `/api/productos/:id` | Detalle de producto |
| | `POST` | `/api/productos` | Crear nuevo producto comercial |
| | `PUT` | `/api/productos/:id` | Editar producto |
| | `PATCH` | `/api/productos/:id/estado` | Alternar / cambiar estado de producto |
| **Recetas** | `GET` | `/api/productos/:id/receta` | Consultar insumos y costo estimado |
| | `PUT` | `/api/productos/:id/receta` | Actualización atómica de receta |

---

## 🧪 Comandos Útiles

```bash
# Backend (dentro de Back/)
npm run dev       # Servidor con recarga automática (nodemon)
npm start         # Servidor en modo producción
npm test          # Ejecutar suite de pruebas de integración
npm run db:init   # Aplicar y verificar DDL en la base de datos

# Frontend (dentro de Front/)
npm run dev       # Servidor de desarrollo con HMR (Vite)
npm run build     # Compilación para producción (genera Front/dist/)
npm run lint      # Validación de código y hooks con ESLint
```

---

## 👥 Contribución y Buenas Prácticas

1. **Variables de Entorno:** Nunca agregues tokens, cadenas de conexión ni llaves API en el código fuente. Usa siempre variables de entorno y documenta nuevos parámetros en `.env.example`.
2. **Consultas a Base de Datos:** Todas las consultas SQL deben ser parametrizadas (`$1, $2, ...`) para prevenir inyecciones SQL.
3. **Control de Existencias:** No realices cálculos monetarios ni de stock en JavaScript; delega la aritmética en los tipos `NUMERIC` de PostgreSQL dentro de transacciones.

