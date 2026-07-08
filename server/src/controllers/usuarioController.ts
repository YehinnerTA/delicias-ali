import { Request, Response } from 'express';
import { executeQuery, executeMutation, executeQuerySingle } from '../config/database';

const ENCRYPTION_KEY = 'ClaveSeguraParaEventosPeru2024!';

export const getUsuarios = async (req: Request, res: Response) => {
    try {
        const rows = await executeQuery<any[]>(`
            SELECT 
                u.*, 
                p.nombre as persona_nombre, 
                p.apellido as persona_apellido, 
                r.nombre as rol_nombre,
                (
                    SELECT GROUP_CONCAT(ue.empresa_id SEPARATOR ',')
                    FROM usuario_empresa ue 
                    WHERE ue.usuario_id = u.id
                ) as empresasIds
            FROM usuarios u
            JOIN personas p ON u.id_persona = p.id
            JOIN roles r ON u.id_rol = r.id
            GROUP BY u.id
            ORDER BY u.id DESC
        `);

        const result = rows.map((row: any) => ({
            ...row,
            empresasIds: row.empresasIds ? (row.empresasIds as string).split(',').map(Number) : []
        }));

        res.json(result);
    } catch (error) {
        console.error('[getUsuarios] Error:', error);
        res.status(500).json({ message: 'Error al obtener usuarios', error: error instanceof Error ? error.message : String(error) });
    }
};

export const getUsuarioById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const row = await executeQuerySingle<any>(
            `
            SELECT 
                u.*, 
                p.nombre as persona_nombre, 
                p.apellido as persona_apellido, 
                r.nombre as rol_nombre,
                (
                    SELECT GROUP_CONCAT(ue.empresa_id SEPARATOR ',')
                    FROM usuario_empresa ue 
                    WHERE ue.usuario_id = u.id
                ) as empresasIds
            FROM usuarios u
            JOIN personas p ON u.id_persona = p.id
            JOIN roles r ON u.id_rol = r.id
            WHERE u.id = ?
            GROUP BY u.id
        `,
            [id]
        );

        if (row) {
            row.empresasIds = row.empresasIds ? (row.empresasIds as string).split(',').map(Number) : [];
        }

        res.json(row);
    } catch (error) {
        console.error('[getUsuarioById] Error:', error);
        res.status(500).json({ message: 'Error al obtener usuario', error: error instanceof Error ? error.message : String(error) });
    }
};

export const createUsuario = async (req: Request, res: Response) => {
    try {
        const { id_persona, usuario, password, id_rol, firma, empresasIds } = req.body;

        const hashResult = await executeQuery<{ hash: string }>(
            `SELECT SHA2(CONCAT(?, SHA2(?, 256)), 256) as hash`,
            [password, ENCRYPTION_KEY]
        );

        if (!hashResult || hashResult.length === 0 || !hashResult[0].hash) {
            throw new Error('No se pudo generar el hash de la contraseña');
        }

        const password_hash = hashResult[0].hash;

        const result = await executeMutation(
            `INSERT INTO usuarios (id_persona, usuario, password_hash, id_rol, firma) VALUES (?, ?, ?, ?, ?)`,
            [id_persona, usuario, password_hash, id_rol || 1, firma || null]
        );

        const usuarioId = result.insertId;

        let empresasAsignadas = empresasIds || [];
        if (empresasAsignadas.length === 0) {
            const empresasActivas = await executeQuery<{ id: number }>('SELECT id FROM empresas WHERE estado = 1');
            empresasAsignadas = empresasActivas.map(e => e.id);
        }

        for (let i = 0; i < empresasAsignadas.length; i++) {
            const empresaId = empresasAsignadas[i];
            const esPredeterminada = (i === 0) ? 1 : 0;
            await executeMutation(
                `INSERT IGNORE INTO usuario_empresa (usuario_id, empresa_id, es_predeterminada) VALUES (?, ?, ?)`,
                [usuarioId, empresaId, esPredeterminada]
            );
        }

        const newRow = await executeQuerySingle('SELECT * FROM usuarios WHERE id = ?', [usuarioId]);
        res.status(201).json({
            ...newRow,
            empresasIds: empresasAsignadas
        });
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
        const { id_persona, usuario, id_rol, firma, estado, empresasIds } = req.body;

        await executeMutation(
            `UPDATE usuarios SET id_persona = ?, usuario = ?, id_rol = ?, firma = ?, estado = ? WHERE id = ?`,
            [id_persona, usuario, id_rol, firma, estado, id]
        );

        if (empresasIds !== undefined && Array.isArray(empresasIds)) {
            await executeMutation(`DELETE FROM usuario_empresa WHERE usuario_id = ?`, [id]);
            for (let i = 0; i < empresasIds.length; i++) {
                const empresaId = empresasIds[i];
                const esPredeterminada = (i === 0) ? 1 : 0;
                await executeMutation(
                    `INSERT IGNORE INTO usuario_empresa (usuario_id, empresa_id, es_predeterminada) VALUES (?, ?, ?)`,
                    [id, empresaId, esPredeterminada]
                );
            }
        }

        const updated = await executeQuerySingle('SELECT * FROM usuarios WHERE id = ?', [id]);
        res.json({
            ...updated,
            empresasIds: empresasIds || []
        });
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

export const getRoles = async (req: Request, res: Response) => {
    try {
        const rows = await executeQuery<any[]>(`
            SELECT id, nombre, descripcion
            FROM roles
            ORDER BY id ASC
        `);
        res.json(rows);
    } catch (error) {
        console.error('[getRoles] Error:', error);
        res.status(500).json({ message: 'Error al obtener roles', error: error instanceof Error ? error.message : String(error) });
    }
};