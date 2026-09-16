-- =====================================================
-- SISTEMA DE EVENTOS Y CATERING
-- =====================================================

-- Eliminar base de datos si existe y crearla nuevamente
DROP DATABASE IF EXISTS sistema_eventos_catering;
CREATE DATABASE sistema_eventos_catering;
USE sistema_eventos_catering;

-- Clave de encriptación
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
    estado TINYINT(1) DEFAULT 1,
    creado_por INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_ruc (ruc)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- 3. PERSONAS
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
-- 4. USUARIOS
-- =====================================================
CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_persona INT NOT NULL,
    usuario VARCHAR(50) NOT NULL UNIQUE,
    password_hash CHAR(64) NOT NULL,
    firma VARCHAR(255) NULL,
    id_rol INT NOT NULL DEFAULT 1,
    estado TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_persona) REFERENCES personas(id) ON DELETE CASCADE,
    FOREIGN KEY (id_rol) REFERENCES roles(id),
    INDEX idx_usuario (usuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- 5. USUARIO - EMPRESA
-- =====================================================
CREATE TABLE usuario_empresa (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    empresa_id INT NOT NULL,
    es_predeterminada TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
    UNIQUE KEY uk_usuario_empresa (usuario_id, empresa_id),
    INDEX idx_usuario (usuario_id),
    INDEX idx_empresa (empresa_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- 6. HISTORIAL
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
-- 7. ACTIVIDAD
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
-- 8. CATEGORÍAS DE ALIMENTOS
-- =====================================================
CREATE TABLE categorias_alimentos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_empresa INT NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_empresa) REFERENCES empresas(id),
    INDEX idx_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- 9. PROVEEDOR - CATEGORÍA
-- =====================================================
CREATE TABLE proveedor_categoria (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_empresa INT NOT NULL,
    id_proveedor INT NOT NULL,
    id_categoria INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_empresa) REFERENCES empresas(id),
    FOREIGN KEY (id_proveedor) REFERENCES personas(id) ON DELETE CASCADE,
    FOREIGN KEY (id_categoria) REFERENCES categorias_alimentos(id) ON DELETE CASCADE,
    UNIQUE KEY uk_proveedor_categoria (id_proveedor, id_categoria),
    INDEX idx_proveedor (id_proveedor),
    INDEX idx_categoria (id_categoria)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- 10. INSUMOS Y UTENSILIOS (Inventario)
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
    dias_vida_util INT NULL,
    precio_compra DECIMAL(10,2) NULL,
    id_proveedor INT NULL,
    registrado_por INT NOT NULL,
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
-- 11. LOTES INSUMOS
-- =====================================================
CREATE TABLE catering_lotes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_empresa INT NOT NULL,
    id_item INT NOT NULL,
    stock INT NOT NULL DEFAULT 0,
    fecha_vencimiento DATE NULL,
    dias_vida_util INT NULL,
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
-- 12. POSTRES
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
-- 13. LOTES POSTRES
-- =====================================================
CREATE TABLE lotes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_empresa INT NOT NULL,
    postre_id INT NOT NULL,
    stock INT NOT NULL DEFAULT 0,
    fecha_vencimiento DATE NOT NULL,
    dias_duracion INT NOT NULL,
    descartado TINYINT(1) DEFAULT 0,
    fecha_registro DATE NOT NULL,
    registrado_por INT NOT NULL,
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
-- 14. VENTAS
-- =====================================================
CREATE TABLE ventas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_empresa INT NOT NULL,
    numero VARCHAR(20) NOT NULL UNIQUE,
    fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    id_cliente INT NOT NULL,
    id_usuario INT NOT NULL,
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
-- 15. DETALLE VENTAS
-- =====================================================
CREATE TABLE detalle_venta (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_empresa INT NOT NULL,
    id_venta INT NOT NULL,
    id_lote INT NOT NULL,
    nombre_producto VARCHAR(100) NOT NULL,
    precio_unitario DECIMAL(10,2) NOT NULL,
    cantidad INT NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (id_empresa) REFERENCES empresas(id),
    FOREIGN KEY (id_venta) REFERENCES ventas(id) ON DELETE CASCADE,
    FOREIGN KEY (id_lote) REFERENCES lotes(id),
    INDEX idx_venta (id_venta)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- 16. DEVOLUCIONES
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
-- 17. DETALLE DEVOLUCIONES
-- =====================================================
CREATE TABLE detalle_devolucion (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_empresa INT NOT NULL,
    id_devolucion INT NOT NULL,
    id_detalle_venta INT NOT NULL,
    cantidad INT NOT NULL,
    FOREIGN KEY (id_empresa) REFERENCES empresas(id),
    FOREIGN KEY (id_devolucion) REFERENCES devoluciones(id) ON DELETE CASCADE,
    FOREIGN KEY (id_detalle_venta) REFERENCES detalle_venta(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- 18. CATÁLOGO TIPOS DE SERVICIO CATERING
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
-- 19. INGREDIENTES
-- =====================================================
CREATE TABLE ingredientes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_empresa INT NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    unidad VARCHAR(20) NOT NULL,
    id_categoria INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_empresa) REFERENCES empresas(id),
    FOREIGN KEY (id_categoria) REFERENCES categorias_alimentos(id) ON DELETE SET NULL,
    INDEX idx_nombre (nombre),
    INDEX idx_categoria (id_categoria)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- 20. RECETAS
-- =====================================================
CREATE TABLE recetas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_empresa INT NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT NULL,
    categoria_receta ENUM('entrada', 'plato_principal', 'postre', 'bebida', 'salsa', 'panificado') DEFAULT 'plato_principal',
    tipo_preparacion ENUM('por_unidad', 'por_molde', 'por_lote') DEFAULT 'por_unidad',
    cantidad_base DECIMAL(10,2) NOT NULL DEFAULT 1,
    porciones_por_unidad INT NOT NULL DEFAULT 1,
    porciones_total INT GENERATED ALWAYS AS (cantidad_base * porciones_por_unidad) STORED,
    tiempo_preparacion INT NULL,
    tiempo_coccion INT NULL,
    dificultad ENUM('fácil', 'media', 'difícil') DEFAULT 'media',
    rendimiento DECIMAL(5,2) DEFAULT 100.00,
    costo_estimado DECIMAL(10,2) NULL,
    estado TINYINT(1) DEFAULT 1,
    created_by VARCHAR(100) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_empresa) REFERENCES empresas(id),
    INDEX idx_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- 21. RECETA - INGREDIENTES
-- =====================================================
CREATE TABLE receta_ingredientes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_empresa INT NOT NULL,
    id_receta INT NOT NULL,
    id_ingrediente INT NOT NULL,
    cantidad_por_unidad DECIMAL(10,4) NOT NULL,
    unidad VARCHAR(20) NOT NULL,
    notas TEXT NULL,
    es_opcional TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_empresa) REFERENCES empresas(id),
    FOREIGN KEY (id_receta) REFERENCES recetas(id) ON DELETE CASCADE,
    FOREIGN KEY (id_ingrediente) REFERENCES ingredientes(id),
    UNIQUE KEY uk_receta_ingrediente (id_receta, id_ingrediente)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- 22. RECETA - PASOS
-- =====================================================
CREATE TABLE receta_pasos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_empresa INT NOT NULL,
    id_receta INT NOT NULL,
    orden INT NOT NULL,
    descripcion TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_empresa) REFERENCES empresas(id),
    FOREIGN KEY (id_receta) REFERENCES recetas(id) ON DELETE CASCADE,
    INDEX idx_receta (id_receta),
    UNIQUE KEY uk_receta_orden (id_receta, orden)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- 23. INGREDIENTE - PROVEEDORES
-- =====================================================
CREATE TABLE ingrediente_proveedores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_empresa INT NOT NULL,
    id_ingrediente INT NOT NULL,
    id_proveedor INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_empresa) REFERENCES empresas(id),
    FOREIGN KEY (id_ingrediente) REFERENCES ingredientes(id) ON DELETE CASCADE,
    FOREIGN KEY (id_proveedor) REFERENCES personas(id) ON DELETE CASCADE,
    UNIQUE KEY uk_ingrediente_proveedor (id_ingrediente, id_proveedor),
    INDEX idx_ingrediente (id_ingrediente),
    INDEX idx_proveedor (id_proveedor)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- 24. PRODUCTOS CARTA (ahora sí puede referenciar recetas)
-- =====================================================
CREATE TABLE catering_service_productos_carta (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_tipo_servicio INT NOT NULL,
    id_receta INT NOT NULL,
    precio DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_tipo_servicio) REFERENCES catering_service_tipos(id) ON DELETE CASCADE,
    FOREIGN KEY (id_receta) REFERENCES recetas(id) ON DELETE CASCADE,
    INDEX idx_tipo (id_tipo_servicio),
    INDEX idx_receta (id_receta)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- 25. CATÁLOGO MATERIALES
-- =====================================================
CREATE TABLE catering_materiales_catalogo (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    precio DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- 26. EVENTOS CATERING
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
-- 27. SERVICIOS CATERING VENTAS
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
-- 28. DETALLE SERVICIOS CATERING
-- =====================================================
CREATE TABLE catering_service_detalle (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_empresa INT NOT NULL,
    id_service_venta INT NOT NULL,
    id_producto_carta INT NOT NULL,
    cantidad INT NOT NULL,
    precio_unitario DECIMAL(10 , 2 ) NOT NULL,
    subtotal DECIMAL(10 , 2 ) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_empresa)
        REFERENCES empresas (id),
    FOREIGN KEY (id_service_venta)
        REFERENCES catering_service_ventas (id)
        ON DELETE CASCADE,
    FOREIGN KEY (id_producto_carta)
        REFERENCES catering_service_productos_carta (id)
)  ENGINE=INNODB DEFAULT CHARSET=UTF8MB4;

-- =====================================================
-- 29. MATERIALES VENTA CATERING
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
-- 30. DEVOLUCIONES CATERING
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
-- 31. DETALLE DEVOLUCIONES CATERING
-- =====================================================
CREATE TABLE catering_detalle_devolucion (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_empresa INT NOT NULL,
    id_devolucion INT NOT NULL,
    tipo_item ENUM('servicio', 'material') NOT NULL,
    id_item INT NOT NULL,
    cantidad INT NOT NULL,
    monto DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_empresa) REFERENCES empresas(id),
    FOREIGN KEY (id_devolucion) REFERENCES catering_devoluciones(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;