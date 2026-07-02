import { Request, Response } from 'express';
import { executeQuery, executeMutation, executeQuerySingle } from '../config/database';

export const getCateringItems = async (req: Request, res: Response) => {
    try {
        const rows = await executeQuery<any[]>(`
            SELECT 
                ci.*,
                p.nombre AS registrado_por_nombre,
                p.apellido AS registrado_por_apellido
            FROM catering_items ci
            JOIN personas p ON ci.registrado_por = p.id
            ORDER BY ci.id DESC
        `);
        res.json(rows);
    } catch (error) {
        console.error('[getCateringItems] Error:', error);
        res.status(500).json({ message: 'Error al obtener insumos', error: error instanceof Error ? error.message : String(error) });
    }
};

export const getCateringItemById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const row = await executeQuerySingle<any>(`
            SELECT 
                ci.*,
                p.nombre AS registrado_por_nombre,
                p.apellido AS registrado_por_apellido
            FROM catering_items ci
            JOIN personas p ON ci.registrado_por = p.id
            WHERE ci.id = ?
        `, [id]);
        res.json(row);
    } catch (error) {
        console.error('[getCateringItemById] Error:', error);
        res.status(500).json({ message: 'Error al obtener insumo', error: error instanceof Error ? error.message : String(error) });
    }
};

export const createCateringItem = async (req: Request, res: Response) => {
    try {
        const { nombre, stock, tipo, usuario_id } = req.body;

        if (!nombre || !tipo || !usuario_id) {
            return res.status(400).json({ message: 'Faltan campos obligatorios: nombre, tipo, usuario_id' });
        }

        // Obtener el id_persona asociado al usuario
        const personaRow = await executeQuerySingle<{ id_persona: number }>(
            `SELECT id_persona FROM usuarios WHERE id = ?`,
            [usuario_id]
        );

        if (!personaRow) {
            return res.status(400).json({ message: 'Usuario no encontrado o sin persona asociada' });
        }

        const registrado_por = personaRow.id_persona;

        const result = await executeMutation(
            `INSERT INTO catering_items (nombre, stock, tipo, registrado_por) VALUES (?, ?, ?, ?)`,
            [nombre, stock || 0, tipo, registrado_por]
        );

        const newRow = await executeQuerySingle('SELECT * FROM catering_items WHERE id = ?', [result.insertId]);
        res.status(201).json(newRow);
    } catch (error) {
        console.error('[createCateringItem] Error:', error);
        res.status(500).json({ message: 'Error al crear insumo', error: error instanceof Error ? error.message : String(error) });
    }
};

export const updateCateringItem = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { nombre, stock, tipo } = req.body;

        // Construir dinámicamente la consulta
        const updates: string[] = [];
        const values: any[] = [];

        if (nombre !== undefined) { updates.push('nombre = ?'); values.push(nombre); }
        if (stock !== undefined) { updates.push('stock = ?'); values.push(stock); }
        if (tipo !== undefined) { updates.push('tipo = ?'); values.push(tipo); }

        if (updates.length === 0) {
            return res.status(400).json({ message: 'No se enviaron campos para actualizar' });
        }

        values.push(id);
        const query = `UPDATE catering_items SET ${updates.join(', ')} WHERE id = ?`;

        await executeMutation(query, values);

        const updated = await executeQuerySingle('SELECT * FROM catering_items WHERE id = ?', [id]);
        res.json(updated);
    } catch (error) {
        console.error('[updateCateringItem] Error:', error);
        res.status(500).json({ message: 'Error al actualizar insumo', error: error instanceof Error ? error.message : String(error) });
    }
};

export const deleteCateringItem = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await executeMutation('DELETE FROM catering_items WHERE id = ?', [id]);
        res.status(204).send();
    } catch (error) {
        console.error('[deleteCateringItem] Error:', error);
        res.status(500).json({ message: 'Error al eliminar insumo', error: error instanceof Error ? error.message : String(error) });
    }
};