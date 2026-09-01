-- =====================================================
-- SISTEMA DE EVENTOS Y CATERING - ESTRUCTURA DE TABLAS
-- =====================================================
-- Este script solo crea las tablas. Los datos iniciales
-- se insertan desde migrate.ts (o manualmente).
-- =====================================================

-- Eliminar base de datos si existe y crearla nuevamente
DROP DATABASE IF EXISTS sistema_eventos_catering;
CREATE DATABASE sistema_eventos_catering;
USE sistema_eventos_catering;

-- Clave de encriptación (usada para hash de contraseñas y otros cifrados)
SET @encryption_key = SHA2('ClaveSeguraParaEventosPeru2024!', 256);

-- =====================================================
-- 1. ROLES
-- =====================================================
CREATE TABLE roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- 2. EMPRESAS
-- =====================================================
CREATE TABLE empresas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ruc CHAR(11) NOT NULL UNIQUE,
    nombre VARCHAR(100) NOT NULL,
    estado TINYINT(1) DEFAULT 1 COMMENT '1=Activa, 0=Inactiva',
    creado_por INT NULL COMMENT 'ID del usuario que creó la empresa',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_ruc (ruc)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- 3. PERSONAS (Datos personales)
-- =====================================================
CREATE TABLE personas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_empresa INT NOT NULL,
    tipo_persona ENUM('proveedor','cliente_natural','cliente_juridico','empleado') NOT NULL,
    tipo_documento ENUM('DNI','RUC') NOT NULL,
    numero_documento VARCHAR(20) NOT NULL,
    razon_social VARCHAR(255) NULL,
    nombre VARCHAR(100) NULL,
    apellido VARCHAR(100) NULL,
    email VARCHAR(100) NULL,
    celular VARCHAR(20) NOT NULL,
    estado TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_empresa) REFERENCES empresas(id),
    INDEX idx_numero_documento (numero_documento),
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- 4. USUARIOS (Autenticación)
-- =====================================================
CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_persona INT NOT NULL COMMENT 'ID de la persona asociada',
    usuario VARCHAR(50) NOT NULL UNIQUE,
    password_hash CHAR(64) NOT NULL COMMENT 'Hash SHA-256 con la clave de encriptación',
    firma VARCHAR(255) NULL COMMENT 'Ruta de la imagen de la firma digital',
    id_rol INT NOT NULL DEFAULT 1,
    estado TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_persona) REFERENCES personas(id) ON DELETE CASCADE,
    FOREIGN KEY (id_rol) REFERENCES roles(id),
    INDEX idx_usuario (usuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- 5. RELACIÓN USUARIO - EMPRESA (ahora con persona)
-- =====================================================
CREATE TABLE usuario_empresa (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    empresa_id INT NOT NULL,
    es_predeterminada TINYINT(1) DEFAULT 0 COMMENT 'Empresa por defecto al iniciar sesión',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
    UNIQUE KEY uk_usuario_empresa (usuario_id, empresa_id),
    INDEX idx_usuario (usuario_id),
    INDEX idx_empresa (empresa_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- 6. HISTORIAL DE CAMBIOS (Auditoría)
-- =====================================================
CREATE TABLE historial (
    id INT AUTO_INCREMENT PRIMARY KEY,
    entidad VARCHAR(50) NOT NULL,
    id_entidad INT NOT NULL,
    accion VARCHAR(50) NOT NULL,
    descripcion TEXT NOT NULL,
    usuario VARCHAR(100) NOT NULL,
    fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_entidad (entidad, id_entidad),
    INDEX idx_usuario (usuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- 7. ACTIVIDAD DEL SISTEMA (Logs)
-- =====================================================
CREATE TABLE actividad (
    id INT AUTO_INCREMENT PRIMARY KEY,
    modulo VARCHAR(50) NOT NULL,
    accion VARCHAR(50) NOT NULL,
    detalle TEXT NOT NULL,
    usuario VARCHAR(100) NOT NULL,
    timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_modulo (modulo),
    INDEX idx_usuario (usuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- 8. INSUMOS Y UTENSILIOS (con multiempresa)
-- =====================================================
CREATE TABLE catering_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_empresa INT NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    stock INT NOT NULL DEFAULT 0,
    tipo ENUM('materia prima', 'utensilio') NOT NULL,
    unidad_medida VARCHAR(50) NOT NULL DEFAULT 'unidad',
    tiene_vencimiento BOOLEAN DEFAULT FALSE,
    fecha_vencimiento DATE NULL,
    dias_vida_util INT NULL COMMENT 'Días estimados para productos sin fecha',
    precio_compra DECIMAL(10,2) NULL,
    id_proveedor INT NULL COMMENT 'ID de persona (proveedor)',
    registrado_por INT NOT NULL COMMENT 'ID de la persona que registró',
    ultima_edicion DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_empresa) REFERENCES empresas(id),
    FOREIGN KEY (id_proveedor) REFERENCES personas(id) ON DELETE SET NULL,
    FOREIGN KEY (registrado_por) REFERENCES personas(id),
    INDEX idx_nombre (nombre),
    INDEX idx_tipo (tipo),
    INDEX idx_vencimiento (fecha_vencimiento)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- 9. LOTES INSUMOS
-- =====================================================
CREATE TABLE catering_lotes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_empresa INT NOT NULL,
    id_item INT NOT NULL COMMENT 'ID de catering_items',
    stock INT NOT NULL DEFAULT 0,
    fecha_vencimiento DATE NULL,
    dias_vida_util INT NULL COMMENT 'Días de duración (si no se usa fecha directa)',
    fecha_registro DATE NOT NULL,
    registrado_por INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    descartado TINYINT(1) DEFAULT 0,
    FOREIGN KEY (id_empresa) REFERENCES empresas(id),
    FOREIGN KEY (id_item) REFERENCES catering_items(id) ON DELETE CASCADE,
    FOREIGN KEY (registrado_por) REFERENCES personas(id),
    INDEX idx_item (id_item),
    INDEX idx_vencimiento (fecha_vencimiento)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- 10. CATÁLOGO DE POSTRES (con multiempresa)
-- =====================================================
CREATE TABLE postres (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_empresa INT NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    precio DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_empresa) REFERENCES empresas(id),
    INDEX idx_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- 11. LOTES POSTRES X VENCIMIENTO (con multiempresa)
-- =====================================================
CREATE TABLE lotes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_empresa INT NOT NULL,
    postre_id INT NOT NULL,
    stock INT NOT NULL DEFAULT 0,
    fecha_vencimiento DATE NOT NULL,
    dias_duracion INT NOT NULL COMMENT 'Días de duración desde la fecha de registro',
    descartado TINYINT(1) DEFAULT 0,
    fecha_registro DATE NOT NULL,
    registrado_por INT NOT NULL COMMENT 'ID de la persona que registró',
    ultima_edicion DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_empresa) REFERENCES empresas(id),
    FOREIGN KEY (postre_id) REFERENCES postres(id) ON DELETE CASCADE,
    FOREIGN KEY (registrado_por) REFERENCES personas(id),
    INDEX idx_postre (postre_id),
    INDEX idx_fecha_vencimiento (fecha_vencimiento)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- 12. VENTAS (cabecera común para general y catering, con multiempresa)
-- =====================================================
CREATE TABLE ventas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_empresa INT NOT NULL,
    numero VARCHAR(20) NOT NULL UNIQUE,
    fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    id_cliente INT NOT NULL COMMENT 'ID de persona (cliente)',
    id_usuario INT NOT NULL COMMENT 'Usuario que registra la venta',
    subtotal DECIMAL(10,2) NOT NULL,
    descuento DECIMAL(10,2) DEFAULT 0,
    igv DECIMAL(10,2) NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    metodo_pago ENUM('EFECTIVO', 'TARJETA', 'YAPE', 'PLIN') NOT NULL,
    estado ENUM('completada', 'anulada', 'devolucion-parcial', 'devolucion-total') DEFAULT 'completada',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_empresa) REFERENCES empresas(id),
    FOREIGN KEY (id_cliente) REFERENCES personas(id),
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id),
    INDEX idx_numero (numero),
    INDEX idx_fecha (fecha)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- 13. DETALLE DE VENTAS (para ventas generales con lotes, con multiempresa)
-- =====================================================
CREATE TABLE detalle_venta (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_empresa INT NOT NULL,
    id_venta INT NOT NULL,
    id_lote INT NOT NULL COMMENT 'Lote del producto vendido',
    nombre_producto VARCHAR(100) NOT NULL COMMENT 'Snapshot del nombre',
    precio_unitario DECIMAL(10,2) NOT NULL,
    cantidad INT NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (id_empresa) REFERENCES empresas(id),
    FOREIGN KEY (id_venta) REFERENCES ventas(id) ON DELETE CASCADE,
    FOREIGN KEY (id_lote) REFERENCES lotes(id),
    INDEX idx_venta (id_venta)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- 14. DEVOLUCIONES (para ventas generales, con multiempresa)
-- =====================================================
CREATE TABLE devoluciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_empresa INT NOT NULL,
    id_venta INT NOT NULL,
    fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    id_usuario INT NOT NULL,
    motivo TEXT NOT NULL,
    nota_credito VARCHAR(50) NOT NULL,
    monto DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (id_empresa) REFERENCES empresas(id),
    FOREIGN KEY (id_venta) REFERENCES ventas(id) ON DELETE CASCADE,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id),
    INDEX idx_venta (id_venta)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- 15. DETALLE DE DEVOLUCIONES (para ventas generales, con multiempresa)
-- =====================================================
CREATE TABLE detalle_devolucion (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_empresa INT NOT NULL,
    id_devolucion INT NOT NULL,
    id_detalle_venta INT NOT NULL COMMENT 'Producto original devuelto',
    cantidad INT NOT NULL,
    FOREIGN KEY (id_empresa) REFERENCES empresas(id),
    FOREIGN KEY (id_devolucion) REFERENCES devoluciones(id) ON DELETE CASCADE,
    FOREIGN KEY (id_detalle_venta) REFERENCES detalle_venta(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- 16. CATÁLOGO DE TIPOS DE SERVICIO CATERING (global o multiempresa según necesidad)
-- Aquí lo dejamos global, pero si cada empresa requiere sus propios servicios, se debe agregar id_empresa
-- =====================================================
CREATE TABLE catering_service_tipos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    clave VARCHAR(50) NOT NULL UNIQUE,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- 17. PRODUCTOS DE CARTA POR TIPO DE SERVICIO (global o multiempresa)
-- =====================================================
CREATE TABLE catering_service_productos_carta (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_tipo_servicio INT NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    precio DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_tipo_servicio) REFERENCES catering_service_tipos(id) ON DELETE CASCADE,
    INDEX idx_tipo (id_tipo_servicio)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- 18. CATÁLOGO DE MATERIALES (global o multiempresa)
-- =====================================================
CREATE TABLE catering_materiales_catalogo (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    precio DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- 19. EVENTOS DE CATERING (datos específicos, con multiempresa)
-- =====================================================
CREATE TABLE catering_eventos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_empresa INT NOT NULL,
    id_venta INT NOT NULL,
    fecha_evento DATE NOT NULL,
    horario TIME NOT NULL,
    personas INT NOT NULL DEFAULT 1,
    tipo_desayuno VARCHAR(50) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_empresa) REFERENCES empresas(id),
    FOREIGN KEY (id_venta) REFERENCES ventas(id) ON DELETE CASCADE,
    UNIQUE KEY uk_venta (id_venta)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- 20. SERVICIOS DE CATERING ASOCIADOS A UNA VENTA (con multiempresa)
-- =====================================================
CREATE TABLE catering_service_ventas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_empresa INT NOT NULL,
    id_venta INT NOT NULL,
    id_tipo_servicio INT NOT NULL,
    subtotal_servicio DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_empresa) REFERENCES empresas(id),
    FOREIGN KEY (id_venta) REFERENCES ventas(id) ON DELETE CASCADE,
    FOREIGN KEY (id_tipo_servicio) REFERENCES catering_service_tipos(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- 21. DETALLE DE PRODUCTOS POR SERVICIO (con multiempresa)
-- =====================================================
CREATE TABLE catering_service_detalle (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_empresa INT NOT NULL,
    id_service_venta INT NOT NULL,
    id_producto_carta INT NOT NULL,
    cantidad INT NOT NULL,
    precio_unitario DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_empresa) REFERENCES empresas(id),
    FOREIGN KEY (id_service_venta) REFERENCES catering_service_ventas(id) ON DELETE CASCADE,
    FOREIGN KEY (id_producto_carta) REFERENCES catering_service_productos_carta(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- 22. MATERIALES UTILIZADOS EN UNA VENTA DE CATERING (con multiempresa)
-- =====================================================
CREATE TABLE catering_materiales_venta (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_empresa INT NOT NULL,
    id_venta INT NOT NULL,
    id_material_catalogo INT NOT NULL,
    cantidad INT NOT NULL,
    precio_unitario DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_empresa) REFERENCES empresas(id),
    FOREIGN KEY (id_venta) REFERENCES ventas(id) ON DELETE CASCADE,
    FOREIGN KEY (id_material_catalogo) REFERENCES catering_materiales_catalogo(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- 23. DEVOLUCIONES DE CATERING (específicas, con multiempresa)
-- =====================================================
CREATE TABLE catering_devoluciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_empresa INT NOT NULL,
    id_venta INT NOT NULL,
    fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    id_usuario INT NOT NULL,
    motivo TEXT NOT NULL,
    nota_credito VARCHAR(50) NOT NULL,
    monto DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_empresa) REFERENCES empresas(id),
    FOREIGN KEY (id_venta) REFERENCES ventas(id) ON DELETE CASCADE,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- 24. DETALLE DE DEVOLUCIONES DE CATERING (con multiempresa)
-- =====================================================
CREATE TABLE catering_detalle_devolucion (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_empresa INT NOT NULL,
    id_devolucion INT NOT NULL,
    tipo_item ENUM('servicio', 'material') NOT NULL,
    id_item INT NOT NULL COMMENT 'ID de catering_service_detalle o catering_materiales_venta',
    cantidad INT NOT NULL,
    monto DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_empresa) REFERENCES empresas(id),
    FOREIGN KEY (id_devolucion) REFERENCES catering_devoluciones(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- 25. RECETAS (con multiempresa)
-- =====================================================
CREATE TABLE recetas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_empresa INT NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT NULL,
    id_producto_carta INT NULL COMMENT 'Relación opcional con producto de carta (catering_service_productos_carta.id)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_empresa) REFERENCES empresas(id),
    FOREIGN KEY (id_producto_carta) REFERENCES catering_service_productos_carta(id) ON DELETE SET NULL,
    INDEX idx_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- 26. INGREDIENTES (con multiempresa)
-- =====================================================
CREATE TABLE ingredientes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_empresa INT NOT NULL,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    unidad VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_empresa) REFERENCES empresas(id),
    INDEX idx_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- 27. RECETA_INGREDIENTES (con multiempresa)
-- =====================================================
CREATE TABLE receta_ingredientes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_empresa INT NOT NULL,
    id_receta INT NOT NULL,
    id_ingrediente INT NOT NULL,
    cantidad_por_unidad DECIMAL(10,4) NOT NULL COMMENT 'Cantidad del ingrediente por unidad de producto final',
    id_proveedor INT NULL COMMENT 'Proveedor recomendado (id de personas con tipo proveedor)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_empresa) REFERENCES empresas(id),
    FOREIGN KEY (id_receta) REFERENCES recetas(id) ON DELETE CASCADE,
    FOREIGN KEY (id_ingrediente) REFERENCES ingredientes(id),
    FOREIGN KEY (id_proveedor) REFERENCES personas(id) ON DELETE SET NULL,
    UNIQUE KEY uk_receta_ingrediente (id_receta, id_ingrediente)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;