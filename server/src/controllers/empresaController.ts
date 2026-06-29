import { Request, Response } from 'express';
import { executeQuery, executeMutation, executeQuerySingle } from '../config/database';

export const getEmpresas = async (req: Request, res: Response) => {
    try {
        const rows = await executeQuery('SELECT * FROM empresas ORDER BY id DESC');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener empresas', error });
    }
};

export const getEmpresaById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const row = await executeQuerySingle('SELECT * FROM empresas WHERE id = ?', [id]);
        res.json(row);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener empresa', error });
    }
};

export const createEmpresa = async (req: Request, res: Response) => {
    try {
        const { ruc, nombre, creado_por } = req.body;
        const result = await executeMutation(
            'INSERT INTO empresas (ruc, nombre, creado_por) VALUES (?, ?, ?)',
            [ruc, nombre, creado_por || null]
        );
        const newRow = await executeQuerySingle('SELECT * FROM empresas WHERE id = ?', [result.insertId]);
        res.status(201).json(newRow);
    } catch (error) {
        res.status(500).json({ message: 'Error al crear empresa', error });
    }
};

export const updateEmpresa = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { ruc, nombre, estado } = req.body;
        await executeMutation(
            'UPDATE empresas SET ruc = ?, nombre = ?, estado = ? WHERE id = ?',
            [ruc, nombre, estado, id]
        );
        const updated = await executeQuerySingle('SELECT * FROM empresas WHERE id = ?', [id]);
        res.json(updated);
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar empresa', error });
    }
};

export const deleteEmpresa = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await executeMutation('DELETE FROM empresas WHERE id = ?', [id]);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar empresa', error });
    }
};