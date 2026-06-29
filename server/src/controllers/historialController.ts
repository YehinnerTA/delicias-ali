import { Request, Response } from 'express';
import { executeQuery, executeMutation } from '../config/database';

export const getHistorialByEntity = async (req: Request, res: Response) => {
    try {
        const { entidad, id_entidad } = req.params;
        const rows = await executeQuery(
            'SELECT * FROM historial WHERE entidad = ? AND id_entidad = ? ORDER BY id DESC',
            [entidad, id_entidad]
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener historial', error });
    }
};

export const createHistorial = async (req: Request, res: Response) => {
    try {
        const { entidad, id_entidad, accion, descripcion, usuario } = req.body;
        const result = await executeMutation(
            `INSERT INTO historial (entidad, id_entidad, accion, descripcion, usuario) VALUES (?, ?, ?, ?, ?)`,
            [entidad, id_entidad, accion, descripcion, usuario]
        );
        const newRow = await executeQuery('SELECT * FROM historial WHERE id = ?', [result.insertId]);
        res.status(201).json(newRow);
    } catch (error) {
        res.status(500).json({ message: 'Error al crear historial', error });
    }
};