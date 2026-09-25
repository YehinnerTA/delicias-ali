import { Request, Response } from 'express';
import { executeQuery, executeMutation, executeQuerySingle } from '../config/database';

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

export const abrirEtapa = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { etapa } = req.params;
        const { id_empresa, usuario_id } = req.body;

        if (!id_empresa || !usuario_id) {
            return res.status(400).json({ message: 'id_empresa y usuario_id son requeridos' });
        }

        const evento = await executeQuerySingle<any>(
            `SELECT id FROM catering_eventos WHERE id = ? AND id_empresa = ?`,
            [id, id_empresa]
        );
        if (!evento) {
            return res.status(404).json({ message: 'Evento no encontrado' });
        }

        let etapaDB = await executeQuerySingle<any>(
            `SELECT * FROM catering_evento_etapas 
             WHERE id_evento = ? AND etapa = ? AND id_empresa = ?`,
            [id, etapa, id_empresa]
        );

        if (!etapaDB) {
            const result = await executeMutation(
                `INSERT INTO catering_evento_etapas 
         (id_empresa, id_evento, etapa, hora_inicio, id_usuario_inicio) 
         VALUES (?, ?, ?, NOW(), ?)`,
                [id_empresa, id, etapa, usuario_id]
            );
            etapaDB = await executeQuerySingle(
                `SELECT * FROM catering_evento_etapas WHERE id = ?`,
                [result.insertId]
            );
        }
        else if (!etapaDB.hora_inicio) {
            await executeMutation(
                `UPDATE catering_evento_etapas 
         SET hora_inicio = NOW(), id_usuario_inicio = ? 
         WHERE id = ? AND id_empresa = ?`,
                [usuario_id, etapaDB.id, id_empresa]
            );
            etapaDB = await executeQuerySingle(
                `SELECT * FROM catering_evento_etapas WHERE id = ?`,
                [etapaDB.id]
            );
        }

        const items = await executeQuery<any[]>(
            `SELECT * FROM catering_evento_checklist 
             WHERE id_evento = ? AND etapa = ? AND id_empresa = ?
             ORDER BY orden, id`,
            [id, etapa, id_empresa]
        );

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

export const confirmarEtapa = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { etapa } = req.params;
        const { id_empresa, usuario_id, observaciones } = req.body;

        if (!id_empresa || !usuario_id) {
            return res.status(400).json({ message: 'id_empresa y usuario_id son requeridos' });
        }

        const siguienteEstado: Record<string, string> = {
            verificacion_almacen: 'en_preparacion',
            preparacion_cocina: 'listo_para_envio',
            carga_transporte: 'en_evento',
            montaje_evento: 'en_retorno',
            recojo_evento: 'retornado',
            retorno_empresa: 'cierre',
            cierre: 'cerrado'
        };

        const estadoAnterior = await executeQuerySingle<any>(
            `SELECT estado_flujo FROM catering_eventos WHERE id = ? AND id_empresa = ?`,
            [id, id_empresa]
        );
        if (!estadoAnterior) {
            return res.status(404).json({ message: 'Evento no encontrado' });
        }

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

        const nuevoEstado = siguienteEstado[etapa] || 'cerrado';
        await executeMutation(
            `UPDATE catering_eventos 
             SET estado_flujo = ?,
                 estado_actualizado_por = ?,
                 estado_actualizado_at = NOW()
             WHERE id = ? AND id_empresa = ?`,
            [nuevoEstado, usuario_id, id, id_empresa]
        );

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

export const reportarIncidencia = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const {
            id_empresa,
            etapa,
            tipo,
            descripcion,
            impacto,
            usuario_id,
            id_checklist_item,
            nombre_item,
            severidad,
            cantidad_afectada
        } = req.body;

        if (!id_empresa || !usuario_id || !tipo || !descripcion) {
            return res.status(400).json({ message: 'Faltan campos obligatorios' });
        }

        let idChecklistItemFinal = id_checklist_item || null;
        if (!idChecklistItemFinal && nombre_item) {
            const itemDB = await executeQuerySingle<any>(
                `SELECT id FROM catering_evento_checklist 
                 WHERE id_evento = ? AND etapa = ? AND item = ? AND id_empresa = ?
                 LIMIT 1`,
                [id, etapa, nombre_item, id_empresa]
            );
            if (itemDB) {
                idChecklistItemFinal = itemDB.id;
            }
        }

        const result = await executeMutation(
            `INSERT INTO catering_evento_incidencias 
             (id_empresa, id_evento, etapa, id_checklist_item, tipo, severidad, cantidad_afectada, descripcion, impacto, estado, id_usuario)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'abierta', ?)`,
            [
                id_empresa,
                id,
                etapa || 'general',
                idChecklistItemFinal,
                tipo,
                severidad || 'media',
                cantidad_afectada ?? null,
                descripcion,
                impacto || null,
                usuario_id
            ]
        );

        if (idChecklistItemFinal) {
            await executeMutation(
                `UPDATE catering_evento_checklist 
                 SET tiene_incidencia = 1,
                     descripcion_incidencia = ?
                 WHERE id = ? AND id_empresa = ?`,
                [descripcion, idChecklistItemFinal, id_empresa]
            );
        } else if (nombre_item) {
            await executeMutation(
                `UPDATE catering_evento_checklist 
                 SET tiene_incidencia = 1,
                     descripcion_incidencia = ?
                 WHERE id_evento = ? AND etapa = ? AND item = ? AND id_empresa = ?`,
                [descripcion, id, etapa, nombre_item, id_empresa]
            );
        }

        const incidencia = await executeQuerySingle<any>(
            `SELECT 
                i.*,
                u.usuario AS usuario_nombre,
                ui.usuario AS resuelto_por_nombre,
                ce.item AS checklist_item_nombre
             FROM catering_evento_incidencias i
             JOIN usuarios u ON i.id_usuario = u.id
             LEFT JOIN usuarios ui ON i.resuelto_por = ui.id
             LEFT JOIN catering_evento_checklist ce ON i.id_checklist_item = ce.id
             WHERE i.id = ?`,
            [result.insertId]
        );

        res.status(201).json(incidencia);
    } catch (error) {
        console.error('[reportarIncidencia] Error:', error);
        res.status(500).json({ message: 'Error al reportar incidencia', error });
    }
};

export const getMetricasEvento = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { id_empresa } = req.query;

        if (!id_empresa) {
            return res.status(400).json({ message: 'id_empresa es requerido' });
        }

        // =====================================================
        // 1. ETAPAS con nombres de usuarios
        // =====================================================
        const etapas = await executeQuery<any[]>(
            `SELECT 
                e.etapa, 
                e.tiempo_estimado_min, 
                e.duracion_real_min, 
                e.hora_inicio, 
                e.hora_fin,
                e.completada,
                e.id_usuario_inicio,
                e.id_usuario_fin,
                ui.usuario AS usuario_inicio_nombre,
                uf.usuario AS usuario_fin_nombre,
                pi.nombre AS persona_inicio_nombre,
                pi.apellido AS persona_inicio_apellido,
                pf.nombre AS persona_fin_nombre,
                pf.apellido AS persona_fin_apellido,
                TIMESTAMPDIFF(SECOND, e.hora_inicio, e.hora_fin) AS duracion_real_seg
             FROM catering_evento_etapas e
             LEFT JOIN usuarios ui ON e.id_usuario_inicio = ui.id
             LEFT JOIN usuarios uf ON e.id_usuario_fin = uf.id
             LEFT JOIN personas pi ON ui.id_persona = pi.id
             LEFT JOIN personas pf ON uf.id_persona = pf.id
             WHERE e.id_evento = ? AND e.id_empresa = ?
             ORDER BY 
                FIELD(e.etapa, 
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

        const incidencias = await executeQuery<any[]>(
            `SELECT 
                i.*,
                u.usuario AS usuario_nombre,
                pu.nombre AS usuario_persona_nombre,
                pu.apellido AS usuario_persona_apellido,
                ui.usuario AS resuelto_por_nombre,
                pui.nombre AS resuelto_persona_nombre,
                pui.apellido AS resuelto_persona_apellido,
                ce.item AS checklist_item_nombre
             FROM catering_evento_incidencias i
             JOIN usuarios u ON i.id_usuario = u.id
             LEFT JOIN personas pu ON u.id_persona = pu.id
             LEFT JOIN usuarios ui ON i.resuelto_por = ui.id
             LEFT JOIN personas pui ON ui.id_persona = pui.id
             LEFT JOIN catering_evento_checklist ce ON i.id_checklist_item = ce.id
             WHERE i.id_evento = ? AND i.id_empresa = ?
             ORDER BY 
                FIELD(i.severidad, 'critica', 'media', 'baja'),
                i.created_at DESC`,
            [id, id_empresa]
        );

        const equipoRaw = await executeQuery<any[]>(
            `SELECT DISTINCT
                e.id_usuario_inicio AS id_usuario,
                e.etapa,
                u.usuario,
                p.nombre,
                p.apellido,
                r.nombre AS rol_nombre
             FROM catering_evento_etapas e
             JOIN usuarios u ON e.id_usuario_inicio = u.id
             JOIN personas p ON u.id_persona = p.id
             JOIN roles r ON u.id_rol = r.id
             WHERE e.id_evento = ? AND e.id_empresa = ? AND e.id_usuario_inicio IS NOT NULL
             
             UNION ALL
             
             SELECT DISTINCT
                e.id_usuario_fin AS id_usuario,
                e.etapa,
                u.usuario,
                p.nombre,
                p.apellido,
                r.nombre AS rol_nombre
             FROM catering_evento_etapas e
             JOIN usuarios u ON e.id_usuario_fin = u.id
             JOIN personas p ON u.id_persona = p.id
             JOIN roles r ON u.id_rol = r.id
             WHERE e.id_evento = ? AND e.id_empresa = ? AND e.id_usuario_fin IS NOT NULL`,
            [id, id_empresa, id, id_empresa]
        );

        const equipoMap = new Map<number, any>();
        for (const row of (equipoRaw as any[])) {
            const r = row as any;
            if (!equipoMap.has(r.id_usuario)) {
                equipoMap.set(r.id_usuario, {
                    id_usuario: r.id_usuario,
                    nombre_completo: `${r.nombre || ''} ${r.apellido || ''}`.trim() || r.usuario,
                    usuario: r.usuario,
                    rol: r.rol_nombre,
                    etapas: new Set<string>()
                });
            }
            equipoMap.get(r.id_usuario)!.etapas.add(r.etapa);
        }
        const equipo = Array.from(equipoMap.values()).map((e: any) => ({
            ...e,
            etapas: Array.from(e.etapas)
        }));

        const preparaciones = await executeQuery<any[]>(
            `SELECT 
                p.*,
                ui.usuario AS iniciado_por_usuario,
                pi.nombre AS iniciado_nombre,
                pi.apellido AS iniciado_apellido
             FROM catering_evento_preparacion p
             LEFT JOIN usuarios ui ON p.iniciado_por = ui.id
             LEFT JOIN personas pi ON ui.id_persona = pi.id
             WHERE p.id_evento = ? AND p.id_empresa = ?
             ORDER BY p.hora_inicio ASC`,
            [id, id_empresa]
        );

        const productosEntregados = await executeQuery<any[]>(
            `SELECT 
                item AS nombre,
                cantidad_requerida AS cantidad_solicitada,
                cantidad_real AS cantidad_entregada,
                etapa AS etapa_registro,
                unidad,
                tiene_incidencia
             FROM catering_evento_checklist
             WHERE id_evento = ? AND id_empresa = ?
               AND categoria = 'producto'
               AND cantidad_real IS NOT NULL
             ORDER BY item`,
            [id, id_empresa]
        );

        const materialesEntregados = await executeQuery<any[]>(
            `SELECT 
                item AS nombre,
                cantidad_requerida AS cantidad_solicitada,
                cantidad_real AS cantidad_entregada,
                etapa AS etapa_registro,
                unidad,
                tiene_incidencia
             FROM catering_evento_checklist
             WHERE id_evento = ? AND id_empresa = ?
               AND categoria = 'material'
               AND cantidad_real IS NOT NULL
             ORDER BY item`,
            [id, id_empresa]
        );

        const totalEstimado = etapas.reduce((sum: number, e: any) => sum + (e.tiempo_estimado_min || 0), 0);
        const totalReal = etapas.reduce((sum: number, e: any) => sum + (e.duracion_real_min || 0), 0);

        const desviacionRaw = totalEstimado > 0
            ? ((totalReal - totalEstimado) / totalEstimado) * 100
            : null;

        const datosConfiables = totalReal >= (totalEstimado * 0.3);
        const desviacion = datosConfiables && desviacionRaw !== null
            ? Math.round(desviacionRaw * 10) / 10
            : null;

        const totalIncidencias = incidencias.length;
        const resueltas = incidencias.filter((i: any) => i.estado === 'resuelta').length;
        const abiertas = incidencias.filter((i: any) => i.estado === 'abierta').length;

        const timeline: any[] = [];

        for (const et of (etapas as any[])) {
            if (et.hora_inicio) {
                timeline.push({
                    tipo: 'etapa_inicio',
                    hora: et.hora_inicio,
                    etapa: et.etapa,
                    descripcion: `Inicio: ${et.etapa.replace(/_/g, ' ')}`,
                    usuario: et.usuario_inicio_nombre || '-'
                });
            }
            if (et.hora_fin) {
                timeline.push({
                    tipo: 'etapa_fin',
                    hora: et.hora_fin,
                    etapa: et.etapa,
                    descripcion: `Fin: ${et.etapa.replace(/_/g, ' ')} (${et.duracion_real_min || 0} min)`,
                    usuario: et.usuario_fin_nombre || '-'
                });
            }
        }

        for (const inc of (incidencias as any[])) {
            timeline.push({
                tipo: 'incidencia',
                hora: inc.created_at,
                etapa: inc.etapa,
                descripcion: `Incidencia (${inc.severidad}): ${inc.descripcion}`,
                usuario: inc.usuario_nombre || '-'
            });
        }

        timeline.sort((a, b) => new Date(a.hora).getTime() - new Date(b.hora).getTime());

        res.json({
            etapas: etapas.map((e: any) => ({
                etapa: e.etapa,
                tiempo_estimado_min: e.tiempo_estimado_min,
                tiempo_estimado_seg: (e.tiempo_estimado_min || 0) * 60,
                duracion_real_min: e.duracion_real_min,
                duracion_real_seg: e.duracion_real_seg,
                hora_inicio: e.hora_inicio,
                hora_fin: e.hora_fin,
                completada: e.completada === 1,
                diferencia_min: (e.duracion_real_min || 0) - (e.tiempo_estimado_min || 0),
                diferencia_seg: (e.duracion_real_seg || 0) - ((e.tiempo_estimado_min || 0) * 60),
                usuario_inicio: e.usuario_inicio_nombre || '-',
                usuario_fin: e.usuario_fin_nombre || '-',
                persona_inicio: `${e.persona_inicio_nombre || ''} ${e.persona_inicio_apellido || ''}`.trim() || e.usuario_inicio_nombre || '-',
                persona_fin: `${e.persona_fin_nombre || ''} ${e.persona_fin_apellido || ''}`.trim() || e.usuario_fin_nombre || '-'
            })),

            resumen: {
                total_estimado_min: totalEstimado,
                total_real_min: totalReal,
                diferencia_min: totalReal - totalEstimado,
                desviacion_porcentaje: desviacion,
                datos_confiables: datosConfiables,
                total_incidencias: totalIncidencias,
                incidencias_resueltas: resueltas,
                incidencias_abiertas: abiertas
            },

            equipo: equipo,

            preparaciones: preparaciones.map((p: any) => ({
                ...p,
                chef_nombre: `${p.iniciado_nombre || ''} ${p.iniciado_apellido || ''}`.trim() || p.iniciado_por_usuario || '-'
            })),

            productos_entregados: productosEntregados.map((p: any) => ({
                ...p,
                cantidad_solicitada: parseFloat(p.cantidad_solicitada),
                cantidad_entregada: parseFloat(p.cantidad_entregada)
            })),

            materiales_entregados: materialesEntregados.map((m: any) => ({
                ...m,
                cantidad_solicitada: parseFloat(m.cantidad_solicitada),
                cantidad_entregada: parseFloat(m.cantidad_entregada)
            })),

            incidencias: incidencias.map((i: any) => ({
                ...i,
                cantidad_afectada: i.cantidad_afectada ? parseFloat(i.cantidad_afectada) : null,
                usuario_completo: `${i.usuario_persona_nombre || ''} ${i.usuario_persona_apellido || ''}`.trim() || i.usuario_nombre,
                resuelto_por_completo: i.resuelto_por_nombre
                    ? `${i.resuelto_persona_nombre || ''} ${i.resuelto_persona_apellido || ''}`.trim() || i.resuelto_por_nombre
                    : null
            })),

            timeline: timeline
        });
    } catch (error) {
        console.error('[getMetricasEvento] Error:', error);
        res.status(500).json({ message: 'Error al obtener métricas', error });
    }
};

export const guardarItemsChecklist = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { id_empresa, etapa, items } = req.body;

        if (!id_empresa || !etapa || !Array.isArray(items)) {
            return res.status(400).json({ message: 'id_empresa, etapa e items son requeridos' });
        }

        const evento = await executeQuerySingle<any>(
            `SELECT id FROM catering_eventos WHERE id = ? AND id_empresa = ?`,
            [id, id_empresa]
        );
        if (!evento) {
            return res.status(404).json({ message: 'Evento no encontrado' });
        }

        let orden = 1;
        for (const item of items) {
            await executeMutation(
                `INSERT INTO catering_evento_checklist 
                    (id_empresa, id_evento, etapa, item, categoria,
                     id_referencia, tipo_referencia,
                     cantidad_requerida, unidad, proveedores,
                     verificado, orden)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
                [
                    id_empresa,
                    id,
                    etapa,
                    item.item || item.nombre || 'Sin nombre',
                    item.categoria || 'ingrediente',
                    item.id_referencia || null,
                    item.tipo_referencia || 'ingrediente',
                    item.cantidad_requerida || null,
                    item.unidad || null,
                    JSON.stringify(item.proveedores || []),
                    orden
                ]
            );
            orden++;
        }

        res.json({
            message: 'Items guardados correctamente',
            total: items.length
        });
    } catch (error) {
        console.error('[guardarItemsChecklist] Error:', error);
        res.status(500).json({ message: 'Error al guardar items del checklist', error });
    }
};

export const getChecklistVerificaciones = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { etapa, id_empresa } = req.query;

        if (!id_empresa || !etapa) {
            return res.status(400).json({ message: 'id_empresa y etapa son requeridos' });
        }

        const rows = await executeQuery<any[]>(
            `SELECT item, verificado, verificado_at, verificado_por, 
                    cantidad_requerida, cantidad_real, 
                    tiene_incidencia, descripcion_incidencia
             FROM catering_evento_checklist 
             WHERE id_evento = ? AND etapa = ? AND id_empresa = ?`,
            [id, etapa, id_empresa]
        );

        res.json(rows.map((r: any) => ({
            item: r.item,
            verificado: r.verificado === 1,
            verificado_at: r.verificado_at,
            verificado_por: r.verificado_por,
            cantidad_requerida: r.cantidad_requerida ? parseFloat(r.cantidad_requerida) : null,
            cantidad_real: r.cantidad_real ? parseFloat(r.cantidad_real) : null,
            tiene_incidencia: r.tiene_incidencia === 1,
            descripcion_incidencia: r.descripcion_incidencia
        })));
    } catch (error) {
        console.error('[getChecklistVerificaciones] Error:', error);
        res.status(500).json({ message: 'Error al obtener checklist', error });
    }
};

export const marcarItemChecklist = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { id_empresa, usuario_id, etapa, item, verificado } = req.body;

        if (!id_empresa || !usuario_id || !etapa || !item) {
            return res.status(400).json({ message: 'Faltan campos obligatorios' });
        }

        const existente = await executeQuerySingle<any>(
            `SELECT id FROM catering_evento_checklist 
             WHERE id_evento = ? AND etapa = ? AND item = ? AND id_empresa = ?`,
            [id, etapa, item, id_empresa]
        );

        if (existente) {
            await executeMutation(
                `UPDATE catering_evento_checklist 
                 SET verificado = ?, verificado_por = ?, verificado_at = ?
                 WHERE id = ? AND id_empresa = ?`,
                [verificado ? 1 : 0, usuario_id, verificado ? new Date() : null, existente.id, id_empresa]
            );
        } else {
            await executeMutation(
                `INSERT INTO catering_evento_checklist 
                 (id_empresa, id_evento, etapa, item, categoria, verificado, verificado_por, verificado_at, orden)
                 VALUES (?, ?, ?, ?, 'dinamico', ?, ?, ?, 0)`,
                [id_empresa, id, etapa, item, verificado ? 1 : 0, usuario_id, verificado ? new Date() : null]
            );
        }

        res.json({ message: 'OK', item, verificado });
    } catch (error) {
        console.error('[marcarItemChecklist] Error:', error);
        res.status(500).json({ message: 'Error al marcar item', error });
    }
};

export const iniciarPreparacion = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { id_empresa, usuario_id, item } = req.body;

        if (!id_empresa || !usuario_id || !item) {
            return res.status(400).json({ message: 'id_empresa, usuario_id e item son requeridos' });
        }

        const idEventoNum = Number(id);
        const idEmpresaNum = Number(id_empresa);
        const idUsuarioNum = Number(usuario_id);

        if (!idEventoNum || !idEmpresaNum || !idUsuarioNum) {
            return res.status(400).json({ message: 'IDs inválidos' });
        }

        const evento = await executeQuerySingle<any>(
            `SELECT id FROM catering_eventos WHERE id = ? AND id_empresa = ?`,
            [idEventoNum, idEmpresaNum]
        );

        if (!evento) {
            return res.status(404).json({ message: 'Evento no encontrado' });
        }

        const itemLimpio = item.trim().toLowerCase();

        const todasPreparaciones = await executeQuery<any[]>(
            `SELECT id, item, estado, hora_inicio FROM catering_evento_preparacion 
             WHERE id_evento = ? AND id_empresa = ?`,
            [idEventoNum, idEmpresaNum]
        );

        let existente: any = null;
        for (const p of (todasPreparaciones as any[])) {
            if (p?.item && p.item.trim().toLowerCase() === itemLimpio) {
                existente = p;
                break;
            }
        }

        if (existente) {
            if (existente.estado === 'completado') {
                return res.json({
                    message: 'Esta receta ya fue completada',
                    preparacion: existente
                });
            }

            if (existente.estado === 'pausado') {
                await executeMutation(
                    `UPDATE catering_evento_preparacion 
                     SET estado = 'en_progreso', updated_at = NOW()
                     WHERE id = ?`,
                    [existente.id]
                );
            }

            const actualizado = await executeQuerySingle<any>(
                `SELECT * FROM catering_evento_preparacion WHERE id = ?`,
                [existente.id]
            );

            return res.json({
                message: 'Preparación reanudada',
                preparacion: actualizado
            });
        }

        let result: any;
        try {
            result = await executeMutation(
                `INSERT INTO catering_evento_preparacion 
                    (id_empresa, id_evento, item, hora_inicio, iniciado_por, estado) 
                    VALUES (?, ?, ?, NOW(), ?, 'en_progreso')`,
                [idEmpresaNum, idEventoNum, item, idUsuarioNum]
            );
        } catch (insertError: any) {
            if (insertError?.code === 'ER_DUP_ENTRY') {
                const raceTodas = await executeQuery<any[]>(
                    `SELECT * FROM catering_evento_preparacion 
                     WHERE id_evento = ? AND id_empresa = ?`,
                    [idEventoNum, idEmpresaNum]
                );
                let raceExistente: any = null;
                for (const p of (raceTodas as any[])) {
                    if (p?.item && p.item.trim().toLowerCase() === itemLimpio) {
                        raceExistente = p;
                        break;
                    }
                }
                return res.json({
                    message: 'Preparación ya existente',
                    preparacion: raceExistente
                });
            }
            throw insertError;
        }

        const nueva = await executeQuerySingle<any>(
            `SELECT * FROM catering_evento_preparacion WHERE id = ?`,
            [result.insertId]
        );

        res.status(201).json({
            message: 'Preparación iniciada',
            preparacion: nueva
        });
    } catch (error) {
        console.error('[iniciarPreparacion] Error:', error);
        res.status(500).json({ message: 'Error al iniciar preparación', error });
    }
};

export const finalizarPreparacion = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { id_empresa, usuario_id, item, observaciones } = req.body;

        if (!id_empresa || !usuario_id || !item) {
            return res.status(400).json({ message: 'id_empresa, usuario_id e item son requeridos' });
        }

        const existente = await executeQuerySingle<any>(
            `SELECT id, estado, hora_inicio FROM catering_evento_preparacion 
             WHERE id_evento = ? AND item = ? AND id_empresa = ?`,
            [id, item, id_empresa]
        );

        if (!existente) {
            return res.status(404).json({ message: 'Preparación no encontrada. Debe iniciarla primero.' });
        }

        if (existente.estado === 'completado') {
            return res.status(400).json({ message: 'Esta preparación ya fue completada' });
        }

        await executeMutation(
            `UPDATE catering_evento_preparacion 
             SET hora_fin = NOW(),
                 duracion_real_min = TIMESTAMPDIFF(MINUTE, hora_inicio, NOW()),
                 finalizado_por = ?,
                 estado = 'completado',
                 observaciones = ?,
                 updated_at = NOW()
             WHERE id = ?`,
            [usuario_id, observaciones || null, existente.id]
        );

        const actualizado = await executeQuerySingle<any>(
            `SELECT * FROM catering_evento_preparacion WHERE id = ?`,
            [existente.id]
        );

        res.json({
            message: 'Preparación completada',
            preparacion: actualizado
        });
    } catch (error) {
        console.error('[finalizarPreparacion] Error:', error);
        res.status(500).json({ message: 'Error al finalizar preparación', error });
    }
};

export const pausarPreparacion = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { id_empresa, item } = req.body;

        if (!id_empresa || !item) {
            return res.status(400).json({ message: 'id_empresa e item son requeridos' });
        }

        const existente = await executeQuerySingle<any>(
            `SELECT id, estado FROM catering_evento_preparacion 
             WHERE id_evento = ? AND item = ? AND id_empresa = ?`,
            [id, item, id_empresa]
        );

        if (!existente) {
            return res.status(404).json({ message: 'Preparación no encontrada' });
        }

        if (existente.estado === 'completado') {
            return res.status(400).json({ message: 'No se puede pausar una preparación completada' });
        }

        await executeMutation(
            `UPDATE catering_evento_preparacion 
             SET estado = 'pausado', updated_at = NOW()
             WHERE id = ?`,
            [existente.id]
        );

        res.json({ message: 'Preparación pausada' });
    } catch (error) {
        console.error('[pausarPreparacion] Error:', error);
        res.status(500).json({ message: 'Error al pausar preparación', error });
    }
};

export const getPreparaciones = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { id_empresa } = req.query;

        if (!id_empresa) {
            return res.status(400).json({ message: 'id_empresa es requerido' });
        }

        const preparaciones = await executeQuery<any[]>(
            `SELECT 
                p.*,
                ui.usuario AS iniciado_por_nombre,
                uf.usuario AS finalizado_por_nombre
             FROM catering_evento_preparacion p
             LEFT JOIN usuarios ui ON p.iniciado_por = ui.id
             LEFT JOIN usuarios uf ON p.finalizado_por = uf.id
             WHERE p.id_evento = ? AND p.id_empresa = ?
             ORDER BY p.hora_inicio ASC`,
            [id, id_empresa]
        );

        res.json(preparaciones);
    } catch (error) {
        console.error('[getPreparaciones] Error:', error);
        res.status(500).json({ message: 'Error al obtener preparaciones', error });
    }
};

export const registrarItemRecojo = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const {
            id_empresa,
            usuario_id,
            etapa,
            item,
            cantidad_requerida,
            cantidad_real,
            categoria,
            tipo_referencia,
            id_referencia,
            unidad
        } = req.body;

        if (!id_empresa || !usuario_id || !etapa || !item) {
            return res.status(400).json({ message: 'id_empresa, usuario_id, etapa e item son requeridos' });
        }

        const evento = await executeQuerySingle<any>(
            `SELECT id FROM catering_eventos WHERE id = ? AND id_empresa = ?`,
            [id, id_empresa]
        );
        if (!evento) {
            return res.status(404).json({ message: 'Evento no encontrado' });
        }

        const itemExistente = await executeQuerySingle<any>(
            `SELECT tiene_incidencia FROM catering_evento_checklist 
             WHERE id_evento = ? AND etapa = ? AND item = ? AND id_empresa = ?`,
            [id, etapa, item, id_empresa]
        );

        if (itemExistente && itemExistente.tiene_incidencia === 1) {
            return res.status(400).json({
                message: 'Este item tiene una incidencia reportada y no puede modificarse'
            });
        }

        await executeMutation(
            `INSERT INTO catering_evento_checklist 
                (id_empresa, id_evento, etapa, item, categoria,
                 id_referencia, tipo_referencia,
                 cantidad_requerida, cantidad_real, unidad,
                 verificado, verificado_por, verificado_at, orden)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, NOW(), 0)
             ON DUPLICATE KEY UPDATE
                 cantidad_requerida = VALUES(cantidad_requerida),
                 cantidad_real = VALUES(cantidad_real),
                 verificado = 1,
                 verificado_por = VALUES(verificado_por),
                 verificado_at = NOW()`,
            [
                id_empresa,
                id,
                etapa,
                item,
                categoria || null,
                id_referencia || null,
                tipo_referencia || null,
                cantidad_requerida ?? null,
                cantidad_real ?? null,
                unidad || null,
                usuario_id
            ]
        );

        const updated = await executeQuerySingle<any>(
            `SELECT * FROM catering_evento_checklist 
             WHERE id_evento = ? AND etapa = ? AND item = ? AND id_empresa = ?`,
            [id, etapa, item, id_empresa]
        );

        res.json({
            message: 'Item registrado correctamente',
            item: {
                ...updated,
                verificado: updated.verificado === 1,
                tiene_incidencia: updated.tiene_incidencia === 1,
                cantidad_requerida: updated.cantidad_requerida ? parseFloat(updated.cantidad_requerida) : null,
                cantidad_real: updated.cantidad_real ? parseFloat(updated.cantidad_real) : null
            }
        });
    } catch (error) {
        console.error('[registrarItemRecojo] Error:', error);
        res.status(500).json({ message: 'Error al registrar item de recojo', error });
    }
};

export const getIncidencias = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { id_empresa, etapa, estado } = req.query;

        if (!id_empresa) {
            return res.status(400).json({ message: 'id_empresa es requerido' });
        }

        let query = `
            SELECT 
                i.*,
                u.usuario AS usuario_nombre,
                ui.usuario AS resuelto_por_nombre,
                ce.item AS checklist_item_nombre
            FROM catering_evento_incidencias i
            JOIN usuarios u ON i.id_usuario = u.id
            LEFT JOIN usuarios ui ON i.resuelto_por = ui.id
            LEFT JOIN catering_evento_checklist ce ON i.id_checklist_item = ce.id
            WHERE i.id_evento = ? AND i.id_empresa = ?
        `;
        const params: any[] = [id, id_empresa];

        if (etapa) {
            query += ` AND i.etapa = ?`;
            params.push(etapa);
        }

        if (estado) {
            query += ` AND i.estado = ?`;
            params.push(estado);
        }

        query += ` ORDER BY 
            FIELD(i.severidad, 'critica', 'media', 'baja'),
            i.created_at DESC`;

        const incidencias = await executeQuery<any[]>(query, params);

        res.json(incidencias.map((inc: any) => ({
            ...inc,
            cantidad_afectada: inc.cantidad_afectada ? parseFloat(inc.cantidad_afectada) : null
        })));
    } catch (error) {
        console.error('[getIncidencias] Error:', error);
        res.status(500).json({ message: 'Error al obtener incidencias', error });
    }
};

export const resolverIncidencia = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { id_empresa, usuario_id, resolucion, estado } = req.body;

        if (!id_empresa || !usuario_id || !resolucion) {
            return res.status(400).json({ message: 'id_empresa, usuario_id y resolucion son requeridos' });
        }

        const existente = await executeQuerySingle<any>(
            `SELECT id, estado FROM catering_evento_incidencias WHERE id = ? AND id_empresa = ?`,
            [id, id_empresa]
        );

        if (!existente) {
            return res.status(404).json({ message: 'Incidencia no encontrada' });
        }

        const nuevoEstado = estado || 'resuelta';

        await executeMutation(
            `UPDATE catering_evento_incidencias 
             SET estado = ?,
                 resolucion = ?,
                 resuelto_por = ?,
                 resuelto_at = NOW()
             WHERE id = ? AND id_empresa = ?`,
            [nuevoEstado, resolucion, usuario_id, id, id_empresa]
        );

        const actualizada = await executeQuerySingle<any>(
            `SELECT 
                i.*,
                u.usuario AS usuario_nombre,
                ui.usuario AS resuelto_por_nombre
             FROM catering_evento_incidencias i
             JOIN usuarios u ON i.id_usuario = u.id
             LEFT JOIN usuarios ui ON i.resuelto_por = ui.id
             WHERE i.id = ?`,
            [id]
        );

        res.json(actualizada);
    } catch (error) {
        console.error('[resolverIncidencia] Error:', error);
        res.status(500).json({ message: 'Error al resolver incidencia', error });
    }
};