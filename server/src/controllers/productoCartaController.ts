import { Request, Response } from 'express';
import { executeQuery, executeMutation, executeQuerySingle } from '../config/database';

export const getProductosCarta = async (req: Request, res: Response) => {
    try {
        const rows = await executeQuery<any[]>(
            `SELECT 
                pc.id,
                pc.id_tipo_servicio,
                pc.id_receta,
                pc.nombre,
                pc.precio,
                pc.created_at,
                pc.updated_at,
                st.clave AS tipo_servicio_clave,
                st.nombre AS tipo_servicio_nombre,
                r.nombre AS receta_nombre,
                r.categoria_receta AS receta_categoria,
                r.tipo_preparacion AS receta_tipo_preparacion,
                r.porciones_total AS receta_porciones_total
             FROM catering_service_productos_carta pc
             JOIN catering_service_tipos st ON pc.id_tipo_servicio = st.id
             LEFT JOIN recetas r ON pc.id_receta = r.id
             ORDER BY st.nombre, pc.nombre`
        );

        const result = rows.map((row: any) => ({
            id: row.id,
            id_tipo_servicio: row.id_tipo_servicio,
            id_receta: row.id_receta,
            nombre: row.nombre,
            precio: parseFloat(row.precio),
            tipo_servicio: {
                id: row.id_tipo_servicio,
                clave: row.tipo_servicio_clave,
                nombre: row.tipo_servicio_nombre
            },
            receta: row.id_receta ? {
                id: row.id_receta,
                nombre: row.receta_nombre,
                categoria: row.receta_categoria,
                tipo_preparacion: row.receta_tipo_preparacion,
                porciones_total: row.receta_porciones_total
            } : null,
            created_at: row.created_at,
            updated_at: row.updated_at
        }));

        res.json(result);
    } catch (error) {
        console.error('[getProductosCarta] Error:', error);
        res.status(500).json({ message: 'Error al obtener productos de carta', error });
    }
};

export const getProductoCartaById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const row = await executeQuerySingle<any>(
            `SELECT 
                pc.id,
                pc.id_tipo_servicio,
                pc.id_receta,
                pc.nombre,
                pc.precio,
                st.clave AS tipo_servicio_clave,
                st.nombre AS tipo_servicio_nombre,
                r.nombre AS receta_nombre
             FROM catering_service_productos_carta pc
             JOIN catering_service_tipos st ON pc.id_tipo_servicio = st.id
             LEFT JOIN recetas r ON pc.id_receta = r.id
             WHERE pc.id = ?`,
            [id]
        );

        if (!row) {
            return res.status(404).json({ message: 'Producto de carta no encontrado' });
        }

        res.json({
            id: row.id,
            id_tipo_servicio: row.id_tipo_servicio,
            id_receta: row.id_receta,
            nombre: row.nombre,
            precio: parseFloat(row.precio),
            tipo_servicio: {
                id: row.id_tipo_servicio,
                clave: row.tipo_servicio_clave,
                nombre: row.tipo_servicio_nombre
            },
            receta: row.id_receta ? {
                id: row.id_receta,
                nombre: row.receta_nombre
            } : null
        });
    } catch (error) {
        console.error('[getProductoCartaById] Error:', error);
        res.status(500).json({ message: 'Error al obtener producto de carta', error });
    }
};

export const createProductoCarta = async (req: Request, res: Response) => {
    try {
        const { id_tipo_servicio, id_receta, nombre, precio } = req.body;

        if (!id_tipo_servicio || !nombre) {
            return res.status(400).json({ message: 'id_tipo_servicio y nombre son requeridos' });
        }

        const tipoServicio = await executeQuerySingle(
            'SELECT id FROM catering_service_tipos WHERE id = ?',
            [id_tipo_servicio]
        );
        if (!tipoServicio) {
            return res.status(400).json({ message: 'Tipo de servicio no encontrado' });
        }

        if (id_receta) {
            const receta = await executeQuerySingle(
                'SELECT id FROM recetas WHERE id = ?',
                [id_receta]
            );
            if (!receta) {
                return res.status(400).json({ message: 'Receta no encontrada' });
            }
        }

        const result = await executeMutation(
            `INSERT INTO catering_service_productos_carta (id_tipo_servicio, id_receta, nombre, precio) 
             VALUES (?, ?, ?, ?)`,
            [id_tipo_servicio, id_receta || null, nombre, precio || 0]
        );

        const newRow = await executeQuerySingle(
            `SELECT * FROM catering_service_productos_carta WHERE id = ?`,
            [result.insertId]
        );

        res.status(201).json(newRow);
    } catch (error) {
        console.error('[createProductoCarta] Error:', error);
        res.status(500).json({ message: 'Error al crear producto de carta', error });
    }
};

export const updateProductoCarta = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { id_tipo_servicio, id_receta, nombre, precio } = req.body;

        if (!id_tipo_servicio || !nombre) {
            return res.status(400).json({ message: 'id_tipo_servicio y nombre son requeridos' });
        }

        const exists = await executeQuerySingle(
            'SELECT id FROM catering_service_productos_carta WHERE id = ?',
            [id]
        );
        if (!exists) {
            return res.status(404).json({ message: 'Producto de carta no encontrado' });
        }

        await executeMutation(
            `UPDATE catering_service_productos_carta 
             SET id_tipo_servicio = ?, id_receta = ?, nombre = ?, precio = ?
             WHERE id = ?`,
            [id_tipo_servicio, id_receta || null, nombre, precio || 0, id]
        );

        const updated = await executeQuerySingle(
            `SELECT * FROM catering_service_productos_carta WHERE id = ?`,
            [id]
        );

        res.json(updated);
    } catch (error) {
        console.error('[updateProductoCarta] Error:', error);
        res.status(500).json({ message: 'Error al actualizar producto de carta', error });
    }
};

export const deleteProductoCarta = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const exists = await executeQuerySingle(
            'SELECT id FROM catering_service_productos_carta WHERE id = ?',
            [id]
        );
        if (!exists) {
            return res.status(404).json({ message: 'Producto de carta no encontrado' });
        }

        const enVentas = await executeQuerySingle<any>(
            'SELECT COUNT(*) as total FROM catering_service_detalle WHERE id_producto_carta = ?',
            [id]
        );
        if (enVentas && enVentas.total > 0) {
            return res.status(400).json({
                message: `No se puede eliminar. Está en ${enVentas.total} venta(s).`
            });
        }

        await executeMutation('DELETE FROM catering_service_productos_carta WHERE id = ?', [id]);
        res.status(204).send();
    } catch (error) {
        console.error('[deleteProductoCarta] Error:', error);
        res.status(500).json({ message: 'Error al eliminar producto de carta', error });
    }
};