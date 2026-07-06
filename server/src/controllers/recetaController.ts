import { Request, Response } from 'express';
import { executeQuery, executeQuerySingle } from '../config/database';

export const getRecetaByProducto = async (req: Request, res: Response) => {
    try {
        const nombre = req.query.nombre as string;
        if (!nombre) {
            return res.status(400).json({ message: 'Nombre de producto requerido' });
        }

        const receta = await executeQuery<any[]>(`
            SELECT 
                r.id AS receta_id,
                r.nombre AS receta_nombre,
                i.nombre AS ingrediente_nombre,
                i.unidad,
                ri.cantidad_por_unidad,
                p.nombre AS proveedor_nombre,
                p.celular AS proveedor_telefono
            FROM recetas r
            JOIN receta_ingredientes ri ON r.id = ri.id_receta
            JOIN ingredientes i ON ri.id_ingrediente = i.id
            LEFT JOIN personas p ON ri.id_proveedor = p.id
            WHERE r.nombre LIKE ?
            OR r.id = (SELECT id_producto_carta FROM catering_service_productos_carta WHERE nombre = ? LIMIT 1)
        `, [`%${nombre}%`, nombre]);

        if (receta.length === 0) {
            return res.json([]);
        }

        res.json(receta);
    } catch (error) {
        console.error('[getRecetaByProducto] Error:', error);
        res.status(500).json({ message: 'Error al obtener receta' });
    }
};