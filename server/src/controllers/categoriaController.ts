import { Request, Response } from 'express';
import { executeQuery, executeMutation, executeQuerySingle } from '../config/database';

export const getCategorias = async (req: Request, res: Response) => {
    try {
        const { id_empresa } = req.query;
        if (!id_empresa) {
            return res.status(400).json({ message: 'id_empresa es requerido' });
        }
        const rows = await executeQuery(
            'SELECT * FROM categorias_alimentos WHERE id_empresa = ? ORDER BY nombre',
            [id_empresa]
        );
        res.json(rows);
    } catch (error) {
        console.error('[getCategorias] Error:', error);
        res.status(500).json({ message: 'Error al obtener categorías', error });
    }
};

export const getCategoriaById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { id_empresa } = req.query;
        if (!id_empresa) {
            return res.status(400).json({ message: 'id_empresa es requerido' });
        }
        const row = await executeQuerySingle(
            'SELECT * FROM categorias_alimentos WHERE id = ? AND id_empresa = ?',
            [id, id_empresa]
        );
        if (!row) {
            return res.status(404).json({ message: 'Categoría no encontrada' });
        }
        res.json(row);
    } catch (error) {
        console.error('[getCategoriaById] Error:', error);
        res.status(500).json({ message: 'Error al obtener categoría', error });
    }
};

export const createCategoria = async (req: Request, res: Response) => {
    try {
        const { id_empresa, nombre, descripcion } = req.body;
        if (!id_empresa || !nombre) {
            return res.status(400).json({ message: 'id_empresa y nombre son requeridos' });
        }
        const result = await executeMutation(
            `INSERT INTO categorias_alimentos (id_empresa, nombre, descripcion) VALUES (?, ?, ?)`,
            [id_empresa, nombre, descripcion || null]
        );
        const newRow = await executeQuerySingle(
            'SELECT * FROM categorias_alimentos WHERE id = ? AND id_empresa = ?',
            [result.insertId, id_empresa]
        );
        res.status(201).json(newRow);
    } catch (error) {
        console.error('[createCategoria] Error:', error);
        res.status(500).json({ message: 'Error al crear categoría', error });
    }
};

export const updateCategoria = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { id_empresa, nombre, descripcion } = req.body;
        if (!id_empresa || !nombre) {
            return res.status(400).json({ message: 'id_empresa y nombre son requeridos' });
        }
        const exists = await executeQuerySingle(
            'SELECT id FROM categorias_alimentos WHERE id = ? AND id_empresa = ?',
            [id, id_empresa]
        );
        if (!exists) {
            return res.status(404).json({ message: 'Categoría no encontrada' });
        }
        await executeMutation(
            `UPDATE categorias_alimentos SET nombre = ?, descripcion = ? WHERE id = ? AND id_empresa = ?`,
            [nombre, descripcion || null, id, id_empresa]
        );
        const updated = await executeQuerySingle(
            'SELECT * FROM categorias_alimentos WHERE id = ? AND id_empresa = ?',
            [id, id_empresa]
        );
        res.json(updated);
    } catch (error) {
        console.error('[updateCategoria] Error:', error);
        res.status(500).json({ message: 'Error al actualizar categoría', error });
    }
};

export const deleteCategoria = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { id_empresa } = req.query;
        if (!id_empresa) {
            return res.status(400).json({ message: 'id_empresa es requerido' });
        }
        const exists = await executeQuerySingle(
            'SELECT id FROM categorias_alimentos WHERE id = ? AND id_empresa = ?',
            [id, id_empresa]
        );
        if (!exists) {
            return res.status(404).json({ message: 'Categoría no encontrada' });
        }
        await executeMutation(
            'DELETE FROM categorias_alimentos WHERE id = ? AND id_empresa = ?',
            [id, id_empresa]
        );
        res.status(204).send();
    } catch (error) {
        console.error('[deleteCategoria] Error:', error);
        res.status(500).json({ message: 'Error al eliminar categoría', error });
    }
};