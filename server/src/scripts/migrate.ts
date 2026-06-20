import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const runMigration = async () => {
    try {
        const sql = fs.readFileSync(
            path.resolve(__dirname, '../../database/db.sql'),
            'utf8'
        );

        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: Number(process.env.DB_PORT),
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            multipleStatements: true
        });

        console.log('Ejecutando migración...');
        await connection.query(sql);
        console.log('Base de datos instalada correctamente');
        await connection.end();
    } catch (error) {
        console.error('Error en migración:', error);
        process.exit(1);
    }
};

runMigration();