import { Request, Response } from 'express';
import { executeQuery, executeMutation, executeQuerySingle } from '../config/database';

export const getPersonas = async (req: Request, res: Response) => {
    try {
        const { id_empresa } = req.query;
        if (!id_empresa) {
            return res.status(400).json({ message: 'id_empresa es requerido' });
        }
        const rows = await executeQuery(
            'SELECT * FROM personas WHERE id_empresa = ? ORDER BY id DESC',
            [id_empresa]
        );
        res.json(rows);
    } catch (error) {
        console.error('[getPersonas] Error:', error);
        res.status(500).json({ message: 'Error al obtener personas', error });
    }
};

export const getPersonaById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { id_empresa } = req.query;
        if (!id_empresa) {
            return res.status(400).json({ message: 'id_empresa es requerido' });
        }
        const row = await executeQuerySingle(
            'SELECT * FROM personas WHERE id = ? AND id_empresa = ?',
            [id, id_empresa]
        );
        if (!row) {
            return res.status(404).json({ message: 'Persona no encontrada en esta empresa' });
        }
        res.json(row);
    } catch (error) {
        console.error('[getPersonaById] Error:', error);
        res.status(500).json({ message: 'Error al obtener persona', error });
    }
};

export const createPersona = async (req: Request, res: Response) => {
    try {
        const { id_empresa, tipo_persona, tipo_documento, numero_documento, razon_social, nombre, apellido, email, celular } = req.body;
        if (!id_empresa) {
            return res.status(400).json({ message: 'id_empresa es requerido' });
        }
        const result = await executeMutation(
            `INSERT INTO personas 
             (id_empresa, tipo_persona, tipo_documento, numero_documento, razon_social, nombre, apellido, email, celular) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id_empresa, tipo_persona, tipo_documento, numero_documento, razon_social, nombre, apellido, email, celular]
        );
        const newRow = await executeQuerySingle(
            'SELECT * FROM personas WHERE id = ? AND id_empresa = ?',
            [result.insertId, id_empresa]
        );
        res.status(201).json(newRow);
    } catch (error) {
        console.error('[createPersona] Error:', error);
        res.status(500).json({ message: 'Error al crear persona', error });
    }
};

export const updatePersona = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { id_empresa, tipo_persona, tipo_documento, numero_documento, razon_social, nombre, apellido, email, celular, estado } = req.body;
        if (!id_empresa) {
            return res.status(400).json({ message: 'id_empresa es requerido' });
        }
        const exists = await executeQuerySingle(
            'SELECT id FROM personas WHERE id = ? AND id_empresa = ?',
            [id, id_empresa]
        );
        if (!exists) {
            return res.status(404).json({ message: 'Persona no encontrada en esta empresa' });
        }

        await executeMutation(
            `UPDATE personas SET 
                id_empresa = ?, tipo_persona = ?, tipo_documento = ?, numero_documento = ?, 
                razon_social = ?, nombre = ?, apellido = ?, email = ?, celular = ?, estado = ? 
             WHERE id = ? AND id_empresa = ?`,
            [id_empresa, tipo_persona, tipo_documento, numero_documento, razon_social, nombre, apellido, email, celular, estado, id, id_empresa]
        );
        const updated = await executeQuerySingle(
            'SELECT * FROM personas WHERE id = ? AND id_empresa = ?',
            [id, id_empresa]
        );
        res.json(updated);
    } catch (error) {
        console.error('[updatePersona] Error:', error);
        res.status(500).json({ message: 'Error al actualizar persona', error });
    }
};

export const deletePersona = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { id_empresa } = req.body;
        const empresaId = req.query.id_empresa || req.body.id_empresa;
        if (!empresaId) {
            return res.status(400).json({ message: 'id_empresa es requerido' });
        }
        const exists = await executeQuerySingle(
            'SELECT id FROM personas WHERE id = ? AND id_empresa = ?',
            [id, empresaId]
        );
        if (!exists) {
            return res.status(404).json({ message: 'Persona no encontrada en esta empresa' });
        }

        await executeMutation(
            'DELETE FROM personas WHERE id = ? AND id_empresa = ?',
            [id, empresaId]
        );
        res.status(204).send();
    } catch (error) {
        console.error('[deletePersona] Error:', error);
        res.status(500).json({ message: 'Error al eliminar persona', error });
    }
};