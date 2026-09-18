import { Request, Response } from 'express';
import { executeQuery, executeMutation, executeQuerySingle } from '../config/database';

// =====================================================
// OBTENER EVENTO CON SU FLUJO
// =====================================================
export const getEventoFlujo = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { id_empresa } = req.query;

        if (!id_empresa) {
            return res.status(400).json({ message: 'id_empresa es requerido' });
        }

        const evento = await executeQuerySingle<any>(
            `SELECT 
                e.*,
                v.numero AS venta_numero,
                v.fecha AS venta_fecha
             FROM catering_eventos e
             JOIN ventas v ON e.id_venta = v.id
             WHERE e.id = ? AND e.id_empresa = ?`,
            [id, id_empresa]
        );

        if (!evento) {
            return res.status(404).json({ message: 'Evento no encontrado' });
        }

        // Obtener etapas
        const etapas = await executeQuery<any[]>(
            `SELECT * FROM catering_evento_etapas 
             WHERE id_evento = ? AND id_empresa = ?
             ORDER BY 
                FIELD(etapa, 
                    'verificacion_almacen', 
                    'preparacion_cocina', 
                    'carga_transporte', 
                    'montaje_evento', 
                    'recojo_evento', 
                    'retorno_empresa', 
                    'cierre'
                )`,
            [id, id_empresa]
        );

        // Obtener historial
        const historial = await executeQuery<any[]>(
            `SELECT h.*, u.usuario AS usuario_nombre
             FROM catering_evento_historial h
             JOIN usuarios u ON h.id_usuario = u.id
             WHERE h.id_evento = ? AND h.id_empresa = ?
             ORDER BY h.created_at DESC`,
            [id, id_empresa]
        );

        res.json({
            evento: {
                ...evento,
                incluir_mozo: evento.incluir_mozo === 1,
                cantidad_mozos: evento.cantidad_mozos || 0,
                precio_mozo: parseFloat(evento.precio_mozo) || 100,
                subtotal_mozo: parseFloat(evento.subtotal_mozo) || 0
            },
            etapas: etapas.map((e: any) => ({
                ...e,
                completada: e.completada === 1
            })),
            historial
        });
    } catch (error) {
        console.error('[getEventoFlujo] Error:', error);
        res.status(500).json({ message: 'Error al obtener flujo del evento', error });
    }
};

// =====================================================
// ABRIR ETAPA (registra hora_inicio si es la primera vez)
// =====================================================
export const abrirEtapa = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { etapa } = req.params;
        const { id_empresa, usuario_id } = req.body;

        if (!id_empresa || !usuario_id) {
            return res.status(400).json({ message: 'id_empresa y usuario_id son requeridos' });
        }

        // Verificar que el evento exista
        const evento = await executeQuerySingle<any>(
            `SELECT id FROM catering_eventos WHERE id = ? AND id_empresa = ?`,
            [id, id_empresa]
        );
        if (!evento) {
            return res.status(404).json({ message: 'Evento no encontrado' });
        }

        // Verificar si la etapa ya existe
        let etapaDB = await executeQuerySingle<any>(
            `SELECT * FROM catering_evento_etapas 
             WHERE id_evento = ? AND etapa = ? AND id_empresa = ?`,
            [id, etapa, id_empresa]
        );

        // Si no existe, crearla con hora_inicio
        if (!etapaDB) {
            const result = await executeMutation(
                `INSERT INTO catering_evento_etapas 
                 (id_empresa, id_evento, etapa, hora_inicio, id_usuario_inicio) 
                 VALUES (?, ?, ?, NOW(), ?)`,
                [id_empresa, id, etapa, usuario_id]
            );
            etapaDB = await executeQuerySingle<any>(
                `SELECT * FROM catering_evento_etapas WHERE id = ?`,
                [result.insertId]
            );
        }

        // Obtener items del checklist de esta etapa
        const items = await executeQuery<any[]>(
            `SELECT * FROM catering_evento_checklist 
             WHERE id_evento = ? AND etapa = ? AND id_empresa = ?
             ORDER BY orden, id`,
            [id, etapa, id_empresa]
        );

        // Calcular tiempo transcurrido
        const tiempoTranscurridoMin = etapaDB.hora_inicio
            ? Math.floor((Date.now() - new Date(etapaDB.hora_inicio).getTime()) / 60000)
            : 0;

        res.json({
            etapa: {
                ...etapaDB,
                completada: etapaDB.completada === 1
            },
            items: items.map((i: any) => ({
                ...i,
                verificado: i.verificado === 1,
                tiene_incidencia: i.tiene_incidencia === 1,
                proveedores: i.proveedores ? JSON.parse(i.proveedores) : []
            })),
            tiempo_transcurrido_min: tiempoTranscurridoMin
        });
    } catch (error) {
        console.error('[abrirEtapa] Error:', error);
        res.status(500).json({ message: 'Error al abrir etapa', error });
    }
};

// =====================================================
// VERIFICAR ITEM DEL CHECKLIST
// =====================================================
export const verificarItem = async (req: Request, res: Response) => {
    try {
        const { id_item } = req.params;
        const { id_empresa, usuario_id, tiene_incidencia, descripcion_incidencia } = req.body;

        if (!id_empresa || !usuario_id) {
            return res.status(400).json({ message: 'id_empresa y usuario_id son requeridos' });
        }

        const existe = await executeQuerySingle<any>(
            `SELECT id FROM catering_evento_checklist WHERE id = ? AND id_empresa = ?`,
            [id_item, id_empresa]
        );
        if (!existe) {
            return res.status(404).json({ message: 'Item no encontrado' });
        }

        await executeMutation(
            `UPDATE catering_evento_checklist 
             SET verificado = 1,
                 verificado_por = ?,
                 verificado_at = NOW(),
                 tiene_incidencia = ?,
                 descripcion_incidencia = ?
             WHERE id = ? AND id_empresa = ?`,
            [
                usuario_id,
                tiene_incidencia ? 1 : 0,
                descripcion_incidencia || null,
                id_item,
                id_empresa
            ]
        );

        const updated = await executeQuerySingle<any>(
            `SELECT * FROM catering_evento_checklist WHERE id = ?`,
            [id_item]
        );

        res.json({
            ...updated,
            verificado: updated.verificado === 1,
            tiene_incidencia: updated.tiene_incidencia === 1,
            proveedores: updated.proveedores ? JSON.parse(updated.proveedores) : []
        });
    } catch (error) {
        console.error('[verificarItem] Error:', error);
        res.status(500).json({ message: 'Error al verificar item', error });
    }
};

// =====================================================
// CONFIRMAR ETAPA Y AVANZAR AL SIGUIENTE ESTADO
// =====================================================
export const confirmarEtapa = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { etapa } = req.params;
        const { id_empresa, usuario_id, observaciones } = req.body;

        if (!id_empresa || !usuario_id) {
            return res.status(400).json({ message: 'id_empresa y usuario_id son requeridos' });
        }

        // Mapeo de etapas a estados siguientes
        const siguienteEstado: Record<string, string> = {
            verificacion_almacen: 'en_preparacion',
            preparacion_cocina: 'listo_para_envio',
            carga_transporte: 'en_evento',
            montaje_evento: 'en_retorno',
            recojo_evento: 'retornado',
            retorno_empresa: 'cerrado',
            cierre: 'cerrado'
        };

        const estadoAnterior = await executeQuerySingle<any>(
            `SELECT estado_flujo FROM catering_eventos WHERE id = ? AND id_empresa = ?`,
            [id, id_empresa]
        );
        if (!estadoAnterior) {
            return res.status(404).json({ message: 'Evento no encontrado' });
        }

        // Actualizar etapa con hora_fin y duración
        await executeMutation(
            `UPDATE catering_evento_etapas 
             SET hora_fin = NOW(),
                 duracion_real_min = TIMESTAMPDIFF(MINUTE, hora_inicio, NOW()),
                 completada = 1,
                 id_usuario_fin = ?,
                 observaciones = ?
             WHERE id_evento = ? AND etapa = ? AND id_empresa = ?`,
            [usuario_id, observaciones || null, id, etapa, id_empresa]
        );

        // Avanzar al siguiente estado
        const nuevoEstado = siguienteEstado[etapa] || 'cerrado';
        await executeMutation(
            `UPDATE catering_eventos 
             SET estado_flujo = ?,
                 estado_actualizado_por = ?,
                 estado_actualizado_at = NOW()
             WHERE id = ? AND id_empresa = ?`,
            [nuevoEstado, usuario_id, id, id_empresa]
        );

        // Registrar en historial
        await executeMutation(
            `INSERT INTO catering_evento_historial 
             (id_empresa, id_evento, estado_anterior, estado_nuevo, id_usuario, observaciones)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                id_empresa,
                id,
                estadoAnterior.estado_flujo,
                nuevoEstado,
                usuario_id,
                observaciones || `Etapa "${etapa}" completada`
            ]
        );

        res.json({
            message: 'Etapa confirmada correctamente',
            estado_anterior: estadoAnterior.estado_flujo,
            estado_nuevo: nuevoEstado
        });
    } catch (error) {
        console.error('[confirmarEtapa] Error:', error);
        res.status(500).json({ message: 'Error al confirmar etapa', error });
    }
};

// =====================================================
// REPORTAR INCIDENCIA
// =====================================================
export const reportarIncidencia = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { id_empresa, etapa, tipo, descripcion, impacto, usuario_id } = req.body;

        if (!id_empresa || !usuario_id || !tipo || !descripcion) {
            return res.status(400).json({ message: 'Faltan campos obligatorios' });
        }

        const result = await executeMutation(
            `INSERT INTO catering_evento_incidencias 
             (id_empresa, id_evento, etapa, tipo, descripcion, impacto, id_usuario)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [id_empresa, id, etapa || 'general', tipo, descripcion, impacto || null, usuario_id]
        );

        const incidencia = await executeQuerySingle<any>(
            `SELECT * FROM catering_evento_incidencias WHERE id = ?`,
            [result.insertId]
        );

        res.status(201).json(incidencia);
    } catch (error) {
        console.error('[reportarIncidencia] Error:', error);
        res.status(500).json({ message: 'Error al reportar incidencia', error });
    }
};

// =====================================================
// OBTENER MÉTRICAS DEL EVENTO
// =====================================================
export const getMetricasEvento = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { id_empresa } = req.query;

        if (!id_empresa) {
            return res.status(400).json({ message: 'id_empresa es requerido' });
        }

        const etapas = await executeQuery<any[]>(
            `SELECT etapa, tiempo_estimado_min, duracion_real_min, hora_inicio, hora_fin
             FROM catering_evento_etapas 
             WHERE id_evento = ? AND id_empresa = ?
             ORDER BY hora_inicio`,
            [id, id_empresa]
        );

        const incidencias = await executeQuery<any[]>(
            `SELECT i.*, u.usuario AS usuario_nombre
             FROM catering_evento_incidencias i
             JOIN usuarios u ON i.id_usuario = u.id
             WHERE i.id_evento = ? AND i.id_empresa = ?
             ORDER BY i.created_at DESC`,
            [id, id_empresa]
        );

        const totalEstimado = etapas.reduce((sum: number, e: any) => sum + (e.tiempo_estimado_min || 0), 0);
        const totalReal = etapas.reduce((sum: number, e: any) => sum + (e.duracion_real_min || 0), 0);

        res.json({
            etapas: etapas.map((e: any) => ({
                ...e,
                diferencia_min: (e.duracion_real_min || 0) - (e.tiempo_estimado_min || 0)
            })),
            resumen: {
                total_estimado_min: totalEstimado,
                total_real_min: totalReal,
                diferencia_min: totalReal - totalEstimado
            },
            incidencias
        });
    } catch (error) {
        console.error('[getMetricasEvento] Error:', error);
        res.status(500).json({ message: 'Error al obtener métricas', error });
    }
};