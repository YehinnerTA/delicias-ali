import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
});

export const testConnection = async (): Promise<boolean> => {
    try {
        const connection = await pool.getConnection();
        console.log('Conexión a MySQL establecida correctamente');
        connection.release();
        return true;
    } catch (error) {
        console.error('Error al conectar a MySQL:', error);
        return false;
    }
};

export const executeQuery = async <T = any>(query: string, params?: any[]): Promise<T[]> => {
    try {
        const [rows] = await pool.query(query, params);
        return rows as T[];
    } catch (error) {
        console.error('Error en consulta SQL:', error);
        throw error;
    }
};

export const executeQuerySingle = async <T = any>(query: string, params?: any[]): Promise<T | null> => {
    try {
        const [rows] = await pool.query(query, params);
        const results = rows as T[];
        return results.length > 0 ? results[0] : null;
    } catch (error) {
        console.error('Error en consulta SQL:', error);
        throw error;
    }
};

export const executeMutation = async (query: string, params?: any[]): Promise<{ insertId: number; affectedRows: number }> => {
    try {
        const [result] = await pool.query(query, params);
        const res = result as mysql.ResultSetHeader;
        return {
            insertId: res.insertId,
            affectedRows: res.affectedRows
        };
    } catch (error) {
        console.error('Error en mutación SQL:', error);
        throw error;
    }
};

export const getConnection = async () => {
    return await pool.getConnection();
};

export const closePool = async (): Promise<void> => {
    await pool.end();
    console.log('Pool de conexiones cerrado');
};

export default pool;