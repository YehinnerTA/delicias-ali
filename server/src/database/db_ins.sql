-- =====================================================
-- DATOS INICIALES
-- =====================================================
USE sistema_eventos_catering;

-- =====================================================
-- 1. ROLES
-- =====================================================
INSERT INTO roles (nombre, descripcion) VALUES
('Administrador', 'Acceso total al sistema'),
('Chef', 'Gestion de cocina y recetas'),
('Cajero', 'Gestion de ventas y pagos'),
('Logistica', 'Gestion de inventario y proveedores');

-- =====================================================
-- 2. EMPRESAS
-- =====================================================
INSERT INTO empresas (ruc, nombre, creado_por) VALUES
('10412743879', 'DeliciaAli', 'SISTEMA'),
('20613823027', 'DELICIAS ALI S.A.C.', 'SISTEMA');

-- =====================================================
-- 3. PERSONAS
-- =====================================================
INSERT INTO personas (id_empresa, tipo_persona, tipo_documento, numero_documento, nombre, apellido, email, celular) VALUES
(1, 'empleado', 'DNI', '12345678', 'Administrador', 'Del Sistema', 'admin@deliciasali.com', '911111111'),
(1, 'empleado', 'DNI', '10000002', 'María', 'López', 'chef@deliciasali.com', '911111112'),
(1, 'empleado', 'DNI', '10000003', 'Jorge', 'Ramírez', 'cajero@deliciasali.com', '911111113'),
(1, 'empleado', 'DNI', '10000004', 'Andrea', 'Torres', 'logistica@deliciasali.com', '911111114'),
(1, 'cliente_natural', 'DNI', '00000000', 'VARIOS', ' ', ' ', '000000000'),
(2, 'cliente_natural', 'DNI', '00000000', 'VARIOS', ' ', ' ', '000000000');

-- =====================================================
-- 4. USUARIOS
-- =====================================================
INSERT INTO usuarios (id_persona, usuario, password_hash, firma, id_rol) VALUES
(1, 'admin', SHA2(CONCAT('123456', @encryption_key), 256), NULL, 1),
(2, 'chef', SHA2(CONCAT('123456', @encryption_key), 256), NULL, 2),
(3, 'cajero', SHA2(CONCAT('123456', @encryption_key), 256), NULL, 3),
(4, 'logistica', SHA2(CONCAT('123456', @encryption_key), 256), NULL, 4);

-- =====================================================
-- 5. USUARIO - EMPRESA
-- =====================================================
INSERT INTO usuario_empresa (usuario_id, empresa_id, es_predeterminada)
SELECT u.id, e.id, IF(e.ruc = '10412743879', 1, 0)
FROM usuarios u
CROSS JOIN empresas e;