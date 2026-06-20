-- =====================================================
-- SISTEMA DE EVENTOS Y CATERING
-- INSTALACIÓN DE BASE DE DATOS
-- =====================================================
-- Eliminar base de datos si existe y crearla nuevamente
DROP DATABASE IF EXISTS sistema_eventos_catering;
CREATE DATABASE sistema_eventos_catering;
USE sistema_eventos_catering;

-- Clave de encriptación (usada para hash de contraseñas y otros cifrados)
SET @encryption_key = SHA2('ClaveSeguraParaEventosPeru2024!', 256);

-- =====================================================
-- 1. EMPRESAS
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
-- 2. USUARIOS
-- =====================================================
CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash CHAR(64) NOT NULL COMMENT 'Hash SHA-256 con la clave de encriptación',
    nombre_completo VARCHAR(100),
    estado TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_usuario (usuario),
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- 3. RELACIÓN USUARIO - EMPRESA
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
-- 4. DATOS INICIALES
-- =====================================================
-- Insertar tus dos empresas existentes
INSERT INTO empresas (ruc, nombre, creado_por) VALUES
                     ('10412743879', 'DeliciaAli', NULL),
                     ('20613823027', 'DELICIAS ALI S.A.C.', NULL);

-- Insertar un usuario de prueba (contraseña: 123456)
-- La contraseña se guarda como SHA2(CONCAT('123456', @encryption_key))
INSERT INTO usuarios (usuario, email, password_hash, nombre_completo) VALUES
                     ('admin', 'admin@deliciasali.com', SHA2(CONCAT('123456', @encryption_key), 256), 'Administrador del Sistema');

-- Asignar el usuario a ambas empresas, marcando la primera como predeterminada
INSERT INTO usuario_empresa (usuario_id, empresa_id, es_predeterminada)
SELECT 
    (SELECT id FROM usuarios WHERE usuario = 'admin'),
    id,
    IF(ruc = '10412743879', 1, 0)
FROM empresas
WHERE ruc IN ('10412743879', '20613823027');

-- =====================================================
-- 5. CONSULTA DE PRUEBA (opcional)
-- =====================================================
-- Verificar que el usuario tenga acceso a las empresas
SELECT 
    u.usuario,
    u.email,
    e.ruc,
    e.nombre AS empresa_nombre,
    ue.es_predeterminada
FROM usuarios u
JOIN usuario_empresa ue ON u.id = ue.usuario_id
JOIN empresas e ON ue.empresa_id = e.id
WHERE u.usuario = 'admin';

-- =====================================================
-- 6. MOSTRAR RESUMEN DE INSTALACIÓN
-- =====================================================
SELECT '========================================' AS '';
SELECT '✅ BASE DE DATOS INSTALADA CORRECTAMENTE' AS mensaje;
SELECT '========================================' AS '';
SELECT CONCAT('📊 Empresas: ', (SELECT COUNT(*) FROM empresas)) AS info;
SELECT CONCAT('👤 Usuarios: ', (SELECT COUNT(*) FROM usuarios)) AS info;
SELECT CONCAT('🔗 Usuario-Empresa: ', (SELECT COUNT(*) FROM usuario_empresa)) AS info;
SELECT '========================================' AS '';