import { Request, Response } from 'express';
import { executeQuery, executeMutation } from '../config/database';

export const getActividad = async (req: Request, res: Response) => {
    try {
        const rows = await executeQuery('SELECT * FROM actividad ORDER BY id DESC LIMIT 50');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener actividad', error });
    }
};

export const createActividad = async (req: Request, res: Response) => {
    try {
        const { modulo, accion, detalle, usuario } = req.body;
        const result = await executeMutation(
            `INSERT INTO actividad (modulo, accion, detalle, usuario) VALUES (?, ?, ?, ?)`,
            [modulo, accion, detalle, usuario]
        );
        const newRow = await executeQuery('SELECT * FROM actividad WHERE id = ?', [result.insertId]);
        res.status(201).json(newRow);
    } catch (error) {
        res.status(500).json({ message: 'Error al crear actividad', error });
    }
};