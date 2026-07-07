import { Request, Response } from 'express';
import { executeQuery, executeMutation, executeQuerySingle } from '../config/database';

// ============================================
// OBTENER INSUMOS POR EMPRESA
// ============================================
export const getCateringItems = async (req: Request, res: Response) => {
    try {
        const { id_empresa } = req.query;
        if (!id_empresa) {
            return res.status(400).json({ message: 'id_empresa es requerido' });
        }

        const rows = await executeQuery<any[]>(`
            SELECT 
                ci.*,
                p.nombre AS registrado_por_nombre,
                p.apellido AS registrado_por_apellido
            FROM catering_items ci
            JOIN personas p ON ci.registrado_por = p.id
            WHERE ci.id_empresa = ?
            ORDER BY ci.id DESC
        `, [id_empresa]);
        res.json(rows);
    } catch (error) {
        console.error('[getCateringItems] Error:', error);
        res.status(500).json({ message: 'Error al obtener insumos', error: error instanceof Error ? error.message : String(error) });
    }
};

// ============================================
// OBTENER INSUMO POR ID (con validación de empresa)
// ============================================
export const getCateringItemById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { id_empresa } = req.query;
        if (!id_empresa) {
            return res.status(400).json({ message: 'id_empresa es requerido' });
        }

        const row = await executeQuerySingle<any>(`
            SELECT 
                ci.*,
                p.nombre AS registrado_por_nombre,
                p.apellido AS registrado_por_apellido
            FROM catering_items ci
            JOIN personas p ON ci.registrado_por = p.id
            WHERE ci.id = ? AND ci.id_empresa = ?
        `, [id, id_empresa]);

        if (!row) {
            return res.status(404).json({ message: 'Insumo no encontrado en esta empresa' });
        }
        res.json(row);
    } catch (error) {
        console.error('[getCateringItemById] Error:', error);
        res.status(500).json({ message: 'Error al obtener insumo', error: error instanceof Error ? error.message : String(error) });
    }
};

// ============================================
// CREAR INSUMO (con id_empresa)
// ============================================
export const createCateringItem = async (req: Request, res: Response) => {
    try {
        const { nombre, stock, tipo, usuario_id, id_empresa } = req.body;

        if (!nombre || !tipo || !usuario_id || !id_empresa) {
            return res.status(400).json({ message: 'Faltan campos obligatorios: nombre, tipo, usuario_id, id_empresa' });
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
            `INSERT INTO catering_items (id_empresa, nombre, stock, tipo, registrado_por) VALUES (?, ?, ?, ?, ?)`,
            [id_empresa, nombre, stock || 0, tipo, registrado_por]
        );

        const newRow = await executeQuerySingle(
            'SELECT * FROM catering_items WHERE id = ? AND id_empresa = ?',
            [result.insertId, id_empresa]
        );
        res.status(201).json(newRow);
    } catch (error) {
        console.error('[createCateringItem] Error:', error);
        res.status(500).json({ message: 'Error al crear insumo', error: error instanceof Error ? error.message : String(error) });
    }
};

// ============================================
// ACTUALIZAR INSUMO (con validación de empresa)
// ============================================
export const updateCateringItem = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { nombre, stock, tipo, id_empresa } = req.body;

        if (!id_empresa) {
            return res.status(400).json({ message: 'id_empresa es requerido' });
        }

        // Verificar que el insumo pertenece a la empresa
        const exists = await executeQuerySingle(
            'SELECT id FROM catering_items WHERE id = ? AND id_empresa = ?',
            [id, id_empresa]
        );
        if (!exists) {
            return res.status(404).json({ message: 'Insumo no encontrado en esta empresa' });
        }

        const updates: string[] = [];
        const values: any[] = [];

        if (nombre !== undefined) { updates.push('nombre = ?'); values.push(nombre); }
        if (stock !== undefined) { updates.push('stock = ?'); values.push(stock); }
        if (tipo !== undefined) { updates.push('tipo = ?'); values.push(tipo); }

        if (updates.length === 0) {
            return res.status(400).json({ message: 'No se enviaron campos para actualizar' });
        }

        values.push(id);
        values.push(id_empresa);
        const query = `UPDATE catering_items SET ${updates.join(', ')} WHERE id = ? AND id_empresa = ?`;

        await executeMutation(query, values);

        const updated = await executeQuerySingle(
            'SELECT * FROM catering_items WHERE id = ? AND id_empresa = ?',
            [id, id_empresa]
        );
        res.json(updated);
    } catch (error) {
        console.error('[updateCateringItem] Error:', error);
        res.status(500).json({ message: 'Error al actualizar insumo', error: error instanceof Error ? error.message : String(error) });
    }
};

// ============================================
// ELIMINAR INSUMO (con validación de empresa)
// ============================================
export const deleteCateringItem = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { id_empresa } = req.body;

        if (!id_empresa) {
            return res.status(400).json({ message: 'id_empresa es requerido' });
        }

        // Verificar que el insumo pertenece a la empresa
        const exists = await executeQuerySingle(
            'SELECT id FROM catering_items WHERE id = ? AND id_empresa = ?',
            [id, id_empresa]
        );
        if (!exists) {
            return res.status(404).json({ message: 'Insumo no encontrado en esta empresa' });
        }

        await executeMutation(
            'DELETE FROM catering_items WHERE id = ? AND id_empresa = ?',
            [id, id_empresa]
        );
        res.status(204).send();
    } catch (error) {
        console.error('[deleteCateringItem] Error:', error);
        res.status(500).json({ message: 'Error al eliminar insumo', error: error instanceof Error ? error.message : String(error) });
    }
};