-- =====================================================
-- DATOS INICIALES (maestros y pruebas)
-- =====================================================
USE sistema_eventos_catering;

-- Insertar roles
INSERT INTO roles (nombre, descripcion) VALUES
                  ('Administrador', 'Acceso total al sistema'),
                  ('Chef', 'Gestion de cocina y recetas'),
                  ('Cajero', 'Gestion de ventas y pagos'),
                  ('Logistica', 'Gestion de inventario y proveedores');

-- Insertar empresas
INSERT INTO empresas (ruc, nombre, creado_por) VALUES
                     ('10412743879', 'DeliciaAli', 'SISTEMA'),
                     ('20613823027', 'DELICIAS ALI S.A.C.', 'SISTEMA');

-- Insertar la persona "Administrador del Sistema" (empresa 1)
INSERT INTO personas (id_empresa, tipo_persona, tipo_documento, numero_documento, nombre, apellido, email, celular) VALUES
                     (1, 'empleado', 'DNI', '12345678', 'Administrador', 'Del Sistema', 'admin@deliciasali.com', '911111111'),
                     (1, 'cliente_natural', 'DNI', '00000000', 'VARIOS', ' ', ' ', '000000000'),
                     (2, 'cliente_natural', 'DNI', '00000000', 'VARIOS', ' ', ' ', '000000000'),
                     (1, 'proveedor', 'RUC', '10412743879', 'Panadería Central', NULL, 'panaderia@central.com', '995123456'),
                     (1, 'proveedor', 'RUC', '10412743880', 'Carnes Premium', NULL, 'carnes@premium.com', '995345678'),
                     (1, 'proveedor', 'RUC', '10412743881', 'Lácteos Andinos', NULL, 'lacteos@andinos.com', '995456789'),
                     (1, 'proveedor', 'RUC', '10412743882', 'Avícola San Fernando', NULL, 'avicola@sanfernando.com', '994123456'),
                     (1, 'proveedor', 'RUC', '10412743883', 'Frutas del Valle', NULL, 'frutas@valle.com', '999123456'),
                     (1, 'proveedor', 'RUC', '10412743884', 'Café Altura', NULL, 'cafe@altura.com', '998765432'),
                     (1, 'proveedor', 'RUC', '10412743885', 'Granos Andinos', NULL, 'granos@andinos.com', '997123456');
                     
-- Insertar el usuario asociado a esa persona (contraseña: 123456)
INSERT INTO usuarios (id_persona, usuario, password_hash, firma, id_rol) VALUES
                     (1, 'admin', SHA2(CONCAT('123456', @encryption_key), 256), NULL, 1);

-- Asignar el usuario a ambas empresas, marcando la primera como predeterminada
INSERT INTO usuario_empresa (usuario_id, empresa_id, es_predeterminada)
SELECT 
    (SELECT id FROM usuarios WHERE usuario = 'admin'),
    id, 
    IF(ruc = '10412743879', 1, 0)
FROM empresas
WHERE ruc IN ('10412743879', '20613823027');

-- Insertar datos de inventory (insumos y utensilios) - empresa 1
INSERT INTO catering_items (id_empresa, nombre, stock, tipo, registrado_por) VALUES
(1, 'Harina de trigo', 28, 'materia prima', 1),
(1, 'Batidora planetaria', 2, 'utensilio', 1),
(1, 'Azúcar morena', 45, 'materia prima', 1);

-- Insertar postres (para ventas generales) - empresa 1
INSERT INTO postres (id_empresa, nombre, precio) VALUES
(1, 'Cheesecake', 6.2),
(1, 'Brownies', 6);

-- Insertar lotes (para ventas generales) - empresa 1
INSERT INTO lotes (id_empresa, postre_id, stock, fecha_vencimiento, dias_duracion, fecha_registro, registrado_por) VALUES
(1, 1, 12, DATE_ADD(CURDATE(), INTERVAL 5 DAY), 5, CURDATE(), 1),
(1, 1, 6, DATE_ADD(CURDATE(), INTERVAL 12 DAY), 12, CURDATE(), 1),
(1, 2, 8, DATE_ADD(CURDATE(), INTERVAL -2 DAY), -2, CURDATE(), 1);

-- =====================================================
-- DATOS MAESTROS PARA CATERING (globales, sin empresa)
-- =====================================================

-- Insertar tipos de servicio (globales, se comparten entre empresas)
INSERT INTO catering_service_tipos (clave, nombre, descripcion) VALUES
('Corporativo', 'Corporativo Ejecutivo', 'Servicio corporativo con sándwiches premium y ensaladas'),
('Social', 'Social / Fiestas', 'Servicio para eventos sociales con mini hamburguesas y brochetas'),
('Desayuno', 'Desayuno Corporativo', 'Servicio de desayuno con café, tostadas y yogurt');

-- Insertar productos de carta para cada tipo (globales)
INSERT INTO catering_service_productos_carta (id_tipo_servicio, nombre, precio) VALUES
(1, 'Sándwich Premium', 18.00),
(1, 'Ensalada de Quinoa', 22.00),
(1, 'Jugo Natural', 9.00),
(1, 'Café Americano', 7.00),
(2, 'Mini Hamburguesas', 15.00),
(2, 'Brochetas de Pollo', 20.00),
(2, 'Postre Variado', 12.00),
(3, 'Café Americano', 8.00),
(3, 'Tostada Francesa', 12.00),
(3, 'Yogurt con Granola', 10.00);

-- Insertar materiales de catálogo (globales)
INSERT INTO catering_materiales_catalogo (nombre, precio) VALUES
('Plato Cerámico (x10)', 45.00),
('Vaso Vidrio (x12)', 28.00),
('Cubiertos Acero (set x20)', 35.00),
('Mantelería Elegante', 60.00),
('Mesa Plegable (unidad)', 85.00),
('Silla Estándar (unidad)', 12.00);

-- =====================================================
-- INSERTS DE PRUEBA PARA VENTAS DE CATERING (empresa 1)
-- =====================================================

-- 1. Cliente de prueba (empresa 1)
SET @cliente_catering = (SELECT id FROM personas WHERE numero_documento = '12345678' AND id_empresa = 1 LIMIT 1);
SET @usuario_catering = (SELECT id FROM usuarios WHERE usuario = 'admin' LIMIT 1);

-- Insertar una venta de catering (cabecera en ventas) - empresa 1
INSERT INTO ventas (id_empresa, numero, fecha, id_cliente, id_usuario, subtotal, descuento, igv, total, metodo_pago, estado)
VALUES (1, 'V-00001', '2026-08-21 20:38:04', @cliente_catering, @usuario_catering, 0.00, 0.00, 0.00, 0.00, 'EFECTIVO', 'completada');

SET @venta_cat = LAST_INSERT_ID();

-- Insertar datos del evento - empresa 1
INSERT INTO catering_eventos (id_empresa, id_venta, fecha_evento, horario, personas, tipo_desayuno)
VALUES (1, @venta_cat, DATE_ADD(CURDATE(), INTERVAL 3 DAY), '12:00:00', 20, 'Clásico');

-- Insertar servicios asociados a la venta - empresa 1
-- Servicio Corporativo (id_tipo_servicio = 1)
INSERT INTO catering_service_ventas (id_empresa, id_venta, id_tipo_servicio, subtotal_servicio)
VALUES (1, @venta_cat, 1, 0.00);
SET @serv_cat_1 = LAST_INSERT_ID();

-- Detalle del servicio: Sándwich Premium (id_producto_carta = 1) y Café Americano (id = 4) - empresa 1
INSERT INTO catering_service_detalle (id_empresa, id_service_venta, id_producto_carta, cantidad, precio_unitario, subtotal)
VALUES 
(1, @serv_cat_1, 1, 10, 18.00, 180.00),
(1, @serv_cat_1, 4, 15, 7.00, 105.00);

-- Actualizar subtotal del servicio
UPDATE catering_service_ventas SET subtotal_servicio = 285.00 WHERE id = @serv_cat_1;

-- Servicio Social (id_tipo_servicio = 2) - empresa 1
INSERT INTO catering_service_ventas (id_empresa, id_venta, id_tipo_servicio, subtotal_servicio)
VALUES (1, @venta_cat, 2, 0.00);
SET @serv_cat_2 = LAST_INSERT_ID();

-- Detalle: Mini Hamburguesas (id = 5) y Brochetas (id = 6) - empresa 1
INSERT INTO catering_service_detalle (id_empresa, id_service_venta, id_producto_carta, cantidad, precio_unitario, subtotal)
VALUES 
(1, @serv_cat_2, 5, 8, 15.00, 120.00),
(1, @serv_cat_2, 6, 10, 20.00, 200.00);

UPDATE catering_service_ventas SET subtotal_servicio = 320.00 WHERE id = @serv_cat_2;

-- Insertar materiales de la venta - empresa 1
INSERT INTO catering_materiales_venta (id_empresa, id_venta, id_material_catalogo, cantidad, precio_unitario, subtotal)
VALUES 
(1, @venta_cat, 1, 2, 45.00, 90.00),
(1, @venta_cat, 3, 1, 35.00, 35.00);

-- Calcular totales de la venta
SET @subtotal_cat = (SELECT COALESCE(SUM(subtotal_servicio),0) FROM catering_service_ventas WHERE id_venta = @venta_cat)
                  + (SELECT COALESCE(SUM(subtotal),0) FROM catering_materiales_venta WHERE id_venta = @venta_cat);
SET @igv_cat = @subtotal_cat * 0.18;
SET @total_cat = @subtotal_cat + @igv_cat;

UPDATE ventas 
SET subtotal = @subtotal_cat,
    igv = @igv_cat,
    total = @total_cat
WHERE id = @venta_cat;

-- Registrar historial y actividad
INSERT INTO historial (entidad, id_entidad, accion, descripcion, usuario)
VALUES ('ventas', @venta_cat, 'CREACIÓN', 'Venta de catering creada', 'admin');

INSERT INTO actividad (modulo, accion, detalle, usuario)
VALUES ('catering', 'VENTA', CONCAT('Venta ', (SELECT numero FROM ventas WHERE id = @venta_cat), ' - Total S/', @total_cat), 'admin');

-- =====================================================
-- DATOS DE PROVEEDORES, INGREDIENTES Y RECETAS (empresa 1)
-- =====================================================

-- Insertar ingredientes - empresa 1
INSERT INTO ingredientes (id_empresa, nombre, unidad) VALUES
(1, 'Pan', 'unidades'),
(1, 'Jamón', 'kg'),
(1, 'Queso', 'kg'),
(1, 'Pechuga de pollo', 'kg'),
(1, 'Pimiento', 'kg'),
(1, 'Naranja', 'kg'),
(1, 'Café en grano', 'kg'),
(1, 'Quinoa', 'kg'),
(1, 'Lechuga', 'kg'),
(1, 'Tomate', 'kg'),
(1, 'Carne molida', 'kg'),
(1, 'Pan de hamburguesa', 'unidades');

-- Insertar recetas - empresa 1
INSERT INTO recetas (id_empresa, nombre, descripcion, id_producto_carta) VALUES
(1, 'Sándwich Premium', 'Receta para sándwich premium', 1),
(1, 'Mini Hamburguesas', 'Receta para mini hamburguesas', 5),
(1, 'Brochetas de Pollo', 'Receta para brochetas de pollo', 6),
(1, 'Jugo Natural', 'Receta para jugo natural', 3),
(1, 'Café Americano', 'Receta para café americano', 4),
(1, 'Ensalada de Quinoa', 'Receta para ensalada de quinoa', 2);

-- Asignar ingredientes a recetas (empresa 1)
INSERT INTO receta_ingredientes (id_empresa, id_receta, id_ingrediente, cantidad_por_unidad, id_proveedor)
SELECT 1, r.id, i.id, 2.0000, p.id
FROM recetas r, ingredientes i, personas p
WHERE r.id_empresa = 1 AND i.id_empresa = 1 AND p.id_empresa = 1
AND r.nombre = 'Sándwich Premium' AND i.nombre = 'Pan' AND p.nombre = 'Panadería Central' LIMIT 1;

INSERT INTO receta_ingredientes (id_empresa, id_receta, id_ingrediente, cantidad_por_unidad, id_proveedor)
SELECT 1, r.id, i.id, 0.0500, p.id
FROM recetas r, ingredientes i, personas p
WHERE r.id_empresa = 1 AND i.id_empresa = 1 AND p.id_empresa = 1
AND r.nombre = 'Sándwich Premium' AND i.nombre = 'Jamón' AND p.nombre = 'Carnes Premium' LIMIT 1;

INSERT INTO receta_ingredientes (id_empresa, id_receta, id_ingrediente, cantidad_por_unidad, id_proveedor)
SELECT 1, r.id, i.id, 0.0400, p.id
FROM recetas r, ingredientes i, personas p
WHERE r.id_empresa = 1 AND i.id_empresa = 1 AND p.id_empresa = 1
AND r.nombre = 'Sándwich Premium' AND i.nombre = 'Queso' AND p.nombre = 'Lácteos Andinos' LIMIT 1;

INSERT INTO receta_ingredientes (id_empresa, id_receta, id_ingrediente, cantidad_por_unidad, id_proveedor)
SELECT 1, r.id, i.id, 1.0000, p.id
FROM recetas r, ingredientes i, personas p
WHERE r.id_empresa = 1 AND i.id_empresa = 1 AND p.id_empresa = 1
AND r.nombre = 'Mini Hamburguesas' AND i.nombre = 'Pan de hamburguesa' AND p.nombre = 'Panadería Central' LIMIT 1;

INSERT INTO receta_ingredientes (id_empresa, id_receta, id_ingrediente, cantidad_por_unidad, id_proveedor)
SELECT 1, r.id, i.id, 0.1000, p.id
FROM recetas r, ingredientes i, personas p
WHERE r.id_empresa = 1 AND i.id_empresa = 1 AND p.id_empresa = 1
AND r.nombre = 'Mini Hamburguesas' AND i.nombre = 'Carne molida' AND p.nombre = 'Carnes Premium' LIMIT 1;

INSERT INTO receta_ingredientes (id_empresa, id_receta, id_ingrediente, cantidad_por_unidad, id_proveedor)
SELECT 1, r.id, i.id, 0.1000, p.id
FROM recetas r, ingredientes i, personas p
WHERE r.id_empresa = 1 AND i.id_empresa = 1 AND p.id_empresa = 1
AND r.nombre = 'Brochetas de Pollo' AND i.nombre = 'Pechuga de pollo' AND p.nombre = 'Avícola San Fernando' LIMIT 1;

INSERT INTO receta_ingredientes (id_empresa, id_receta, id_ingrediente, cantidad_por_unidad, id_proveedor)
SELECT 1, r.id, i.id, 0.0200, p.id
FROM recetas r, ingredientes i, personas p
WHERE r.id_empresa = 1 AND i.id_empresa = 1 AND p.id_empresa = 1
AND r.nombre = 'Brochetas de Pollo' AND i.nombre = 'Pimiento' AND p.nombre = 'Frutas del Valle' LIMIT 1;

INSERT INTO receta_ingredientes (id_empresa, id_receta, id_ingrediente, cantidad_por_unidad, id_proveedor)
SELECT 1, r.id, i.id, 0.3000, p.id
FROM recetas r, ingredientes i, personas p
WHERE r.id_empresa = 1 AND i.id_empresa = 1 AND p.id_empresa = 1
AND r.nombre = 'Jugo Natural' AND i.nombre = 'Naranja' AND p.nombre = 'Frutas del Valle' LIMIT 1;

INSERT INTO receta_ingredientes (id_empresa, id_receta, id_ingrediente, cantidad_por_unidad, id_proveedor)
SELECT 1, r.id, i.id, 0.0200, p.id
FROM recetas r, ingredientes i, personas p
WHERE r.id_empresa = 1 AND i.id_empresa = 1 AND p.id_empresa = 1
AND r.nombre = 'Café Americano' AND i.nombre = 'Café en grano' AND p.nombre = 'Café Altura' LIMIT 1;

INSERT INTO receta_ingredientes (id_empresa, id_receta, id_ingrediente, cantidad_por_unidad, id_proveedor)
SELECT 1, r.id, i.id, 0.1500, p.id
FROM recetas r, ingredientes i, personas p
WHERE r.id_empresa = 1 AND i.id_empresa = 1 AND p.id_empresa = 1
AND r.nombre = 'Ensalada de Quinoa' AND i.nombre = 'Quinoa' AND p.nombre = 'Granos Andinos' LIMIT 1;

INSERT INTO receta_ingredientes (id_empresa, id_receta, id_ingrediente, cantidad_por_unidad, id_proveedor)
SELECT 1, r.id, i.id, 0.0500, p.id
FROM recetas r, ingredientes i, personas p
WHERE r.id_empresa = 1 AND i.id_empresa = 1 AND p.id_empresa = 1
AND r.nombre = 'Ensalada de Quinoa' AND i.nombre = 'Lechuga' AND p.nombre = 'Frutas del Valle' LIMIT 1;

INSERT INTO receta_ingredientes (id_empresa, id_receta, id_ingrediente, cantidad_por_unidad, id_proveedor)
SELECT 1, r.id, i.id, 0.0500, p.id
FROM recetas r, ingredientes i, personas p
WHERE r.id_empresa = 1 AND i.id_empresa = 1 AND p.id_empresa = 1
AND r.nombre = 'Ensalada de Quinoa' AND i.nombre = 'Tomate' AND p.nombre = 'Frutas del Valle' LIMIT 1;

-- =====================================================
-- VERIFICACIÓN
-- =====================================================
SELECT * FROM ventas WHERE id = @venta_cat;
SELECT * FROM catering_eventos WHERE id_venta = @venta_cat;
SELECT * FROM catering_service_ventas WHERE id_venta = @venta_cat;