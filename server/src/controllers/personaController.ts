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
        const personasConCategorias = await Promise.all(
            rows.map(async (persona: any) => {
                if (persona.tipo_persona === 'proveedor') {
                    const categorias = await executeQuery(
                        `SELECT c.id, c.nombre, c.descripcion 
                         FROM categorias_alimentos c
                         JOIN proveedor_categoria pc ON c.id = pc.id_categoria
                         WHERE pc.id_proveedor = ? AND pc.id_empresa = ?`,
                        [persona.id, id_empresa]
                    );
                    return { ...persona, categorias };
                }
                return { ...persona, categorias: [] };
            })
        );
        res.json(personasConCategorias);
    } catch (error) {
        console.error('[getPersonas] Error:', error);
        res.status(500).json({ message: 'Error al obtener personas', error });
    }
};

export const searchPersonaByDocumento = async (req: Request, res: Response) => {
    try {
        const { numero, id_empresa } = req.query;

        if (!id_empresa) {
            return res.status(400).json({ message: 'id_empresa es requerido' });
        }

        if (!numero) {
            return res.status(400).json({ message: 'numero de documento es requerido' });
        }

        const row = await executeQuerySingle(
            'SELECT * FROM personas WHERE numero_documento = ? AND id_empresa = ?',
            [numero, id_empresa]
        );

        if (!row) {
            return res.status(404).json({ message: 'Persona no encontrada' });
        }

        let categorias: any[] = [];
        if (row.tipo_persona === 'proveedor') {
            categorias = await executeQuery(
                `SELECT c.id, c.nombre, c.descripcion 
                 FROM categorias_alimentos c
                 JOIN proveedor_categoria pc ON c.id = pc.id_categoria
                 WHERE pc.id_proveedor = ? AND pc.id_empresa = ?`,
                [row.id, id_empresa]
            );
        }

        res.json({ ...row, categorias });
    } catch (error) {
        console.error('[searchPersonaByDocumento] Error:', error);
        res.status(500).json({ message: 'Error al buscar persona', error });
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
        let categorias: any[] = [];
        if (row.tipo_persona === 'proveedor') {
            categorias = await executeQuery(
                `SELECT c.id, c.nombre, c.descripcion 
                 FROM categorias_alimentos c
                 JOIN proveedor_categoria pc ON c.id = pc.id_categoria
                 WHERE pc.id_proveedor = ? AND pc.id_empresa = ?`,
                [row.id, id_empresa]
            );
        }
        res.json({ ...row, categorias });
    } catch (error) {
        console.error('[getPersonaById] Error:', error);
        res.status(500).json({ message: 'Error al obtener persona', error });
    }
};

export const createPersona = async (req: Request, res: Response) => {
    try {
        const { id_empresa, tipo_persona, tipo_documento, numero_documento, razon_social, nombre, apellido, email, celular, categorias } = req.body;
        if (!id_empresa) {
            return res.status(400).json({ message: 'id_empresa es requerido' });
        }
        const result = await executeMutation(
            `INSERT INTO personas 
             (id_empresa, tipo_persona, tipo_documento, numero_documento, razon_social, nombre, apellido, email, celular) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id_empresa, tipo_persona, tipo_documento, numero_documento, razon_social, nombre, apellido, email, celular]
        );

        const personaId = result.insertId;

        if (tipo_persona === 'proveedor' && categorias && Array.isArray(categorias) && categorias.length > 0) {
            for (const categoriaId of categorias) {
                await executeMutation(
                    `INSERT INTO proveedor_categoria (id_empresa, id_proveedor, id_categoria) 
                     VALUES (?, ?, ?)`,
                    [id_empresa, personaId, categoriaId]
                );
            }
        }

        const newRow = await executeQuerySingle(
            'SELECT * FROM personas WHERE id = ? AND id_empresa = ?',
            [result.insertId, id_empresa]
        );

        let categoriasGuardadas: any[] = [];
        if (tipo_persona === 'proveedor') {
            categoriasGuardadas = await executeQuery(
                `SELECT c.id, c.nombre, c.descripcion 
                 FROM categorias_alimentos c
                 JOIN proveedor_categoria pc ON c.id = pc.id_categoria
                 WHERE pc.id_proveedor = ? AND pc.id_empresa = ?`,
                [personaId, id_empresa]
            );
        }

        res.status(201).json({ ...newRow, categorias: categoriasGuardadas });
    } catch (error) {
        console.error('[createPersona] Error:', error);
        res.status(500).json({ message: 'Error al crear persona', error });
    }
};

export const updatePersona = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { id_empresa, tipo_persona, tipo_documento, numero_documento, razon_social, nombre, apellido, email, celular, estado, categorias } = req.body;
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

        if (tipo_persona === 'proveedor') {
            await executeMutation(
                `DELETE FROM proveedor_categoria WHERE id_proveedor = ? AND id_empresa = ?`,
                [id, id_empresa]
            );

            if (categorias && Array.isArray(categorias) && categorias.length > 0) {
                for (const categoriaId of categorias) {
                    await executeMutation(
                        `INSERT INTO proveedor_categoria (id_empresa, id_proveedor, id_categoria) 
                         VALUES (?, ?, ?)`,
                        [id_empresa, id, categoriaId]
                    );
                }
            }
        }

        const updated = await executeQuerySingle(
            'SELECT * FROM personas WHERE id = ? AND id_empresa = ?',
            [id, id_empresa]
        );

        let categoriasGuardadas: any[] = [];
        if (tipo_persona === 'proveedor') {
            categoriasGuardadas = await executeQuery(
                `SELECT c.id, c.nombre, c.descripcion 
                 FROM categorias_alimentos c
                 JOIN proveedor_categoria pc ON c.id = pc.id_categoria
                 WHERE pc.id_proveedor = ? AND pc.id_empresa = ?`,
                [id, id_empresa]
            );
        }
        res.json({ ...updated, categorias: categoriasGuardadas });
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
            'DELETE FROM proveedor_categoria WHERE id_proveedor = ? AND id_empresa = ?',
            [id, empresaId]
        );

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