import { Request, Response } from 'express';
import { executeQuery, executeMutation, executeQuerySingle } from '../config/database';

export const getLotes = async (req: Request, res: Response) => {
    try {
        const { id_empresa } = req.query;
        if (!id_empresa) {
            return res.status(400).json({ message: 'id_empresa es requerido' });
        }

        const rows = await executeQuery<any[]>(`
            SELECT 
                l.*,
                p.nombre AS registrado_por_nombre,
                p.apellido AS registrado_por_apellido
            FROM lotes l
            JOIN personas p ON l.registrado_por = p.id
            WHERE l.id_empresa = ?
            ORDER BY l.id DESC
        `, [id_empresa]);
        res.json(rows);
    } catch (error) {
        console.error('[getLotes] Error:', error);
        res.status(500).json({ message: 'Error al obtener lotes', error: error instanceof Error ? error.message : String(error) });
    }
};

export const getLotesByPostre = async (req: Request, res: Response) => {
    try {
        const { postreId } = req.params;
        const { id_empresa } = req.query;
        if (!id_empresa) {
            return res.status(400).json({ message: 'id_empresa es requerido' });
        }

        const rows = await executeQuery<any[]>(`
            SELECT 
                l.*,
                p.nombre AS registrado_por_nombre,
                p.apellido AS registrado_por_apellido
            FROM lotes l
            JOIN personas p ON l.registrado_por = p.id
            WHERE l.postre_id = ? AND l.id_empresa = ?
            ORDER BY l.fecha_vencimiento ASC
        `, [postreId, id_empresa]);
        res.json(rows);
    } catch (error) {
        console.error('[getLotesByPostre] Error:', error);
        res.status(500).json({ message: 'Error al obtener lotes del postre', error: error instanceof Error ? error.message : String(error) });
    }
};

export const createLote = async (req: Request, res: Response) => {
    try {
        const { postre_id, stock, fecha_vencimiento, dias_duracion, fecha_registro, usuario_id, id_empresa } = req.body;

        if (!postre_id || !usuario_id || !id_empresa) {
            return res.status(400).json({ message: 'Faltan campos obligatorios: postre_id, usuario_id, id_empresa' });
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
            `INSERT INTO lotes (id_empresa, postre_id, stock, fecha_vencimiento, dias_duracion, fecha_registro, registrado_por) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                id_empresa,
                postre_id,
                stock || 0,
                fecha_vencimiento,
                dias_duracion || 0,
                fecha_registro || new Date().toISOString().split('T')[0],
                registrado_por
            ]
        );

        const newRow = await executeQuerySingle(
            'SELECT * FROM lotes WHERE id = ? AND id_empresa = ?',
            [result.insertId, id_empresa]
        );
        res.status(201).json(newRow);
    } catch (error) {
        console.error('[createLote] Error:', error);
        res.status(500).json({ message: 'Error al crear lote', error: error instanceof Error ? error.message : String(error) });
    }
};

export const updateLote = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { stock, fecha_vencimiento, dias_duracion, id_empresa } = req.body;

        if (!id_empresa) {
            return res.status(400).json({ message: 'id_empresa es requerido' });
        }

        const exists = await executeQuerySingle(
            'SELECT id FROM lotes WHERE id = ? AND id_empresa = ?',
            [id, id_empresa]
        );
        if (!exists) {
            return res.status(404).json({ message: 'Lote no encontrado en esta empresa' });
        }

        await executeMutation(
            `UPDATE lotes SET stock = ?, fecha_vencimiento = ?, dias_duracion = ? WHERE id = ? AND id_empresa = ?`,
            [stock, fecha_vencimiento, dias_duracion, id, id_empresa]
        );

        const updated = await executeQuerySingle(
            'SELECT * FROM lotes WHERE id = ? AND id_empresa = ?',
            [id, id_empresa]
        );
        res.json(updated);
    } catch (error) {
        console.error('[updateLote] Error:', error);
        res.status(500).json({ message: 'Error al actualizar lote', error: error instanceof Error ? error.message : String(error) });
    }
};

export const deleteLote = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { id_empresa } = req.query;

        if (!id_empresa) {
            return res.status(400).json({ message: 'id_empresa es requerido' });
        }

        const exists = await executeQuerySingle(
            'SELECT id FROM lotes WHERE id = ? AND id_empresa = ?',
            [id, id_empresa]
        );
        if (!exists) {
            return res.status(404).json({ message: 'Lote no encontrado en esta empresa' });
        }

        await executeMutation(
            'DELETE FROM lotes WHERE id = ? AND id_empresa = ?',
            [id, id_empresa]
        );
        res.status(204).send();
    } catch (error) {
        console.error('[deleteLote] Error:', error);
        res.status(500).json({ message: 'Error al eliminar lote', error: error instanceof Error ? error.message : String(error) });
    }
};