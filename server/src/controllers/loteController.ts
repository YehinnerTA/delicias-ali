import { Request, Response } from 'express';
import { executeQuery, executeMutation, executeQuerySingle } from '../config/database';

export const getLotes = async (req: Request, res: Response) => {
    try {
        const rows = await executeQuery<any[]>(`
            SELECT 
                l.*,
                p.nombre AS registrado_por_nombre,
                p.apellido AS registrado_por_apellido
            FROM lotes l
            JOIN personas p ON l.registrado_por = p.id
            ORDER BY l.id DESC
        `);
        res.json(rows);
    } catch (error) {
        console.error('[getLotes] Error:', error);
        res.status(500).json({ message: 'Error al obtener lotes', error: error instanceof Error ? error.message : String(error) });
    }
};

export const getLotesByPostre = async (req: Request, res: Response) => {
    try {
        const { postreId } = req.params;
        const rows = await executeQuery<any[]>(`
            SELECT 
                l.*,
                p.nombre AS registrado_por_nombre,
                p.apellido AS registrado_por_apellido
            FROM lotes l
            JOIN personas p ON l.registrado_por = p.id
            WHERE l.postre_id = ?
            ORDER BY l.fecha_vencimiento ASC
        `, [postreId]);
        res.json(rows);
    } catch (error) {
        console.error('[getLotesByPostre] Error:', error);
        res.status(500).json({ message: 'Error al obtener lotes del postre', error: error instanceof Error ? error.message : String(error) });
    }
};

export const createLote = async (req: Request, res: Response) => {
    try {
        const { postre_id, stock, fecha_vencimiento, dias_duracion, fecha_registro, usuario_id } = req.body;

        if (!postre_id || !usuario_id) {
            return res.status(400).json({ message: 'Faltan campos obligatorios: postre_id, usuario_id' });
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
            `INSERT INTO lotes (postre_id, stock, fecha_vencimiento, dias_duracion, fecha_registro, registrado_por) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                postre_id,
                stock || 0,
                fecha_vencimiento,
                dias_duracion || 0,
                fecha_registro || new Date().toISOString().split('T')[0],
                registrado_por
            ]
        );

        const newRow = await executeQuerySingle('SELECT * FROM lotes WHERE id = ?', [result.insertId]);
        res.status(201).json(newRow);
    } catch (error) {
        console.error('[createLote] Error:', error);
        res.status(500).json({ message: 'Error al crear lote', error: error instanceof Error ? error.message : String(error) });
    }
};

export const updateLote = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { stock, fecha_vencimiento, dias_duracion } = req.body;

        await executeMutation(
            `UPDATE lotes SET stock = ?, fecha_vencimiento = ?, dias_duracion = ? WHERE id = ?`,
            [stock, fecha_vencimiento, dias_duracion, id]
        );

        const updated = await executeQuerySingle('SELECT * FROM lotes WHERE id = ?', [id]);
        res.json(updated);
    } catch (error) {
        console.error('[updateLote] Error:', error);
        res.status(500).json({ message: 'Error al actualizar lote', error: error instanceof Error ? error.message : String(error) });
    }
};

export const deleteLote = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await executeMutation('DELETE FROM lotes WHERE id = ?', [id]);
        res.status(204).send();
    } catch (error) {
        console.error('[deleteLote] Error:', error);
        res.status(500).json({ message: 'Error al eliminar lote', error: error instanceof Error ? error.message : String(error) });
    }
};