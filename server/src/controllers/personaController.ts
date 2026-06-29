import { Request, Response } from 'express';
import { executeQuery, executeMutation, executeQuerySingle } from '../config/database';

export const getPersonas = async (req: Request, res: Response) => {
    try {
        const rows = await executeQuery('SELECT * FROM personas ORDER BY id DESC');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener personas', error });
    }
};

export const getPersonaById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const row = await executeQuerySingle('SELECT * FROM personas WHERE id = ?', [id]);
        res.json(row);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener persona', error });
    }
};

export const createPersona = async (req: Request, res: Response) => {
    try {
        const { id_empresa, tipo_persona, tipo_documento, numero_documento, razon_social, nombre, apellido, email, celular } = req.body;
        const result = await executeMutation(
            `INSERT INTO personas 
             (id_empresa, tipo_persona, tipo_documento, numero_documento, razon_social, nombre, apellido, email, celular) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id_empresa, tipo_persona, tipo_documento, numero_documento, razon_social, nombre, apellido, email, celular]
        );
        const newRow = await executeQuerySingle('SELECT * FROM personas WHERE id = ?', [result.insertId]);
        res.status(201).json(newRow);
    } catch (error) {
        res.status(500).json({ message: 'Error al crear persona', error });
    }
};

export const updatePersona = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { id_empresa, tipo_persona, tipo_documento, numero_documento, razon_social, nombre, apellido, email, celular, estado } = req.body;
        await executeMutation(
            `UPDATE personas SET 
                id_empresa = ?, tipo_persona = ?, tipo_documento = ?, numero_documento = ?, 
                razon_social = ?, nombre = ?, apellido = ?, email = ?, celular = ?, estado = ? 
             WHERE id = ?`,
            [id_empresa, tipo_persona, tipo_documento, numero_documento, razon_social, nombre, apellido, email, celular, estado, id]
        );
        const updated = await executeQuerySingle('SELECT * FROM personas WHERE id = ?', [id]);
        res.json(updated);
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar persona', error });
    }
};

export const deletePersona = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await executeMutation('DELETE FROM personas WHERE id = ?', [id]);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar persona', error });
    }
};