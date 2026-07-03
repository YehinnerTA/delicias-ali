import { Request, Response } from 'express';
import { executeQuery, executeMutation, executeQuerySingle } from '../config/database';

export const getPostres = async (req: Request, res: Response) => {
    try {
        const rows = await executeQuery<any>(`
            SELECT 
                p.*,
                GROUP_CONCAT(
                    JSON_OBJECT(
                        'id', l.id,
                        'stock', l.stock,
                        'precio', l.precio,
                        'fecha_vencimiento', l.fecha_vencimiento,
                        'dias_duracion', l.dias_duracion,
                        'fecha_registro', l.fecha_registro,
                        'registrado_por', l.registrado_por,
                        'ultima_edicion', l.ultima_edicion
                    )
                ) AS lotes
            FROM postres p
            LEFT JOIN lotes l ON p.id = l.postre_id
            GROUP BY p.id
            ORDER BY p.id DESC
        `);

        const result = rows.map((row: any) => ({
            ...row,
            lotes: row.lotes ? JSON.parse(`[${row.lotes}]`) : []
        }));

        res.json(result);
    } catch (error) {
        console.error('[getPostres] Error:', error);
        res.status(500).json({ message: 'Error al obtener postres', error: error instanceof Error ? error.message : String(error) });
    }
};

export const getPostreById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const row = await executeQuerySingle<any>(
            `
            SELECT 
                p.*,
                GROUP_CONCAT(
                    JSON_OBJECT(
                        'id', l.id,
                        'stock', l.stock,
                        'precio', l.precio,
                        'fecha_vencimiento', l.fecha_vencimiento,
                        'dias_duracion', l.dias_duracion,
                        'fecha_registro', l.fecha_registro,
                        'registrado_por', l.registrado_por,
                        'ultima_edicion', l.ultima_edicion
                    )
                ) AS lotes
            FROM postres p
            LEFT JOIN lotes l ON p.id = l.postre_id
            WHERE p.id = ?
            GROUP BY p.id
        `,
            [id]
        );

        if (row) {
            row.lotes = row.lotes ? JSON.parse(`[${row.lotes}]`) : [];
        }

        res.json(row);
    } catch (error) {
        console.error('[getPostreById] Error:', error);
        res.status(500).json({ message: 'Error al obtener postre', error: error instanceof Error ? error.message : String(error) });
    }
};

export const createPostre = async (req: Request, res: Response) => {
    try {
        const { nombre, lotes, usuario_id } = req.body;

        if (!nombre || !usuario_id) {
            return res.status(400).json({ message: 'Nombre y usuario_id son obligatorios' });
        }

        // Obtener la persona asociada al usuario
        const personaRow = await executeQuerySingle<{ id_persona: number }>(
            `SELECT id_persona FROM usuarios WHERE id = ?`,
            [usuario_id]
        );
        if (!personaRow) {
            return res.status(400).json({ message: 'Usuario no encontrado o sin persona asociada' });
        }
        const registrado_por = personaRow.id_persona;

        const result = await executeMutation(
            `INSERT INTO postres (nombre) VALUES (?)`,
            [nombre]
        );
        const postreId = result.insertId;

        // Insertar lotes si vienen
        if (lotes && Array.isArray(lotes) && lotes.length > 0) {
            for (const lote of lotes) {
                await executeMutation(
                    `INSERT INTO lotes (postre_id, stock, precio, fecha_vencimiento, dias_duracion, fecha_registro, registrado_por) 
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [
                        postreId,
                        lote.stock || 0,
                        lote.precio || 0,
                        lote.fecha_vencimiento,
                        lote.dias_duracion || 0,
                        lote.fecha_registro || new Date().toISOString().split('T')[0],
                        registrado_por
                    ]
                );
            }
        }

        const newRow = await executeQuerySingle('SELECT * FROM postres WHERE id = ?', [postreId]);
        res.status(201).json(newRow);
    } catch (error) {
        console.error('[createPostre] Error:', error);
        res.status(500).json({ message: 'Error al crear postre', error: error instanceof Error ? error.message : String(error) });
    }
};

export const updatePostre = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { nombre } = req.body;

        await executeMutation(
            `UPDATE postres SET nombre = ? WHERE id = ?`,
            [nombre, id]
        );

        const updated = await executeQuerySingle('SELECT * FROM postres WHERE id = ?', [id]);
        res.json(updated);
    } catch (error) {
        console.error('[updatePostre] Error:', error);
        res.status(500).json({ message: 'Error al actualizar postre', error: error instanceof Error ? error.message : String(error) });
    }
};

export const deletePostre = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        // Los lotes se eliminan en cascada por ON DELETE CASCADE
        await executeMutation('DELETE FROM postres WHERE id = ?', [id]);
        res.status(204).send();
    } catch (error) {
        console.error('[deletePostre] Error:', error);
        res.status(500).json({ message: 'Error al eliminar postre', error: error instanceof Error ? error.message : String(error) });
    }
};