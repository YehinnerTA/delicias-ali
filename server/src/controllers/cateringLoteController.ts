import { Request, Response } from 'express';
import { executeQuery, executeMutation, executeQuerySingle } from '../config/database';

export const getCateringLotes = async (req: Request, res: Response) => {
    try {
        const { id_empresa } = req.query;
        if (!id_empresa) {
            return res.status(400).json({ message: 'id_empresa es requerido' });
        }

        const rows = await executeQuery<any[]>(`
            SELECT 
                cl.*,
                p.nombre AS registrado_por_nombre,
                p.apellido AS registrado_por_apellido
            FROM catering_lotes cl
            JOIN personas p ON cl.registrado_por = p.id
            WHERE cl.id_empresa = ?
            ORDER BY cl.id DESC
        `, [id_empresa]);
        res.json(rows);
    } catch (error) {
        console.error('[getCateringLotes] Error:', error);
        res.status(500).json({ message: 'Error al obtener lotes de catering', error: error instanceof Error ? error.message : String(error) });
    }
};

export const getCateringLotesByItem = async (req: Request, res: Response) => {
    try {
        const { itemId } = req.params;
        const { id_empresa } = req.query;
        if (!id_empresa) {
            return res.status(400).json({ message: 'id_empresa es requerido' });
        }

        const rows = await executeQuery<any[]>(`
            SELECT 
                cl.*,
                p.nombre AS registrado_por_nombre,
                p.apellido AS registrado_por_apellido
            FROM catering_lotes cl
            JOIN personas p ON cl.registrado_por = p.id
            WHERE cl.id_item = ? AND cl.id_empresa = ?
            ORDER BY cl.fecha_vencimiento ASC
        `, [itemId, id_empresa]);
        res.json(rows);
    } catch (error) {
        console.error('[getCateringLotesByItem] Error:', error);
        res.status(500).json({ message: 'Error al obtener lotes del item', error: error instanceof Error ? error.message : String(error) });
    }
};

export const createCateringLote = async (req: Request, res: Response) => {
    try {
        const {
            id_item,
            stock,
            fecha_vencimiento,
            dias_vida_util,
            fecha_registro,
            usuario_id,
            id_empresa
        } = req.body;

        if (!id_item || !usuario_id || !id_empresa) {
            return res.status(400).json({ message: 'Faltan campos obligatorios: id_item, usuario_id, id_empresa' });
        }

        const itemCheck = await executeQuerySingle(
            `SELECT id, tipo FROM catering_items WHERE id = ? AND id_empresa = ?`,
            [id_item, id_empresa]
        );
        if (!itemCheck) {
            return res.status(404).json({ message: 'Item no encontrado en esta empresa' });
        }
        if (itemCheck.tipo !== 'materia prima') {
            return res.status(400).json({ message: 'Solo los items de tipo "materia prima" pueden tener lotes' });
        }

        const personaRow = await executeQuerySingle<{ id_persona: number }>(
            `SELECT id_persona FROM usuarios WHERE id = ?`,
            [usuario_id]
        );
        if (!personaRow) {
            return res.status(400).json({ message: 'Usuario no encontrado o sin persona asociada' });
        }
        const registrado_por = personaRow.id_persona;

        const result = await executeMutation(
            `INSERT INTO catering_lotes 
                (id_empresa, id_item, stock, fecha_vencimiento, dias_vida_util, fecha_registro, registrado_por, descartado) 
             VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
            [
                id_empresa,
                id_item,
                stock || 0,
                fecha_vencimiento || null,
                dias_vida_util || null,
                fecha_registro || new Date().toISOString().split('T')[0],
                registrado_por
            ]
        );

        const stockTotal = await executeQuerySingle<{ total: number }>(
            `SELECT SUM(stock) AS total FROM catering_lotes WHERE id_item = ? AND id_empresa = ? AND descartado = 0`,
            [id_item, id_empresa]
        );
        const nuevoStockTotal = stockTotal?.total || 0;

        await executeMutation(
            `UPDATE catering_items SET stock = ? WHERE id = ? AND id_empresa = ?`,
            [nuevoStockTotal, id_item, id_empresa]
        );

        const newRow = await executeQuerySingle(
            `SELECT 
                cl.*,
                p.nombre AS registrado_por_nombre,
                p.apellido AS registrado_por_apellido
            FROM catering_lotes cl
            JOIN personas p ON cl.registrado_por = p.id
            WHERE cl.id = ? AND cl.id_empresa = ?`,
            [result.insertId, id_empresa]
        );

        res.status(201).json(newRow);
    } catch (error) {
        console.error('[createCateringLote] Error:', error);
        res.status(500).json({ message: 'Error al crear lote de catering', error: error instanceof Error ? error.message : String(error) });
    }
};

export const updateCateringLote = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { stock, fecha_vencimiento, dias_vida_util, descartado, id_empresa } = req.body;

        if (!id_empresa) {
            return res.status(400).json({ message: 'id_empresa es requerido' });
        }

        const loteActual = await executeQuerySingle<any>(
            `SELECT id_item, stock FROM catering_lotes WHERE id = ? AND id_empresa = ?`,
            [id, id_empresa]
        );
        if (!loteActual) {
            return res.status(404).json({ message: 'Lote no encontrado en esta empresa' });
        }

        const updates: string[] = [];
        const values: any[] = [];

        if (stock !== undefined) { updates.push('stock = ?'); values.push(stock); }
        if (fecha_vencimiento !== undefined) { updates.push('fecha_vencimiento = ?'); values.push(fecha_vencimiento); }
        if (dias_vida_util !== undefined) { updates.push('dias_vida_util = ?'); values.push(dias_vida_util); }
        if (descartado !== undefined) { updates.push('descartado = ?'); values.push(descartado); }

        if (updates.length === 0) {
            return res.status(400).json({ message: 'No se enviaron campos para actualizar' });
        }

        values.push(id, id_empresa);
        await executeMutation(
            `UPDATE catering_lotes SET ${updates.join(', ')} WHERE id = ? AND id_empresa = ?`,
            values
        );

        const stockTotal = await executeQuerySingle<{ total: number }>(
            `SELECT SUM(stock) AS total FROM catering_lotes WHERE id_item = ? AND id_empresa = ? AND descartado = 0`,
            [loteActual.id_item, id_empresa]
        );
        const nuevoStockTotal = stockTotal?.total || 0;

        await executeMutation(
            `UPDATE catering_items SET stock = ? WHERE id = ? AND id_empresa = ?`,
            [nuevoStockTotal, loteActual.id_item, id_empresa]
        );

        const updated = await executeQuerySingle(
            `SELECT 
                cl.*,
                p.nombre AS registrado_por_nombre,
                p.apellido AS registrado_por_apellido
            FROM catering_lotes cl
            JOIN personas p ON cl.registrado_por = p.id
            WHERE cl.id = ? AND cl.id_empresa = ?`,
            [id, id_empresa]
        );
        res.json(updated);
    } catch (error) {
        console.error('[updateCateringLote] Error:', error);
        res.status(500).json({ message: 'Error al actualizar lote de catering', error: error instanceof Error ? error.message : String(error) });
    }
};

export const deleteCateringLote = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { id_empresa } = req.query;

        if (!id_empresa) {
            return res.status(400).json({ message: 'id_empresa es requerido' });
        }

        const lote = await executeQuerySingle<any>(
            `SELECT id_item FROM catering_lotes WHERE id = ? AND id_empresa = ?`,
            [id, id_empresa]
        );
        if (!lote) {
            return res.status(404).json({ message: 'Lote no encontrado en esta empresa' });
        }

        await executeMutation(
            'DELETE FROM catering_lotes WHERE id = ? AND id_empresa = ?',
            [id, id_empresa]
        );

        const stockTotal = await executeQuerySingle<{ total: number }>(
            `SELECT SUM(stock) AS total FROM catering_lotes WHERE id_item = ? AND id_empresa = ? AND descartado = 0`,
            [lote.id_item, id_empresa]
        );
        const nuevoStockTotal = stockTotal?.total || 0;

        await executeMutation(
            `UPDATE catering_items SET stock = ? WHERE id = ? AND id_empresa = ?`,
            [nuevoStockTotal, lote.id_item, id_empresa]
        );

        res.status(204).send();
    } catch (error) {
        console.error('[deleteCateringLote] Error:', error);
        res.status(500).json({ message: 'Error al eliminar lote de catering', error: error instanceof Error ? error.message : String(error) });
    }
};

export const descartarCateringLote = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { id_empresa } = req.body;

        if (!id_empresa) {
            return res.status(400).json({ message: 'id_empresa es requerido' });
        }

        const lote = await executeQuerySingle<any>(
            `SELECT id_item, stock FROM catering_lotes WHERE id = ? AND id_empresa = ?`,
            [id, id_empresa]
        );
        if (!lote) {
            return res.status(404).json({ message: 'Lote no encontrado en esta empresa' });
        }

        await executeMutation(
            `UPDATE catering_lotes SET descartado = 1 WHERE id = ? AND id_empresa = ?`,
            [id, id_empresa]
        );

        const stockTotal = await executeQuerySingle<{ total: number }>(
            `SELECT SUM(stock) AS total FROM catering_lotes WHERE id_item = ? AND id_empresa = ? AND descartado = 0`,
            [lote.id_item, id_empresa]
        );
        const nuevoStockTotal = stockTotal?.total || 0;

        await executeMutation(
            `UPDATE catering_items SET stock = ? WHERE id = ? AND id_empresa = ?`,
            [nuevoStockTotal, lote.id_item, id_empresa]
        );

        const updated = await executeQuerySingle(
            `SELECT 
                cl.*,
                p.nombre AS registrado_por_nombre,
                p.apellido AS registrado_por_apellido
            FROM catering_lotes cl
            JOIN personas p ON cl.registrado_por = p.id
            WHERE cl.id = ? AND cl.id_empresa = ?`,
            [id, id_empresa]
        );
        res.json(updated);
    } catch (error) {
        console.error('[descartarCateringLote] Error:', error);
        res.status(500).json({ message: 'Error al descartar lote de catering', error: error instanceof Error ? error.message : String(error) });
    }
};

export const createBulkCateringLote = async (req: Request, res: Response) => {
    try {
        const {
            items,
            tipo,
            id_proveedor,
            usuario_id,
            id_empresa,
            unidad_medida
        } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ message: 'Se requiere un array de items' });
        }
        if (!tipo || !usuario_id || !id_empresa) {
            return res.status(400).json({ message: 'Faltan campos obligatorios: tipo, usuario_id, id_empresa' });
        }
        if (tipo !== 'materia prima' && tipo !== 'utensilio') {
            return res.status(400).json({ message: 'Tipo debe ser "materia prima" o "utensilio"' });
        }

        const personaRow = await executeQuerySingle<{ id_persona: number }>(
            `SELECT id_persona FROM usuarios WHERE id = ?`,
            [usuario_id]
        );
        if (!personaRow) {
            return res.status(400).json({ message: 'Usuario no encontrado o sin persona asociada' });
        }
        const registrado_por = personaRow.id_persona;

        const success: any[] = [];
        const errors: { index: number; message: string; data: any }[] = [];

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            try {
                if (!item.nombre) {
                    errors.push({
                        index: i,
                        message: 'El campo "nombre" es obligatorio',
                        data: item
                    });
                    continue;
                }
                if (item.stock === undefined || item.stock === null) {
                    errors.push({
                        index: i,
                        message: 'El campo "stock" es obligatorio',
                        data: item
                    });
                    continue;
                }

                if (tipo === 'materia prima') {
                    if (!item.fecha_vencimiento && !item.dias_vida_util) {
                        errors.push({
                            index: i,
                            message: 'Para materia prima, debe especificar "fecha_vencimiento" o "dias_vida_util"',
                            data: item
                        });
                        continue;
                    }
                }

                const nombre = item.nombre.trim();
                const stock = parseInt(item.stock) || 0;
                const precio_compra = item.precio_compra ? parseFloat(item.precio_compra) : null;
                const fecha_vencimiento = item.fecha_vencimiento || null;
                const dias_vida_util = item.dias_vida_util ? parseInt(item.dias_vida_util) : null;
                const unidad = unidad_medida || 'unidad';

                let tiene_vencimiento = 0;
                if (tipo === 'materia prima') {
                    if (fecha_vencimiento) {
                        tiene_vencimiento = 1;
                    } else if (dias_vida_util) {
                        tiene_vencimiento = 0;
                    }
                }

                const itemResult = await executeMutation(
                    `INSERT INTO catering_items 
                        (id_empresa, nombre, stock, tipo, registrado_por, unidad_medida, tiene_vencimiento, fecha_vencimiento, dias_vida_util, precio_compra, id_proveedor) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        id_empresa,
                        nombre,
                        stock,
                        tipo,
                        registrado_por,
                        unidad,
                        tiene_vencimiento,
                        fecha_vencimiento,
                        dias_vida_util,
                        precio_compra,
                        id_proveedor || null
                    ]
                );
                const itemId = itemResult.insertId;

                if (tipo === 'materia prima') {
                    const loteFechaVencimiento = item.fecha_vencimiento || null;
                    const loteDiasVidaUtil = item.dias_vida_util ? parseInt(item.dias_vida_util) : null;

                    await executeMutation(
                        `INSERT INTO catering_lotes 
                            (id_empresa, id_item, stock, fecha_vencimiento, dias_vida_util, fecha_registro, registrado_por, descartado) 
                         VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
                        [
                            id_empresa,
                            itemId,
                            stock,
                            loteFechaVencimiento,
                            loteDiasVidaUtil,
                            new Date().toISOString().split('T')[0],
                            registrado_por
                        ]
                    );

                    const stockTotal = await executeQuerySingle<{ total: number }>(
                        `SELECT SUM(stock) AS total FROM catering_lotes WHERE id_item = ? AND id_empresa = ? AND descartado = 0`,
                        [itemId, id_empresa]
                    );
                    const nuevoStockTotal = stockTotal?.total || 0;
                    await executeMutation(
                        `UPDATE catering_items SET stock = ? WHERE id = ? AND id_empresa = ?`,
                        [nuevoStockTotal, itemId, id_empresa]
                    );
                }

                const newItem = await executeQuerySingle(
                    `SELECT 
                        ci.*,
                        p.nombre AS registrado_por_nombre,
                        p.apellido AS registrado_por_apellido
                    FROM catering_items ci
                    JOIN personas p ON ci.registrado_por = p.id
                    WHERE ci.id = ? AND ci.id_empresa = ?`,
                    [itemId, id_empresa]
                );

                const lotes = await executeQuery<any[]>(
                    `SELECT 
                        cl.*,
                        p.nombre AS registrado_por_nombre,
                        p.apellido AS registrado_por_apellido
                    FROM catering_lotes cl
                    JOIN personas p ON cl.registrado_por = p.id
                    WHERE cl.id_item = ? AND cl.id_empresa = ?`,
                    [itemId, id_empresa]
                );

                success.push({ ...newItem, lotes });

            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : String(err);
                errors.push({
                    index: i,
                    message: `Error al insertar: ${errorMessage}`,
                    data: item
                });
            }
        }

        res.status(201).json({
            success,
            errors,
            total: items.length,
            successCount: success.length,
            errorCount: errors.length
        });

    } catch (error) {
        console.error('[createBulkCateringItems] Error:', error);
        res.status(500).json({
            message: 'Error al procesar la carga masiva',
            error: error instanceof Error ? error.message : String(error)
        });
    }
};