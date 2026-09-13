import { Request, Response } from 'express';
import { executeQuery, executeMutation, executeQuerySingle } from '../config/database';

export const getServiceTipos = async (req: Request, res: Response) => {
    try {
        const rows = await executeQuery<any[]>(
            `SELECT id, clave, nombre, descripcion, created_at, updated_at
             FROM catering_service_tipos
             ORDER BY nombre`
        );
        res.json(rows);
    } catch (error) {
        console.error('[getServiceTipos] Error:', error);
        res.status(500).json({ message: 'Error al obtener tipos de servicio', error });
    }
};

export const getServiceTipoById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const row = await executeQuerySingle<any>(
            `SELECT id, clave, nombre, descripcion, created_at, updated_at
             FROM catering_service_tipos
             WHERE id = ?`,
            [id]
        );
        if (!row) {
            return res.status(404).json({ message: 'Tipo de servicio no encontrado' });
        }
        res.json(row);
    } catch (error) {
        console.error('[getServiceTipoById] Error:', error);
        res.status(500).json({ message: 'Error al obtener tipo de servicio', error });
    }
};

export const createServiceTipo = async (req: Request, res: Response) => {
    try {
        const { clave, nombre, descripcion } = req.body;

        if (!clave || !nombre) {
            return res.status(400).json({ message: 'clave y nombre son requeridos' });
        }

        const exists = await executeQuerySingle(
            'SELECT id FROM catering_service_tipos WHERE clave = ?',
            [clave]
        );
        if (exists) {
            return res.status(400).json({ message: 'Ya existe un tipo de servicio con esa clave' });
        }

        const result = await executeMutation(
            `INSERT INTO catering_service_tipos (clave, nombre, descripcion) 
             VALUES (?, ?, ?)`,
            [clave, nombre, descripcion || null]
        );

        const newRow = await executeQuerySingle(
            `SELECT * FROM catering_service_tipos WHERE id = ?`,
            [result.insertId]
        );

        res.status(201).json(newRow);
    } catch (error) {
        console.error('[createServiceTipo] Error:', error);
        res.status(500).json({ message: 'Error al crear tipo de servicio', error });
    }
};

export const updateServiceTipo = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { clave, nombre, descripcion } = req.body;

        if (!clave || !nombre) {
            return res.status(400).json({ message: 'clave y nombre son requeridos' });
        }

        const exists = await executeQuerySingle(
            'SELECT id FROM catering_service_tipos WHERE id = ?',
            [id]
        );
        if (!exists) {
            return res.status(404).json({ message: 'Tipo de servicio no encontrado' });
        }

        const claveEnUso = await executeQuerySingle(
            'SELECT id FROM catering_service_tipos WHERE clave = ? AND id != ?',
            [clave, id]
        );
        if (claveEnUso) {
            return res.status(400).json({ message: 'Ya existe otro tipo de servicio con esa clave' });
        }

        await executeMutation(
            `UPDATE catering_service_tipos SET clave = ?, nombre = ?, descripcion = ?
             WHERE id = ?`,
            [clave, nombre, descripcion || null, id]
        );

        const updated = await executeQuerySingle(
            `SELECT * FROM catering_service_tipos WHERE id = ?`,
            [id]
        );

        res.json(updated);
    } catch (error) {
        console.error('[updateServiceTipo] Error:', error);
        res.status(500).json({ message: 'Error al actualizar tipo de servicio', error });
    }
};

export const deleteServiceTipo = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const exists = await executeQuerySingle(
            'SELECT id FROM catering_service_tipos WHERE id = ?',
            [id]
        );
        if (!exists) {
            return res.status(404).json({ message: 'Tipo de servicio no encontrado' });
        }

        const productosAsociados = await executeQuerySingle(
            'SELECT COUNT(*) as total FROM catering_service_productos_carta WHERE id_tipo_servicio = ?',
            [id]
        );
        if (productosAsociados && productosAsociados.total > 0) {
            return res.status(400).json({
                message: `No se puede eliminar. Hay ${productosAsociados.total} producto(s) de carta asociado(s) a este tipo de servicio.`
            });
        }

        await executeMutation(
            'DELETE FROM catering_service_tipos WHERE id = ?',
            [id]
        );

        res.status(204).send();
    } catch (error) {
        console.error('[deleteServiceTipo] Error:', error);
        res.status(500).json({ message: 'Error al eliminar tipo de servicio', error });
    }
};