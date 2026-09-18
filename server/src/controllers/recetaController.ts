import { Request, Response } from 'express';
import { executeQuery, executeMutation, executeQuerySingle } from '../config/database';

export const getRecetas = async (req: Request, res: Response) => {
    try {
        const { id_empresa } = req.query;
        if (!id_empresa) {
            return res.status(400).json({ message: 'id_empresa es requerido' });
        }

        const rows = await executeQuery<any[]>(
            `SELECT 
                r.id,
                r.id_empresa,
                r.nombre,
                r.descripcion,
                r.categoria_receta,
                r.tipo_preparacion,
                r.cantidad_base,
                r.porciones_por_unidad,
                r.porciones_total,
                r.tiempo_preparacion,
                r.tiempo_coccion,
                r.dificultad,
                r.rendimiento,
                r.costo_estimado,
                r.estado,
                r.created_by,
                r.created_at,
                r.updated_at
             FROM recetas r
             WHERE r.id_empresa = ?
             ORDER BY r.nombre`,
            [id_empresa]
        );

        const recetasConDetalles = await Promise.all(
            rows.map(async (receta: any) => {
                const ingredientes = await executeQuery<any[]>(
                    `SELECT 
                        ri.id_ingrediente,
                        i.nombre,
                        ri.cantidad_por_unidad,
                        ri.unidad,
                        ri.notas,
                        ri.es_opcional,
                        i.id_categoria,
                        c.nombre AS categoria_nombre,
                        c.descripcion AS categoria_descripcion
                     FROM receta_ingredientes ri
                     JOIN ingredientes i ON ri.id_ingrediente = i.id
                     LEFT JOIN categorias_alimentos c ON i.id_categoria = c.id
                     WHERE ri.id_receta = ? AND ri.id_empresa = ?
                     ORDER BY i.nombre`,
                    [receta.id, id_empresa]
                );

                const pasos = await executeQuery<any[]>(
                    `SELECT orden, descripcion
                     FROM receta_pasos
                     WHERE id_receta = ? AND id_empresa = ?
                     ORDER BY orden`,
                    [receta.id, id_empresa]
                );

                const productosCarta = await executeQuery<any[]>(
                    `SELECT 
                       pc.id,
                       pc.id_tipo_servicio,
                       pc.precio,
                       st.clave AS tipo_servicio_clave,
                       st.nombre AS tipo_servicio_nombre
                    FROM catering_service_productos_carta pc
                    JOIN catering_service_tipos st ON pc.id_tipo_servicio = st.id
                    WHERE pc.id_receta = ?`,
                    [receta.id]
                );

                return {
                    ...receta,
                    cantidad_base: parseFloat(receta.cantidad_base),
                    porciones_por_unidad: parseInt(receta.porciones_por_unidad),
                    porciones_total: parseInt(receta.porciones_total),
                    rendimiento: parseFloat(receta.rendimiento),
                    costo_estimado: receta.costo_estimado ? parseFloat(receta.costo_estimado) : null,
                    estado: receta.estado === 1,
                    ingredientes: ingredientes.map((i: any) => ({
                        id_ingrediente: i.id_ingrediente,
                        nombre: i.nombre,
                        cantidad: parseFloat(i.cantidad_por_unidad),
                        unidad: i.unidad,
                        notas: i.notas,
                        es_opcional: i.es_opcional === 1,
                        id_categoria: i.id_categoria,
                        categoria: i.categoria_nombre ? {
                            id: i.id_categoria,
                            nombre: i.categoria_nombre,
                            descripcion: i.categoria_descripcion
                        } : null
                    })),
                    pasos: pasos.map((p: any) => ({
                        orden: p.orden,
                        descripcion: p.descripcion
                    })),
                    servicios: productosCarta.map((pc: any) => ({
                        id_producto_carta: pc.id,
                        id_tipo_servicio: pc.id_tipo_servicio,
                        nombre_producto: receta.nombre,
                        precio: parseFloat(pc.precio),
                        tipo_servicio: {
                            clave: pc.tipo_servicio_clave,
                            nombre: pc.tipo_servicio_nombre
                        }
                    }))
                };
            })
        );

        res.json(recetasConDetalles);
    } catch (error) {
        console.error('[getRecetas] Error:', error);
        res.status(500).json({ message: 'Error al obtener recetas', error });
    }
};

export const getRecetaById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { id_empresa } = req.query;
        if (!id_empresa) {
            return res.status(400).json({ message: 'id_empresa es requerido' });
        }

        const receta = await executeQuerySingle<any>(
            `SELECT 
                r.id,
                r.id_empresa,
                r.nombre,
                r.descripcion,
                r.categoria_receta,
                r.tipo_preparacion,
                r.cantidad_base,
                r.porciones_por_unidad,
                r.porciones_total,
                r.tiempo_preparacion,
                r.tiempo_coccion,
                r.dificultad,
                r.rendimiento,
                r.costo_estimado,
                r.estado,
                r.created_by,
                r.created_at,
                r.updated_at
             FROM recetas r
             WHERE r.id = ? AND r.id_empresa = ?`,
            [id, id_empresa]
        );

        if (!receta) {
            return res.status(404).json({ message: 'Receta no encontrada' });
        }

        const ingredientes = await executeQuery<any[]>(
            `SELECT 
                ri.id_ingrediente,
                i.nombre,
                ri.cantidad_por_unidad,
                ri.unidad,
                ri.notas,
                ri.es_opcional,
                i.id_categoria,
                c.nombre AS categoria_nombre,
                c.descripcion AS categoria_descripcion
             FROM receta_ingredientes ri
             JOIN ingredientes i ON ri.id_ingrediente = i.id
             LEFT JOIN categorias_alimentos c ON i.id_categoria = c.id
             WHERE ri.id_receta = ? AND ri.id_empresa = ?
             ORDER BY i.nombre`,
            [id, id_empresa]
        );

        const pasos = await executeQuery<any[]>(
            `SELECT orden, descripcion
             FROM receta_pasos
             WHERE id_receta = ? AND id_empresa = ?
             ORDER BY orden`,
            [id, id_empresa]
        );

        const productosCarta = await executeQuery<any[]>(
            `SELECT 
               pc.id,
               pc.id_tipo_servicio,
               pc.precio,
               st.clave AS tipo_servicio_clave,
               st.nombre AS tipo_servicio_nombre
            FROM catering_service_productos_carta pc
            JOIN catering_service_tipos st ON pc.id_tipo_servicio = st.id
            WHERE pc.id_receta = ?`,
            [receta.id]
        );

        res.json({
            ...receta,
            cantidad_base: parseFloat(receta.cantidad_base),
            porciones_por_unidad: parseInt(receta.porciones_por_unidad),
            porciones_total: parseInt(receta.porciones_total),
            rendimiento: parseFloat(receta.rendimiento),
            costo_estimado: receta.costo_estimado ? parseFloat(receta.costo_estimado) : null,
            estado: receta.estado === 1,
            ingredientes: ingredientes.map((i: any) => ({
                id_ingrediente: i.id_ingrediente,
                nombre: i.nombre,
                cantidad: parseFloat(i.cantidad_por_unidad),
                unidad: i.unidad,
                notas: i.notas,
                es_opcional: i.es_opcional === 1,
                id_categoria: i.id_categoria,
                categoria: i.categoria_nombre ? {
                    id: i.id_categoria,
                    nombre: i.categoria_nombre,
                    descripcion: i.categoria_descripcion
                } : null
            })),
            pasos: pasos.map((p: any) => ({
                orden: p.orden,
                descripcion: p.descripcion
            })),
            servicios: productosCarta.map((pc: any) => ({
                id_producto_carta: pc.id,
                id_tipo_servicio: pc.id_tipo_servicio,
                nombre_producto: receta.nombre,
                precio: parseFloat(pc.precio),
                tipo_servicio: {
                    clave: pc.tipo_servicio_clave,
                    nombre: pc.tipo_servicio_nombre
                }
            }))
        });
    } catch (error) {
        console.error('[getRecetaById] Error:', error);
        res.status(500).json({ message: 'Error al obtener receta', error });
    }
};

export const createReceta = async (req: Request, res: Response) => {
    try {
        const {
            id_empresa,
            nombre,
            descripcion,
            categoria_receta,
            tipo_preparacion,
            cantidad_base,
            porciones_por_unidad,
            tiempo_preparacion,
            tiempo_coccion,
            dificultad,
            rendimiento,
            costo_estimado,
            created_by,
            ingredientes,
            pasos
        } = req.body;

        if (!id_empresa || !nombre) {
            return res.status(400).json({ message: 'id_empresa y nombre son requeridos' });
        }

        const result = await executeMutation(
            `INSERT INTO recetas (
                id_empresa, nombre, descripcion,
                categoria_receta, tipo_preparacion, cantidad_base, porciones_por_unidad,
                tiempo_preparacion, tiempo_coccion, dificultad, rendimiento, costo_estimado,
                estado, created_by
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
            [
                id_empresa,
                nombre,
                descripcion || null,
                categoria_receta || 'plato_principal',
                tipo_preparacion || 'por_unidad',
                cantidad_base || 1,
                porciones_por_unidad || 1,
                tiempo_preparacion || null,
                tiempo_coccion || null,
                dificultad || 'media',
                rendimiento || 100,
                costo_estimado || null,
                created_by || 'admin'
            ]
        );

        const recetaId = result.insertId;

        if (ingredientes && Array.isArray(ingredientes)) {
            for (const ing of ingredientes) {
                if (!ing.id_ingrediente || !ing.cantidad) continue;
                await executeMutation(
                    `INSERT INTO receta_ingredientes 
                        (id_empresa, id_receta, id_ingrediente, cantidad_por_unidad, unidad, notas, es_opcional) 
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [
                        id_empresa,
                        recetaId,
                        ing.id_ingrediente,
                        ing.cantidad,
                        ing.unidad || 'unidades',
                        ing.notas || null,
                        ing.es_opcional ? 1 : 0
                    ]
                );
            }
        }

        if (pasos && Array.isArray(pasos) && pasos.length > 0) {
            let orden = 1;
            for (const paso of pasos) {
                if (!paso.descripcion || !paso.descripcion.trim()) continue;
                await executeMutation(
                    `INSERT INTO receta_pasos (id_empresa, id_receta, orden, descripcion) 
                     VALUES (?, ?, ?, ?)`,
                    [id_empresa, recetaId, orden, paso.descripcion.trim()]
                );
                orden++;
            }
        }

        const newRow = await executeQuerySingle(
            `SELECT * FROM recetas WHERE id = ? AND id_empresa = ?`,
            [recetaId, id_empresa]
        );

        res.status(201).json(newRow);
    } catch (error) {
        console.error('[createReceta] Error:', error);
        res.status(500).json({ message: 'Error al crear receta', error });
    }
};

export const updateReceta = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const {
            id_empresa,
            nombre,
            descripcion,
            categoria_receta,
            tipo_preparacion,
            cantidad_base,
            porciones_por_unidad,
            tiempo_preparacion,
            tiempo_coccion,
            dificultad,
            rendimiento,
            costo_estimado,
            estado,
            ingredientes,
            pasos
        } = req.body;

        if (!id_empresa) {
            return res.status(400).json({ message: 'id_empresa es requerido' });
        }

        const exists = await executeQuerySingle(
            'SELECT id FROM recetas WHERE id = ? AND id_empresa = ?',
            [id, id_empresa]
        );
        if (!exists) {
            return res.status(404).json({ message: 'Receta no encontrada' });
        }

        await executeMutation(
            `UPDATE recetas SET 
                nombre = ?, descripcion = ?,
                categoria_receta = ?, tipo_preparacion = ?, cantidad_base = ?, porciones_por_unidad = ?,
                tiempo_preparacion = ?, tiempo_coccion = ?, dificultad = ?, rendimiento = ?, costo_estimado = ?,
                estado = ?
             WHERE id = ? AND id_empresa = ?`,
            [
                nombre,
                descripcion || null,
                categoria_receta || 'plato_principal',
                tipo_preparacion || 'por_unidad',
                cantidad_base || 1,
                porciones_por_unidad || 1,
                tiempo_preparacion || null,
                tiempo_coccion || null,
                dificultad || 'media',
                rendimiento || 100,
                costo_estimado || null,
                estado !== undefined ? (estado ? 1 : 0) : 1,
                id,
                id_empresa
            ]
        );

        await executeMutation(
            'DELETE FROM receta_ingredientes WHERE id_receta = ? AND id_empresa = ?',
            [id, id_empresa]
        );

        if (ingredientes && Array.isArray(ingredientes)) {
            for (const ing of ingredientes) {
                if (!ing.id_ingrediente || !ing.cantidad) continue;
                await executeMutation(
                    `INSERT INTO receta_ingredientes 
                        (id_empresa, id_receta, id_ingrediente, cantidad_por_unidad, unidad, notas, es_opcional) 
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [
                        id_empresa,
                        id,
                        ing.id_ingrediente,
                        ing.cantidad,
                        ing.unidad || 'unidades',
                        ing.notas || null,
                        ing.es_opcional ? 1 : 0
                    ]
                );
            }
        }

        await executeMutation(
            'DELETE FROM receta_pasos WHERE id_receta = ? AND id_empresa = ?',
            [id, id_empresa]
        );

        if (pasos && Array.isArray(pasos) && pasos.length > 0) {
            let orden = 1;
            for (const paso of pasos) {
                if (!paso.descripcion || !paso.descripcion.trim()) continue;
                await executeMutation(
                    `INSERT INTO receta_pasos (id_empresa, id_receta, orden, descripcion) 
                     VALUES (?, ?, ?, ?)`,
                    [id_empresa, id, orden, paso.descripcion.trim()]
                );
                orden++;
            }
        }

        const updated = await executeQuerySingle(
            `SELECT * FROM recetas WHERE id = ? AND id_empresa = ?`,
            [id, id_empresa]
        );

        res.json(updated);
    } catch (error) {
        console.error('[updateReceta] Error:', error);
        res.status(500).json({ message: 'Error al actualizar receta', error });
    }
};

export const deleteReceta = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { id_empresa } = req.query;

        if (!id_empresa) {
            return res.status(400).json({ message: 'id_empresa es requerido' });
        }

        const exists = await executeQuerySingle(
            'SELECT id FROM recetas WHERE id = ? AND id_empresa = ?',
            [id, id_empresa]
        );
        if (!exists) {
            return res.status(404).json({ message: 'Receta no encontrada' });
        }

        await executeMutation(
            'DELETE FROM receta_ingredientes WHERE id_receta = ? AND id_empresa = ?',
            [id, id_empresa]
        );

        await executeMutation(
            'DELETE FROM receta_pasos WHERE id_receta = ? AND id_empresa = ?',
            [id, id_empresa]
        );

        await executeMutation(
            'UPDATE catering_service_productos_carta SET id_receta = NULL WHERE id_receta = ?',
            [id]
        );

        await executeMutation(
            'DELETE FROM recetas WHERE id = ? AND id_empresa = ?',
            [id, id_empresa]
        );

        res.status(204).send();
    } catch (error) {
        console.error('[deleteReceta] Error:', error);
        res.status(500).json({ message: 'Error al eliminar receta', error });
    }
};

export const getRecetaByProducto = async (req: Request, res: Response) => {
    try {
        const nombre = req.query.nombre as string;
        const id_empresa = req.query.id_empresa ? Number(req.query.id_empresa) : null;

        if (!nombre) {
            return res.status(400).json({ message: 'Nombre de producto requerido' });
        }
        if (!id_empresa) {
            return res.status(400).json({ message: 'id_empresa es requerido' });
        }

        const receta = await executeQuery<any[]>(`
            SELECT 
                r.id AS receta_id,
                r.nombre AS receta_nombre,
                r.tipo_preparacion,
                r.cantidad_base,
                r.porciones_por_unidad,
                r.porciones_total,
                r.rendimiento,
                i.nombre AS ingrediente_nombre,
                i.unidad,
                ri.cantidad_por_unidad,
                p.nombre AS proveedor_nombre,
                p.celular AS proveedor_telefono
            FROM recetas r
            JOIN receta_ingredientes ri ON r.id = ri.id_receta
            JOIN ingredientes i ON ri.id_ingrediente = i.id
            LEFT JOIN ingrediente_proveedores ip ON i.id = ip.id_ingrediente AND i.id_empresa = ip.id_empresa
            LEFT JOIN personas p ON ip.id_proveedor = p.id AND p.id_empresa = ?
            WHERE (r.nombre LIKE ?
                OR r.id = (
                    SELECT r2.id 
                    FROM catering_service_productos_carta pc 
                    JOIN recetas r2 ON pc.id_receta = r2.id
                    WHERE r2.nombre = ? 
                    LIMIT 1
                ))
              AND r.id_empresa = ?
              AND ri.id_empresa = ?
              AND i.id_empresa = ?
        `, [id_empresa, `%${nombre}%`, nombre, id_empresa, id_empresa, id_empresa]);

        if (receta.length === 0) {
            return res.json([]);
        }

        res.json(receta);
    } catch (error) {
        console.error('[getRecetaByProducto] Error:', error);
        res.status(500).json({ message: 'Error al obtener receta' });
    }
};