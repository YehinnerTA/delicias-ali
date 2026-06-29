import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const ENCRYPTION_KEY = 'ClaveSeguraParaEventosPeru2024!';

const runMigration = async () => {
    let connection: mysql.Connection | null = null;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: Number(process.env.DB_PORT),
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            multipleStatements: true
        });

        console.log('[DB] Conectado a MySQL. Ejecutando estructura...');

        const sqlPath = path.resolve(__dirname, '../../database/db.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf8');
        await connection.query(sqlContent);
        console.log('[DB] Estructura de tablas creada/actualizada.');

        const dbName = process.env.DB_NAME || 'sistema_eventos_catering';
        await connection.query(`USE ${dbName}`);
        console.log(`[DB] Base de datos seleccionada: ${dbName}`);

        // ============================================================
        // DATOS INICIALES (idempotentes)
        // ============================================================

        // 1. Roles (ya se insertaron en db.sql, pero lo dejamos por si acaso)
        // 2. Empresas
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
        console.log('[DB] Empresas insertadas (o ya existian).');

        // 3. Persona Admin
        const adminPersona = {
            id_empresa: 1,
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
            console.log('[DB] Persona administrador creada.');
        } else {
            idPersona = existingPersona[0].id;
            console.log('[DB] Persona administrador ya existia.');
        }

        // 4. Usuario Admin (con id_rol = 1)
        const adminUser = {
            usuario: 'admin',
            password: '123456',
            id_persona: idPersona,
            id_rol: 1,
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
                `INSERT INTO usuarios (id_persona, usuario, password_hash, firma, id_rol) VALUES (?, ?, ?, ?, ?)`,
                [adminUser.id_persona, adminUser.usuario, passwordHash, adminUser.firma, adminUser.id_rol]
            );
            console.log('[DB] Usuario admin creado.');
        } else {
            console.log('[DB] Usuario admin ya existia.');
        }

        // 5. Relaciones usuario-empresa
        const [userRow] = await connection.query<any[]>(
            `SELECT id FROM usuarios WHERE usuario = 'admin'`
        );
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
        console.log('[DB] Relaciones usuario-empresa insertadas.');

        // 6. Historial inicial
        const [historialCount] = await connection.query<any[]>(
            `SELECT COUNT(*) as total FROM historial`
        );
        if (historialCount[0].total === 0) {
            await connection.query(
                `INSERT INTO historial (entidad, id_entidad, accion, descripcion, usuario) 
                 VALUES ('empresas', 1, 'CREACION', 'Empresa creada: DeliciaAli', 'sistema')`
            );
            await connection.query(
                `INSERT INTO historial (entidad, id_entidad, accion, descripcion, usuario) 
                 VALUES ('personas', ?, 'CREACION', 'Persona creada: Administrador Del Sistema', 'sistema')`,
                [idPersona]
            );
            await connection.query(
                `INSERT INTO historial (entidad, id_entidad, accion, descripcion, usuario) 
                 VALUES ('usuarios', ?, 'CREACION', 'Usuario creado: admin', 'sistema')`,
                [usuarioId]
            );
            console.log('[DB] Historial inicial insertado.');
        }

        // 7. Actividad inicial
        const [actividadCount] = await connection.query<any[]>(
            `SELECT COUNT(*) as total FROM actividad`
        );
        if (actividadCount[0].total === 0) {
            await connection.query(
                `INSERT INTO actividad (modulo, accion, detalle, usuario) 
                 VALUES ('sistema', 'INICIALIZAR', 'Base de datos instalada correctamente', 'sistema')`
            );
            console.log('[DB] Actividad inicial insertada.');
        }

        console.log('[DB] Migracion completada exitosamente.');

    } catch (error) {
        console.error('[DB] Error en migracion:', error);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
            console.log('[DB] Conexion cerrada.');
        }
    }
};

runMigration();