-- ============================================================
-- Helados del Valle
-- Esquema inicial para PostgreSQL (Neon)
-- Ejecutar una sola vez sobre una base de datos vacía.
-- ============================================================

BEGIN;

-- 1. Usuarios del sistema
CREATE TABLE IF NOT EXISTS usuarios (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre          VARCHAR(120) NOT NULL,
    correo          VARCHAR(254) NOT NULL,
    password_hash   TEXT NOT NULL,
    rol             VARCHAR(20) NOT NULL DEFAULT 'cajero',
    activo          BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_usuarios_correo UNIQUE (correo),
    CONSTRAINT ck_usuarios_rol CHECK (rol IN ('admin', 'cajero')),
    CONSTRAINT ck_usuarios_nombre_no_vacio CHECK (LENGTH(TRIM(nombre)) > 0),
    CONSTRAINT ck_usuarios_correo_no_vacio CHECK (LENGTH(TRIM(correo)) > 0),
    CONSTRAINT ck_usuarios_password_hash_no_vacio CHECK (LENGTH(password_hash) > 0)
);

-- 2. Insumos e inventario
-- unidad_medida es la unidad base usada en recetas y movimientos.
-- Ejemplos: g, ml, pieza. Las conversiones se hacen al registrar compras.
CREATE TABLE IF NOT EXISTS insumos (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre          VARCHAR(120) NOT NULL,
    descripcion     TEXT,
    unidad_medida   VARCHAR(20) NOT NULL,
    stock_actual    NUMERIC(14,3) NOT NULL DEFAULT 0,
    stock_minimo    NUMERIC(14,3) NOT NULL DEFAULT 0,
    costo_unitario  NUMERIC(12,4) NOT NULL DEFAULT 0,
    activo          BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT ck_insumos_nombre_no_vacio CHECK (LENGTH(TRIM(nombre)) > 0),
    CONSTRAINT ck_insumos_unidad CHECK (unidad_medida IN ('g', 'ml', 'pieza')),
    CONSTRAINT ck_insumos_stock_actual CHECK (stock_actual >= 0),
    CONSTRAINT ck_insumos_stock_minimo CHECK (stock_minimo >= 0),
    CONSTRAINT ck_insumos_costo_unitario CHECK (costo_unitario >= 0),
    CONSTRAINT uq_insumos_nombre_unidad UNIQUE (nombre, unidad_medida)
);

-- 3. Productos que se venden
CREATE TABLE IF NOT EXISTS productos (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre          VARCHAR(120) NOT NULL,
    descripcion     TEXT,
    precio_venta    NUMERIC(12,2) NOT NULL,
    activo          BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT ck_productos_nombre_no_vacio CHECK (LENGTH(TRIM(nombre)) > 0),
    CONSTRAINT ck_productos_precio_venta CHECK (precio_venta >= 0),
    CONSTRAINT uq_productos_nombre UNIQUE (nombre)
);

-- 4. Receta: relación muchos-a-muchos entre productos e insumos.
-- cantidad representa cuánto insumo se consume para UNA unidad del producto.
CREATE TABLE IF NOT EXISTS producto_insumos (
    producto_id     BIGINT NOT NULL,
    insumo_id       BIGINT NOT NULL,
    cantidad        NUMERIC(14,3) NOT NULL,

    CONSTRAINT pk_producto_insumos PRIMARY KEY (producto_id, insumo_id),
    CONSTRAINT fk_producto_insumos_producto
        FOREIGN KEY (producto_id) REFERENCES productos(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_producto_insumos_insumo
        FOREIGN KEY (insumo_id) REFERENCES insumos(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT ck_producto_insumos_cantidad CHECK (cantidad > 0)
);

-- 5. Categorías de evento
CREATE TABLE IF NOT EXISTS tipos_evento (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre          VARCHAR(80) NOT NULL,
    descripcion     TEXT,
    activo          BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_tipos_evento_nombre UNIQUE (nombre),
    CONSTRAINT ck_tipos_evento_nombre_no_vacio CHECK (LENGTH(TRIM(nombre)) > 0)
);

-- 6. Eventos concretos atendidos por el negocio
CREATE TABLE IF NOT EXISTS eventos (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tipo_evento_id      BIGINT NOT NULL,
    nombre              VARCHAR(150) NOT NULL,
    fecha_inicio        TIMESTAMPTZ NOT NULL,
    fecha_fin           TIMESTAMPTZ,
    ubicacion           VARCHAR(250),
    observaciones       TEXT,
    costo_evento        NUMERIC(12,2) NOT NULL DEFAULT 0,
    estado              VARCHAR(20) NOT NULL DEFAULT 'programado',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_eventos_tipo
        FOREIGN KEY (tipo_evento_id) REFERENCES tipos_evento(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT ck_eventos_nombre_no_vacio CHECK (LENGTH(TRIM(nombre)) > 0),
    CONSTRAINT ck_eventos_fechas CHECK (fecha_fin IS NULL OR fecha_fin >= fecha_inicio),
    CONSTRAINT ck_eventos_costo CHECK (costo_evento >= 0),
    CONSTRAINT ck_eventos_estado CHECK (estado IN ('programado', 'realizado', 'cancelado'))
);

-- 7. Ventas
-- evento_id NULL significa que fue una venta habitual/no asociada a un evento.
CREATE TABLE IF NOT EXISTS ventas (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id      BIGINT NOT NULL,
    evento_id       BIGINT,
    fecha           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metodo_pago     VARCHAR(20) NOT NULL,
    estado          VARCHAR(20) NOT NULL DEFAULT 'activa',
    total           NUMERIC(12,2) NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    cancelada_at    TIMESTAMPTZ,
    motivo_cancelacion TEXT,

    CONSTRAINT fk_ventas_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_ventas_evento
        FOREIGN KEY (evento_id) REFERENCES eventos(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT ck_ventas_metodo_pago
        CHECK (metodo_pago IN ('efectivo', 'tarjeta', 'transferencia')),
    CONSTRAINT ck_ventas_estado CHECK (estado IN ('activa', 'cancelada')),
    CONSTRAINT ck_ventas_total CHECK (total >= 0),
    CONSTRAINT ck_ventas_cancelacion CHECK (
        (estado = 'activa' AND cancelada_at IS NULL)
        OR
        (estado = 'cancelada' AND cancelada_at IS NOT NULL)
    )
);

-- 8. Renglones de cada venta. El precio queda guardado como histórico.
CREATE TABLE IF NOT EXISTS detalle_ventas (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    venta_id        BIGINT NOT NULL,
    producto_id     BIGINT NOT NULL,
    cantidad        INTEGER NOT NULL,
    precio_unitario NUMERIC(12,2) NOT NULL,
    subtotal        NUMERIC(14,2) GENERATED ALWAYS AS
                    (cantidad * precio_unitario) STORED,

    CONSTRAINT fk_detalle_ventas_venta
        FOREIGN KEY (venta_id) REFERENCES ventas(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_detalle_ventas_producto
        FOREIGN KEY (producto_id) REFERENCES productos(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT ck_detalle_ventas_cantidad CHECK (cantidad > 0),
    CONSTRAINT ck_detalle_ventas_precio CHECK (precio_unitario >= 0),
    CONSTRAINT uq_detalle_ventas_venta_producto UNIQUE (venta_id, producto_id)
);

-- 9. Historial de entradas, consumos, mermas, ajustes y reversiones.
-- cantidad siempre es positiva; el tipo determina el sentido del movimiento.
-- Para consumo/reversiones asociados a una venta, venta_id identifica esa venta.
CREATE TABLE IF NOT EXISTS movimientos_inventario (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    insumo_id       BIGINT NOT NULL,
    usuario_id      BIGINT NOT NULL,
    venta_id        BIGINT,
    tipo            VARCHAR(24) NOT NULL,
    cantidad        NUMERIC(14,3) NOT NULL,
    motivo          TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_movimientos_insumo
        FOREIGN KEY (insumo_id) REFERENCES insumos(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_movimientos_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_movimientos_venta
        FOREIGN KEY (venta_id) REFERENCES ventas(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT ck_movimientos_tipo
        CHECK (tipo IN (
            'entrada',
            'consumo',
            'merma',
            'ajuste_entrada',
            'ajuste_salida',
            'reversion_venta'
        )),
    CONSTRAINT ck_movimientos_cantidad CHECK (cantidad > 0),
    CONSTRAINT ck_movimientos_venta_tipo CHECK (
        (tipo IN ('consumo', 'reversion_venta') AND venta_id IS NOT NULL)
        OR
        (tipo IN ('entrada', 'merma', 'ajuste_entrada', 'ajuste_salida') AND venta_id IS NULL)
    )
);

-- Índices para las consultas más frecuentes.
CREATE INDEX IF NOT EXISTS idx_eventos_tipo_fecha
    ON eventos (tipo_evento_id, fecha_inicio);
CREATE INDEX IF NOT EXISTS idx_ventas_fecha
    ON ventas (fecha DESC);
CREATE INDEX IF NOT EXISTS idx_ventas_usuario_fecha
    ON ventas (usuario_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_ventas_evento_fecha
    ON ventas (evento_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_ventas_estado_fecha
    ON ventas (estado, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_detalle_ventas_producto
    ON detalle_ventas (producto_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_insumo_fecha
    ON movimientos_inventario (insumo_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_movimientos_venta
    ON movimientos_inventario (venta_id)
    WHERE venta_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_insumos_activos
    ON insumos (nombre)
    WHERE activo = TRUE;
CREATE INDEX IF NOT EXISTS idx_productos_activos
    ON productos (nombre)
    WHERE activo = TRUE;

-- Valores iniciales para las categorías de eventos.
INSERT INTO tipos_evento (nombre, descripcion)
VALUES
    ('Cumpleaños', 'Fiestas y celebraciones de cumpleaños'),
    ('Exposición', 'Exposiciones comerciales, escolares o profesionales'),
    ('Feria', 'Ferias y eventos públicos'),
    ('Evento empresarial', 'Eventos organizados por empresas'),
    ('Evento escolar', 'Actividades y eventos escolares'),
    ('Venta habitual', 'Ventas en puntos habituales que se registran como evento si se desea'),
    ('Otro', 'Cualquier otro tipo de evento')
ON CONFLICT (nombre) DO NOTHING;

COMMIT;
