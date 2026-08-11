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
                (id_empresa, id_item, stock, fecha_vencimiento, dias_vida_util, fecha_registro, registrado_por) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
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
            `SELECT SUM(stock) AS total FROM catering_lotes WHERE id_item = ? AND id_empresa = ?`,
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
        const { stock, fecha_vencimiento, dias_vida_util, id_empresa } = req.body;

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

        const stockAnterior = loteActual.stock || 0;
        const nuevoStock = stock !== undefined ? stock : stockAnterior;
        const diferenciaStock = nuevoStock - stockAnterior;

        await executeMutation(
            `UPDATE catering_lotes SET stock = ?, fecha_vencimiento = ?, dias_vida_util = ? WHERE id = ? AND id_empresa = ?`,
            [nuevoStock, fecha_vencimiento, dias_vida_util, id, id_empresa]
        );

        if (diferenciaStock !== 0) {
            const stockTotal = await executeQuerySingle<{ total: number }>(
                `SELECT SUM(stock) AS total FROM catering_lotes WHERE id_item = ? AND id_empresa = ?`,
                [loteActual.id_item, id_empresa]
            );
            const nuevoStockTotal = stockTotal?.total || 0;

            await executeMutation(
                `UPDATE catering_items SET stock = ? WHERE id = ? AND id_empresa = ?`,
                [nuevoStockTotal, loteActual.id_item, id_empresa]
            );
        }

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
            `SELECT id_item, stock FROM catering_lotes WHERE id = ? AND id_empresa = ?`,
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
            `SELECT SUM(stock) AS total FROM catering_lotes WHERE id_item = ? AND id_empresa = ?`,
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