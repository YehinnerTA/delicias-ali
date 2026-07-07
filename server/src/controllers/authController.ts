import { Request, Response } from 'express';
import { executeQuery, executeQuerySingle } from '../config/database';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const JWT_SECRET = process.env.JWT_SECRET || 'ClaveSeguraParaEventosPeru2024!';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const ENCRYPTION_KEY = 'ClaveSeguraParaEventosPeru2024!';

export const login = async (req: Request, res: Response) => {
    try {
        const { email, password, rememberMe } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email y contraseña son requeridos'
            });
        }

        const user = await executeQuerySingle<any>(
            `SELECT 
                u.id,
                u.usuario,
                u.password_hash,
                u.firma,
                u.estado,
                p.email,
                p.nombre,
                p.apellido,
                CONCAT(COALESCE(p.nombre, ''), ' ', COALESCE(p.apellido, '')) AS nombre_completo
            FROM usuarios u
            INNER JOIN personas p ON u.id_persona = p.id
            WHERE p.email = ? AND u.estado = 1`,
            [email]
        );

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Credenciales incorrectas'
            });
        }

        const passwordHash = await executeQuerySingle<{ hash: string }>(
            `SELECT SHA2(CONCAT(?, SHA2(?, 256)), 256) as hash`,
            [password, ENCRYPTION_KEY]
        );

        if (!passwordHash || passwordHash.hash !== user.password_hash) {
            return res.status(401).json({
                success: false,
                message: 'Credenciales incorrectas'
            });
        }

        const empresas = await executeQuery<any>(
            `SELECT 
                e.id AS id_empresa,
                e.ruc,
                e.nombre,
                ue.es_predeterminada
            FROM usuario_empresa ue
            JOIN empresas e ON ue.empresa_id = e.id
            WHERE ue.usuario_id = ?`,
            [user.id]
        );

        if (empresas.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'El usuario no tiene empresas asignadas'
            });
        }

        const expiresIn = rememberMe ? '30d' : JWT_EXPIRES_IN;
        const token = jwt.sign(
            {
                id: user.id,
                usuario: user.usuario,
                email: user.email
            },
            JWT_SECRET,
            { expiresIn: expiresIn as jwt.SignOptions['expiresIn'] }
        );

        res.json({
            success: true,
            message: 'Inicio de sesión exitoso',
            token,
            user: {
                id: user.id,
                usuario: user.usuario,
                email: user.email,
                nombre_completo: user.nombre_completo,
                firma: user.firma || null,
                empresas: empresas.map((e: any) => ({
                    id_empresa: e.id_empresa,
                    ruc: e.ruc,
                    nombre: e.nombre,
                    es_predeterminada: e.es_predeterminada === 1
                }))
            }
        });

    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};

export const verifyToken = async (req: Request, res: Response) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Token no proporcionado'
            });
        }

        const decoded = jwt.verify(token, JWT_SECRET) as {
            id: number;
            usuario: string;
            email: string;
        };

        const user = await executeQuerySingle<any>(
            `SELECT 
                u.id,
                u.usuario,
                u.firma,
                p.email,
                p.nombre,
                p.apellido,
                CONCAT(COALESCE(p.nombre, ''), ' ', COALESCE(p.apellido, '')) AS nombre_completo
            FROM usuarios u
            INNER JOIN personas p ON u.id_persona = p.id
            WHERE u.id = ? AND u.estado = 1`,
            [decoded.id]
        );

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        const empresas = await executeQuery<any>(
            `SELECT 
                e.id AS id_empresa,
                e.ruc,
                e.nombre,
                ue.es_predeterminada
            FROM usuario_empresa ue
            JOIN empresas e ON ue.empresa_id = e.id
            WHERE ue.usuario_id = ?`,
            [user.id]
        );

        res.json({
            success: true,
            user: {
                id: user.id,
                usuario: user.usuario,
                email: user.email,
                nombre_completo: user.nombre_completo,
                firma: user.firma || null,
                empresas: empresas.map((e: any) => ({
                    id_empresa: e.id_empresa,
                    ruc: e.ruc,
                    nombre: e.nombre,
                    es_predeterminada: e.es_predeterminada === 1
                }))
            }
        });

    } catch (error) {
        console.error('Error al verificar token:', error);
        res.status(401).json({
            success: false,
            message: 'Token inválido o expirado'
        });
    }
};