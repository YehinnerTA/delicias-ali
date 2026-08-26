import { Request, Response } from 'express';
import { executeQuery, executeMutation, executeQuerySingle } from '../config/database';

export const getPostres = async (req: Request, res: Response) => {
    try {
        const { id_empresa } = req.query;
        if (!id_empresa) {
            return res.status(400).json({ message: 'id_empresa es requerido' });
        }

        const rows = await executeQuery<any>(
            `
            SELECT 
                p.*,
                GROUP_CONCAT(
                    JSON_OBJECT(
                        'id', l.id,
                        'stock', l.stock,
                        'fecha_vencimiento', l.fecha_vencimiento,
                        'dias_duracion', l.dias_duracion,
                        'fecha_registro', l.fecha_registro,
                        'registrado_por', l.registrado_por,
                        'ultima_edicion', l.ultima_edicion,
                        'descartado', l.descartado
                    )
                ) AS lotes
            FROM postres p
            LEFT JOIN lotes l ON p.id = l.postre_id
            WHERE p.id_empresa = ?
            GROUP BY p.id
            ORDER BY p.id DESC
        `,
            [id_empresa]
        );

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
        const { id_empresa } = req.query;
        if (!id_empresa) {
            return res.status(400).json({ message: 'id_empresa es requerido' });
        }

        const row = await executeQuerySingle<any>(
            `
            SELECT 
                p.*,
                GROUP_CONCAT(
                    JSON_OBJECT(
                        'id', l.id,
                        'stock', l.stock,
                        'fecha_vencimiento', l.fecha_vencimiento,
                        'dias_duracion', l.dias_duracion,
                        'fecha_registro', l.fecha_registro,
                        'registrado_por', l.registrado_por,
                        'ultima_edicion', l.ultima_edicion,
                        'descartado', l.descartado
                    )
                ) AS lotes
            FROM postres p
            LEFT JOIN lotes l ON p.id = l.postre_id
            WHERE p.id = ? AND p.id_empresa = ?
            GROUP BY p.id
        `,
            [id, id_empresa]
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
        const { nombre, precio, lotes, usuario_id, id_empresa } = req.body;

        if (!nombre || !usuario_id || !id_empresa) {
            return res.status(400).json({ message: 'Nombre, usuario_id y id_empresa son obligatorios' });
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
            `INSERT INTO postres (id_empresa, nombre, precio) VALUES (?, ?, ?)`,
            [id_empresa, nombre, precio || 0]
        );
        const postreId = result.insertId;

        if (lotes && Array.isArray(lotes) && lotes.length > 0) {
            for (const lote of lotes) {
                await executeMutation(
                    `INSERT INTO lotes (id_empresa, postre_id, stock, fecha_vencimiento, dias_duracion, fecha_registro, registrado_por, descartado) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
                    [
                        id_empresa,
                        postreId,
                        lote.stock || 0,
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
        const { nombre, id_empresa } = req.body;

        if (!id_empresa) {
            return res.status(400).json({ message: 'id_empresa es requerido' });
        }

        const exists = await executeQuerySingle(
            'SELECT id FROM postres WHERE id = ? AND id_empresa = ?',
            [id, id_empresa]
        );
        if (!exists) {
            return res.status(404).json({ message: 'Postre no encontrado en esta empresa' });
        }

        await executeMutation(
            `UPDATE postres SET nombre = ? WHERE id = ? AND id_empresa = ?`,
            [nombre, id, id_empresa]
        );

        const updated = await executeQuerySingle('SELECT * FROM postres WHERE id = ? AND id_empresa = ?', [id, id_empresa]);
        res.json(updated);
    } catch (error) {
        console.error('[updatePostre] Error:', error);
        res.status(500).json({ message: 'Error al actualizar postre', error: error instanceof Error ? error.message : String(error) });
    }
};

export const deletePostre = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { id_empresa } = req.query;

        if (!id_empresa) {
            return res.status(400).json({ message: 'id_empresa es requerido' });
        }

        const exists = await executeQuerySingle(
            'SELECT id FROM postres WHERE id = ? AND id_empresa = ?',
            [id, id_empresa]
        );
        if (!exists) {
            return res.status(404).json({ message: 'Postre no encontrado en esta empresa' });
        }

        await executeMutation(
            'DELETE FROM postres WHERE id = ? AND id_empresa = ?',
            [id, id_empresa]
        );
        res.status(204).send();
    } catch (error) {
        console.error('[deletePostre] Error:', error);
        res.status(500).json({ message: 'Error al eliminar postre', error: error instanceof Error ? error.message : String(error) });
    }
};

export const createBulkPostres = async (req: Request, res: Response) => {
    try {
        const {
            items,
            usuario_id,
            id_empresa
        } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ message: 'Se requiere un array de items' });
        }
        if (!usuario_id || !id_empresa) {
            return res.status(400).json({ message: 'Faltan campos obligatorios: usuario_id, id_empresa' });
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
                if (item.precio === undefined || item.precio === null) {
                    errors.push({
                        index: i,
                        message: 'El campo "precio" es obligatorio',
                        data: item
                    });
                    continue;
                }
                if (!item.dias_duracion) {
                    errors.push({
                        index: i,
                        message: 'El campo "dias_duracion" es obligatorio',
                        data: item
                    });
                    continue;
                }

                const nombre = item.nombre.trim();
                const precio = parseFloat(item.precio) || 0;

                const postreResult = await executeMutation(
                    `INSERT INTO postres (id_empresa, nombre, precio) VALUES (?, ?, ?)`,
                    [id_empresa, nombre, precio]
                );
                const postreId = postreResult.insertId;

                const newPostre = await executeQuerySingle(
                    'SELECT * FROM postres WHERE id = ? AND id_empresa = ?',
                    [postreId, id_empresa]
                );

                success.push({
                    ...newPostre,
                    _itemData: {
                        stock: item.stock,
                        dias_duracion: item.dias_duracion,
                        fecha_registro: item.fecha_registro || new Date().toISOString().split('T')[0]
                    }
                });

            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : String(err);
                errors.push({
                    index: i,
                    message: `Error al insertar postre: ${errorMessage}`,
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
        console.error('[createBulkPostres] Error:', error);
        res.status(500).json({
            message: 'Error al procesar la carga masiva de postres',
            error: error instanceof Error ? error.message : String(error)
        });
    }
};