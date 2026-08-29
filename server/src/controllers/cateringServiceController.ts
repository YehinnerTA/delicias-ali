import { Request, Response } from 'express';
import { executeQuery, executeMutation, executeQuerySingle } from '../config/database';

export const getVentasCatering = async (req: Request, res: Response) => {
    try {
        const id_empresa = req.query.id_empresa ? Number(req.query.id_empresa) : null;
        if (!id_empresa) {
            return res.status(400).json({ message: 'id_empresa es requerido' });
        }

        const rows = await executeQuery<any[]>(`
            SELECT 
                v.*,
                p.nombre AS cliente_nombre,
                p.apellido AS cliente_apellido,
                p.numero_documento AS cliente_documento,
                u.usuario AS usuario_nombre
            FROM ventas v
            JOIN personas p ON v.id_cliente = p.id
            JOIN usuarios u ON v.id_usuario = u.id
            WHERE v.id IN (SELECT id_venta FROM catering_eventos)
              AND v.id_empresa = ?
            ORDER BY v.id DESC
        `, [id_empresa]);

        const ventasConDetalles = await Promise.all(
            rows.map(async (venta: any) => {
                const evento = await executeQuerySingle<any>(
                    `SELECT * FROM catering_eventos WHERE id_venta = ? AND id_empresa = ?`,
                    [venta.id, id_empresa]
                );

                const servicios = await executeQuery<any[]>(`
                    SELECT 
                        sv.id AS service_id,
                        st.nombre AS tipo_nombre,
                        st.clave AS tipo_clave,
                        sv.subtotal_servicio
                    FROM catering_service_ventas sv
                    JOIN catering_service_tipos st ON sv.id_tipo_servicio = st.id
                    WHERE sv.id_venta = ? AND sv.id_empresa = ?
                `, [venta.id, id_empresa]);

                const serviciosConProductos = await Promise.all(
                    servicios.map(async (serv: any) => {
                        const productos = await executeQuery<any[]>(`
                            SELECT 
                                sd.id AS detalleId,
                                pc.id AS producto_id,
                                pc.nombre,
                                sd.cantidad,
                                sd.precio_unitario AS precio
                            FROM catering_service_detalle sd
                            JOIN catering_service_productos_carta pc ON sd.id_producto_carta = pc.id
                            WHERE sd.id_service_venta = ? AND sd.id_empresa = ?
                        `, [serv.service_id, id_empresa]);

                        return {
                            id: serv.service_id,
                            tipoKey: serv.tipo_clave,
                            tipoNombre: serv.tipo_nombre,
                            productos: productos.map((p: any) => ({
                                detalleId: p.detalleId,
                                id: p.producto_id,
                                nombre: p.nombre,
                                precio: parseFloat(p.precio),
                                cantidad: p.cantidad
                            }))
                        };
                    })
                );

                const materiales = await executeQuery<any[]>(`
                    SELECT 
                        mv.id,
                        mc.id AS material_id,
                        mc.nombre,
                        mv.cantidad,
                        mv.precio_unitario AS precio
                    FROM catering_materiales_venta mv
                    JOIN catering_materiales_catalogo mc ON mv.id_material_catalogo = mc.id
                    WHERE mv.id_venta = ? AND mv.id_empresa = ?
                `, [venta.id, id_empresa]);

                const devoluciones = await executeQuery<any[]>(`
                    SELECT 
                        d.*,
                        u.usuario AS usuario_nombre,
                        GROUP_CONCAT(
                            JSON_OBJECT(
                                'id', dd.id,
                                'nombre', 
                                    CASE 
                                        WHEN dd.tipo_item = 'servicio' THEN pc.nombre
                                        WHEN dd.tipo_item = 'material' THEN mc.nombre
                                        ELSE 'Producto'
                                    END,
                                'precio', 
                                    CASE 
                                        WHEN dd.cantidad > 0 THEN ROUND(dd.monto / dd.cantidad, 2)
                                        ELSE 0
                                    END,
                                'cantidad', dd.cantidad,
                                'tipo_item', dd.tipo_item
                            )
                        ) AS productos_json
                    FROM catering_devoluciones d
                    JOIN usuarios u ON d.id_usuario = u.id
                    LEFT JOIN catering_detalle_devolucion dd ON d.id = dd.id_devolucion AND d.id_empresa = dd.id_empresa
                    LEFT JOIN catering_service_detalle sd ON dd.tipo_item = 'servicio' AND dd.id_item = sd.id AND d.id_empresa = sd.id_empresa
                    LEFT JOIN catering_service_productos_carta pc ON sd.id_producto_carta = pc.id
                    LEFT JOIN catering_materiales_venta mv ON dd.tipo_item = 'material' AND dd.id_item = mv.id AND d.id_empresa = mv.id_empresa
                    LEFT JOIN catering_materiales_catalogo mc ON mv.id_material_catalogo = mc.id
                    WHERE d.id_venta = ? AND d.id_empresa = ?
                    GROUP BY d.id
                `, [venta.id, id_empresa]);

                return {
                    ...venta,
                    id_empresa: venta.id_empresa,
                    cliente: `${venta.cliente_nombre || ''} ${venta.cliente_apellido || ''}`.trim(),
                    clienteDoc: venta.cliente_documento,
                    eventoData: evento ? {
                        fecha: evento.fecha_evento,
                        horario: evento.horario,
                        personas: evento.personas,
                        tipoDesayuno: evento.tipo_desayuno || 'Clásico'
                    } : null,
                    servicios: serviciosConProductos,
                    materiales: materiales.map((m: any) => ({
                        id: m.material_id,
                        nombre: m.nombre,
                        precio: parseFloat(m.precio),
                        cantidad: m.cantidad
                    })),
                    devoluciones: devoluciones.map((d: any) => ({
                        id: d.id,
                        fecha: d.fecha,
                        motivo: d.motivo,
                        notaCredito: d.nota_credito,
                        monto: parseFloat(d.monto),
                        usuario: d.usuario_nombre,
                        productos: d.productos_json ? JSON.parse(`[${d.productos_json}]`) : []
                    })),
                    subtotal: parseFloat(venta.subtotal),
                    descuento: parseFloat(venta.descuento || 0),
                    igv: parseFloat(venta.igv),
                    total: parseFloat(venta.total),
                    metodoPago: venta.metodo_pago,
                    estado: venta.estado
                };
            })
        );

        res.json(ventasConDetalles);
    } catch (error) {
        console.error('[getVentasCatering] Error:', error);
        res.status(500).json({ message: 'Error al obtener ventas de catering', error: error instanceof Error ? error.message : String(error) });
    }
};

export const getVentaCateringById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const id_empresa = req.query.id_empresa ? Number(req.query.id_empresa) : null;
        if (!id_empresa) {
            return res.status(400).json({ message: 'id_empresa es requerido' });
        }

        const venta = await executeQuerySingle<any>(`
            SELECT 
                v.*,
                p.nombre AS cliente_nombre,
                p.apellido AS cliente_apellido,
                p.numero_documento AS cliente_documento,
                u.usuario AS usuario_nombre
            FROM ventas v
            JOIN personas p ON v.id_cliente = p.id
            JOIN usuarios u ON v.id_usuario = u.id
            WHERE v.id = ? AND v.id_empresa = ?
        `, [id, id_empresa]);

        if (!venta) {
            return res.status(404).json({ message: 'Venta no encontrada' });
        }

        const evento = await executeQuerySingle<any>(
            `SELECT * FROM catering_eventos WHERE id_venta = ? AND id_empresa = ?`,
            [id, id_empresa]
        );

        const servicios = await executeQuery<any[]>(`
            SELECT 
                sv.id AS service_id,
                st.nombre AS tipo_nombre,
                st.clave AS tipo_clave,
                sv.subtotal_servicio
            FROM catering_service_ventas sv
            JOIN catering_service_tipos st ON sv.id_tipo_servicio = st.id
            WHERE sv.id_venta = ? AND sv.id_empresa = ?
        `, [id, id_empresa]);

        const serviciosConProductos = await Promise.all(
            servicios.map(async (serv: any) => {
                const productos = await executeQuery<any[]>(`
                    SELECT 
                        sd.id AS detalleId,
                        pc.id AS producto_id,
                        pc.nombre,
                        sd.cantidad,
                        sd.precio_unitario AS precio
                    FROM catering_service_detalle sd
                    JOIN catering_service_productos_carta pc ON sd.id_producto_carta = pc.id
                    WHERE sd.id_service_venta = ? AND sd.id_empresa = ?
                `, [serv.service_id, id_empresa]);

                return {
                    id: serv.service_id,
                    tipoKey: serv.tipo_clave,
                    tipoNombre: serv.tipo_nombre,
                    productos: productos.map((p: any) => ({
                        detalleId: p.detalleId,
                        id: p.producto_id,
                        nombre: p.nombre,
                        precio: parseFloat(p.precio),
                        cantidad: p.cantidad
                    }))
                };
            })
        );

        const materiales = await executeQuery<any[]>(`
            SELECT 
                mv.id,
                mc.id AS material_id,
                mc.nombre,
                mv.cantidad,
                mv.precio_unitario AS precio
            FROM catering_materiales_venta mv
            JOIN catering_materiales_catalogo mc ON mv.id_material_catalogo = mc.id
            WHERE mv.id_venta = ? AND mv.id_empresa = ?
        `, [id, id_empresa]);

        const devoluciones = await executeQuery<any[]>(`
            SELECT 
                d.*,
                u.usuario AS usuario_nombre,
                GROUP_CONCAT(
                    JSON_OBJECT(
                        'id', dd.id,
                        'nombre', 
                            CASE 
                                WHEN dd.tipo_item = 'servicio' THEN pc.nombre
                                WHEN dd.tipo_item = 'material' THEN mc.nombre
                                ELSE 'Producto'
                            END,
                        'precio', 
                            CASE 
                                WHEN dd.cantidad > 0 THEN ROUND(dd.monto / dd.cantidad, 2)
                                ELSE 0
                            END,
                        'cantidad', dd.cantidad,
                        'tipo_item', dd.tipo_item
                    )
                ) AS productos_json
            FROM catering_devoluciones d
            JOIN usuarios u ON d.id_usuario = u.id
            LEFT JOIN catering_detalle_devolucion dd ON d.id = dd.id_devolucion AND d.id_empresa = dd.id_empresa
            LEFT JOIN catering_service_detalle sd ON dd.tipo_item = 'servicio' AND dd.id_item = sd.id AND d.id_empresa = sd.id_empresa
            LEFT JOIN catering_service_productos_carta pc ON sd.id_producto_carta = pc.id
            LEFT JOIN catering_materiales_venta mv ON dd.tipo_item = 'material' AND dd.id_item = mv.id AND d.id_empresa = mv.id_empresa
            LEFT JOIN catering_materiales_catalogo mc ON mv.id_material_catalogo = mc.id
            WHERE d.id_venta = ? AND d.id_empresa = ?
            GROUP BY d.id
        `, [venta.id, id_empresa]);

        const result = {
            ...venta,
            id_empresa: venta.id_empresa,
            cliente: `${venta.cliente_nombre || ''} ${venta.cliente_apellido || ''}`.trim(),
            clienteDoc: venta.cliente_documento,
            eventoData: evento ? {
                fecha: evento.fecha_evento,
                horario: evento.horario,
                personas: evento.personas,
                tipoDesayuno: evento.tipo_desayuno || 'Clásico'
            } : null,
            servicios: serviciosConProductos,
            materiales: materiales.map((m: any) => ({
                id: m.material_id,
                nombre: m.nombre,
                precio: parseFloat(m.precio),
                cantidad: m.cantidad
            })),
            devoluciones: devoluciones.map((d: any) => ({
                id: d.id,
                fecha: d.fecha,
                motivo: d.motivo,
                notaCredito: d.nota_credito,
                monto: parseFloat(d.monto),
                usuario: d.usuario_nombre,
                productos: d.productos_json ? JSON.parse(`[${d.productos_json}]`) : []
            })),
            subtotal: parseFloat(venta.subtotal),
            descuento: parseFloat(venta.descuento || 0),
            igv: parseFloat(venta.igv),
            total: parseFloat(venta.total),
            metodoPago: venta.metodo_pago,
            estado: venta.estado
        };

        res.json(result);
    } catch (error) {
        console.error('[getVentaCateringById] Error:', error);
        res.status(500).json({ message: 'Error al obtener venta de catering', error: error instanceof Error ? error.message : String(error) });
    }
};

export const getNextNumeroVentaCatering = async (req: Request, res: Response) => {
    try {
        const id_empresa = req.query.id_empresa ? Number(req.query.id_empresa) : null;
        if (!id_empresa) {
            return res.status(400).json({ message: 'id_empresa es requerido' });
        }

        const result = await executeQuerySingle<any>(`
            SELECT numero AS last_numero 
            FROM ventas 
            WHERE id_empresa = ?
            ORDER BY id DESC 
            LIMIT 1
        `, [id_empresa]);

        let nextNumber = 1;
        if (result && result.last_numero) {
            const match = result.last_numero.match(/\d+/);
            if (match) {
                nextNumber = parseInt(match[0]) + 1;
            }
        }

        const numero = `V-${String(nextNumber).padStart(6, '0')}`;
        res.json({ numero });
    } catch (error) {
        console.error('[getNextNumeroVentaCatering] Error:', error);
        res.status(500).json({ message: 'Error al generar número de venta' });
    }
};

export const getCatalogosCatering = async (req: Request, res: Response) => {
    try {
        const tiposServicio = await executeQuery<any[]>(`
            SELECT id, nombre, clave FROM catering_service_tipos
        `);

        const productosCarta = await executeQuery<any[]>(`
            SELECT pc.*, t.clave AS tipo_clave
            FROM catering_service_productos_carta pc
            JOIN catering_service_tipos t ON pc.id_tipo_servicio = t.id
        `);

        const materialesCatalogo = await executeQuery<any[]>(`
            SELECT * FROM catering_materiales_catalogo
        `);

        const serviciosDisponibles: any = {};
        tiposServicio.forEach((t: any) => {
            serviciosDisponibles[t.clave] = {
                nombre: t.nombre,
                carta: productosCarta
                    .filter((p: any) => p.tipo_clave === t.clave)
                    .map((p: any) => ({
                        id: p.id,
                        nombre: p.nombre,
                        precio: parseFloat(p.precio)
                    }))
            };
        });

        res.json({
            serviciosDisponibles,
            catalogoMateriales: materialesCatalogo.map((m: any) => ({
                id: m.id,
                nombre: m.nombre,
                precio: parseFloat(m.precio),
                cantidad: 0
            }))
        });
    } catch (error) {
        console.error('[getCatalogosCatering] Error:', error);
        res.status(500).json({ message: 'Error al obtener catálogos de catering' });
    }
};

export const createVentaCatering = async (req: Request, res: Response) => {
    try {
        const {
            id_empresa,
            cliente_documento,
            cliente_nombre,
            cliente_apellido,
            cliente_email,
            cliente_celular,
            servicios,
            materiales,
            eventoData,
            subtotal,
            descuento,
            igv,
            total,
            metodo_pago,
            usuario_id
        } = req.body;

        if (!id_empresa) {
            return res.status(400).json({ message: 'id_empresa es requerido' });
        }
        if (!cliente_documento || !usuario_id) {
            return res.status(400).json({ message: 'Faltan campos obligatorios: cliente_documento, usuario_id' });
        }

        let cliente = await executeQuerySingle<any>(
            `SELECT * FROM personas WHERE numero_documento = ? AND id_empresa = ?`,
            [cliente_documento, id_empresa]
        );

        if (!cliente) {
            const tipoDocumento = cliente_documento.length === 8 ? 'DNI' : 'RUC';
            const tipoPersona = cliente_documento.length === 8 ? 'cliente_natural' : 'cliente_juridico';

            const empresa = await executeQuerySingle<any>(
                `SELECT id FROM empresas WHERE id = ?`,
                [id_empresa]
            );
            if (!empresa) {
                return res.status(400).json({ message: 'Empresa no encontrada' });
            }

            const result = await executeMutation(
                `INSERT INTO personas 
                    (id_empresa, tipo_persona, tipo_documento, numero_documento, nombre, apellido, email, celular) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    id_empresa,
                    tipoPersona,
                    tipoDocumento,
                    cliente_documento,
                    cliente_nombre || '',
                    cliente_apellido || '',
                    cliente_email || null,
                    cliente_celular || ''
                ]
            );

            cliente = await executeQuerySingle<any>(
                `SELECT * FROM personas WHERE id = ?`,
                [result.insertId]
            );
        }

        const numeroResult = await executeQuerySingle<any>(`
            SELECT numero AS last_numero 
            FROM ventas 
            WHERE id_empresa = ?
            ORDER BY id DESC 
            LIMIT 1
        `, [id_empresa]);

        let nextNumber = 1;
        if (numeroResult && numeroResult.last_numero) {
            const match = numeroResult.last_numero.match(/\d+/);
            if (match) {
                nextNumber = parseInt(match[0]) + 1;
            }
        }
        const numero = `V-${String(nextNumber).padStart(6, '0')}`;

        const ventaResult = await executeMutation(
            `INSERT INTO ventas 
                (id_empresa, numero, fecha, id_cliente, id_usuario, subtotal, descuento, igv, total, metodo_pago, estado) 
             VALUES (?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?, 'completada')`,
            [
                id_empresa,
                numero,
                cliente.id,
                usuario_id,
                subtotal || 0,
                descuento || 0,
                igv || 0,
                total || 0,
                metodo_pago || 'EFECTIVO'
            ]
        );

        const ventaId = ventaResult.insertId;

        await executeMutation(
            `INSERT INTO catering_eventos (id_empresa, id_venta, fecha_evento, horario, personas, tipo_desayuno)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                id_empresa,
                ventaId,
                eventoData?.fecha || new Date().toISOString().split('T')[0],
                eventoData?.horario || '12:00:00',
                eventoData?.personas || 1,
                eventoData?.tipoDesayuno || 'Clásico'
            ]
        );

        for (const serv of servicios) {
            const tipoServicio = await executeQuerySingle<any>(
                `SELECT id FROM catering_service_tipos WHERE clave = ?`,
                [serv.tipoKey]
            );
            if (!tipoServicio) continue;

            const serviceResult = await executeMutation(
                `INSERT INTO catering_service_ventas (id_empresa, id_venta, id_tipo_servicio, subtotal_servicio)
                 VALUES (?, ?, ?, ?)`,
                [
                    id_empresa,
                    ventaId,
                    tipoServicio.id,
                    serv.productos.reduce((sum: number, p: any) => sum + p.cantidad * p.precio, 0)
                ]
            );
            const serviceId = serviceResult.insertId;

            for (const prod of serv.productos) {
                await executeMutation(
                    `INSERT INTO catering_service_detalle 
                        (id_empresa, id_service_venta, id_producto_carta, cantidad, precio_unitario, subtotal) 
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [
                        id_empresa,
                        serviceId,
                        prod.id,
                        prod.cantidad,
                        prod.precio,
                        prod.cantidad * prod.precio
                    ]
                );
            }
        }

        for (const mat of materiales) {
            await executeMutation(
                `INSERT INTO catering_materiales_venta 
                    (id_empresa, id_venta, id_material_catalogo, cantidad, precio_unitario, subtotal) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    id_empresa,
                    ventaId,
                    mat.id,
                    mat.cantidad,
                    mat.precio,
                    mat.cantidad * mat.precio
                ]
            );
        }

        const nuevaVenta = await executeQuerySingle<any>(
            `SELECT * FROM ventas WHERE id = ? AND id_empresa = ?`,
            [ventaId, id_empresa]
        );

        res.status(201).json({
            ...nuevaVenta,
            id_empresa: nuevaVenta.id_empresa,
            cliente: `${cliente.nombre || ''} ${cliente.apellido || ''}`.trim(),
            clienteDoc: cliente.numero_documento,
            servicios,
            materiales,
            eventoData
        });

    } catch (error) {
        console.error('[createVentaCatering] Error:', error);
        res.status(500).json({ message: 'Error al crear venta de catering', error: error instanceof Error ? error.message : String(error) });
    }
};

export const updateVentaCatering = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { id_empresa, id_cliente, servicios, materiales, eventoData, subtotal, igv, total, metodo_pago } = req.body;

        if (!id_empresa) {
            return res.status(400).json({ message: 'id_empresa es requerido' });
        }

        const ventaExistente = await executeQuerySingle<any>(
            `SELECT * FROM ventas WHERE id = ? AND id_empresa = ?`,
            [id, id_empresa]
        );
        if (!ventaExistente) {
            return res.status(404).json({ message: 'Venta no encontrada' });
        }

        let query = `UPDATE ventas SET subtotal = ?, igv = ?, total = ?, metodo_pago = ?`;
        const params: any[] = [subtotal || 0, igv || 0, total || 0, metodo_pago || 'EFECTIVO'];

        if (id_cliente) {
            query += `, id_cliente = ?`;
            params.push(id_cliente);
        }

        query += ` WHERE id = ? AND id_empresa = ?`;
        params.push(id, id_empresa);

        await executeMutation(query, params);

        if (eventoData) {
            await executeMutation(
                `UPDATE catering_eventos SET fecha_evento = ?, horario = ?, personas = ?, tipo_desayuno = ?
                 WHERE id_venta = ? AND id_empresa = ?`,
                [
                    eventoData.fecha,
                    eventoData.horario,
                    eventoData.personas,
                    eventoData.tipoDesayuno,
                    id,
                    id_empresa
                ]
            );
        }

        const serviciosAntiguos = await executeQuery<any[]>(
            `SELECT id FROM catering_service_ventas WHERE id_venta = ? AND id_empresa = ?`,
            [id, id_empresa]
        );
        for (const serv of serviciosAntiguos) {
            await executeMutation(
                `DELETE FROM catering_service_detalle WHERE id_service_venta = ? AND id_empresa = ?`,
                [(serv as any).id, id_empresa]
            );
        }
        await executeMutation(
            `DELETE FROM catering_service_ventas WHERE id_venta = ? AND id_empresa = ?`,
            [id, id_empresa]
        );

        for (const serv of servicios) {
            const tipoServicio = await executeQuerySingle<any>(
                `SELECT id FROM catering_service_tipos WHERE clave = ?`,
                [serv.tipoKey]
            );
            if (!tipoServicio) continue;

            const serviceResult = await executeMutation(
                `INSERT INTO catering_service_ventas (id_empresa, id_venta, id_tipo_servicio, subtotal_servicio)
                 VALUES (?, ?, ?, ?)`,
                [
                    id_empresa,
                    id,
                    tipoServicio.id,
                    serv.productos.reduce((sum: number, p: any) => sum + p.cantidad * p.precio, 0)
                ]
            );
            const serviceId = serviceResult.insertId;

            for (const prod of serv.productos) {
                await executeMutation(
                    `INSERT INTO catering_service_detalle 
                        (id_empresa, id_service_venta, id_producto_carta, cantidad, precio_unitario, subtotal) 
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [
                        id_empresa,
                        serviceId,
                        prod.id,
                        prod.cantidad,
                        prod.precio,
                        prod.cantidad * prod.precio
                    ]
                );
            }
        }

        await executeMutation(
            `DELETE FROM catering_materiales_venta WHERE id_venta = ? AND id_empresa = ?`,
            [id, id_empresa]
        );
        for (const mat of materiales) {
            await executeMutation(
                `INSERT INTO catering_materiales_venta 
                    (id_empresa, id_venta, id_material_catalogo, cantidad, precio_unitario, subtotal) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    id_empresa,
                    id,
                    mat.id,
                    mat.cantidad,
                    mat.precio,
                    mat.cantidad * mat.precio
                ]
            );
        }

        const ventaActualizada = await executeQuerySingle<any>(
            `SELECT * FROM ventas WHERE id = ? AND id_empresa = ?`,
            [id, id_empresa]
        );
        const nuevoEvento = await executeQuerySingle<any>(
            `SELECT * FROM catering_eventos WHERE id_venta = ? AND id_empresa = ?`,
            [id, id_empresa]
        );
        const nuevosServicios = await executeQuery<any[]>(`
            SELECT sv.id, st.clave AS tipoKey, st.nombre AS tipoNombre, sv.subtotal_servicio
            FROM catering_service_ventas sv
            JOIN catering_service_tipos st ON sv.id_tipo_servicio = st.id
            WHERE sv.id_venta = ? AND sv.id_empresa = ?
        `, [id, id_empresa]);

        const serviciosConProductos = await Promise.all(
            nuevosServicios.map(async (serv: any) => {
                const productos = await executeQuery<any[]>(`
                    SELECT pc.id, pc.nombre, sd.cantidad, sd.precio_unitario AS precio
                    FROM catering_service_detalle sd
                    JOIN catering_service_productos_carta pc ON sd.id_producto_carta = pc.id
                    WHERE sd.id_service_venta = ? AND sd.id_empresa = ?
                `, [serv.id, id_empresa]);

                return {
                    id: serv.id,
                    tipoKey: serv.tipoKey,
                    tipoNombre: serv.tipoNombre,
                    productos: productos.map((p: any) => ({
                        id: p.id,
                        nombre: p.nombre,
                        precio: parseFloat(p.precio),
                        cantidad: p.cantidad
                    }))
                };
            })
        );

        const nuevosMateriales = await executeQuery<any[]>(`
            SELECT mc.id, mc.nombre, mv.cantidad, mv.precio_unitario AS precio
            FROM catering_materiales_venta mv
            JOIN catering_materiales_catalogo mc ON mv.id_material_catalogo = mc.id
            WHERE mv.id_venta = ? AND mv.id_empresa = ?
        `, [id, id_empresa]);

        res.json({
            ...ventaActualizada,
            id_empresa: ventaActualizada.id_empresa,
            eventoData: nuevoEvento ? {
                fecha: nuevoEvento.fecha_evento,
                horario: nuevoEvento.horario,
                personas: nuevoEvento.personas,
                tipoDesayuno: nuevoEvento.tipo_desayuno
            } : null,
            servicios: serviciosConProductos,
            materiales: nuevosMateriales.map((m: any) => ({
                id: m.id,
                nombre: m.nombre,
                precio: parseFloat(m.precio),
                cantidad: m.cantidad
            }))
        });

    } catch (error) {
        console.error('[updateVentaCatering] Error:', error);
        res.status(500).json({
            message: 'Error al actualizar venta de catering',
            error: error instanceof Error ? error.message : String(error)
        });
    }
};

export const anularVentaCatering = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const id_empresa = req.body.id_empresa ? Number(req.body.id_empresa) : null;
        if (!id_empresa) {
            return res.status(400).json({ message: 'id_empresa es requerido' });
        }

        const venta = await executeQuerySingle<any>(
            `SELECT * FROM ventas WHERE id = ? AND id_empresa = ?`,
            [id, id_empresa]
        );

        if (!venta) {
            return res.status(404).json({ message: 'Venta no encontrada' });
        }

        if (venta.estado === 'anulada') {
            return res.status(400).json({ message: 'La venta ya está anulada' });
        }

        await executeMutation(
            `UPDATE ventas SET estado = 'anulada' WHERE id = ? AND id_empresa = ?`,
            [id, id_empresa]
        );

        res.json({ message: 'Venta de catering anulada correctamente' });
    } catch (error) {
        console.error('[anularVentaCatering] Error:', error);
        res.status(500).json({ message: 'Error al anular venta de catering', error: error instanceof Error ? error.message : String(error) });
    }
};

export const registrarDevolucionCatering = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { id_empresa, productos_devueltos, materiales_devueltos, motivo, nota_credito, usuario_id } = req.body;

        if (!id_empresa) {
            return res.status(400).json({ message: 'id_empresa es requerido' });
        }

        if ((!productos_devueltos || productos_devueltos.length === 0) &&
            (!materiales_devueltos || materiales_devueltos.length === 0) || !usuario_id) {
            return res.status(400).json({ message: 'Faltan campos obligatorios: productos_devueltos, materiales_devueltos o usuario_id' });
        }

        const venta = await executeQuerySingle<any>(
            `SELECT * FROM ventas WHERE id = ? AND id_empresa = ?`,
            [id, id_empresa]
        );

        if (!venta) {
            return res.status(404).json({ message: 'Venta no encontrada' });
        }

        if (venta.estado === 'anulada') {
            return res.status(400).json({ message: 'No se puede devolver una venta anulada' });
        }

        let montoTotal = 0;

        const devolucionResult = await executeMutation(
            `INSERT INTO catering_devoluciones 
                (id_empresa, id_venta, fecha, id_usuario, motivo, nota_credito, monto) 
             VALUES (?, ?, NOW(), ?, ?, ?, ?)`,
            [
                id_empresa,
                id,
                usuario_id,
                motivo || 'Devolución',
                nota_credito || `NC-${venta.numero}`,
                0
            ]
        );
        const devolucionId = devolucionResult.insertId;


        if (productos_devueltos && productos_devueltos.length > 0) {
            for (const prod of productos_devueltos) {
                const detalle = await executeQuerySingle<any>(
                    `SELECT * FROM catering_service_detalle WHERE id = ? AND id_empresa = ?`,
                    [prod.id_item, id_empresa]
                );

                if (!detalle) continue;

                const montoItem = detalle.precio_unitario * prod.cantidad;
                montoTotal += montoItem;

                if (detalle.cantidad >= prod.cantidad) {
                    await executeMutation(
                        `UPDATE catering_service_detalle SET cantidad = cantidad - ? WHERE id = ? AND id_empresa = ?`,
                        [prod.cantidad, prod.id_item, id_empresa]
                    );
                }

                await executeMutation(
                    `INSERT INTO catering_detalle_devolucion 
                        (id_empresa, id_devolucion, tipo_item, id_item, cantidad, monto) 
                     VALUES (?, ?, 'servicio', ?, ?, ?)`,
                    [
                        id_empresa,
                        devolucionId,
                        prod.id_item,
                        prod.cantidad,
                        montoItem
                    ]
                );
            }
        }

        if (materiales_devueltos && materiales_devueltos.length > 0) {
            for (const mat of materiales_devueltos) {
                const materialVenta = await executeQuerySingle<any>(
                    `SELECT * FROM catering_materiales_venta WHERE id = ? AND id_empresa = ?`,
                    [mat.id_item, id_empresa]
                ) as any;

                if (!materialVenta) continue;

                const montoItem = materialVenta.precio_unitario * mat.cantidad;
                montoTotal += montoItem;

                if (materialVenta.cantidad >= mat.cantidad) {
                    await executeMutation(
                        `UPDATE catering_materiales_venta SET cantidad = cantidad - ? WHERE id = ? AND id_empresa = ?`,
                        [mat.cantidad, mat.id_item, id_empresa]
                    );
                }

                await executeMutation(
                    `INSERT INTO catering_detalle_devolucion 
                        (id_empresa, id_devolucion, tipo_item, id_item, cantidad, monto) 
                     VALUES (?, ?, 'material', ?, ?, ?)`,
                    [
                        id_empresa,
                        devolucionId,
                        mat.id_item,
                        mat.cantidad,
                        montoItem
                    ]
                );
            }
        }

        await executeMutation(
            `UPDATE catering_devoluciones SET monto = ? WHERE id = ? AND id_empresa = ?`,
            [montoTotal, devolucionId, id_empresa]
        );

        await executeMutation(
            `UPDATE ventas SET subtotal = subtotal - ?, igv = igv - (? * 0.18), total = total - (? * 1.18)
             WHERE id = ? AND id_empresa = ?`,
            [montoTotal, montoTotal, montoTotal, id, id_empresa]
        );

        const detallesRestantesServicios = await executeQuery<any[]>(
            `SELECT SUM(cantidad) AS total FROM catering_service_detalle 
             WHERE id_service_venta IN (SELECT id FROM catering_service_ventas WHERE id_venta = ? AND id_empresa = ?)`,
            [id, id_empresa]
        );
        const detallesRestantesMateriales = await executeQuery<any[]>(
            `SELECT SUM(cantidad) AS total FROM catering_materiales_venta WHERE id_venta = ? AND id_empresa = ?`,
            [id, id_empresa]
        );
        const totalRestante = ((detallesRestantesServicios[0] as any)?.total || 0) +
            ((detallesRestantesMateriales[0] as any)?.total || 0);

        const nuevoEstado = totalRestante > 0 ? 'devolucion-parcial' : 'devolucion-total';
        await executeMutation(
            `UPDATE ventas SET estado = ? WHERE id = ? AND id_empresa = ?`,
            [nuevoEstado, id, id_empresa]
        );

        res.json({
            message: 'Devolución registrada correctamente',
            devolucionId,
            monto: montoTotal,
            notaCredito: nota_credito || `NC-${venta.numero}`
        });

    } catch (error) {
        console.error('[registrarDevolucionCatering] Error:', error);
        res.status(500).json({ message: 'Error al registrar devolución de catering', error: error instanceof Error ? error.message : String(error) });
    }
};