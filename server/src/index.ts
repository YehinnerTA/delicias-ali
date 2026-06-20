import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import pool, { testConnection } from './config/database';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware básico
app.use(cors());
app.use(express.json());

// SOLO UN ENDPOINT PARA PROBAR CONEXIÓN
app.get('/api/test', async (req, res) => {
    try {
        // Probar conexión con una consulta simple
        const [rows] = await pool.query('SELECT 1 as resultado, NOW() as fecha_hora, DATABASE() as base_datos');
        res.json({
            success: true,
            message: 'Conexión a MySQL exitosa',
            data: rows
        });
    } catch (error) {
        console.error('Error en consulta:', error);
        res.status(500).json({
            success: false,
            message: 'Error al conectar a MySQL',
            error: error
        });
    }
});

// Health check
app.get('/api/health', async (req, res) => {
    const dbConnected = await testConnection();
    res.json({
        status: 'OK',
        database: dbConnected ? '✅ conectado' : '❌ error'
    });
});

// Iniciar servidor
app.listen(PORT, async () => {
    console.log(`🚀 Servidor en http://localhost:${PORT}`);
    console.log(`📡 Test DB: http://localhost:${PORT}/api/test`);
    console.log(`📡 Health: http://localhost:${PORT}/api/health`);
    await testConnection();
});