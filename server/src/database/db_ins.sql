USE sistema_eventos_catering;

-- =====================================================
-- 1. ROLES
-- =====================================================
INSERT INTO roles (nombre, descripcion) VALUES
('Administrador', 'Acceso total al sistema'),
('Vendedor', 'Gestión de ventas y clientes'),
('Cocinero', 'Gestión de preparación de recetas'),
('Almacenero', 'Gestión de inventario y stock'),
('Repartidor', 'Gestión de transporte y entrega de eventos');

-- =====================================================
-- 2. EMPRESAS
-- =====================================================
INSERT INTO empresas (id, ruc, nombre, estado, creado_por) VALUES
(1, '20512345678', 'Catering Delicias Peruanas SAC', 1, NULL),
(2, '20698765432', 'Eventos y Sabores EIRL', 1, NULL),
(3, '20456789123', 'Tienda Gourmet Express SAC', 1, NULL);

-- =====================================================
-- 3. PERSONAS (proveedores, clientes naturales, jurídicos, empleados)
-- =====================================================
INSERT INTO personas (id, id_empresa, tipo_persona, tipo_documento, numero_documento, razon_social, nombre, apellido, email, celular, estado) VALUES
-- Empleados (usuarios)
(1, 1, 'empleado', 'DNI', '45678912', NULL, 'Carlos', 'Mendoza Ríos', 'carlos.mendoza@catering.pe', '987654321', 1),
(2, 1, 'empleado', 'DNI', '45678913', NULL, 'María', 'López Fernández', 'maria.lopez@catering.pe', '987654322', 1),
(3, 1, 'empleado', 'DNI', '45678914', NULL, 'José', 'Ramírez Torres', 'jose.ramirez@catering.pe', '987654323', 1),
(4, 1, 'empleado', 'DNI', '45678915', NULL, 'Ana', 'García Paredes', 'ana.garcia@catering.pe', '987654324', 1),
(5, 1, 'empleado', 'DNI', '45678916', NULL, 'Luis', 'Quispe Huamán', 'luis.quispe@catering.pe', '987654325', 1),
-- Proveedores
(6, 1, 'proveedor', 'RUC', '20123456789', 'Distribuidora La Fresa SAC', NULL, NULL, 'ventas@lafresa.pe', '988111222', 1),
(7, 1, 'proveedor', 'RUC', '20987654321', 'Carnes Premium del Sur SAC', NULL, NULL, 'contacto@carnespremium.pe', '988333444', 1),
(8, 1, 'proveedor', 'RUC', '20445566778', 'Abarrotes El Sol EIRL', NULL, NULL, 'pedidos@abarrotessel.pe', '988555666', 1),
-- Clientes naturales
(9, 1, 'cliente_natural', 'DNI', '12345678', NULL, 'Patricia', 'Vega Salazar', 'patricia.vega@gmail.com', '999111222', 1),
(10, 1, 'cliente_natural', 'DNI', '87654321', NULL, 'Ricardo', 'Palma Ortiz', 'ricardo.palma@gmail.com', '999333444', 1),
-- Clientes jurídicos
(11, 1, 'cliente_juridico', 'RUC', '20556677889', 'Corporación Andina SAC', NULL, NULL, 'eventos@andina.com.pe', '999555666', 1),
(12, 1, 'cliente_juridico', 'RUC', '20778899001', 'Constructora Lima Norte SAC', NULL, NULL, 'rrhh@limanorte.pe', '999777888', 1),
-- Empleados empresa 2
(13, 2, 'empleado', 'DNI', '45678917', NULL, 'Pedro', 'Sánchez Luna', 'pedro.sanchez@sabores.pe', '987654326', 1),
(14, 2, 'empleado', 'DNI', '45678918', NULL, 'Lucía', 'Rojas Campos', 'lucia.rojas@sabores.pe', '987654327', 1),
-- Empleados empresa 3
(15, 3, 'empleado', 'DNI', '45678919', NULL, 'Diego', 'Herrera Ponce', 'diego.herrera@gourmet.pe', '987654328', 1);

-- =====================================================
-- 4. USUARIOS (hash fijo, sin variables de sesión)
-- =====================================================
INSERT INTO usuarios (id, id_persona, usuario, password_hash, firma, id_rol, estado) VALUES
(1, 1, 'cmendoza', SHA2(CONCAT('admin123', SHA2('ClaveSeguraParaEventosPeru2024!', 256)), 256), 'Carlos Mendoza - Administrador', 1, 1),
(2, 2, 'mlopez',   SHA2(CONCAT('vende123', SHA2('ClaveSeguraParaEventosPeru2024!', 256)), 256), 'María López - Vendedora', 2, 1),
(3, 3, 'jramirez', SHA2(CONCAT('cocina123', SHA2('ClaveSeguraParaEventosPeru2024!', 256)), 256), 'José Ramírez - Cocinero', 3, 1),
(4, 4, 'agarcia',  SHA2(CONCAT('almacen123', SHA2('ClaveSeguraParaEventosPeru2024!', 256)), 256), 'Ana García - Almacenera', 4, 1),
(5, 5, 'lquispe',  SHA2(CONCAT('reparto123', SHA2('ClaveSeguraParaEventosPeru2024!', 256)), 256), 'Luis Quispe - Repartidor', 5, 1),
(6, 13, 'psanchez', SHA2(CONCAT('admin456', SHA2('ClaveSeguraParaEventosPeru2024!', 256)), 256), 'Pedro Sánchez - Admin E2', 1, 1),
(7, 14, 'lrojas',   SHA2(CONCAT('vende456', SHA2('ClaveSeguraParaEventosPeru2024!', 256)), 256), 'Lucía Rojas - Vendedora E2', 2, 1),
(8, 15, 'dherrera', SHA2(CONCAT('admin789', SHA2('ClaveSeguraParaEventosPeru2024!', 256)), 256), 'Diego Herrera - Admin E3', 1, 1);

-- =====================================================
-- 5. USUARIO - EMPRESA
-- =====================================================
INSERT INTO usuario_empresa (usuario_id, empresa_id, es_predeterminada) VALUES
(1, 1, 1),
(2, 1, 1),
(3, 1, 1),
(4, 1, 1),
(5, 1, 1),
(6, 2, 1),
(7, 2, 1),
(8, 3, 1);

-- =====================================================
-- 6. HISTORIAL
-- =====================================================
INSERT INTO historial (entidad, id_entidad, accion, descripcion, usuario, fecha) VALUES
('personas', 1, 'CREAR', 'Se creó la persona Carlos Mendoza Ríos', 'cmendoza', '2024-06-01 09:00:00'),
('usuarios', 1, 'CREAR', 'Se creó el usuario cmendoza', 'cmendoza', '2024-06-01 09:05:00'),
('empresas', 1, 'CREAR', 'Se registró la empresa Catering Delicias Peruanas SAC', 'cmendoza', '2024-06-01 09:10:00'),
('ventas', 1, 'CREAR', 'Se registró la venta V-0001 por S/ 550.00', 'mlopez', '2024-06-15 10:30:00'),
('catering_items', 1, 'ACTUALIZAR', 'Se actualizó el stock del ítem Aceite Vegetal', 'agarcia', '2024-06-16 11:00:00'),
('catering_eventos', 1, 'ESTADO', 'Evento cambió a estado en_preparacion', 'jramirez', '2024-06-20 08:00:00');

-- =====================================================
-- 7. ACTIVIDAD
-- =====================================================
INSERT INTO actividad (modulo, accion, detalle, usuario, timestamp) VALUES
('Login', 'INICIO_SESION', 'El usuario cmendoza inició sesión', 'cmendoza', '2024-06-01 08:55:00'),
('Ventas', 'CREAR_VENTA', 'Se registró la venta V-0001', 'mlopez', '2024-06-15 10:30:00'),
('Inventario', 'ACTUALIZAR_STOCK', 'Se actualizó stock del ítem ID 1 a 50', 'agarcia', '2024-06-16 11:00:00'),
('Eventos', 'CAMBIO_ESTADO', 'Evento ID 1 pasó a en_preparacion', 'jramirez', '2024-06-20 08:00:00'),
('Recetas', 'CREAR_RECETA', 'Se creó la receta Sándwich de Pollo', 'jramirez', '2024-06-10 14:00:00');

-- =====================================================
-- 8. CATEGORÍAS DE ALIMENTOS
-- =====================================================
INSERT INTO categorias_alimentos (id, id_empresa, nombre, descripcion) VALUES
(1, 1, 'Carnes y Aves', 'Pollo, res, cerdo y derivados'),
(2, 1, 'Verduras y Hortalizas', 'Vegetales frescos'),
(3, 1, 'Lácteos', 'Leche, queso, mantequilla'),
(4, 1, 'Abarrotes', 'Productos secos y enlatados'),
(5, 1, 'Panadería', 'Panes y masas'),
(6, 1, 'Bebidas', 'Jugos, gaseosas, agua'),
(7, 1, 'Postres', 'Dulces y tortas');

-- =====================================================
-- 9. PROVEEDOR - CATEGORÍA
-- =====================================================
INSERT INTO proveedor_categoria (id_empresa, id_proveedor, id_categoria) VALUES
(1, 6, 2),  -- Distribuidora La Fresa -> Verduras
(1, 6, 3),  -- Distribuidora La Fresa -> Lácteos
(1, 7, 1),  -- Carnes Premium -> Carnes
(1, 8, 4),  -- Abarrotes El Sol -> Abarrotes
(1, 8, 5);  -- Abarrotes El Sol -> Panadería

-- =====================================================
-- 10. CATERING ITEMS (Insumos y Utensilios)
-- =====================================================
INSERT INTO catering_items (id, id_empresa, nombre, stock, tipo, unidad_medida, tiene_vencimiento, fecha_vencimiento, dias_vida_util, precio_compra, id_proveedor, registrado_por) VALUES
(1, 1, 'Aceite Vegetal', 50, 'materia prima', 'litro', 1, '2025-12-31', 365, 8.50, 8, 4),
(2, 1, 'Harina de Trigo', 80, 'materia prima', 'kg', 1, '2025-10-15', 180, 4.20, 8, 4),
(3, 1, 'Pechuga de Pollo', 30, 'materia prima', 'kg', 1, '2024-07-10', 5, 15.00, 7, 4),
(4, 1, 'Tomate', 25, 'materia prima', 'kg', 1, '2024-07-05', 7, 3.50, 6, 4),
(5, 1, 'Leche Entera', 40, 'materia prima', 'litro', 1, '2024-08-01', 30, 4.80, 6, 4),
(6, 1, 'Vajilla de Porcelana', 200, 'utensilio', 'unidad', 0, NULL, NULL, 12.00, NULL, 4),
(7, 1, 'Copas de Vidrio', 150, 'utensilio', 'unidad', 0, NULL, NULL, 6.50, NULL, 4),
(8, 1, 'Mantel Blanco', 60, 'utensilio', 'unidad', 0, NULL, NULL, 25.00, NULL, 4),
(9, 1, 'Azúcar Rubia', 35, 'materia prima', 'kg', 1, '2025-06-30', 365, 4.00, 8, 4),
(10, 1, 'Queso Fresco', 20, 'materia prima', 'kg', 1, '2024-07-20', 15, 18.00, 6, 4);

-- =====================================================
-- 11. CATERING LOTES
-- =====================================================
INSERT INTO catering_lotes (id, id_empresa, id_item, stock, fecha_vencimiento, dias_vida_util, fecha_registro, registrado_por, descartado) VALUES
(1, 1, 1, 30, '2025-12-31', 365, '2024-06-01', 4, 0),
(2, 1, 1, 20, '2025-11-30', 300, '2024-06-10', 4, 0),
(3, 1, 2, 50, '2025-10-15', 180, '2024-06-05', 4, 0),
(4, 1, 3, 15, '2024-07-10', 5, '2024-07-05', 4, 0),
(5, 1, 3, 15, '2024-07-12', 5, '2024-07-07', 4, 0),
(6, 1, 4, 25, '2024-07-05', 7, '2024-06-28', 4, 0),
(7, 1, 5, 40, '2024-08-01', 30, '2024-07-02', 4, 0),
(8, 1, 9, 35, '2025-06-30', 365, '2024-06-01', 4, 0),
(9, 1, 10, 20, '2024-07-20', 15, '2024-07-05', 4, 0),
(10, 1, 2, 30, '2025-09-30', 180, '2024-07-01', 4, 0);

-- =====================================================
-- 12. POSTRES
-- =====================================================
INSERT INTO postres (id, id_empresa, nombre, precio) VALUES
(1, 1, 'Torta de Chocolate', 8.50),
(2, 1, 'Cheesecake de Fresa', 9.00),
(3, 1, 'Alfajor de Manjar', 3.50),
(4, 1, 'Mazamorra Morada', 4.00),
(5, 1, 'Flan de Vainilla', 5.50);

-- =====================================================
-- 13. LOTES (POSTRES)
-- =====================================================
INSERT INTO lotes (id, id_empresa, postre_id, stock, fecha_vencimiento, dias_duracion, descartado, fecha_registro, registrado_por) VALUES
(1, 1, 1, 20, '2024-07-15', 7, 0, '2024-07-08', 4),
(2, 1, 2, 15, '2024-07-14', 5, 0, '2024-07-09', 4),
(3, 1, 3, 30, '2024-07-20', 10, 0, '2024-07-10', 4),
(4, 1, 4, 25, '2024-07-13', 3, 0, '2024-07-10', 4),
(5, 1, 5, 18, '2024-07-16', 6, 0, '2024-07-10', 4),
(6, 1, 1, 10, '2024-07-22', 7, 0, '2024-07-15', 4);

-- =====================================================
-- 14. VENTAS
-- =====================================================
INSERT INTO ventas (id, id_empresa, numero, fecha, id_cliente, id_usuario, subtotal, descuento, igv, total, metodo_pago, estado) VALUES
(1, 1, 'V-0001', '2024-06-15 10:30:00', 9, 2, 550.00, 0.00, 99.00, 649.00, 'EFECTIVO', 'completada'),
(2, 1, 'V-0002', '2024-06-18 14:20:00', 11, 2, 1200.00, 50.00, 207.00, 1357.00, 'TARJETA', 'completada'),
(3, 1, 'V-0003', '2024-06-20 09:15:00', 10, 2, 320.00, 0.00, 57.60, 377.60, 'YAPE', 'completada'),
(4, 1, 'V-0004', '2024-06-25 16:00:00', 12, 2, 800.00, 0.00, 144.00, 944.00, 'PLIN', 'completada'),
(5, 1, 'V-0005', '2024-07-01 11:45:00', 9, 2, 250.00, 0.00, 45.00, 295.00, 'EFECTIVO', 'completada'),
(6, 1, 'V-0006', '2024-07-05 13:00:00', 11, 2, 600.00, 0.00, 108.00, 708.00, 'TARJETA', 'anulada');

-- =====================================================
-- 15. DETALLE VENTA
-- =====================================================
INSERT INTO detalle_venta (id, id_empresa, id_venta, id_lote, nombre_producto, precio_unitario, cantidad, subtotal) VALUES
(1, 1, 1, 1, 'Torta de Chocolate', 8.50, 20, 170.00),
(2, 1, 1, 2, 'Cheesecake de Fresa', 9.00, 15, 135.00),
(3, 1, 1, 3, 'Alfajor de Manjar', 3.50, 30, 105.00),
(4, 1, 1, 4, 'Mazamorra Morada', 4.00, 25, 100.00),
(5, 1, 1, 5, 'Flan de Vainilla', 5.50, 18, 99.00),
(6, 1, 2, 1, 'Torta de Chocolate', 8.50, 40, 340.00),
(7, 1, 2, 2, 'Cheesecake de Fresa', 9.00, 30, 270.00),
(8, 1, 2, 6, 'Torta de Chocolate', 8.50, 10, 85.00),
(9, 1, 3, 3, 'Alfajor de Manjar', 3.50, 40, 140.00),
(10, 1, 3, 5, 'Flan de Vainilla', 5.50, 20, 110.00),
(11, 1, 4, 4, 'Mazamorra Morada', 4.00, 30, 120.00),
(12, 1, 4, 2, 'Cheesecake de Fresa', 9.00, 20, 180.00),
(13, 1, 5, 3, 'Alfajor de Manjar', 3.50, 25, 87.50),
(14, 1, 5, 1, 'Torta de Chocolate', 8.50, 15, 127.50),
(15, 1, 6, 4, 'Mazamorra Morada', 4.00, 20, 80.00);

-- =====================================================
-- 16. DEVOLUCIONES
-- =====================================================
INSERT INTO devoluciones (id, id_empresa, id_venta, fecha, id_usuario, motivo, nota_credito, monto) VALUES
(1, 1, 6, '2024-07-06 10:00:00', 1, 'El cliente solicitó anular la venta por cambio de fecha', 'NC-0001', 708.00),
(2, 1, 3, '2024-06-22 09:00:00', 2, 'Producto en mal estado (postre vencido)', 'NC-0002', 44.00);

-- =====================================================
-- 17. DETALLE DEVOLUCIÓN
-- =====================================================
INSERT INTO detalle_devolucion (id, id_empresa, id_devolucion, id_detalle_venta, cantidad) VALUES
(1, 1, 1, 15, 20),
(2, 1, 2, 10, 4);

-- =====================================================
-- 18. CATÁLOGO TIPOS DE SERVICIO CATERING
-- =====================================================
INSERT INTO catering_service_tipos (id, clave, nombre, descripcion) VALUES
(1, 'desayuno', 'Desayuno', 'Servicio de desayuno completo'),
(2, 'almuerzo', 'Almuerzo', 'Servicio de almuerzo con entrada, plato y postre'),
(3, 'cena', 'Cena', 'Servicio de cena formal'),
(4, 'coffee_break', 'Coffee Break', 'Refrigerio ligero para reuniones'),
(5, 'buffet', 'Buffet', 'Servicio tipo buffet variado');

-- =====================================================
-- 19. INGREDIENTES
-- =====================================================
INSERT INTO ingredientes (id, id_empresa, nombre, unidad, id_categoria) VALUES
(1, 1, 'Pechuga de Pollo', 'kg', 1),
(2, 1, 'Tomate', 'kg', 2),
(3, 1, 'Harina de Trigo', 'kg', 4),
(4, 1, 'Leche Entera', 'litro', 3),
(5, 1, 'Queso Fresco', 'kg', 3),
(6, 1, 'Azúcar Rubia', 'kg', 4),
(7, 1, 'Aceite Vegetal', 'litro', 4),
(8, 1, 'Pan de Molde', 'unidad', 5),
(9, 1, 'Lechuga', 'kg', 2),
(10, 1, 'Huevo', 'unidad', 1);

-- =====================================================
-- 20. RECETAS
-- =====================================================
INSERT INTO recetas (id, id_empresa, nombre, descripcion, categoria_receta, tipo_preparacion, cantidad_base, porciones_por_unidad, tiempo_preparacion, tiempo_coccion, dificultad, rendimiento, costo_estimado, estado, created_by) VALUES
(1, 1, 'Sándwich de Pollo', 'Sándwich de pollo deshilachado con lechuga y tomate', 'entrada', 'por_unidad', 10, 1, 15, 10, 'fácil', 100.00, 25.00, 1, 'jramirez'),
(2, 1, 'Ensalada Fresca', 'Ensalada de lechuga y tomate con aderezo', 'entrada', 'por_unidad', 5, 1, 10, 0, 'fácil', 100.00, 12.00, 1, 'jramirez'),
(3, 1, 'Pollo a la Plancha', 'Pechuga de pollo a la plancha con guarnición', 'plato_principal', 'por_unidad', 8, 1, 20, 15, 'media', 95.00, 45.00, 1, 'jramirez'),
(4, 1, 'Queque de Vainilla', 'Queque esponjoso de vainilla para 12 porciones', 'postre', 'por_molde', 1, 12, 25, 40, 'media', 90.00, 30.00, 1, 'jramirez'),
(5, 1, 'Jugo de Naranja', 'Jugo natural de naranja', 'bebida', 'por_lote', 20, 1, 10, 0, 'fácil', 100.00, 18.00, 1, 'jramirez');

-- =====================================================
-- 21. RECETA - INGREDIENTES
-- =====================================================
INSERT INTO receta_ingredientes (id, id_empresa, id_receta, id_ingrediente, cantidad_por_unidad, unidad, notas, es_opcional) VALUES
(1, 1, 1, 1, 0.1000, 'kg', 'Pollo deshilachado', 0),
(2, 1, 1, 8, 2.0000, 'unidad', 'Pan de molde', 0),
(3, 1, 1, 9, 0.0200, 'kg', 'Lechuga fresca', 0),
(4, 1, 1, 2, 0.0300, 'kg', 'Tomate en rodajas', 0),
(5, 1, 2, 9, 0.0500, 'kg', 'Lechuga', 0),
(6, 1, 2, 2, 0.0800, 'kg', 'Tomate', 0),
(7, 1, 3, 1, 0.2000, 'kg', 'Pechuga de pollo', 0),
(8, 1, 3, 7, 0.0200, 'litro', 'Aceite para plancha', 0),
(9, 1, 4, 3, 0.5000, 'kg', 'Harina', 0),
(10, 1, 4, 6, 0.3000, 'kg', 'Azúcar', 0),
(11, 1, 4, 10, 3.0000, 'unidad', 'Huevos', 0),
(12, 1, 5, 6, 0.0500, 'kg', 'Azúcar opcional', 1);

-- =====================================================
-- 22. RECETA - PASOS
-- =====================================================
INSERT INTO receta_pasos (id, id_empresa, id_receta, orden, descripcion) VALUES
(1, 1, 1, 1, 'Cocinar y deshilachar la pechuga de pollo.'),
(2, 1, 1, 2, 'Cortar el pan de molde por la mitad.'),
(3, 1, 1, 3, 'Lavar y cortar la lechuga y el tomate.'),
(4, 1, 1, 4, 'Armar el sándwich con el pollo, lechuga y tomate.'),
(5, 1, 2, 1, 'Lavar la lechuga y el tomate.'),
(6, 1, 2, 2, 'Cortar en trozos y mezclar con aderezo.'),
(7, 1, 3, 1, 'Sazonar la pechuga de pollo.'),
(8, 1, 3, 2, 'Calentar la plancha con aceite.'),
(9, 1, 3, 3, 'Cocinar el pollo por ambos lados hasta dorar.'),
(10, 1, 4, 1, 'Mezclar harina, azúcar y huevos.'),
(11, 1, 4, 2, 'Batir hasta obtener masa homogénea.'),
(12, 1, 4, 3, 'Hornear a 180°C por 40 minutos.'),
(13, 1, 5, 1, 'Exprimir las naranjas.'),
(14, 1, 5, 2, 'Endulzar al gusto y servir frío.');

-- =====================================================
-- 23. INGREDIENTE - PROVEEDORES
-- =====================================================
INSERT INTO ingrediente_proveedores (id, id_empresa, id_ingrediente, id_proveedor) VALUES
(1, 1, 1, 7),
(2, 1, 2, 6),
(3, 1, 3, 8),
(4, 1, 4, 6),
(5, 1, 5, 6),
(6, 1, 6, 8),
(7, 1, 7, 8),
(8, 1, 8, 8),
(9, 1, 9, 6),
(10, 1, 10, 7);

-- =====================================================
-- 24. PRODUCTOS CARTA
-- =====================================================
INSERT INTO catering_service_productos_carta (id, id_tipo_servicio, id_receta, precio) VALUES
(1, 1, 1, 6.00),
(2, 1, 5, 4.00),
(3, 2, 1, 6.00),
(4, 2, 2, 5.00),
(5, 2, 3, 18.00),
(6, 2, 4, 7.00),
(7, 3, 3, 20.00),
(8, 3, 2, 6.00),
(9, 4, 1, 5.50),
(10, 4, 4, 6.50),
(11, 5, 3, 17.00),
(12, 5, 2, 5.00);

-- =====================================================
-- 25. CATÁLOGO MATERIALES
-- =====================================================
INSERT INTO catering_materiales_catalogo (id, nombre, precio) VALUES
(1, 'Mesa Plegable', 35.00),
(2, 'Silla de Plástico', 8.00),
(3, 'Mantelería Completa', 20.00),
(4, 'Vajilla Completa (plato, cubiertos, vaso)', 15.00),
(5, 'Carpa 3x3', 120.00);

-- =====================================================
-- 26. EVENTOS CATERING
-- =====================================================
INSERT INTO catering_eventos (id, id_empresa, id_venta, fecha_evento, horario, personas, tipo_desayuno, direccion, referencia, incluir_mozo, cantidad_mozos, precio_mozo, subtotal_mozo, estado_flujo, estado_actualizado_por, estado_actualizado_at, observaciones) VALUES
(1, 1, 1, '2024-07-20', '08:00:00', 50, 'Americano', 'Av. Javier Prado 1234, San Isidro', 'Frente al parque central', 1, 3, 100.00, 300.00, 'en_evento', 3, '2024-07-20 08:30:00', 'Evento corporativo, ingreso por puerta lateral'),
(2, 1, 2, '2024-07-25', '12:00:00', 100, NULL, 'Calle Los Olivos 456, Miraflores', 'Edificio azul, piso 2', 1, 5, 100.00, 500.00, 'en_preparacion', 3, '2024-07-24 09:00:00', 'Almuerzo de aniversario empresarial'),
(3, 1, 3, '2024-08-01', '19:00:00', 30, NULL, 'Av. Larco 789, Barranco', 'Casa de campo', 0, 0, 100.00, 0.00, 'pendiente_verificacion', NULL, NULL, 'Cena familiar'),
(4, 1, 4, '2024-08-10', '07:30:00', 80, 'Buffet', 'Jr. Puno 321, Cercado de Lima', 'Local institucional', 1, 4, 100.00, 400.00, 'compra_pendiente', 4, '2024-08-05 10:00:00', 'Desayuno para colaboradores'),
(5, 1, 5, '2024-08-15', '18:00:00', 25, NULL, 'Av. Arequipa 567, Lince', 'Segundo piso', 0, 0, 100.00, 0.00, 'cerrado', 1, '2024-08-15 22:00:00', 'Evento concluido satisfactoriamente');

-- =====================================================
-- 27. SERVICIOS CATERING VENTAS
-- =====================================================
INSERT INTO catering_service_ventas (id, id_empresa, id_venta, id_tipo_servicio, subtotal_servicio) VALUES
(1, 1, 1, 1, 350.00),
(2, 1, 2, 2, 1200.00),
(3, 1, 3, 3, 320.00),
(4, 1, 4, 1, 800.00),
(5, 1, 5, 3, 250.00);

-- =====================================================
-- 28. DETALLE SERVICIOS CATERING
-- =====================================================
INSERT INTO catering_service_detalle (id, id_empresa, id_service_venta, id_producto_carta, cantidad, precio_unitario, subtotal) VALUES
(1, 1, 1, 1, 30, 6.00, 180.00),   -- Desayuno: 30 sándwiches
(2, 1, 1, 2, 25, 4.00, 100.00),   -- Desayuno: 25 jugos
(3, 1, 2, 3, 50, 6.00, 300.00),   -- Almuerzo: 50 sándwiches
(4, 1, 2, 4, 50, 5.00, 250.00),   -- Almuerzo: 50 ensaladas
(5, 1, 2, 5, 40, 18.00, 720.00),  -- Almuerzo: 40 pollos
(6, 1, 2, 6, 30, 7.00, 210.00),   -- Almuerzo: 30 queques (postre)
(7, 1, 3, 7, 20, 20.00, 400.00),  -- Cena: 20 pollos
(8, 1, 3, 8, 20, 6.00, 120.00),   -- Cena: 20 ensaladas
(9, 1, 4, 1, 50, 6.00, 300.00),   -- Desayuno: 50 sándwiches
(10, 1, 4, 2, 60, 4.00, 240.00),  -- Desayuno: 60 jugos
(11, 1, 5, 7, 15, 20.00, 300.00), -- Cena: 15 pollos
(12, 1, 5, 8, 10, 6.00, 60.00);   -- Cena: 10 ensaladas

-- =====================================================
-- 29. MATERIALES VENTA CATERING
-- =====================================================
INSERT INTO catering_materiales_venta (id, id_empresa, id_venta, id_material_catalogo, cantidad, precio_unitario, subtotal) VALUES
(1, 1, 1, 1, 10, 35.00, 350.00),   -- Mesas para evento 1
(2, 1, 1, 2, 50, 8.00, 400.00),    -- Sillas para evento 1
(3, 1, 2, 1, 20, 35.00, 700.00),   -- Mesas para evento 2
(4, 1, 2, 2, 100, 8.00, 800.00),   -- Sillas para evento 2
(5, 1, 2, 4, 100, 15.00, 1500.00), -- Vajilla para evento 2
(6, 1, 3, 1, 6, 35.00, 210.00),    -- Mesas para evento 3
(7, 1, 3, 2, 30, 8.00, 240.00),    -- Sillas para evento 3
(8, 1, 4, 5, 2, 120.00, 240.00),   -- Carpas para evento 4
(9, 1, 4, 3, 10, 20.00, 200.00),   -- Mantelería para evento 4
(10, 1, 5, 1, 4, 35.00, 140.00);   -- Mesas para evento 5

-- =====================================================
-- 30. DEVOLUCIONES CATERING
-- =====================================================
INSERT INTO catering_devoluciones (id, id_empresa, id_venta, fecha, id_usuario, motivo, nota_credito, monto) VALUES
(1, 1, 6, '2024-07-06 10:30:00', 1, 'Cliente canceló el evento por motivos personales', 'NC-CAT-0001', 708.00),
(2, 1, 5, '2024-08-16 09:00:00', 2, 'Devolución parcial por 5 sillas dañadas', 'NC-CAT-0002', 40.00);

-- =====================================================
-- 31. DETALLE DEVOLUCIONES CATERING
-- =====================================================
INSERT INTO catering_detalle_devolucion (id, id_empresa, id_devolucion, tipo_item, id_item, cantidad, monto) VALUES
(1, 1, 1, 'servicio', 5, 1, 250.00),     -- Devolución total servicio de cena venta 6
(2, 1, 1, 'material', 10, 4, 140.00),    -- Devolución de 4 mesas
(3, 1, 2, 'material', 2, 5, 40.00);      -- Devolución de 5 sillas

-- =====================================================
-- 32. HISTORIAL DE ESTADOS DEL EVENTO
-- =====================================================
INSERT INTO catering_evento_historial (id, id_empresa, id_evento, estado_anterior, estado_nuevo, id_usuario, observaciones, created_at) VALUES
-- Evento 1 (en_evento)
(1, 1, 1, NULL, 'pendiente_verificacion', 4, 'Evento creado y pendiente de verificación de stock', '2024-07-15 09:00:00'),
(2, 1, 1, 'pendiente_verificacion', 'compra_pendiente', 4, 'Faltan insumos: se requiere compra de pollo y tomate', '2024-07-16 10:00:00'),
(3, 1, 1, 'compra_pendiente', 'en_preparacion', 3, 'Insumos completos, inicia preparación en cocina', '2024-07-19 07:00:00'),
(4, 1, 1, 'en_preparacion', 'listo_para_envio', 3, 'Preparación completa, listo para cargar', '2024-07-20 06:00:00'),
(5, 1, 1, 'listo_para_envio', 'en_transito', 5, 'Carga subida al vehículo, en camino', '2024-07-20 07:00:00'),
(6, 1, 1, 'en_transito', 'en_evento', 5, 'Llegada al local y montaje completado', '2024-07-20 08:30:00'),
-- Evento 2 (en_preparacion)
(7, 1, 2, NULL, 'pendiente_verificacion', 4, 'Evento creado', '2024-07-20 10:00:00'),
(8, 1, 2, 'pendiente_verificacion', 'en_preparacion', 3, 'Stock verificado, inicia cocina', '2024-07-24 09:00:00'),
-- Evento 3 (pendiente_verificacion)
(9, 1, 3, NULL, 'pendiente_verificacion', 4, 'Evento creado, esperando verificación', '2024-07-25 15:00:00'),
-- Evento 4 (compra_pendiente)
(10, 1, 4, NULL, 'pendiente_verificacion', 4, 'Evento creado', '2024-08-01 08:00:00'),
(11, 1, 4, 'pendiente_verificacion', 'compra_pendiente', 4, 'Faltan 2 carpas y mantelería', '2024-08-05 10:00:00'),
-- Evento 5 (cerrado)
(12, 1, 5, NULL, 'pendiente_verificacion', 4, 'Evento creado', '2024-08-10 11:00:00'),
(13, 1, 5, 'pendiente_verificacion', 'en_preparacion', 3, 'Inicio de preparación', '2024-08-14 16:00:00'),
(14, 1, 5, 'en_preparacion', 'listo_para_envio', 3, 'Listo para enviar', '2024-08-15 16:00:00'),
(15, 1, 5, 'listo_para_envio', 'en_transito', 5, 'En camino al evento', '2024-08-15 17:00:00'),
(16, 1, 5, 'en_transito', 'en_evento', 5, 'Evento iniciado', '2024-08-15 18:00:00'),
(17, 1, 5, 'en_evento', 'en_retorno', 5, 'Recojo de materiales completado', '2024-08-15 21:00:00'),
(18, 1, 5, 'en_retorno', 'retornado', 5, 'Llegada a empresa con materiales', '2024-08-15 21:45:00'),
(19, 1, 5, 'retornado', 'cerrado', 1, 'Evento cerrado y conciliado', '2024-08-15 22:00:00');

-- =====================================================
-- 33. ETAPAS DEL EVENTO (TIEMPOS AUTOMÁTICOS)
-- =====================================================
INSERT INTO catering_evento_etapas (id, id_empresa, id_evento, etapa, hora_inicio, hora_fin, duracion_real_min, tiempo_estimado_min, completada, id_usuario_inicio, id_usuario_fin, observaciones) VALUES
-- Evento 1 (en_evento - etapas 1 a 4 completas, 5 en curso)
(1, 1, 1, 'verificacion_almacen', '2024-07-15 09:00:00', '2024-07-15 10:30:00', 90, 60, 1, 4, 4, 'Verificación de stock completada'),
(2, 1, 1, 'preparacion_cocina', '2024-07-19 07:00:00', '2024-07-20 06:00:00', 1380, 1200, 1, 3, 3, 'Preparación de 30 sándwiches y 25 jugos'),
(3, 1, 1, 'carga_transporte', '2024-07-20 06:00:00', '2024-07-20 06:45:00', 45, 30, 1, 5, 5, 'Carga completa'),
(4, 1, 1, 'montaje_evento', '2024-07-20 07:30:00', '2024-07-20 08:30:00', 60, 45, 1, 5, 5, 'Montaje de mesas y sillas'),
(5, 1, 1, 'recojo_evento', NULL, NULL, NULL, 45, 0, NULL, NULL, NULL),
(6, 1, 1, 'retorno_empresa', NULL, NULL, NULL, 30, 0, NULL, NULL, NULL),
(7, 1, 1, 'cierre', NULL, NULL, NULL, 20, 0, NULL, NULL, NULL),
-- Evento 2 (en_preparacion - etapa 1 completa, 2 en curso)
(8, 1, 2, 'verificacion_almacen', '2024-07-20 10:00:00', '2024-07-20 11:00:00', 60, 90, 1, 4, 4, 'Stock verificado'),
(9, 1, 2, 'preparacion_cocina', '2024-07-24 09:00:00', NULL, NULL, 1800, 0, 3, NULL, 'En preparación'),
(10, 1, 2, 'carga_transporte', NULL, NULL, NULL, 60, 0, NULL, NULL, NULL),
(11, 1, 2, 'montaje_evento', NULL, NULL, NULL, 90, 0, NULL, NULL, NULL),
(12, 1, 2, 'recojo_evento', NULL, NULL, NULL, 60, 0, NULL, NULL, NULL),
(13, 1, 2, 'retorno_empresa', NULL, NULL, NULL, 30, 0, NULL, NULL, NULL),
(14, 1, 2, 'cierre', NULL, NULL, NULL, 20, 0, NULL, NULL, NULL),
-- Evento 3 (solo etapa 1 abierta)
(15, 1, 3, 'verificacion_almacen', NULL, NULL, NULL, 45, 0, NULL, NULL, NULL),
(16, 1, 3, 'preparacion_cocina', NULL, NULL, NULL, 600, 0, NULL, NULL, NULL),
(17, 1, 3, 'carga_transporte', NULL, NULL, NULL, 30, 0, NULL, NULL, NULL),
(18, 1, 3, 'montaje_evento', NULL, NULL, NULL, 45, 0, NULL, NULL, NULL),
(19, 1, 3, 'recojo_evento', NULL, NULL, NULL, 30, 0, NULL, NULL, NULL),
(20, 1, 3, 'retorno_empresa', NULL, NULL, NULL, 30, 0, NULL, NULL, NULL),
(21, 1, 3, 'cierre', NULL, NULL, NULL, 20, 0, NULL, NULL, NULL),
-- Evento 4 (compra_pendiente - solo etapa 1 completa)
(22, 1, 4, 'verificacion_almacen', '2024-08-01 08:00:00', '2024-08-05 10:00:00', 5880, 90, 1, 4, 4, 'Verificación con compras pendientes'),
(23, 1, 4, 'preparacion_cocina', NULL, NULL, NULL, 1200, 0, NULL, NULL, NULL),
(24, 1, 4, 'carga_transporte', NULL, NULL, NULL, 45, 0, NULL, NULL, NULL),
(25, 1, 4, 'montaje_evento', NULL, NULL, NULL, 60, 0, NULL, NULL, NULL),
(26, 1, 4, 'recojo_evento', NULL, NULL, NULL, 45, 0, NULL, NULL, NULL),
(27, 1, 4, 'retorno_empresa', NULL, NULL, NULL, 30, 0, NULL, NULL, NULL),
(28, 1, 4, 'cierre', NULL, NULL, NULL, 20, 0, NULL, NULL, NULL),
-- Evento 5 (cerrado - todas completas)
(29, 1, 5, 'verificacion_almacen', '2024-08-10 11:00:00', '2024-08-10 12:00:00', 60, 45, 1, 4, 4, 'OK'),
(30, 1, 5, 'preparacion_cocina', '2024-08-14 16:00:00', '2024-08-15 16:00:00', 1440, 900, 1, 3, 3, 'Preparación completa'),
(31, 1, 5, 'carga_transporte', '2024-08-15 16:00:00', '2024-08-15 17:00:00', 60, 30, 1, 5, 5, 'Carga completa'),
(32, 1, 5, 'montaje_evento', '2024-08-15 17:00:00', '2024-08-15 18:00:00', 60, 45, 1, 5, 5, 'Montaje listo'),
(33, 1, 5, 'recojo_evento', '2024-08-15 20:00:00', '2024-08-15 21:00:00', 60, 30, 1, 5, 5, 'Recojo completo'),
(34, 1, 5, 'retorno_empresa', '2024-08-15 21:00:00', '2024-08-15 21:45:00', 45, 30, 1, 5, 5, 'Llegada a almacén'),
(35, 1, 5, 'cierre', '2024-08-15 21:45:00', '2024-08-15 22:00:00', 15, 20, 1, 1, 1, 'Cierre administrativo');

-- =====================================================
-- 34. CHECKLIST ESPECÍFICO DEL EVENTO
-- =====================================================
INSERT INTO catering_evento_checklist 
(id, id_empresa, id_evento, etapa, item, categoria, id_referencia, tipo_referencia, cantidad_requerida, cantidad_real, unidad, cantidad_stock, cantidad_faltante, estado_compra, id_gasto, proveedores, verificado, verificado_por, verificado_at, tiene_incidencia, descripcion_incidencia, orden) 
VALUES
-- Evento 1 - verificacion_almacen (completado)
(1, 1, 1, 'verificacion_almacen', 'Sándwich de Pollo x30', 'entrada', 1, 'producto_carta', 30.00, 30.00, 'unidad', 30.00, 0.00, 'en_almacen', NULL, JSON_ARRAY(JSON_OBJECT('nombre','Carnes Premium','telefono','988333444')), 1, 4, '2024-07-15 10:00:00', 0, NULL, 1),
(2, 1, 1, 'verificacion_almacen', 'Jugo de Naranja x25', 'bebida', 2, 'producto_carta', 25.00, 25.00, 'unidad', 25.00, 0.00, 'en_almacen', NULL, NULL, 1, 4, '2024-07-15 10:10:00', 0, NULL, 2),
(3, 1, 1, 'verificacion_almacen', 'Pechuga de Pollo', 'ingrediente', 1, 'ingrediente', 3.00, 3.00, 'kg', 30.00, 0.00, 'en_almacen', NULL, NULL, 1, 4, '2024-07-15 10:15:00', 0, NULL, 3),
(4, 1, 1, 'verificacion_almacen', 'Mesa Plegable', 'material', 1, 'material', 10.00, 10.00, 'unidad', 15.00, 0.00, 'en_almacen', NULL, NULL, 1, 4, '2024-07-15 10:20:00', 0, NULL, 4),
-- Evento 2 - verificacion_almacen
(5, 1, 2, 'verificacion_almacen', 'Sándwich de Pollo x50', 'entrada', 3, 'producto_carta', 50.00, 50.00, 'unidad', 50.00, 0.00, 'en_almacen', NULL, NULL, 1, 4, '2024-07-20 10:30:00', 0, NULL, 1),
(6, 1, 2, 'verificacion_almacen', 'Pollo a la Plancha x40', 'plato_principal', 5, 'producto_carta', 40.00, 35.00, 'unidad', 35.00, 5.00, 'comprar', NULL, JSON_ARRAY(JSON_OBJECT('nombre','Carnes Premium','telefono','988333444')), 1, 4, '2024-07-20 10:40:00', 1, 'Faltaron 5 porciones de pollo', 2),
(7, 1, 2, 'verificacion_almacen', 'Vajilla Completa', 'material', 4, 'material', 100.00, 100.00, 'unidad', 100.00, 0.00, 'en_almacen', NULL, NULL, 1, 4, '2024-07-20 10:45:00', 0, NULL, 3),
(8, 1, 2, 'verificacion_almacen', 'Silla de Plástico', 'material', 2, 'material', 100.00, 100.00, 'unidad', 120.00, 0.00, 'en_almacen', NULL, NULL, 1, 4, '2024-07-20 10:50:00', 0, NULL, 4),
-- Evento 3 - pendiente
(9, 1, 3, 'verificacion_almacen', 'Pollo a la Plancha x20', 'plato_principal', 7, 'producto_carta', 20.00, NULL, 'unidad', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, NULL, 1),
(10, 1, 3, 'verificacion_almacen', 'Mesa Plegable', 'material', 1, 'material', 6.00, NULL, 'unidad', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, NULL, 2),
-- Evento 4 - compra_pendiente
(11, 1, 4, 'verificacion_almacen', 'Carpa 3x3', 'material', 5, 'material', 2.00, 0.00, 'unidad', 0.00, 2.00, 'comprar', 3, JSON_ARRAY(JSON_OBJECT('nombre','Eventos y Carpas SAC','telefono','988777888')), 1, 4, '2024-08-05 10:00:00', 1, 'No hay carpas en stock, se compran', 1),
(12, 1, 4, 'verificacion_almacen', 'Mantelería Completa', 'material', 3, 'material', 10.00, 8.00, 'unidad', 8.00, 2.00, 'comprar', 4, NULL, 1, 4, '2024-08-05 10:10:00', 1, 'Faltan 2 mantelerías', 2),
(13, 1, 4, 'verificacion_almacen', 'Sándwich de Pollo x50', 'entrada', 1, 'producto_carta', 50.00, 50.00, 'unidad', 50.00, 0.00, 'en_almacen', NULL, NULL, 1, 4, '2024-08-05 10:20:00', 0, NULL, 3),
-- Evento 5 - cerrado (completado)
(14, 1, 5, 'verificacion_almacen', 'Pollo a la Plancha x15', 'plato_principal', 7, 'producto_carta', 15.00, 15.00, 'unidad', 15.00, 0.00, 'en_almacen', NULL, NULL, 1, 4, '2024-08-10 11:30:00', 0, NULL, 1),
(15, 1, 5, 'verificacion_almacen', 'Mesa Plegable', 'material', 1, 'material', 4.00, 4.00, 'unidad', 4.00, 0.00, 'en_almacen', NULL, NULL, 1, 4, '2024-08-10 11:35:00', 0, NULL, 2),
(16, 1, 5, 'preparacion_cocina', 'Pollo a la Plancha x15', 'plato_principal', 7, 'producto_carta', 15.00, 15.00, 'unidad', 15.00, 0.00, NULL, NULL, NULL, 1, 3, '2024-08-15 15:00:00', 0, NULL, 3),
(17, 1, 5, 'carga_transporte', 'Mesa Plegable', 'material', 1, 'material', 4.00, 4.00, 'unidad', 4.00, 0.00, NULL, NULL, NULL, 1, 5, '2024-08-15 16:30:00', 0, NULL, 4),
(18, 1, 5, 'montaje_evento', 'Silla de Plástico', 'material', 2, 'material', 25.00, 25.00, 'unidad', 25.00, 0.00, NULL, NULL, NULL, 1, 5, '2024-08-15 17:30:00', 0, NULL, 5),
(19, 1, 5, 'recojo_evento', 'Mesa Plegable', 'material', 1, 'material', 4.00, 4.00, 'unidad', 4.00, 0.00, NULL, NULL, NULL, 1, 5, '2024-08-15 20:30:00', 0, NULL, 6),
(20, 1, 5, 'recojo_evento', 'Silla de Plástico', 'material', 2, 'material', 25.00, 24.00, 'unidad', 24.00, 1.00, NULL, NULL, NULL, 1, 5, '2024-08-15 20:45:00', 1, 'Se perdió 1 silla', 7),
(21, 1, 5, 'retorno_empresa', 'Mesa Plegable', 'material', 1, 'material', 4.00, 4.00, 'unidad', 4.00, 0.00, NULL, NULL, NULL, 1, 5, '2024-08-15 21:30:00', 0, NULL, 8),
(22, 1, 5, 'cierre', 'Conciliación final evento 5', 'otro', NULL, NULL, 1.00, 1.00, 'unidad', NULL, NULL, NULL, NULL, NULL, 1, 1, '2024-08-15 22:00:00', 0, NULL, 9);

-- =====================================================
-- 35. INCIDENCIAS DEL EVENTO
-- =====================================================
INSERT INTO catering_evento_incidencias 
(id, id_empresa, id_evento, etapa, id_checklist_item, tipo, severidad, cantidad_afectada, descripcion, impacto, estado, resolucion, resuelto_por, resuelto_at, id_usuario, created_at) 
VALUES
(1, 1, 1, 'preparacion_cocina', 1, 'retraso', 'baja', NULL, 'La cocina tardó 15 minutos más de lo previsto en preparar los sándwiches', 'Retraso en el cronograma, se compensó en el montaje', 'resuelta', 'Se ajustaron tiempos del resto de la preparación', 3, '2024-07-20 06:30:00', 3, '2024-07-20 05:45:00'),
(2, 1, 2, 'verificacion_almacen', 6, 'falta_stock', 'media', 5.00, 'Faltaron 5 porciones de pollo para el evento', 'Se compró pollo adicional a proveedor', 'en_revision', NULL, NULL, NULL, 4, '2024-07-20 10:45:00'),
(3, 1, 4, 'verificacion_almacen', 11, 'falta_stock', 'alta', 2.00, 'No hay carpas en stock para el evento', 'Se requiere compra urgente', 'abierta', NULL, NULL, NULL, 4, '2024-08-05 10:15:00'),
(4, 1, 5, 'recojo_evento', 20, 'perdida', 'baja', 1.00, 'Se perdió 1 silla durante el recojo del evento', 'Pérdida de S/ 8.00', 'resuelta', 'Se descontó del inventario y se registró como gasto', 1, '2024-08-15 22:00:00', 5, '2024-08-15 20:50:00'),
(5, 1, 5, 'montaje_evento', 18, 'producto_defectuoso', 'media', 2.00, 'Dos sillas llegaron con patas flojas', 'Se reemplazaron por sillas de reserva', 'resuelta', 'Se reemplazaron y se reportó al almacén', 4, '2024-08-15 18:00:00', 5, '2024-08-15 17:45:00');

-- =====================================================
-- 36. PREPARACIÓN DE RECETAS (COCINA)
-- =====================================================
INSERT INTO catering_evento_preparacion 
(id, id_empresa, id_evento, item, hora_inicio, hora_fin, duracion_real_min, iniciado_por, finalizado_por, estado, observaciones) 
VALUES
-- Evento 1
(1, 1, 1, 'Sándwich Premium x30', '2024-07-19 07:00:00', '2024-07-19 09:00:00', 120, 3, 3, 'completado', 'Preparación sin novedades'),
(2, 1, 1, 'Jugo de Naranja x25', '2024-07-19 09:00:00', '2024-07-19 10:00:00', 60, 3, 3, 'completado', 'Se exprimieron 30 naranjas'),
(3, 1, 1, 'Ensalada Fresca x20', '2024-07-19 10:00:00', '2024-07-19 10:45:00', 45, 3, 3, 'completado', NULL),
-- Evento 2
(4, 1, 2, 'Sándwich de Pollo x50', '2024-07-24 09:00:00', NULL, NULL, 3, NULL, 'en_progreso', 'Iniciado, en proceso'),
(5, 1, 2, 'Pollo a la Plancha x40', '2024-07-24 10:00:00', NULL, NULL, 3, NULL, 'en_progreso', 'A la espera de compra de pollo'),
-- Evento 5 (completado)
(6, 1, 5, 'Pollo a la Plancha x15', '2024-08-15 10:00:00', '2024-08-15 12:00:00', 120, 3, 3, 'completado', 'Sin novedades'),
(7, 1, 5, 'Ensalada Fresca x10', '2024-08-15 12:00:00', '2024-08-15 12:45:00', 45, 3, 3, 'completado', NULL);

-- =====================================================
-- 37. GASTOS / EGRESOS DEL EVENTO (continuación)
-- =====================================================
INSERT INTO catering_evento_gastos 
(id, id_empresa, id_evento, id_checklist_item, categoria, etapa, descripcion, cantidad, unidad, precio_unitario, subtotal, id_proveedor, tiene_factura, numero_factura, fecha_gasto, observaciones, registrado_por) 
VALUES
-- Evento 4 (continuación de compras)
(5, 1, 4, 12, 'material', 'verificacion_almacen', 'Compra de 2 mantelerías completas', 2.00, 'unidad', 20.00, 40.00, 8, 1, 'F001-00457', '2024-08-05', 'Compra a Abarrotes El Sol', 4),
(6, 1, 4, NULL, 'movilidad', 'carga_transporte', 'Flete de carpas y materiales', 1.00, 'servicio', 120.00, 120.00, NULL, 0, NULL, '2024-08-10', 'Flete por carpas grandes', 5),
(7, 1, 4, NULL, 'mano_obra', 'montaje_evento', 'Pago a mozos por servicio (4 mozos)', 4.00, 'persona', 100.00, 400.00, NULL, 0, NULL, '2024-08-10', 'Servicio de mozos', 1),
-- Evento 5 (cerrado)
(8, 1, 5, NULL, 'movilidad', 'carga_transporte', 'Flete de materiales al evento', 1.00, 'servicio', 60.00, 60.00, NULL, 0, NULL, '2024-08-15', 'Flete en camioneta', 5),
(9, 1, 5, 20, 'otro', 'recojo_evento', 'Pérdida de 1 silla de plástico', 1.00, 'unidad', 8.00, 8.00, NULL, 0, NULL, '2024-08-15', 'Se descuenta del inventario', 1),
(10, 1, 5, NULL, 'mano_obra', 'cierre', 'Pago a personal de cocina por evento', 2.00, 'persona', 150.00, 300.00, NULL, 1, 'B001-00012', '2024-08-15', 'Boleta de honorarios', 1),
(11, 1, 5, NULL, 'ingrediente', 'preparacion_cocina', 'Compra de naranjas para jugos', 10.00, 'kg', 2.50, 25.00, 6, 1, 'F001-00458', '2024-08-14', 'Naranjas frescas', 3);