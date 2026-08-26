import { Request, Response } from 'express';
import { executeQuery, executeMutation, executeQuerySingle } from '../config/database';

export const getVentas = async (req: Request, res: Response) => {
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
            WHERE v.id_empresa = ?
            ORDER BY v.id DESC
        `, [id_empresa]);

        const ventasConDetalles = await Promise.all(
            rows.map(async (venta: any) => {
                const detalles = await executeQuery<any[]>(`
                    SELECT 
                        dv.id AS detalleId,
                        dv.id_lote,
                        dv.nombre_producto,
                        dv.precio_unitario,
                        dv.cantidad,
                        l.postre_id,
                        p.nombre AS postre_nombre
                    FROM detalle_venta dv
                    JOIN lotes l ON dv.id_lote = l.id
                    JOIN postres p ON l.postre_id = p.id
                    WHERE dv.id_venta = ? AND dv.id_empresa = ?
                `, [venta.id, id_empresa]);

                const devoluciones = await executeQuery<any[]>(`
                    SELECT 
                        d.*,
                        u.usuario AS usuario_nombre,
                        GROUP_CONCAT(
                            JSON_OBJECT(
                                'id', dv.id,
                                'nombre', dv.nombre_producto,
                                'precio', dv.precio_unitario,
                                'cantidad', dd.cantidad
                            )
                        ) AS productos_json
                    FROM devoluciones d
                    JOIN usuarios u ON d.id_usuario = u.id
                    LEFT JOIN detalle_devolucion dd ON d.id = dd.id_devolucion
                    LEFT JOIN detalle_venta dv ON dd.id_detalle_venta = dv.id
                    WHERE d.id_venta = ? AND d.id_empresa = ?
                    GROUP BY d.id
                `, [venta.id, id_empresa]);

                return {
                    ...venta,
                    id_empresa: venta.id_empresa,
                    cliente: `${venta.cliente_nombre || ''} ${venta.cliente_apellido || ''}`.trim(),
                    clienteDoc: venta.cliente_documento,
                    productos: detalles.map((d: any) => ({
                        id: d.id_lote,
                        detalleId: d.detalleId,
                        nombre: d.nombre_producto || d.postre_nombre,
                        precio: parseFloat(d.precio_unitario),
                        cantidad: d.cantidad
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
        console.error('[getVentas] Error:', error);
        res.status(500).json({ message: 'Error al obtener ventas', error: error instanceof Error ? error.message : String(error) });
    }
};

export const getVentaById = async (req: Request, res: Response) => {
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

        const detalles = await executeQuery<any[]>(`
            SELECT 
                dv.id AS detalleId,
                dv.id_lote,
                dv.nombre_producto,
                dv.precio_unitario,
                dv.cantidad,
                l.postre_id,
                p.nombre AS postre_nombre
            FROM detalle_venta dv
            JOIN lotes l ON dv.id_lote = l.id
            JOIN postres p ON l.postre_id = p.id
            WHERE dv.id_venta = ? AND dv.id_empresa = ?
        `, [id, id_empresa]);

        const devoluciones = await executeQuery<any[]>(`
            SELECT 
                d.*,
                u.usuario AS usuario_nombre,
                GROUP_CONCAT(
                    JSON_OBJECT(
                        'id', dv.id,
                        'nombre', dv.nombre_producto,
                        'precio', dv.precio_unitario,
                        'cantidad', dd.cantidad
                    )
                ) AS productos_json
            FROM devoluciones d
            JOIN usuarios u ON d.id_usuario = u.id
            LEFT JOIN detalle_devolucion dd ON d.id = dd.id_devolucion
            LEFT JOIN detalle_venta dv ON dd.id_detalle_venta = dv.id
            WHERE d.id_venta = ? AND d.id_empresa = ?
            GROUP BY d.id
        `, [id, id_empresa]);

        const result = {
            ...venta,
            id_empresa: venta.id_empresa,
            cliente: `${venta.cliente_nombre || ''} ${venta.cliente_apellido || ''}`.trim(),
            clienteDoc: venta.cliente_documento,
            productos: detalles.map((d: any) => ({
                id: d.id_lote,
                detalleId: d.detalleId,
                nombre: d.nombre_producto || d.postre_nombre,
                precio: parseFloat(d.precio_unitario),
                cantidad: d.cantidad
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
        console.error('[getVentaById] Error:', error);
        res.status(500).json({ message: 'Error al obtener venta', error: error instanceof Error ? error.message : String(error) });
    }
};

export const getNextNumeroVenta = async (req: Request, res: Response) => {
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
        console.error('[getNextNumeroVenta] Error:', error);
        res.status(500).json({ message: 'Error al generar número de venta' });
    }
};

export const getCatalogoProductos = async (req: Request, res: Response) => {
    try {
        const id_empresa = req.query.id_empresa ? Number(req.query.id_empresa) : null;
        if (!id_empresa) {
            return res.status(400).json({ message: 'id_empresa es requerido' });
        }

        const rows = await executeQuery<any[]>(`
            SELECT 
                l.id AS lote_id,
                p.id AS postre_id,
                p.nombre AS nombre,
                p.precio AS precio,
                l.stock,
                l.fecha_vencimiento AS fechaVencimiento,
                l.dias_duracion AS diasDuracion
            FROM lotes l
            JOIN postres p ON l.postre_id = p.id
            WHERE l.stock > 0 
              AND l.fecha_vencimiento >= CURDATE()
              AND l.id_empresa = ?
            ORDER BY p.nombre, l.fecha_vencimiento
        `, [id_empresa]);

        const result = rows.map((row: any) => ({
            id: row.lote_id,
            id_empresa: row.id_empresa,
            postreId: row.postre_id,
            nombre: row.nombre,
            precio: parseFloat(row.precio),
            stock: row.stock,
            fechaVencimiento: row.fechaVencimiento,
            diasDuracion: row.dias_duracion
        }));

        res.json(result);
    } catch (error) {
        console.error('[getCatalogoProductos] Error:', error);
        res.status(500).json({ message: 'Error al obtener catálogo de productos' });
    }
};

export const getClientes = async (req: Request, res: Response) => {
    try {
        const id_empresa = req.query.id_empresa ? Number(req.query.id_empresa) : null;
        if (!id_empresa) {
            return res.status(400).json({ message: 'id_empresa es requerido' });
        }

        const rows = await executeQuery<any[]>(`
            SELECT 
                id,
                id_empresa,
                numero_documento,
                nombre,
                apellido,
                tipo_persona,
                tipo_documento,
                email,
                celular
            FROM personas
            WHERE tipo_persona IN ('cliente_natural', 'cliente_juridico')
              AND id_empresa = ?
            ORDER BY nombre, apellido
        `, [id_empresa]);

        const result = rows.map((row: any) => ({
            id: row.id,
            id_empresa: row.id_empresa,
            numeroDocumento: row.numero_documento,
            nombre: row.nombre || '',
            apellido: row.apellido || '',
            nombreCompleto: `${row.nombre || ''} ${row.apellido || ''}`.trim(),
            tipoPersona: row.tipo_persona,
            tipoDocumento: row.tipo_documento,
            email: row.email,
            celular: row.celular
        }));

        res.json(result);
    } catch (error) {
        console.error('[getClientes] Error:', error);
        res.status(500).json({ message: 'Error al obtener clientes' });
    }
};

export const createVenta = async (req: Request, res: Response) => {
    try {
        const {
            id_empresa,
            cliente_documento,
            cliente_nombre,
            cliente_apellido,
            cliente_email,
            cliente_celular,
            productos,
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
        if (!cliente_documento || !productos || productos.length === 0 || !usuario_id) {
            return res.status(400).json({ message: 'Faltan campos obligatorios: cliente_documento, productos, usuario_id' });
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

        for (const prod of productos) {
            const lote = await executeQuerySingle<any>(
                `SELECT stock FROM lotes WHERE id = ? AND id_empresa = ?`,
                [prod.id_lote, id_empresa]
            );

            if (!lote || lote.stock < prod.cantidad) {
                throw new Error(`Stock insuficiente para el producto ${prod.nombre || prod.id_lote}`);
            }

            await executeMutation(
                `INSERT INTO detalle_venta 
                    (id_empresa, id_venta, id_lote, nombre_producto, precio_unitario, cantidad, subtotal) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    id_empresa,
                    ventaId,
                    prod.id_lote,
                    prod.nombre || '',
                    prod.precio || 0,
                    prod.cantidad,
                    (prod.precio || 0) * prod.cantidad
                ]
            );

            await executeMutation(
                `UPDATE lotes SET stock = stock - ? WHERE id = ? AND id_empresa = ?`,
                [prod.cantidad, prod.id_lote, id_empresa]
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
            productos: productos
        });

    } catch (error) {
        console.error('[createVenta] Error:', error);
        res.status(500).json({ message: 'Error al crear venta', error: error instanceof Error ? error.message : String(error) });
    }
};

export const anularVenta = async (req: Request, res: Response) => {
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

        const detalles = await executeQuery<any[]>(
            `SELECT * FROM detalle_venta WHERE id_venta = ? AND id_empresa = ?`,
            [id, id_empresa]
        );

        for (const detalle of detalles) {
            await executeMutation(
                `UPDATE lotes SET stock = stock + ? WHERE id = ? AND id_empresa = ?`,
                [(detalle as any).cantidad, (detalle as any).id_lote, id_empresa]
            );
        }

        await executeMutation(
            `UPDATE ventas SET estado = 'anulada' WHERE id = ? AND id_empresa = ?`,
            [id, id_empresa]
        );

        res.json({ message: 'Venta anulada correctamente' });
    } catch (error) {
        console.error('[anularVenta] Error:', error);
        res.status(500).json({ message: 'Error al anular venta', error: error instanceof Error ? error.message : String(error) });
    }
};

export const registrarDevolucion = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { id_empresa, productos_devueltos, motivo, nota_credito, usuario_id } = req.body;

        if (!id_empresa) {
            return res.status(400).json({ message: 'id_empresa es requerido' });
        }
        if (!productos_devueltos || productos_devueltos.length === 0 || !usuario_id) {
            return res.status(400).json({ message: 'Faltan campos obligatorios: productos_devueltos, usuario_id' });
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
        const detallesDevueltos = [];

        for (const prod of productos_devueltos) {
            const detalle = await executeQuerySingle<any>(
                `SELECT * FROM detalle_venta WHERE id = ? AND id_venta = ? AND id_empresa = ?`,
                [prod.id_detalle_venta, id, id_empresa]
            );

            if (!detalle) {
                return res.status(400).json({ message: `Detalle de venta ${prod.id_detalle_venta} no encontrado` });
            }

            if (prod.cantidad > detalle.cantidad) {
                return res.status(400).json({ message: `No se puede devolver más de lo vendido (${detalle.cantidad})` });
            }

            montoTotal += detalle.precio_unitario * prod.cantidad;
            detallesDevueltos.push({
                ...detalle,
                cantidad_devuelta: prod.cantidad
            });
        }

        const devolucionResult = await executeMutation(
            `INSERT INTO devoluciones 
                (id_empresa, id_venta, fecha, id_usuario, motivo, nota_credito, monto) 
             VALUES (?, ?, NOW(), ?, ?, ?, ?)`,
            [
                id_empresa,
                id,
                usuario_id,
                motivo || 'Devolución',
                nota_credito || `NC-${venta.numero}`,
                montoTotal
            ]
        );

        const devolucionId = devolucionResult.insertId;

        for (const dev of detallesDevueltos) {
            await executeMutation(
                `INSERT INTO detalle_devolucion 
                    (id_empresa, id_devolucion, id_detalle_venta, cantidad) 
                 VALUES (?, ?, ?, ?)`,
                [
                    id_empresa,
                    devolucionId,
                    (dev as any).id,
                    (dev as any).cantidad_devuelta
                ]
            );

            await executeMutation(
                `UPDATE lotes SET stock = stock + ? WHERE id = ? AND id_empresa = ?`,
                [(dev as any).cantidad_devuelta, (dev as any).id_lote, id_empresa]
            );

            await executeMutation(
                `UPDATE detalle_venta SET cantidad = cantidad - ? WHERE id = ? AND id_empresa = ?`,
                [(dev as any).cantidad_devuelta, (dev as any).id, id_empresa]
            );
        }

        const detallesRestantes = await executeQuery<any[]>(
            `SELECT SUM(cantidad) AS total FROM detalle_venta WHERE id_venta = ? AND id_empresa = ?`,
            [id, id_empresa]
        );

        const totalRestante = (detallesRestantes[0] as any)?.total || 0;
        const nuevoEstado = totalRestante > 0 ? 'devolucion-parcial' : 'devolucion-total';
        await executeMutation(
            `UPDATE ventas SET estado = ? WHERE id = ? AND id_empresa = ?`,
            [nuevoEstado, id, id_empresa]
        );

        const nuevosTotales = await executeQuery<any[]>(
            `SELECT 
                SUM(precio_unitario * cantidad) AS subtotal,
                SUM(precio_unitario * cantidad) * 0.18 AS igv,
                SUM(precio_unitario * cantidad) * 1.18 AS total
             FROM detalle_venta 
             WHERE id_venta = ? AND id_empresa = ?`,
            [id, id_empresa]
        );

        const totales = (nuevosTotales[0] as any) || { subtotal: 0, igv: 0, total: 0 };

        await executeMutation(
            `UPDATE ventas SET subtotal = ?, igv = ?, total = ? WHERE id = ? AND id_empresa = ?`,
            [
                totales.subtotal || 0,
                totales.igv || 0,
                totales.total || 0,
                id,
                id_empresa
            ]
        );

        res.json({
            message: 'Devolución registrada correctamente',
            devolucionId,
            monto: montoTotal,
            notaCredito: nota_credito || `NC-${venta.numero}`
        });

    } catch (error) {
        console.error('[registrarDevolucion] Error:', error);
        res.status(500).json({ message: 'Error al registrar devolución', error: error instanceof Error ? error.message : String(error) });
    }
};

export const updateVenta = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { id_empresa, id_cliente, productos, subtotal, igv, total } = req.body;

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

        const detallesAntiguos = await executeQuery<any[]>(
            `SELECT * FROM detalle_venta WHERE id_venta = ? AND id_empresa = ?`,
            [id, id_empresa]
        );

        for (const detalle of detallesAntiguos) {
            await executeMutation(
                `UPDATE lotes SET stock = stock + ? WHERE id = ? AND id_empresa = ?`,
                [(detalle as any).cantidad, (detalle as any).id_lote, id_empresa]
            );
        }

        for (const prod of productos) {
            if (!prod.id_lote) {
                throw new Error(`Lote no especificado para el producto ${prod.nombre}`);
            }
            const lote = await executeQuerySingle<any>(
                `SELECT stock FROM lotes WHERE id = ? AND id_empresa = ?`,
                [prod.id_lote, id_empresa]
            );
            if (!lote) {
                throw new Error(`Lote ${prod.id_lote} no encontrado`);
            }
            if (lote.stock < prod.cantidad) {
                throw new Error(`Stock insuficiente para ${prod.nombre}`);
            }

            await executeMutation(
                `UPDATE lotes SET stock = stock - ? WHERE id = ? AND id_empresa = ?`,
                [prod.cantidad, prod.id_lote, id_empresa]
            );

            const detalleExistente = await executeQuerySingle<any>(
                `SELECT id FROM detalle_venta WHERE id_venta = ? AND id_lote = ? AND id_empresa = ?`,
                [id, prod.id_lote, id_empresa]
            );

            if (detalleExistente) {
                await executeMutation(
                    `UPDATE detalle_venta 
                     SET cantidad = ?, precio_unitario = ?, subtotal = ?, nombre_producto = ?
                     WHERE id = ? AND id_empresa = ?`,
                    [prod.cantidad, prod.precio, prod.cantidad * prod.precio, prod.nombre, detalleExistente.id, id_empresa]
                );
            } else {
                await executeMutation(
                    `INSERT INTO detalle_venta 
                        (id_empresa, id_venta, id_lote, nombre_producto, precio_unitario, cantidad, subtotal) 
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [
                        id_empresa,
                        id,
                        prod.id_lote,
                        prod.nombre || '',
                        prod.precio || 0,
                        prod.cantidad,
                        (prod.precio || 0) * prod.cantidad
                    ]
                );
            }
        }

        const idsNuevos = productos.map((p: any) => p.id_lote).filter((id: any) => id !== undefined);
        if (idsNuevos.length > 0) {
            const detallesAEliminar = await executeQuery<any[]>(
                `SELECT id FROM detalle_venta 
                 WHERE id_venta = ? AND id_empresa = ? AND id_lote NOT IN (${idsNuevos.map(() => '?').join(',')})`,
                [id, id_empresa, ...idsNuevos]
            );
            for (const det of detallesAEliminar) {
                const tieneDevolucion = await executeQuerySingle<any>(
                    `SELECT id FROM detalle_devolucion WHERE id_detalle_venta = ? AND id_empresa = ?`,
                    [(det as any).id, id_empresa]
                );
                if (!tieneDevolucion) {
                    await executeMutation(
                        `DELETE FROM detalle_venta WHERE id = ? AND id_empresa = ?`,
                        [(det as any).id, id_empresa]
                    );
                } else {
                    console.warn(`Detalle ${(det as any).id} tiene devoluciones, no se elimina.`);
                }
            }
        }

        let query = `UPDATE ventas SET subtotal = ?, igv = ?, total = ?`;
        const params: any[] = [subtotal || 0, igv || 0, total || 0];

        if (id_cliente) {
            query += `, id_cliente = ?`;
            params.push(id_cliente);
        }

        query += ` WHERE id = ? AND id_empresa = ?`;
        params.push(id, id_empresa);

        await executeMutation(query, params);

        const ventaActualizada = await executeQuerySingle<any>(
            `SELECT * FROM ventas WHERE id = ? AND id_empresa = ?`,
            [id, id_empresa]
        );
        const nuevosDetalles = await executeQuery<any[]>(
            `SELECT * FROM detalle_venta WHERE id_venta = ? AND id_empresa = ?`,
            [id, id_empresa]
        );

        res.json({
            ...ventaActualizada,
            id_empresa: ventaActualizada.id_empresa,
            productos: nuevosDetalles.map((d: any) => ({
                id: d.id_lote,
                nombre: d.nombre_producto,
                precio: parseFloat(d.precio_unitario),
                cantidad: d.cantidad
            }))
        });
    } catch (error) {
        console.error('[updateVenta] Error:', error);
        res.status(500).json({
            message: 'Error al actualizar venta',
            error: error instanceof Error ? error.message : String(error)
        });
    }
};