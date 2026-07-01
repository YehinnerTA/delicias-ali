import { Request, Response } from 'express';
import { executeQuery, executeMutation, executeQuerySingle } from '../config/database';

const ENCRYPTION_KEY = 'ClaveSeguraParaEventosPeru2024!';

export const getUsuarios = async (req: Request, res: Response) => {
    try {
        const rows = await executeQuery(`
            SELECT u.*, p.nombre as persona_nombre, p.apellido as persona_apellido, r.nombre as rol_nombre
            FROM usuarios u
            JOIN personas p ON u.id_persona = p.id
            JOIN roles r ON u.id_rol = r.id
            ORDER BY u.id DESC
        `);
        res.json(rows);
    } catch (error) {
        console.error('[getUsuarios] Error:', error);
        res.status(500).json({ message: 'Error al obtener usuarios', error: error instanceof Error ? error.message : String(error) });
    }
};

export const getUsuarioById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const row = await executeQuerySingle(`
            SELECT u.*, p.nombre as persona_nombre, p.apellido as persona_apellido, r.nombre as rol_nombre
            FROM usuarios u
            JOIN personas p ON u.id_persona = p.id
            JOIN roles r ON u.id_rol = r.id
            WHERE u.id = ?
        `, [id]);
        res.json(row);
    } catch (error) {
        console.error('[getUsuarioById] Error:', error);
        res.status(500).json({ message: 'Error al obtener usuario', error: error instanceof Error ? error.message : String(error) });
    }
};

export const createUsuario = async (req: Request, res: Response) => {
    try {
        const { id_persona, usuario, password, id_rol, firma } = req.body;

        if (!id_persona || !usuario || !password) {
            return res.status(400).json({
                message: 'Faltan campos obligatorios: id_persona, usuario, password'
            });
        }

        const hashResult = await executeQuery<{ hash: string }>(
            `SELECT SHA2(CONCAT(?, SHA2(?, 256)), 256) as hash`,
            [password, ENCRYPTION_KEY]
        );

        const password_hash = Array.isArray(hashResult) && hashResult.length > 0 ? hashResult[0].hash : null;

        if (!password_hash) {
            throw new Error('No se pudo generar el hash de la contraseña');
        }

        const result = await executeMutation(
            `INSERT INTO usuarios (id_persona, usuario, password_hash, id_rol, firma) VALUES (?, ?, ?, ?, ?)`,
            [id_persona, usuario, password_hash, id_rol || 1, firma || null]
        );

        const newRow = await executeQuerySingle('SELECT * FROM usuarios WHERE id = ?', [result.insertId]);
        res.status(201).json(newRow);
    } catch (error) {
        console.error('[createUsuario] Error completo:', error);
        res.status(500).json({
            message: 'Error al crear usuario',
            error: error instanceof Error ? error.message : String(error)
        });
    }
};

export const updateUsuario = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { id_persona, usuario, id_rol, firma, estado } = req.body;
        await executeMutation(
            `UPDATE usuarios SET id_persona = ?, usuario = ?, id_rol = ?, firma = ?, estado = ? WHERE id = ?`,
            [id_persona, usuario, id_rol, firma, estado, id]
        );
        const updated = await executeQuerySingle('SELECT * FROM usuarios WHERE id = ?', [id]);
        res.json(updated);
    } catch (error) {
        console.error('[updateUsuario] Error:', error);
        res.status(500).json({ message: 'Error al actualizar usuario', error: error instanceof Error ? error.message : String(error) });
    }
};

export const deleteUsuario = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await executeMutation('DELETE FROM usuarios WHERE id = ?', [id]);
        res.status(204).send();
    } catch (error) {
        console.error('[deleteUsuario] Error:', error);
        res.status(500).json({ message: 'Error al eliminar usuario', error: error instanceof Error ? error.message : String(error) });
    }
};