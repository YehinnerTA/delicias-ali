import { Request, Response } from 'express';
import { executeQuery, executeMutation, executeQuerySingle } from '../config/database';

export const getIngredientes = async (req: Request, res: Response) => {
    try {
        const { id_empresa } = req.query;
        if (!id_empresa) {
            return res.status(400).json({ message: 'id_empresa es requerido' });
        }

        const rows = await executeQuery<any[]>(
            `SELECT 
                i.id,
                i.id_empresa,
                i.nombre,
                i.unidad,
                i.id_categoria,
                c.nombre AS categoria_nombre,
                c.descripcion AS categoria_descripcion
             FROM ingredientes i
             LEFT JOIN categorias_alimentos c ON i.id_categoria = c.id
             WHERE i.id_empresa = ?
             ORDER BY i.nombre`,
            [id_empresa]
        );

        const ingredientesConProveedores = await Promise.all(
            rows.map(async (ing: any) => {
                const proveedoresVinculados = await executeQuery<any[]>(
                    `SELECT 
                        p.id,
                        p.nombre,
                        p.apellido,
                        p.razon_social,
                        p.celular,
                        p.tipo_documento,
                        p.numero_documento
                     FROM personas p
                     JOIN ingrediente_proveedores ip ON p.id = ip.id_proveedor
                     WHERE ip.id_ingrediente = ? AND ip.id_empresa = ?
                     ORDER BY p.nombre`,
                    [ing.id, id_empresa]
                );

                let proveedoresPorCategoria: any[] = [];
                if (ing.id_categoria) {
                    proveedoresPorCategoria = await executeQuery<any[]>(
                        `SELECT 
                            p.id,
                            p.nombre,
                            p.apellido,
                            p.razon_social,
                            p.celular,
                            p.tipo_documento,
                            p.numero_documento
                         FROM personas p
                         JOIN proveedor_categoria pc ON p.id = pc.id_proveedor
                         WHERE pc.id_categoria = ? AND pc.id_empresa = ?
                         ORDER BY p.nombre`,
                        [ing.id_categoria, id_empresa]
                    );
                }

                return {
                    id: ing.id,
                    id_empresa: ing.id_empresa,
                    nombre: ing.nombre,
                    unidad: ing.unidad,
                    id_categoria: ing.id_categoria,
                    categoria: ing.categoria_nombre ? {
                        id: ing.id_categoria,
                        nombre: ing.categoria_nombre,
                        descripcion: ing.categoria_descripcion
                    } : null,
                    proveedores: proveedoresVinculados.map((p: any) => ({
                        id_persona: p.id,
                        nombre: p.nombre,
                        apellido: p.apellido,
                        razon_social: p.razon_social,
                        celular: p.celular,
                        tipo_documento: p.tipo_documento,
                        numero_documento: p.numero_documento
                    })),
                    proveedores_sugeridos: proveedoresPorCategoria.map((p: any) => ({
                        id_persona: p.id,
                        nombre: p.nombre,
                        apellido: p.apellido,
                        razon_social: p.razon_social,
                        celular: p.celular,
                        tipo_documento: p.tipo_documento,
                        numero_documento: p.numero_documento
                    }))
                };
            })
        );

        res.json(ingredientesConProveedores);
    } catch (error) {
        console.error('[getIngredientes] Error:', error);
        res.status(500).json({ message: 'Error al obtener ingredientes', error });
    }
};

export const getIngredienteById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { id_empresa } = req.query;
        if (!id_empresa) {
            return res.status(400).json({ message: 'id_empresa es requerido' });
        }

        const ing = await executeQuerySingle<any>(
            `SELECT 
                i.id,
                i.id_empresa,
                i.nombre,
                i.unidad,
                i.id_categoria,
                c.nombre AS categoria_nombre,
                c.descripcion AS categoria_descripcion
             FROM ingredientes i
             LEFT JOIN categorias_alimentos c ON i.id_categoria = c.id
             WHERE i.id = ? AND i.id_empresa = ?`,
            [id, id_empresa]
        );

        if (!ing) {
            return res.status(404).json({ message: 'Ingrediente no encontrado' });
        }

        const proveedoresVinculados = await executeQuery<any[]>(
            `SELECT 
                p.id,
                p.nombre,
                p.apellido,
                p.razon_social,
                p.celular,
                p.tipo_documento,
                p.numero_documento
             FROM personas p
             JOIN ingrediente_proveedores ip ON p.id = ip.id_proveedor
             WHERE ip.id_ingrediente = ? AND ip.id_empresa = ?
             ORDER BY p.nombre`,
            [id, id_empresa]
        );

        let proveedoresPorCategoria: any[] = [];
        if (ing.id_categoria) {
            proveedoresPorCategoria = await executeQuery<any[]>(
                `SELECT 
                    p.id,
                    p.nombre,
                    p.apellido,
                    p.razon_social,
                    p.celular,
                    p.tipo_documento,
                    p.numero_documento
                 FROM personas p
                 JOIN proveedor_categoria pc ON p.id = pc.id_proveedor
                 WHERE pc.id_categoria = ? AND pc.id_empresa = ?
                 ORDER BY p.nombre`,
                [ing.id_categoria, id_empresa]
            );
        }

        res.json({
            id: ing.id,
            id_empresa: ing.id_empresa,
            nombre: ing.nombre,
            unidad: ing.unidad,
            id_categoria: ing.id_categoria,
            categoria: ing.categoria_nombre ? {
                id: ing.id_categoria,
                nombre: ing.categoria_nombre,
                descripcion: ing.categoria_descripcion
            } : null,
            proveedores: proveedoresVinculados.map((p: any) => ({
                id_persona: p.id,
                nombre: p.nombre,
                apellido: p.apellido,
                razon_social: p.razon_social,
                celular: p.celular,
                tipo_documento: p.tipo_documento,
                numero_documento: p.numero_documento
            })),
            proveedores_sugeridos: proveedoresPorCategoria.map((p: any) => ({
                id_persona: p.id,
                nombre: p.nombre,
                apellido: p.apellido,
                razon_social: p.razon_social,
                celular: p.celular,
                tipo_documento: p.tipo_documento,
                numero_documento: p.numero_documento
            }))
        });
    } catch (error) {
        console.error('[getIngredienteById] Error:', error);
        res.status(500).json({ message: 'Error al obtener ingrediente', error });
    }
};

export const sincronizarProveedoresPorCategoria = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { id_empresa } = req.body;

        if (!id_empresa) {
            return res.status(400).json({ message: 'id_empresa es requerido' });
        }

        const ing = await executeQuerySingle<any>(
            'SELECT id, id_categoria FROM ingredientes WHERE id = ? AND id_empresa = ?',
            [id, id_empresa]
        );
        if (!ing) {
            return res.status(404).json({ message: 'Ingrediente no encontrado' });
        }

        if (!ing.id_categoria) {
            return res.status(400).json({ message: 'El ingrediente no tiene categoría asignada' });
        }

        await executeMutation(
            'DELETE FROM ingrediente_proveedores WHERE id_ingrediente = ? AND id_empresa = ?',
            [id, id_empresa]
        );

        const proveedores = await executeQuery<any[]>(
            `SELECT id_proveedor FROM proveedor_categoria 
            WHERE id_categoria = ? AND id_empresa = ?`,
            [ing.id_categoria, id_empresa]
        );

        for (const prov of proveedores) {
            await executeMutation(
                `INSERT INTO ingrediente_proveedores (id_empresa, id_ingrediente, id_proveedor) 
                VALUES (?, ?, ?)`,
                [id_empresa, id, (prov as any).id_proveedor]
            );
        }

        res.json({
            message: 'Proveedores sincronizados por categoría',
            proveedores_vinculados: proveedores.length
        });
    } catch (error) {
        console.error('[sincronizarProveedoresPorCategoria] Error:', error);
        res.status(500).json({ message: 'Error al sincronizar proveedores', error });
    }
};

export const createIngrediente = async (req: Request, res: Response) => {
    try {
        const {
            id_empresa,
            nombre,
            unidad,
            id_categoria,
            proveedores,
            forma_agrupacion
        } = req.body;

        if (!id_empresa || !nombre || !unidad) {
            return res.status(400).json({ message: 'id_empresa, nombre y unidad son requeridos' });
        }

        const result = await executeMutation(
            `INSERT INTO ingredientes (id_empresa, nombre, unidad, id_categoria) 
             VALUES (?, ?, ?, ?)`,
            [id_empresa, nombre, unidad, id_categoria || null]
        );

        const ingredienteId = result.insertId;

        if (forma_agrupacion === 'categoria' && id_categoria) {
            const proveedoresDeCategoria = await executeQuery<any[]>(
                `SELECT id_proveedor FROM proveedor_categoria 
                WHERE id_categoria = ? AND id_empresa = ?`,
                [id_categoria, id_empresa]
            );

            for (const prov of proveedoresDeCategoria) {
                await executeMutation(
                    `INSERT INTO ingrediente_proveedores (id_empresa, id_ingrediente, id_proveedor) 
                    VALUES (?, ?, ?)`,
                    [id_empresa, ingredienteId, (prov as any).id_proveedor]
                );
            }
        } else if (forma_agrupacion === 'proveedor' && proveedores && Array.isArray(proveedores) && proveedores.length > 0) {
            for (const idProveedor of proveedores) {
                await executeMutation(
                    `INSERT INTO ingrediente_proveedores (id_empresa, id_ingrediente, id_proveedor) 
                     VALUES (?, ?, ?)`,
                    [id_empresa, ingredienteId, idProveedor]
                );
            }
        } else if (proveedores && Array.isArray(proveedores) && proveedores.length > 0) {
            for (const idProveedor of proveedores) {
                await executeMutation(
                    `INSERT INTO ingrediente_proveedores (id_empresa, id_ingrediente, id_proveedor) 
                     VALUES (?, ?, ?)`,
                    [id_empresa, ingredienteId, idProveedor]
                );
            }
        }

        const newRow = await executeQuerySingle(
            `SELECT * FROM ingredientes WHERE id = ? AND id_empresa = ?`,
            [ingredienteId, id_empresa]
        );

        res.status(201).json(newRow);
    } catch (error) {
        console.error('[createIngrediente] Error:', error);
        res.status(500).json({ message: 'Error al crear ingrediente', error });
    }
};

export const updateIngrediente = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const {
            id_empresa,
            nombre,
            unidad,
            id_categoria,
            proveedores,
            forma_agrupacion
        } = req.body;

        if (!id_empresa) {
            return res.status(400).json({ message: 'id_empresa es requerido' });
        }

        const exists = await executeQuerySingle(
            'SELECT id FROM ingredientes WHERE id = ? AND id_empresa = ?',
            [id, id_empresa]
        );
        if (!exists) {
            return res.status(404).json({ message: 'Ingrediente no encontrado' });
        }

        await executeMutation(
            `UPDATE ingredientes SET nombre = ?, unidad = ?, id_categoria = ?
             WHERE id = ? AND id_empresa = ?`,
            [nombre, unidad, id_categoria || null, id, id_empresa]
        );

        if (forma_agrupacion !== undefined) {
            await executeMutation(
                `DELETE FROM ingrediente_proveedores WHERE id_ingrediente = ? AND id_empresa = ?`,
                [id, id_empresa]
            );

            if (forma_agrupacion === 'categoria' && id_categoria) {
                const proveedoresDeCategoria = await executeQuery<any[]>(
                    `SELECT id_proveedor FROM proveedor_categoria 
                     WHERE id_categoria = ? AND id_empresa = ?`,
                    [id_categoria, id_empresa]
                );

                for (const prov of proveedoresDeCategoria) {
                    await executeMutation(
                        `INSERT INTO ingrediente_proveedores (id_empresa, id_ingrediente, id_proveedor) 
                         VALUES (?, ?, ?)`,
                        [id_empresa, id, (prov as any).id_proveedor]
                    );
                }
            } else if (forma_agrupacion === 'proveedor' && proveedores && Array.isArray(proveedores)) {
                for (const idProveedor of proveedores) {
                    await executeMutation(
                        `INSERT INTO ingrediente_proveedores (id_empresa, id_ingrediente, id_proveedor) 
                         VALUES (?, ?, ?)`,
                        [id_empresa, id, idProveedor]
                    );
                }
            }
        } else if (proveedores !== undefined) {
            await executeMutation(
                `DELETE FROM ingrediente_proveedores WHERE id_ingrediente = ? AND id_empresa = ?`,
                [id, id_empresa]
            );

            if (Array.isArray(proveedores) && proveedores.length > 0) {
                for (const idProveedor of proveedores) {
                    await executeMutation(
                        `INSERT INTO ingrediente_proveedores (id_empresa, id_ingrediente, id_proveedor) 
                         VALUES (?, ?, ?)`,
                        [id_empresa, id, idProveedor]
                    );
                }
            }
        }

        const updated = await executeQuerySingle(
            `SELECT * FROM ingredientes WHERE id = ? AND id_empresa = ?`,
            [id, id_empresa]
        );

        res.json(updated);
    } catch (error) {
        console.error('[updateIngrediente] Error:', error);
        res.status(500).json({ message: 'Error al actualizar ingrediente', error });
    }
};

export const deleteIngrediente = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { id_empresa } = req.query;

        if (!id_empresa) {
            return res.status(400).json({ message: 'id_empresa es requerido' });
        }

        const exists = await executeQuerySingle(
            'SELECT id FROM ingredientes WHERE id = ? AND id_empresa = ?',
            [id, id_empresa]
        );
        if (!exists) {
            return res.status(404).json({ message: 'Ingrediente no encontrado' });
        }

        await executeMutation(
            'DELETE FROM ingrediente_proveedores WHERE id_ingrediente = ? AND id_empresa = ?',
            [id, id_empresa]
        );

        await executeMutation(
            'DELETE FROM ingredientes WHERE id = ? AND id_empresa = ?',
            [id, id_empresa]
        );

        res.status(204).send();
    } catch (error) {
        console.error('[deleteIngrediente] Error:', error);
        res.status(500).json({ message: 'Error al eliminar ingrediente', error });
    }
};