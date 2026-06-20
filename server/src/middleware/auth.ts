import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const JWT_SECRET = process.env.JWT_SECRET || 'ClaveSeguraParaEventosPeru2024!';

export interface AuthRequest extends Request {
    user?: {
        id: number;
        usuario: string;
        email: string;
    };
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader?.split(' ')[1];

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

        req.user = decoded;
        next();

    } catch (error) {
        console.error('Error al autenticar:', error);
        res.status(401).json({
            success: false,
            message: 'Token inválido o expirado'
        });
    }
};