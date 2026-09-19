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
(1, 'cliente_natural', 'DNI', '00000000', 'VARIOS', ' ', ' ', '000000000'),
(2, 'cliente_natural', 'DNI', '00000000', 'VARIOS', ' ', ' ', '000000000'),
(1, 'proveedor', 'RUC', '10412743879', 'Panadería Central', NULL, 'panaderia@central.com', '995123456'),
(1, 'proveedor', 'RUC', '10412743880', 'Carnes Premium', NULL, 'carnes@premium.com', '995345678'),
(1, 'proveedor', 'RUC', '10412743881', 'Lácteos Andinos', NULL, 'lacteos@andinos.com', '995456789'),
(1, 'proveedor', 'RUC', '10412743882', 'Avícola San Fernando', NULL, 'avicola@sanfernando.com', '994123456'),
(1, 'proveedor', 'RUC', '10412743883', 'Frutas del Valle', NULL, 'frutas@valle.com', '999123456'),
(1, 'proveedor', 'RUC', '10412743884', 'Café Altura', NULL, 'cafe@altura.com', '998765432'),
(1, 'proveedor', 'RUC', '10412743885', 'Granos Andinos', NULL, 'granos@andinos.com', '997123456');

-- =====================================================
-- 4. USUARIOS
-- =====================================================
INSERT INTO usuarios (id_persona, usuario, password_hash, firma, id_rol) VALUES
(1, 'admin', SHA2(CONCAT('123456', @encryption_key), 256), NULL, 1);

-- =====================================================
-- 5. USUARIO - EMPRESA
-- =====================================================
INSERT INTO usuario_empresa (usuario_id, empresa_id, es_predeterminada)
SELECT 
    (SELECT id FROM usuarios WHERE usuario = 'admin'),
    id, 
    IF(ruc = '10412743879', 1, 0)
FROM empresas
WHERE ruc IN ('10412743879', '20613823027');

-- =====================================================
-- 6. CATEGORÍAS DE ALIMENTOS
-- =====================================================
INSERT INTO categorias_alimentos (id_empresa, nombre, descripcion) VALUES
(1, 'Lácteos', 'Leche, queso, yogurt y derivados'),
(1, 'Carnes Rojas', 'Carne de res, cerdo, cordero'),
(1, 'Panificados', 'Pan, pan de hamburguesa, productos de panadería'),
(1, 'Aves', 'Pollo, pavo y otras aves'),
(1, 'Frutas y Verduras', 'Frutas, verduras y hortalizas frescas'),
(1, 'Granos y Cereales', 'Quinoa, arroz, legumbres'),
(1, 'Bebidas', 'Café, jugos, infusiones');

-- =====================================================
-- 7. PROVEEDOR - CATEGORÍA
-- =====================================================
INSERT INTO proveedor_categoria (id_empresa, id_proveedor, id_categoria) VALUES
(1, (SELECT id FROM personas WHERE nombre = 'Lácteos Andinos'), (SELECT id FROM categorias_alimentos WHERE nombre = 'Lácteos')),
(1, (SELECT id FROM personas WHERE nombre = 'Carnes Premium'), (SELECT id FROM categorias_alimentos WHERE nombre = 'Carnes Rojas')),
(1, (SELECT id FROM personas WHERE nombre = 'Panadería Central'), (SELECT id FROM categorias_alimentos WHERE nombre = 'Panificados')),
(1, (SELECT id FROM personas WHERE nombre = 'Avícola San Fernando'), (SELECT id FROM categorias_alimentos WHERE nombre = 'Aves')),
(1, (SELECT id FROM personas WHERE nombre = 'Frutas del Valle'), (SELECT id FROM categorias_alimentos WHERE nombre = 'Frutas y Verduras')),
(1, (SELECT id FROM personas WHERE nombre = 'Granos Andinos'), (SELECT id FROM categorias_alimentos WHERE nombre = 'Granos y Cereales')),
(1, (SELECT id FROM personas WHERE nombre = 'Café Altura'), (SELECT id FROM categorias_alimentos WHERE nombre = 'Bebidas'));

-- =====================================================
-- 8. INGREDIENTES
-- =====================================================
INSERT INTO ingredientes (id_empresa, nombre, unidad, id_categoria) VALUES
(1, 'Pan', 'unidades', (SELECT id FROM categorias_alimentos WHERE nombre = 'Panificados')),
(1, 'Pan de hamburguesa', 'unidades', (SELECT id FROM categorias_alimentos WHERE nombre = 'Panificados')),
(1, 'Carne molida', 'kg', (SELECT id FROM categorias_alimentos WHERE nombre = 'Carnes Rojas')),
(1, 'Jamón', 'kg', (SELECT id FROM categorias_alimentos WHERE nombre = 'Carnes Rojas')),
(1, 'Queso', 'kg', (SELECT id FROM categorias_alimentos WHERE nombre = 'Lácteos')),
(1, 'Leche', 'kg', (SELECT id FROM categorias_alimentos WHERE nombre = 'Lácteos')),
(1, 'Pechuga de pollo', 'kg', (SELECT id FROM categorias_alimentos WHERE nombre = 'Aves')),
(1, 'Pimiento', 'kg', (SELECT id FROM categorias_alimentos WHERE nombre = 'Frutas y Verduras')),
(1, 'Lechuga', 'kg', (SELECT id FROM categorias_alimentos WHERE nombre = 'Frutas y Verduras')),
(1, 'Tomate', 'kg', (SELECT id FROM categorias_alimentos WHERE nombre = 'Frutas y Verduras')),
(1, 'Naranja', 'kg', (SELECT id FROM categorias_alimentos WHERE nombre = 'Frutas y Verduras')),
(1, 'Quinoa', 'kg', (SELECT id FROM categorias_alimentos WHERE nombre = 'Granos y Cereales')),
(1, 'Café en grano', 'kg', (SELECT id FROM categorias_alimentos WHERE nombre = 'Bebidas'));

-- =====================================================
-- 9. INGREDIENTE - PROVEEDOR
-- =====================================================
INSERT INTO ingrediente_proveedores (id_empresa, id_ingrediente, id_proveedor) VALUES
(1, (SELECT id FROM ingredientes WHERE nombre = 'Pan'), (SELECT id FROM personas WHERE nombre = 'Panadería Central')),
(1, (SELECT id FROM ingredientes WHERE nombre = 'Pan de hamburguesa'), (SELECT id FROM personas WHERE nombre = 'Panadería Central')),
(1, (SELECT id FROM ingredientes WHERE nombre = 'Carne molida'), (SELECT id FROM personas WHERE nombre = 'Carnes Premium')),
(1, (SELECT id FROM ingredientes WHERE nombre = 'Jamón'), (SELECT id FROM personas WHERE nombre = 'Carnes Premium')),
(1, (SELECT id FROM ingredientes WHERE nombre = 'Queso'), (SELECT id FROM personas WHERE nombre = 'Lácteos Andinos')),
(1, (SELECT id FROM ingredientes WHERE nombre = 'Leche'), (SELECT id FROM personas WHERE nombre = 'Lácteos Andinos')),
(1, (SELECT id FROM ingredientes WHERE nombre = 'Pechuga de pollo'), (SELECT id FROM personas WHERE nombre = 'Avícola San Fernando')),
(1, (SELECT id FROM ingredientes WHERE nombre = 'Pimiento'), (SELECT id FROM personas WHERE nombre = 'Frutas del Valle')),
(1, (SELECT id FROM ingredientes WHERE nombre = 'Lechuga'), (SELECT id FROM personas WHERE nombre = 'Frutas del Valle')),
(1, (SELECT id FROM ingredientes WHERE nombre = 'Tomate'), (SELECT id FROM personas WHERE nombre = 'Frutas del Valle')),
(1, (SELECT id FROM ingredientes WHERE nombre = 'Naranja'), (SELECT id FROM personas WHERE nombre = 'Frutas del Valle')),
(1, (SELECT id FROM ingredientes WHERE nombre = 'Quinoa'), (SELECT id FROM personas WHERE nombre = 'Granos Andinos')),
(1, (SELECT id FROM ingredientes WHERE nombre = 'Café en grano'), (SELECT id FROM personas WHERE nombre = 'Café Altura'));

-- =====================================================
-- 10. TIPOS DE SERVICIO
-- =====================================================
INSERT INTO catering_service_tipos (clave, nombre, descripcion) VALUES
('Corporativo', 'Corporativo Ejecutivo', 'Servicio corporativo con sándwiches premium y ensaladas'),
('Social', 'Social / Fiestas', 'Servicio para eventos sociales con mini hamburguesas y brochetas'),
('Desayuno', 'Desayuno Corporativo', 'Servicio de desayuno con café, tostadas y yogurt');

-- =====================================================
-- 11. RECETAS
-- =====================================================
INSERT INTO recetas (
    id_empresa, nombre, descripcion,
    categoria_receta, tipo_preparacion, cantidad_base, porciones_por_unidad,
    tiempo_preparacion, tiempo_coccion, dificultad, rendimiento,
    estado, created_by
) VALUES
(1, 'Sándwich Premium', 'Receta para sándwich premium',
    'plato_principal', 'por_unidad', 10, 1,
    15, 5, 'fácil', 95.00, 1, 'admin'),
(1, 'Mini Hamburguesas', 'Receta para mini hamburguesas',
    'plato_principal', 'por_unidad', 8, 1,
    20, 10, 'media', 95.00, 1, 'admin'),
(1, 'Brochetas de Pollo', 'Receta para brochetas de pollo',
    'plato_principal', 'por_unidad', 10, 1,
    25, 15, 'media', 90.00, 1, 'admin'),
(1, 'Jugo Natural', 'Receta para jugo natural',
    'bebida', 'por_lote', 1, 15,
    10, 0, 'fácil', 100.00, 1, 'admin'),
(1, 'Café Americano', 'Receta para café americano',
    'bebida', 'por_lote', 1, 15,
    5, 5, 'fácil', 100.00, 1, 'admin'),
(1, 'Ensalada de Quinoa', 'Receta para ensalada de quinoa',
    'entrada', 'por_lote', 1, 10,
    15, 0, 'fácil', 95.00, 1, 'admin'),
(1, 'Postre Variado', 'Receta para postre variado',
    'postre', 'por_unidad', 1, 1,
    20, 0, 'fácil', 100.00, 1, 'admin'),
(1, 'Tostada Francesa', 'Receta para tostada francesa',
    'entrada', 'por_unidad', 1, 1,
    10, 5, 'fácil', 100.00, 1, 'admin'),
(1, 'Yogurt con Granola', 'Receta para yogurt con granola',
    'entrada', 'por_unidad', 1, 1,
    5, 0, 'fácil', 100.00, 1, 'admin');

-- =====================================================
-- 12. RECETA - INGREDIENTES
-- =====================================================

-- Sándwich Premium
INSERT INTO receta_ingredientes (id_empresa, id_receta, id_ingrediente, cantidad_por_unidad, unidad, notas, es_opcional)
SELECT 1, r.id, i.id, 0.2, 'unidades', 'Pan artesanal, no industrial', 0
FROM recetas r, ingredientes i
WHERE r.nombre = 'Sándwich Premium' AND i.nombre = 'Pan';

INSERT INTO receta_ingredientes (id_empresa, id_receta, id_ingrediente, cantidad_por_unidad, unidad, notas, es_opcional)
SELECT 1, r.id, i.id, 0.005, 'kg', NULL, 0
FROM recetas r, ingredientes i
WHERE r.nombre = 'Sándwich Premium' AND i.nombre = 'Jamón';

INSERT INTO receta_ingredientes (id_empresa, id_receta, id_ingrediente, cantidad_por_unidad, unidad, notas, es_opcional)
SELECT 1, r.id, i.id, 0.004, 'kg', NULL, 0
FROM recetas r, ingredientes i
WHERE r.nombre = 'Sándwich Premium' AND i.nombre = 'Queso';

-- Mini Hamburguesas
INSERT INTO receta_ingredientes (id_empresa, id_receta, id_ingrediente, cantidad_por_unidad, unidad, notas, es_opcional)
SELECT 1, r.id, i.id, 0.125, 'unidades', NULL, 0
FROM recetas r, ingredientes i
WHERE r.nombre = 'Mini Hamburguesas' AND i.nombre = 'Pan de hamburguesa';

INSERT INTO receta_ingredientes (id_empresa, id_receta, id_ingrediente, cantidad_por_unidad, unidad, notas, es_opcional)
SELECT 1, r.id, i.id, 0.0125, 'kg', NULL, 0
FROM recetas r, ingredientes i
WHERE r.nombre = 'Mini Hamburguesas' AND i.nombre = 'Carne molida';

-- Brochetas de Pollo
INSERT INTO receta_ingredientes (id_empresa, id_receta, id_ingrediente, cantidad_por_unidad, unidad, notas, es_opcional)
SELECT 1, r.id, i.id, 0.01, 'kg', NULL, 0
FROM recetas r, ingredientes i
WHERE r.nombre = 'Brochetas de Pollo' AND i.nombre = 'Pechuga de pollo';

INSERT INTO receta_ingredientes (id_empresa, id_receta, id_ingrediente, cantidad_por_unidad, unidad, notas, es_opcional)
SELECT 1, r.id, i.id, 0.002, 'kg', 'Pimiento rojo', 1
FROM recetas r, ingredientes i
WHERE r.nombre = 'Brochetas de Pollo' AND i.nombre = 'Pimiento';

-- Jugo Natural
INSERT INTO receta_ingredientes (id_empresa, id_receta, id_ingrediente, cantidad_por_unidad, unidad, notas, es_opcional)
SELECT 1, r.id, i.id, 0.02, 'kg', 'Naranja de jugo', 0
FROM recetas r, ingredientes i
WHERE r.nombre = 'Jugo Natural' AND i.nombre = 'Naranja';

-- Café Americano
INSERT INTO receta_ingredientes (id_empresa, id_receta, id_ingrediente, cantidad_por_unidad, unidad, notas, es_opcional)
SELECT 1, r.id, i.id, 0.0013, 'kg', NULL, 0
FROM recetas r, ingredientes i
WHERE r.nombre = 'Café Americano' AND i.nombre = 'Café en grano';

-- Ensalada de Quinoa
INSERT INTO receta_ingredientes (id_empresa, id_receta, id_ingrediente, cantidad_por_unidad, unidad, notas, es_opcional)
SELECT 1, r.id, i.id, 0.015, 'kg', 'Quinoa lavada', 0
FROM recetas r, ingredientes i
WHERE r.nombre = 'Ensalada de Quinoa' AND i.nombre = 'Quinoa';

INSERT INTO receta_ingredientes (id_empresa, id_receta, id_ingrediente, cantidad_por_unidad, unidad, notas, es_opcional)
SELECT 1, r.id, i.id, 0.005, 'kg', NULL, 0
FROM recetas r, ingredientes i
WHERE r.nombre = 'Ensalada de Quinoa' AND i.nombre = 'Lechuga';

INSERT INTO receta_ingredientes (id_empresa, id_receta, id_ingrediente, cantidad_por_unidad, unidad, notas, es_opcional)
SELECT 1, r.id, i.id, 0.005, 'kg', NULL, 0
FROM recetas r, ingredientes i
WHERE r.nombre = 'Ensalada de Quinoa' AND i.nombre = 'Tomate';

-- =====================================================
-- 13. RECETA - PASOS
-- =====================================================

INSERT INTO receta_pasos (id_empresa, id_receta, orden, descripcion)
SELECT 1, r.id, 1, 'Cortar el pan por la mitad' FROM recetas r WHERE r.nombre = 'Sándwich Premium';
INSERT INTO receta_pasos (id_empresa, id_receta, orden, descripcion)
SELECT 1, r.id, 2, 'Untar mantequilla en ambas mitades' FROM recetas r WHERE r.nombre = 'Sándwich Premium';
INSERT INTO receta_pasos (id_empresa, id_receta, orden, descripcion)
SELECT 1, r.id, 3, 'Colocar jamón y queso' FROM recetas r WHERE r.nombre = 'Sándwich Premium';
INSERT INTO receta_pasos (id_empresa, id_receta, orden, descripcion)
SELECT 1, r.id, 4, 'Cerrar el sándwich y cortar en diagonal' FROM recetas r WHERE r.nombre = 'Sándwich Premium';

INSERT INTO receta_pasos (id_empresa, id_receta, orden, descripcion)
SELECT 1, r.id, 1, 'Lavar y cocinar la quinoa por 15 minutos' FROM recetas r WHERE r.nombre = 'Ensalada de Quinoa';
INSERT INTO receta_pasos (id_empresa, id_receta, orden, descripcion)
SELECT 1, r.id, 2, 'Picar la lechuga y el tomate en cubos' FROM recetas r WHERE r.nombre = 'Ensalada de Quinoa';
INSERT INTO receta_pasos (id_empresa, id_receta, orden, descripcion)
SELECT 1, r.id, 3, 'Mezclar todos los ingredientes y aderezar' FROM recetas r WHERE r.nombre = 'Ensalada de Quinoa';

-- =====================================================
-- 14. PRODUCTOS DE CARTA
-- =====================================================

-- Tipo 1: Corporativo Ejecutivo
INSERT INTO catering_service_productos_carta (id_tipo_servicio, id_receta, precio) VALUES
(1, (SELECT id FROM recetas WHERE nombre = 'Sándwich Premium'), 18.00),
(1, (SELECT id FROM recetas WHERE nombre = 'Ensalada de Quinoa'), 22.00),
(1, (SELECT id FROM recetas WHERE nombre = 'Jugo Natural'), 9.00),
(1, (SELECT id FROM recetas WHERE nombre = 'Café Americano'), 7.00);

-- Tipo 2: Social / Fiestas
INSERT INTO catering_service_productos_carta (id_tipo_servicio, id_receta, precio) VALUES
(2, (SELECT id FROM recetas WHERE nombre = 'Mini Hamburguesas'), 15.00),
(2, (SELECT id FROM recetas WHERE nombre = 'Brochetas de Pollo'), 20.00),
(2, (SELECT id FROM recetas WHERE nombre = 'Postre Variado'), 12.00);

-- Tipo 3: Desayuno Corporativo
INSERT INTO catering_service_productos_carta (id_tipo_servicio, id_receta, precio) VALUES
(3, (SELECT id FROM recetas WHERE nombre = 'Café Americano'), 8.00),
(3, (SELECT id FROM recetas WHERE nombre = 'Tostada Francesa'), 12.00),
(3, (SELECT id FROM recetas WHERE nombre = 'Yogurt con Granola'), 10.00);

-- =====================================================
-- 15. MATERIALES DE CATÁLOGO
-- =====================================================
INSERT INTO catering_materiales_catalogo (nombre, precio) VALUES
('Plato Cerámico (x10)', 45.00),
('Vaso Vidrio (x12)', 28.00),
('Cubiertos Acero (set x20)', 35.00),
('Mantelería Elegante', 60.00),
('Mesa Plegable (unidad)', 85.00),
('Silla Estándar (unidad)', 12.00);

-- =====================================================
-- 16. INVENTARIO
-- =====================================================
INSERT INTO catering_items (id_empresa, nombre, stock, tipo, registrado_por) VALUES
(1, 'Harina de trigo', 28, 'materia prima', 1),
(1, 'Batidora planetaria', 2, 'utensilio', 1),
(1, 'Azúcar morena', 45, 'materia prima', 1);

-- =====================================================
-- 17. POSTRES
-- =====================================================
INSERT INTO postres (id_empresa, nombre, precio) VALUES
(1, 'Cheesecake', 6.2),
(1, 'Brownies', 6);

INSERT INTO lotes (id_empresa, postre_id, stock, fecha_vencimiento, dias_duracion, fecha_registro, registrado_por) VALUES
(1, 1, 12, DATE_ADD(CURDATE(), INTERVAL 5 DAY), 5, CURDATE(), 1),
(1, 1, 6, DATE_ADD(CURDATE(), INTERVAL 12 DAY), 12, CURDATE(), 1),
(1, 2, 8, DATE_ADD(CURDATE(), INTERVAL -2 DAY), -2, CURDATE(), 1);

-- =====================================================
-- 18. VENTA DE PRUEBA CATERING (CON DIRECCIÓN Y FLUJO)
-- =====================================================
SET @cliente_catering = (SELECT id FROM personas WHERE numero_documento = '12345678' AND id_empresa = 1 LIMIT 1);
SET @usuario_catering = (SELECT id FROM usuarios WHERE usuario = 'admin' LIMIT 1);

-- Venta principal
INSERT INTO ventas (id_empresa, numero, fecha, id_cliente, id_usuario, subtotal, descuento, igv, total, metodo_pago, estado)
VALUES (1, 'V-00001', '2026-08-21 20:38:04', @cliente_catering, @usuario_catering, 0.00, 0.00, 0.00, 0.00, 'EFECTIVO', 'completada');

SET @venta_cat = LAST_INSERT_ID();

-- ✅ Evento CON dirección, mozo y estado de flujo (CORREGIDO: compra_pendiente)
INSERT INTO catering_eventos (
    id_empresa, id_venta, fecha_evento, horario, personas, tipo_desayuno,
    direccion, referencia,
    incluir_mozo, cantidad_mozos, precio_mozo, subtotal_mozo,
    estado_flujo, estado_actualizado_por, estado_actualizado_at, observaciones
) VALUES (
    1, @venta_cat, DATE_ADD(CURDATE(), INTERVAL 3 DAY), '12:00:00', 20, 'Clásico',
    'Av. Los Álamos 123, Miraflores', 'Frente al parque central',
    1, 1, 100.00, 100.00,
    'compra_pendiente', @usuario_catering, NOW(), 'Venta creada, enviada a almacén'
);

SET @evento_id = LAST_INSERT_ID();

-- ✅ Historial de cambio de estado (CORREGIDO: compra_pendiente)
INSERT INTO catering_evento_historial 
(id_empresa, id_evento, estado_anterior, estado_nuevo, id_usuario, observaciones)
VALUES 
(1, @evento_id, NULL, 'compra_pendiente', @usuario_catering, 'Venta creada, enviada a almacén');

-- ✅ Etapa 1: Verificación de almacén (pendiente)
INSERT INTO catering_evento_etapas 
(id_empresa, id_evento, etapa, tiempo_estimado_min)
VALUES 
(1, @evento_id, 'verificacion_almacen', 20);

-- ✅ Etapas 2-7: Todas las etapas creadas desde el inicio
INSERT INTO catering_evento_etapas 
(id_empresa, id_evento, etapa, tiempo_estimado_min)
VALUES 
(1, @evento_id, 'preparacion_cocina', 90),
(1, @evento_id, 'carga_transporte', 30),
(1, @evento_id, 'montaje_evento', 45),
(1, @evento_id, 'recojo_evento', 30),
(1, @evento_id, 'retorno_empresa', 15),
(1, @evento_id, 'cierre', 5);

-- ✅ Checklist específico de almacén
INSERT INTO catering_evento_checklist 
(id_empresa, id_evento, etapa, item, categoria, tipo_referencia, 
 cantidad_requerida, unidad, cantidad_stock, cantidad_faltante, proveedores, orden)
VALUES 
(1, @evento_id, 'verificacion_almacen', 'Pan', 'ingrediente', 'ingrediente',
    2, 'unidades', 30, 0, 
    JSON_ARRAY('Panadería Central - 995123456'), 1),
(1, @evento_id, 'verificacion_almacen', 'Jamón', 'ingrediente', 'ingrediente',
    0.05, 'kg', 5, 0, 
    JSON_ARRAY('Carnes Premium - 995345678'), 2),
(1, @evento_id, 'verificacion_almacen', 'Queso', 'ingrediente', 'ingrediente',
    0.04, 'kg', 3, 0, 
    JSON_ARRAY('Lácteos Andinos - 995456789'), 3),
(1, @evento_id, 'verificacion_almacen', 'Café en grano', 'ingrediente', 'ingrediente',
    0.02, 'kg', 1, 0, 
    JSON_ARRAY('Café Altura - 998765432'), 4),
(1, @evento_id, 'verificacion_almacen', 'Plato Cerámico (x10)', 'material', 'material',
    2, 'unidades', 10, 0, 
    JSON_ARRAY('Proveedor de materiales - 999888777'), 5),
(1, @evento_id, 'verificacion_almacen', 'Cubiertos Acero (set x20)', 'material', 'material',
    1, 'set', 5, 0, 
    JSON_ARRAY('Proveedor de materiales - 999888777'), 6);

-- =====================================================
-- 19. SERVICIOS Y PRODUCTOS DE LA VENTA
-- =====================================================

-- Servicio Corporativo
INSERT INTO catering_service_ventas (id_empresa, id_venta, id_tipo_servicio, subtotal_servicio)
VALUES (1, @venta_cat, 1, 0.00);
SET @serv_cat_1 = LAST_INSERT_ID();

INSERT INTO catering_service_detalle (id_empresa, id_service_venta, id_producto_carta, cantidad, precio_unitario, subtotal)
VALUES 
(1, @serv_cat_1, 
    (SELECT pc.id FROM catering_service_productos_carta pc 
     JOIN recetas r ON pc.id_receta = r.id 
     WHERE r.nombre = 'Sándwich Premium' AND pc.id_tipo_servicio = 1 LIMIT 1),
    10, 18.00, 180.00),
(1, @serv_cat_1, 
    (SELECT pc.id FROM catering_service_productos_carta pc 
     JOIN recetas r ON pc.id_receta = r.id 
     WHERE r.nombre = 'Café Americano' AND pc.id_tipo_servicio = 1 LIMIT 1),
    15, 7.00, 105.00);

UPDATE catering_service_ventas SET subtotal_servicio = 285.00 WHERE id = @serv_cat_1;

-- Servicio Social
INSERT INTO catering_service_ventas (id_empresa, id_venta, id_tipo_servicio, subtotal_servicio)
VALUES (1, @venta_cat, 2, 0.00);
SET @serv_cat_2 = LAST_INSERT_ID();

INSERT INTO catering_service_detalle (id_empresa, id_service_venta, id_producto_carta, cantidad, precio_unitario, subtotal)
VALUES 
(1, @serv_cat_2, 
    (SELECT pc.id FROM catering_service_productos_carta pc 
     JOIN recetas r ON pc.id_receta = r.id 
     WHERE r.nombre = 'Mini Hamburguesas' AND pc.id_tipo_servicio = 2 LIMIT 1),
    8, 15.00, 120.00),
(1, @serv_cat_2, 
    (SELECT pc.id FROM catering_service_productos_carta pc 
     JOIN recetas r ON pc.id_receta = r.id 
     WHERE r.nombre = 'Brochetas de Pollo' AND pc.id_tipo_servicio = 2 LIMIT 1),
    10, 20.00, 200.00);

UPDATE catering_service_ventas SET subtotal_servicio = 320.00 WHERE id = @serv_cat_2;

-- Materiales
INSERT INTO catering_materiales_venta (id_empresa, id_venta, id_material_catalogo, cantidad, precio_unitario, subtotal)
VALUES 
(1, @venta_cat, 1, 2, 45.00, 90.00),
(1, @venta_cat, 3, 1, 35.00, 35.00);

-- Calcular totales
SET @subtotal_cat = (SELECT COALESCE(SUM(subtotal_servicio),0) FROM catering_service_ventas WHERE id_venta = @venta_cat)
                  + (SELECT COALESCE(SUM(subtotal),0) FROM catering_materiales_venta WHERE id_venta = @venta_cat)
                  + (SELECT COALESCE(subtotal_mozo,0) FROM catering_eventos WHERE id_venta = @venta_cat);

SET @igv_cat = @subtotal_cat * 0.18;
SET @total_cat = @subtotal_cat + @igv_cat;

UPDATE ventas 
SET subtotal = @subtotal_cat,
    igv = @igv_cat,
    total = @total_cat
WHERE id = @venta_cat;

-- Historial y actividad
INSERT INTO historial (entidad, id_entidad, accion, descripcion, usuario)
VALUES ('ventas', @venta_cat, 'CREACIÓN', 'Venta de catering creada', 'admin');

INSERT INTO actividad (modulo, accion, detalle, usuario)
VALUES ('catering', 'VENTA', CONCAT('Venta ', (SELECT numero FROM ventas WHERE id = @venta_cat), ' - Total S/', @total_cat), 'admin');

-- =====================================================
-- VERIFICACIÓN FINAL
-- =====================================================
SELECT 
    id, personas, direccion, referencia,
    incluir_mozo, cantidad_mozos, subtotal_mozo,
    estado_flujo, estado_actualizado_at
FROM catering_eventos WHERE id = @evento_id;

SELECT estado_anterior, estado_nuevo, observaciones, created_at
FROM catering_evento_historial WHERE id_evento = @evento_id;

SELECT etapa, hora_inicio, hora_fin, tiempo_estimado_min, completada
FROM catering_evento_etapas WHERE id_evento = @evento_id;

SELECT etapa, item, cantidad_requerida, unidad, verificado
FROM catering_evento_checklist WHERE id_evento = @evento_id ORDER BY orden;

SELECT id, numero, subtotal, igv, total FROM ventas WHERE id = @venta_cat;