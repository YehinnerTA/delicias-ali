import { Request, Response } from 'express';
import { executeQuery, executeMutation, executeQuerySingle } from '../config/database';

export const getGastosByEvento = async (req: Request, res: Response) => {
    try {
        const { evento_id, id_empresa, categoria, etapa } = req.query;

        if (!evento_id || !id_empresa) {
            return res.status(400).json({ message: 'evento_id e id_empresa son requeridos' });
        }

        let query = `
            SELECT 
                g.*,
                p.nombre AS proveedor_nombre,
                p.apellido AS proveedor_apellido,
                p.razon_social AS proveedor_razon_social,
                p.numero_documento AS proveedor_documento,
                u.usuario AS registrado_por_usuario,
                ce.item AS checklist_item_nombre
            FROM catering_evento_gastos g
            LEFT JOIN personas p ON g.id_proveedor = p.id
            LEFT JOIN usuarios u ON g.registrado_por = u.id
            LEFT JOIN catering_evento_checklist ce ON g.id_checklist_item = ce.id
            WHERE g.id_evento = ? AND g.id_empresa = ?
        `;

        const params: any[] = [evento_id, id_empresa];

        if (categoria) {
            query += ` AND g.categoria = ?`;
            params.push(categoria);
        }

        if (etapa) {
            query += ` AND g.etapa = ?`;
            params.push(etapa);
        }

        query += ` ORDER BY g.created_at DESC`;

        const gastos = await executeQuery<any[]>(query, params);

        res.json(
            gastos.map((g: any) => ({
                id: g.id,
                id_empresa: g.id_empresa,
                id_evento: g.id_evento,
                id_checklist_item: g.id_checklist_item,
                checklist_item_nombre: g.checklist_item_nombre,
                categoria: g.categoria,
                etapa: g.etapa,
                descripcion: g.descripcion,
                cantidad: parseFloat(g.cantidad),
                unidad: g.unidad,
                precio_unitario: parseFloat(g.precio_unitario),
                subtotal: parseFloat(g.subtotal),
                id_proveedor: g.id_proveedor,
                proveedor_nombre:
                    g.proveedor_razon_social ||
                    `${g.proveedor_nombre || ''} ${g.proveedor_apellido || ''}`.trim() ||
                    null,
                proveedor_documento: g.proveedor_documento,
                tiene_factura: g.tiene_factura === 1,
                numero_factura: g.numero_factura,
                fecha_gasto: g.fecha_gasto,
                observaciones: g.observaciones,
                registrado_por: g.registrado_por,
                registrado_por_usuario: g.registrado_por_usuario,
                created_at: g.created_at,
                updated_at: g.updated_at
            }))
        );
    } catch (error) {
        console.error('[getGastosByEvento] Error:', error);
        res.status(500).json({ message: 'Error al obtener gastos', error });
    }
};

export const getGastoById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { id_empresa } = req.query;

        if (!id_empresa) {
            return res.status(400).json({ message: 'id_empresa es requerido' });
        }

        const gasto = await executeQuerySingle<any>(
            `SELECT 
                g.*,
                p.nombre AS proveedor_nombre,
                p.apellido AS proveedor_apellido,
                p.razon_social AS proveedor_razon_social,
                p.numero_documento AS proveedor_documento,
                u.usuario AS registrado_por_usuario,
                ce.item AS checklist_item_nombre
            FROM catering_evento_gastos g
            LEFT JOIN personas p ON g.id_proveedor = p.id
            LEFT JOIN usuarios u ON g.registrado_por = u.id
            LEFT JOIN catering_evento_checklist ce ON g.id_checklist_item = ce.id
            WHERE g.id = ? AND g.id_empresa = ?`,
            [id, id_empresa]
        );

        if (!gasto) {
            return res.status(404).json({ message: 'Gasto no encontrado' });
        }

        res.json({
            id: gasto.id,
            id_empresa: gasto.id_empresa,
            id_evento: gasto.id_evento,
            id_checklist_item: gasto.id_checklist_item,
            checklist_item_nombre: gasto.checklist_item_nombre,
            categoria: gasto.categoria,
            etapa: gasto.etapa,
            descripcion: gasto.descripcion,
            cantidad: parseFloat(gasto.cantidad),
            unidad: gasto.unidad,
            precio_unitario: parseFloat(gasto.precio_unitario),
            subtotal: parseFloat(gasto.subtotal),
            id_proveedor: gasto.id_proveedor,
            proveedor_nombre:
                gasto.proveedor_razon_social ||
                `${gasto.proveedor_nombre || ''} ${gasto.proveedor_apellido || ''}`.trim() ||
                null,
            proveedor_documento: gasto.proveedor_documento,
            tiene_factura: gasto.tiene_factura === 1,
            numero_factura: gasto.numero_factura,
            fecha_gasto: gasto.fecha_gasto,
            observaciones: gasto.observaciones,
            registrado_por: gasto.registrado_por,
            registrado_por_usuario: gasto.registrado_por_usuario,
            created_at: gasto.created_at,
            updated_at: gasto.updated_at
        });
    } catch (error) {
        console.error('[getGastoById] Error:', error);
        res.status(500).json({ message: 'Error al obtener gasto', error });
    }
};

export const getResumenGastos = async (req: Request, res: Response) => {
    try {
        const { evento_id, id_empresa } = req.query;

        if (!evento_id || !id_empresa) {
            return res.status(400).json({ message: 'evento_id e id_empresa son requeridos' });
        }

        const totalRow = await executeQuerySingle<any>(
            `SELECT 
                COUNT(*) AS total_items,
                COALESCE(SUM(subtotal), 0) AS total_general
             FROM catering_evento_gastos
             WHERE id_evento = ? AND id_empresa = ?`,
            [evento_id, id_empresa]
        );

        const porCategoria = await executeQuery<any[]>(
            `SELECT 
                categoria,
                COUNT(*) AS cantidad_items,
                COALESCE(SUM(subtotal), 0) AS subtotal
             FROM catering_evento_gastos
             WHERE id_evento = ? AND id_empresa = ?
             GROUP BY categoria
             ORDER BY subtotal DESC`,
            [evento_id, id_empresa]
        );

        const porEtapa = await executeQuery<any[]>(
            `SELECT 
                etapa,
                COUNT(*) AS cantidad_items,
                COALESCE(SUM(subtotal), 0) AS subtotal
             FROM catering_evento_gastos
             WHERE id_evento = ? AND id_empresa = ?
             GROUP BY etapa`,
            [evento_id, id_empresa]
        );

        const conFactura = await executeQuerySingle<any>(
            `SELECT 
                COALESCE(SUM(CASE WHEN tiene_factura = 1 THEN subtotal ELSE 0 END), 0) AS con_factura,
                COALESCE(SUM(CASE WHEN tiene_factura = 0 THEN subtotal ELSE 0 END), 0) AS sin_factura
             FROM catering_evento_gastos
             WHERE id_evento = ? AND id_empresa = ?`,
            [evento_id, id_empresa]
        );

        res.json({
            total_general: parseFloat(totalRow?.total_general || 0),
            total_items: totalRow?.total_items || 0,
            por_categoria: porCategoria.map((c: any) => ({
                categoria: c.categoria,
                cantidad_items: c.cantidad_items,
                subtotal: parseFloat(c.subtotal)
            })),
            por_etapa: porEtapa.map((e: any) => ({
                etapa: e.etapa,
                cantidad_items: e.cantidad_items,
                subtotal: parseFloat(e.subtotal)
            })),
            con_factura: parseFloat(conFactura?.con_factura || 0),
            sin_factura: parseFloat(conFactura?.sin_factura || 0)
        });
    } catch (error) {
        console.error('[getResumenGastos] Error:', error);
        res.status(500).json({ message: 'Error al obtener resumen de gastos', error });
    }
};

export const createGasto = async (req: Request, res: Response) => {
    try {
        const {
            id_empresa,
            id_evento,
            id_checklist_item,
            categoria,
            etapa,
            descripcion,
            cantidad,
            unidad,
            precio_unitario,
            id_proveedor,
            tiene_factura,
            numero_factura,
            fecha_gasto,
            observaciones,
            registrado_por
        } = req.body;

        if (!id_empresa || !id_evento || !categoria || !etapa || !descripcion || !registrado_por) {
            return res.status(400).json({
                message: 'Faltan campos obligatorios: id_empresa, id_evento, categoria, etapa, descripcion, registrado_por'
            });
        }

        if (precio_unitario == null || parseFloat(precio_unitario) <= 0) {
            return res.status(400).json({ message: 'precio_unitario debe ser mayor a 0' });
        }

        if (cantidad == null || parseFloat(cantidad) <= 0) {
            return res.status(400).json({ message: 'cantidad debe ser mayor a 0' });
        }

        const evento = await executeQuerySingle<any>(
            `SELECT id FROM catering_eventos WHERE id = ? AND id_empresa = ?`,
            [id_evento, id_empresa]
        );
        if (!evento) {
            return res.status(404).json({ message: 'Evento no encontrado' });
        }

        const cantNum = parseFloat(cantidad);
        const precioNum = parseFloat(precio_unitario);
        const subtotal = parseFloat((cantNum * precioNum).toFixed(2));

        const result = await executeMutation(
            `INSERT INTO catering_evento_gastos 
                (id_empresa, id_evento, id_checklist_item, categoria, etapa,
                 descripcion, cantidad, unidad, precio_unitario, subtotal,
                 id_proveedor, tiene_factura, numero_factura,
                 fecha_gasto, observaciones, registrado_por)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                id_empresa,
                id_evento,
                id_checklist_item || null,
                categoria,
                etapa,
                descripcion,
                cantNum,
                unidad || null,
                precioNum,
                subtotal,
                id_proveedor || null,
                tiene_factura ? 1 : 0,
                numero_factura || null,
                fecha_gasto || new Date().toISOString().split('T')[0],
                observaciones || null,
                registrado_por
            ]
        );

        const gastoId = result.insertId;

        if (id_checklist_item) {
            await executeMutation(
                `UPDATE catering_evento_checklist 
                 SET estado_compra = 'comprar',
                     id_gasto = ?
                 WHERE id = ? AND id_empresa = ?`,
                [gastoId, id_checklist_item, id_empresa]
            );
        }

        const gastoCreado = await executeQuerySingle<any>(
            `SELECT 
                g.*,
                p.nombre AS proveedor_nombre,
                p.apellido AS proveedor_apellido,
                p.razon_social AS proveedor_razon_social,
                u.usuario AS registrado_por_usuario
             FROM catering_evento_gastos g
             LEFT JOIN personas p ON g.id_proveedor = p.id
             LEFT JOIN usuarios u ON g.registrado_por = u.id
             WHERE g.id = ?`,
            [gastoId]
        );

        res.status(201).json({
            id: gastoCreado.id,
            id_empresa: gastoCreado.id_empresa,
            id_evento: gastoCreado.id_evento,
            id_checklist_item: gastoCreado.id_checklist_item,
            categoria: gastoCreado.categoria,
            etapa: gastoCreado.etapa,
            descripcion: gastoCreado.descripcion,
            cantidad: parseFloat(gastoCreado.cantidad),
            unidad: gastoCreado.unidad,
            precio_unitario: parseFloat(gastoCreado.precio_unitario),
            subtotal: parseFloat(gastoCreado.subtotal),
            id_proveedor: gastoCreado.id_proveedor,
            proveedor_nombre:
                gastoCreado.proveedor_razon_social ||
                `${gastoCreado.proveedor_nombre || ''} ${gastoCreado.proveedor_apellido || ''}`.trim() ||
                null,
            tiene_factura: gastoCreado.tiene_factura === 1,
            numero_factura: gastoCreado.numero_factura,
            fecha_gasto: gastoCreado.fecha_gasto,
            observaciones: gastoCreado.observaciones,
            registrado_por: gastoCreado.registrado_por,
            registrado_por_usuario: gastoCreado.registrado_por_usuario,
            created_at: gastoCreado.created_at,
            updated_at: gastoCreado.updated_at
        });
    } catch (error) {
        console.error('[createGasto] Error:', error);
        res.status(500).json({ message: 'Error al crear gasto', error });
    }
};

export const updateGasto = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const {
            id_empresa,
            cantidad,
            precio_unitario,
            id_proveedor,
            tiene_factura,
            numero_factura,
            observaciones,
            descripcion,
            unidad
        } = req.body;

        if (!id_empresa) {
            return res.status(400).json({ message: 'id_empresa es requerido' });
        }

        const gastoExistente = await executeQuerySingle<any>(
            `SELECT * FROM catering_evento_gastos WHERE id = ? AND id_empresa = ?`,
            [id, id_empresa]
        );

        if (!gastoExistente) {
            return res.status(404).json({ message: 'Gasto no encontrado' });
        }

        const cantFinal = cantidad != null ? parseFloat(cantidad) : parseFloat(gastoExistente.cantidad);
        const precioFinal = precio_unitario != null ? parseFloat(precio_unitario) : parseFloat(gastoExistente.precio_unitario);

        if (cantFinal <= 0 || precioFinal <= 0) {
            return res.status(400).json({ message: 'cantidad y precio_unitario deben ser mayores a 0' });
        }

        const subtotal = parseFloat((cantFinal * precioFinal).toFixed(2));

        await executeMutation(
            `UPDATE catering_evento_gastos 
             SET cantidad = ?,
                 precio_unitario = ?,
                 subtotal = ?,
                 id_proveedor = ?,
                 tiene_factura = ?,
                 numero_factura = ?,
                 observaciones = ?,
                 descripcion = ?,
                 unidad = ?
             WHERE id = ? AND id_empresa = ?`,
            [
                cantFinal,
                precioFinal,
                subtotal,
                id_proveedor !== undefined ? (id_proveedor || null) : gastoExistente.id_proveedor,
                tiene_factura !== undefined ? (tiene_factura ? 1 : 0) : gastoExistente.tiene_factura,
                numero_factura !== undefined ? (numero_factura || null) : gastoExistente.numero_factura,
                observaciones !== undefined ? (observaciones || null) : gastoExistente.observaciones,
                descripcion || gastoExistente.descripcion,
                unidad !== undefined ? (unidad || null) : gastoExistente.unidad,
                id,
                id_empresa
            ]
        );

        const gastoActualizado = await executeQuerySingle<any>(
            `SELECT 
                g.*,
                p.nombre AS proveedor_nombre,
                p.apellido AS proveedor_apellido,
                p.razon_social AS proveedor_razon_social,
                u.usuario AS registrado_por_usuario
             FROM catering_evento_gastos g
             LEFT JOIN personas p ON g.id_proveedor = p.id
             LEFT JOIN usuarios u ON g.registrado_por = u.id
             WHERE g.id = ?`,
            [id]
        );

        res.json({
            id: gastoActualizado.id,
            id_empresa: gastoActualizado.id_empresa,
            id_evento: gastoActualizado.id_evento,
            id_checklist_item: gastoActualizado.id_checklist_item,
            categoria: gastoActualizado.categoria,
            etapa: gastoActualizado.etapa,
            descripcion: gastoActualizado.descripcion,
            cantidad: parseFloat(gastoActualizado.cantidad),
            unidad: gastoActualizado.unidad,
            precio_unitario: parseFloat(gastoActualizado.precio_unitario),
            subtotal: parseFloat(gastoActualizado.subtotal),
            id_proveedor: gastoActualizado.id_proveedor,
            proveedor_nombre:
                gastoActualizado.proveedor_razon_social ||
                `${gastoActualizado.proveedor_nombre || ''} ${gastoActualizado.proveedor_apellido || ''}`.trim() ||
                null,
            tiene_factura: gastoActualizado.tiene_factura === 1,
            numero_factura: gastoActualizado.numero_factura,
            fecha_gasto: gastoActualizado.fecha_gasto,
            observaciones: gastoActualizado.observaciones,
            registrado_por: gastoActualizado.registrado_por,
            registrado_por_usuario: gastoActualizado.registrado_por_usuario,
            created_at: gastoActualizado.created_at,
            updated_at: gastoActualizado.updated_at
        });
    } catch (error) {
        console.error('[updateGasto] Error:', error);
        res.status(500).json({ message: 'Error al actualizar gasto', error });
    }
};

export const deleteGasto = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { id_empresa } = req.query;

        if (!id_empresa) {
            return res.status(400).json({ message: 'id_empresa es requerido' });
        }

        const gasto = await executeQuerySingle<any>(
            `SELECT id, id_checklist_item FROM catering_evento_gastos 
             WHERE id = ? AND id_empresa = ?`,
            [id, id_empresa]
        );

        if (!gasto) {
            return res.status(404).json({ message: 'Gasto no encontrado' });
        }

        if (gasto.id_checklist_item) {
            await executeMutation(
                `UPDATE catering_evento_checklist 
                 SET estado_compra = NULL,
                     id_gasto = NULL
                 WHERE id = ? AND id_empresa = ?`,
                [gasto.id_checklist_item, id_empresa]
            );
        }

        await executeMutation(
            `DELETE FROM catering_evento_gastos WHERE id = ? AND id_empresa = ?`,
            [id, id_empresa]
        );

        res.json({ message: 'Gasto eliminado correctamente' });
    } catch (error) {
        console.error('[deleteGasto] Error:', error);
        res.status(500).json({ message: 'Error al eliminar gasto', error });
    }
};