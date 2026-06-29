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

-- Clave de encriptación (usada para hash de contraseñas)
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

INSERT INTO roles (nombre, descripcion) VALUES
                  ('Administrador', 'Acceso total al sistema'),
                  ('Chef', 'Gestion de cocina y recetas'),
                  ('Cajero', 'Gestion de ventas y pagos'),
                  ('Logistica', 'Gestion de inventario y proveedores');

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
-- 5. RELACIÓN USUARIO - EMPRESA
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