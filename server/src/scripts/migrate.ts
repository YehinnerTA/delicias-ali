import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const ENCRYPTION_KEY = 'ClaveSeguraParaEventosPeru2024!';

const runMigration = async () => {
    let connection: mysql.Connection | null = null;
    try {
        // Conectar sin seleccionar base de datos aún (para poder ejecutar DROP/CREATE DATABASE)
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: Number(process.env.DB_PORT),
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            multipleStatements: true
        });

        console.log('📦 Conectado a MySQL. Ejecutando script de estructura...');

        // 1. Leer y ejecutar db.sql (crea la BD y las tablas)
        const sqlPath = path.resolve(__dirname, '../../database/db.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf8');
        await connection.query(sqlContent);
        console.log('Estructura de tablas creada/actualizada.');

        // 2. Seleccionar la base de datos recién creada
        const dbName = process.env.DB_NAME || 'sistema_eventos_catering';
        await connection.query(`USE ${dbName}`);
        console.log(`Base de datos seleccionada: ${dbName}`);

        // ============================================================
        // INSERTS DE DATOS INICIALES (idempotentes)
        // ============================================================

        console.log('Insertando datos iniciales...');

        // ------------------------------------------------------------
        // 1. EMPRESAS (solo si no existen)
        // ------------------------------------------------------------
        const empresas = [
            { ruc: '10412743879', nombre: 'DeliciaAli' },
            { ruc: '20613823027', nombre: 'DELICIAS ALI S.A.C.' }
        ];

        for (const emp of empresas) {
            await connection.query(
                `INSERT IGNORE INTO empresas (ruc, nombre, creado_por) VALUES (?, ?, 'SISTEMA')`,
                [emp.ruc, emp.nombre]
            );
        }
        console.log('Empresas insertadas (o ya existían).');

        // ------------------------------------------------------------
        // 2. PERSONA ADMIN (si no existe)
        // ------------------------------------------------------------
        const adminPersona = {
            id_empresa: 1, // DeliciaAli
            tipo_persona: 'empleado',
            tipo_documento: 'DNI',
            numero_documento: '12345678',
            nombre: 'Administrador',
            apellido: 'Del Sistema',
            email: 'admin@deliciasali.com',
            celular: '+51911111111'
        };

        const [existingPersona] = await connection.query<any[]>(
            `SELECT id FROM personas WHERE email = ? OR numero_documento = ?`,
            [adminPersona.email, adminPersona.numero_documento]
        );

        let idPersona: number;
        if (existingPersona.length === 0) {
            const [result] = await connection.query(
                `INSERT INTO personas 
                    (id_empresa, tipo_persona, tipo_documento, numero_documento, nombre, apellido, email, celular) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    adminPersona.id_empresa,
                    adminPersona.tipo_persona,
                    adminPersona.tipo_documento,
                    adminPersona.numero_documento,
                    adminPersona.nombre,
                    adminPersona.apellido,
                    adminPersona.email,
                    adminPersona.celular
                ]
            );
            idPersona = (result as any).insertId;
            console.log('Persona administrador creada.');
        } else {
            idPersona = existingPersona[0].id;
            console.log('Persona administrador ya existía.');
        }

        // ------------------------------------------------------------
        // 3. USUARIO ADMIN (si no existe)
        // ------------------------------------------------------------
        const adminUser = {
            usuario: 'admin',
            password: '123456',
            id_persona: idPersona,
            firma: null
        };

        const [existingUser] = await connection.query<any[]>(
            `SELECT id FROM usuarios WHERE usuario = ?`,
            [adminUser.usuario]
        );

        if (existingUser.length === 0) {
            const [hashResult] = await connection.query<any[]>(
                `SELECT SHA2(CONCAT(?, SHA2(?, 256)), 256) as hash`,
                [adminUser.password, ENCRYPTION_KEY]
            );
            const passwordHash = hashResult[0].hash;

            await connection.query(
                `INSERT INTO usuarios (id_persona, usuario, password_hash, firma) VALUES (?, ?, ?, ?)`,
                [adminUser.id_persona, adminUser.usuario, passwordHash, adminUser.firma]
            );
            console.log('Usuario admin creado.');
        } else {
            console.log('Usuario admin ya existía.');
        }

        // ------------------------------------------------------------
        // 4. RELACIÓN USUARIO - EMPRESA
        // ------------------------------------------------------------
        const [userRow] = await connection.query<any[]>(
            `SELECT id FROM usuarios WHERE usuario = 'admin'`
        );
        if (userRow.length === 0) {
            throw new Error('Usuario admin no encontrado');
        }
        const usuarioId = userRow[0].id;

        const [empresasRows] = await connection.query<any[]>(
            `SELECT id, ruc FROM empresas WHERE ruc IN ('10412743879', '20613823027')`
        );

        for (const emp of empresasRows) {
            const esPredeterminada = (emp.ruc === '10412743879') ? 1 : 0;
            await connection.query(
                `INSERT IGNORE INTO usuario_empresa (usuario_id, empresa_id, es_predeterminada) VALUES (?, ?, ?)`,
                [usuarioId, emp.id, esPredeterminada]
            );
        }
        console.log('Relaciones usuario-empresa insertadas.');

        // ------------------------------------------------------------
        // 5. HISTORIAL INICIAL (solo si no existen registros)
        // ------------------------------------------------------------
        const [historialCount] = await connection.query<any[]>(
            `SELECT COUNT(*) as total FROM historial`
        );
        if (historialCount[0].total === 0) {
            for (const emp of empresasRows) {
                await connection.query(
                    `INSERT INTO historial (entidad, id_entidad, accion, descripcion, usuario) 
                     VALUES ('empresas', ?, 'CREACIÓN', ?, 'sistema')`,
                    [emp.id, `Empresa creada: ${emp.ruc}`]
                );
            }
            const [personaRow] = await connection.query<any[]>(
                `SELECT id, nombre, apellido FROM personas WHERE id = ?`,
                [idPersona]
            );
            if (personaRow.length > 0) {
                await connection.query(
                    `INSERT INTO historial (entidad, id_entidad, accion, descripcion, usuario) 
                     VALUES ('personas', ?, 'CREACIÓN', ?, 'sistema')`,
                    [idPersona, `Persona creada: ${personaRow[0].nombre} ${personaRow[0].apellido}`]
                );
            }
            await connection.query(
                `INSERT INTO historial (entidad, id_entidad, accion, descripcion, usuario) 
                 VALUES ('usuarios', ?, 'CREACIÓN', ?, 'sistema')`,
                [usuarioId, `Usuario creado: admin`]
            );
            console.log('Historial inicial insertado.');
        } else {
            console.log('Historial ya contenía registros, omitido.');
        }

        // ------------------------------------------------------------
        // 6. ACTIVIDAD INICIAL (solo si está vacía)
        // ------------------------------------------------------------
        const [actividadCount] = await connection.query<any[]>(
            `SELECT COUNT(*) as total FROM actividad`
        );
        if (actividadCount[0].total === 0) {
            await connection.query(
                `INSERT INTO actividad (modulo, accion, detalle, usuario) 
                 VALUES ('sistema', 'INICIALIZAR', 'Base de datos instalada correctamente', 'sistema')`
            );
            console.log('Actividad inicial insertada.');
        } else {
            console.log('Actividad ya contenía registros, omitido.');
        }

        console.log('Migración completada exitosamente.');

    } catch (error) {
        console.error('Error en migración:', error);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
            console.log('Conexión cerrada.');
        }
    }
};

runMigration();