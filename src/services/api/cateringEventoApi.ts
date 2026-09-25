const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export interface EtapaEvento {
    id: number;
    id_evento: number;
    etapa: string;
    hora_inicio: string | null;
    hora_fin: string | null;
    duracion_real_min: number | null;
    tiempo_estimado_min: number | null;
    completada: boolean;
    id_usuario_inicio: number | null;
    id_usuario_fin: number | null;
    observaciones: string | null;
}

export interface ChecklistItem {
    id: number;
    id_evento: number;
    etapa: string;
    item: string;
    categoria: string | null;
    id_referencia: number | null;
    tipo_referencia: string | null;
    cantidad_requerida: number | null;
    cantidad_real: number | null;
    unidad: string | null;
    cantidad_stock: number | null;
    cantidad_faltante: number | null;
    proveedores: any[];
    verificado: boolean;
    verificado_por: number | null;
    verificado_at: string | null;
    tiene_incidencia: boolean;
    descripcion_incidencia: string | null;
    orden: number;
}

export interface EventoFlujo {
    evento: any;
    etapas: EtapaEvento[];
    historial: any[];
}

export interface Incidencia {
    id: number;
    id_empresa: number;
    id_evento: number;
    etapa: string;
    id_checklist_item: number | null;
    tipo: string;
    severidad: 'baja' | 'media' | 'critica';
    cantidad_afectada: number | null;
    descripcion: string;
    impacto: string | null;
    estado: 'abierta' | 'en_revision' | 'resuelta' | 'descartada';
    resolucion: string | null;
    resuelto_por: number | null;
    resuelto_at: string | null;
    id_usuario: number;
    created_at: string;
    updated_at: string;
    usuario_nombre?: string;
    resuelto_por_nombre?: string | null;
    checklist_item_nombre?: string | null;
}

export interface PreparacionReceta {
    id: number;
    id_empresa: number;
    id_evento: number;
    item: string;
    hora_inicio: string;
    hora_fin: string | null;
    duracion_real_min: number | null;
    iniciado_por: number | null;
    finalizado_por: number | null;
    estado: 'en_progreso' | 'pausado' | 'completado';
    observaciones: string | null;
    created_at: string;
    updated_at: string;
    iniciado_por_nombre?: string | null;
    finalizado_por_nombre?: string | null;
}

export interface ChecklistCompleto {
    item: string;
    verificado: boolean;
    verificado_at: string | null;
    verificado_por: number | null;
    cantidad_requerida: number | null;
    cantidad_real: number | null;
    tiene_incidencia: boolean;
    descripcion_incidencia: string | null;
}

export interface EtapaMetrica {
    etapa: string;
    tiempo_estimado_min: number | null;
    duracion_real_min: number | null;
    hora_inicio: string | null;
    hora_fin: string | null;
    completada: boolean;
    diferencia_min: number;
    usuario_inicio: string;
    usuario_fin: string;
    persona_inicio: string;
    persona_fin: string;
}

export interface EquipoParticipante {
    id_usuario: number;
    nombre_completo: string;
    usuario: string;
    rol: string;
    etapas: string[];
}

export interface PreparacionMetrica {
    id: number;
    id_empresa: number;
    id_evento: number;
    item: string;
    hora_inicio: string;
    hora_fin: string | null;
    duracion_real_min: number | null;
    iniciado_por: number | null;
    finalizado_por: number | null;
    estado: 'en_progreso' | 'pausado' | 'completado';
    observaciones: string | null;
    created_at: string;
    updated_at: string;
    iniciado_por_usuario?: string | null;
    iniciado_nombre?: string | null;
    iniciado_apellido?: string | null;
    chef_nombre: string;
}

export interface ProductoEntregado {
    nombre: string;
    cantidad_solicitada: number;
    cantidad_entregada: number;
    etapa_registro: string;
    unidad: string;
    tiene_incidencia: number;
}

export interface MaterialEntregado {
    nombre: string;
    cantidad_solicitada: number;
    cantidad_entregada: number;
    etapa_registro: string;
    unidad: string;
    tiene_incidencia: number;
}

export interface MetricasResumen {
    total_estimado_min: number;
    total_real_min: number;
    diferencia_min: number;
    eficiencia_porcentaje: number;
    total_incidencias: number;
    incidencias_resueltas: number;
    incidencias_abiertas: number;
}

export interface TimelineItem {
    tipo: 'etapa_inicio' | 'etapa_fin' | 'incidencia';
    hora: string;
    etapa: string;
    descripcion: string;
    usuario: string;
}

export interface MetricasEvento {
    etapas: EtapaMetrica[];
    resumen: MetricasResumen;
    equipo: EquipoParticipante[];
    preparaciones: PreparacionMetrica[];
    productos_entregados: ProductoEntregado[];
    materiales_entregados: MaterialEntregado[];
    incidencias: Incidencia[];
    timeline: TimelineItem[];
}

export const cateringEventoApi = {
    getFlujo: async (idEvento: number, idEmpresa: number): Promise<EventoFlujo> => {
        const res = await fetch(`${API_URL}/catering/eventos/${idEvento}/flujo?id_empresa=${idEmpresa}`);
        if (!res.ok) throw new Error('Error al obtener flujo del evento');
        return await res.json();
    },

    abrirEtapa: async (idEvento: number, etapa: string, idEmpresa: number, usuarioId: number): Promise<{
        etapa: EtapaEvento;
        items: ChecklistItem[];
        tiempo_transcurrido_min: number;
    }> => {
        const res = await fetch(`${API_URL}/catering/eventos/${idEvento}/etapas/${etapa}/abrir`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_empresa: idEmpresa, usuario_id: usuarioId })
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.message || 'Error al abrir etapa');
        }
        return await res.json();
    },

    verificarItem: async (idItem: number, idEmpresa: number, usuarioId: number, tieneIncidencia: boolean = false, descripcionIncidencia?: string): Promise<ChecklistItem> => {
        const res = await fetch(`${API_URL}/catering/eventos/checklist/${idItem}/verificar`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id_empresa: idEmpresa,
                usuario_id: usuarioId,
                tiene_incidencia: tieneIncidencia,
                descripcion_incidencia: descripcionIncidencia
            })
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.message || 'Error al verificar item');
        }
        return await res.json();
    },

    confirmarEtapa: async (idEvento: number, etapa: string, idEmpresa: number, usuarioId: number, observaciones?: string): Promise<{
        message: string;
        estado_anterior: string;
        estado_nuevo: string;
    }> => {
        const res = await fetch(`${API_URL}/catering/eventos/${idEvento}/etapas/${etapa}/confirmar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id_empresa: idEmpresa,
                usuario_id: usuarioId,
                observaciones
            })
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.message || 'Error al confirmar etapa');
        }
        return await res.json();
    },

    reportarIncidencia: async (
        idEvento: number,
        idEmpresa: number,
        usuarioId: number,
        data: {
            etapa: string;
            tipo: string;
            descripcion: string;
            impacto?: string;
            id_checklist_item?: number;
            nombre_item?: string;
            severidad?: 'baja' | 'media' | 'critica';
            cantidad_afectada?: number;
        }
    ): Promise<Incidencia> => {
        const res = await fetch(`${API_URL}/catering/eventos/${idEvento}/incidencias`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id_empresa: idEmpresa,
                usuario_id: usuarioId,
                ...data
            })
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.message || 'Error al reportar incidencia');
        }
        return await res.json();
    },

    getMetricas: async (idEvento: number, idEmpresa: number): Promise<MetricasEvento> => {
        const res = await fetch(`${API_URL}/catering/eventos/${idEvento}/metricas?id_empresa=${idEmpresa}`);
        if (!res.ok) throw new Error('Error al obtener métricas');
        return await res.json();
    },

    guardarItemsChecklist: async (
        idEvento: number,
        idEmpresa: number,
        etapa: string,
        items: Array<{
            item: string;
            categoria: string;
            id_referencia: number;
            tipo_referencia: string;
            cantidad_requerida: number;
            unidad: string;
            proveedores: Array<{ nombre: string; telefono: string }>;
        }>
    ): Promise<{ message: string; total: number }> => {
        const res = await fetch(`${API_URL}/catering/eventos/${idEvento}/checklist/guardar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_empresa: idEmpresa, etapa, items })
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.message || 'Error al guardar items del checklist');
        }
        return await res.json();
    },

    getVerificaciones: async (idEvento: number, etapa: string, idEmpresa: number): Promise<Record<string, boolean>> => {
        const res = await fetch(`${API_URL}/catering/eventos/${idEvento}/checklist?etapa=${etapa}&id_empresa=${idEmpresa}`);
        if (!res.ok) return {};
        const data = await res.json();
        const mapa: Record<string, boolean> = {};
        for (const row of data) {
            mapa[row.item] = row.verificado === true;
        }
        return mapa;
    },

    getChecklistCompleto: async (
        idEvento: number,
        etapa: string,
        idEmpresa: number
    ): Promise<ChecklistCompleto[]> => {
        const res = await fetch(`${API_URL}/catering/eventos/${idEvento}/checklist?etapa=${etapa}&id_empresa=${idEmpresa}`);
        if (!res.ok) return [];
        return await res.json();
    },

    marcarItemVerificado: async (
        idEvento: number, etapa: string, idEmpresa: number, usuarioId: number,
        item: string, verificado: boolean
    ): Promise<void> => {
        const res = await fetch(`${API_URL}/catering/eventos/${idEvento}/checklist/marcar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_empresa: idEmpresa, usuario_id: usuarioId, etapa, item, verificado })
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.message || 'Error al marcar item');
        }
    },

    iniciarPreparacion: async (
        idEvento: number,
        item: string,
        idEmpresa: number,
        usuarioId: number
    ): Promise<{ message: string; preparacion: PreparacionReceta }> => {
        const res = await fetch(`${API_URL}/catering/eventos/${idEvento}/preparacion/iniciar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_empresa: idEmpresa, usuario_id: usuarioId, item })
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.message || 'Error al iniciar preparación');
        }
        return await res.json();
    },

    finalizarPreparacion: async (
        idEvento: number,
        item: string,
        idEmpresa: number,
        usuarioId: number,
        observaciones?: string
    ): Promise<{ message: string; preparacion: PreparacionReceta }> => {
        const res = await fetch(`${API_URL}/catering/eventos/${idEvento}/preparacion/finalizar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id_empresa: idEmpresa,
                usuario_id: usuarioId,
                item,
                observaciones
            })
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.message || 'Error al finalizar preparación');
        }
        return await res.json();
    },

    pausarPreparacion: async (
        idEvento: number,
        item: string,
        idEmpresa: number
    ): Promise<{ message: string }> => {
        const res = await fetch(`${API_URL}/catering/eventos/${idEvento}/preparacion/pausar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_empresa: idEmpresa, item })
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.message || 'Error al pausar preparación');
        }
        return await res.json();
    },

    getPreparaciones: async (
        idEvento: number,
        idEmpresa: number
    ): Promise<PreparacionReceta[]> => {
        const res = await fetch(`${API_URL}/catering/eventos/${idEvento}/preparacion?id_empresa=${idEmpresa}`);
        if (!res.ok) return [];
        return await res.json();
    },

    registrarItemRecojo: async (
        idEvento: number,
        idEmpresa: number,
        usuarioId: number,
        data: {
            etapa: string;
            item: string;
            cantidad_requerida: number;
            cantidad_real: number;
            categoria?: string;
            tipo_referencia?: string;
            id_referencia?: number;
            unidad?: string;
        }
    ): Promise<{ message: string; item: any }> => {
        const res = await fetch(`${API_URL}/catering/eventos/${idEvento}/checklist/registrar-cantidad`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id_empresa: idEmpresa,
                usuario_id: usuarioId,
                ...data
            })
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.message || 'Error al registrar item de recojo');
        }
        return await res.json();
    },

    getIncidencias: async (
        idEvento: number,
        idEmpresa: number,
        filtros?: { etapa?: string; estado?: string }
    ): Promise<Incidencia[]> => {
        let url = `${API_URL}/catering/eventos/${idEvento}/incidencias?id_empresa=${idEmpresa}`;
        if (filtros?.etapa) url += `&etapa=${filtros.etapa}`;
        if (filtros?.estado) url += `&estado=${filtros.estado}`;

        const res = await fetch(url);
        if (!res.ok) return [];
        return await res.json();
    },

    resolverIncidencia: async (
        idIncidencia: number,
        idEmpresa: number,
        usuarioId: number,
        resolucion: string,
        estado?: 'resuelta' | 'descartada' | 'en_revision'
    ): Promise<Incidencia> => {
        const res = await fetch(`${API_URL}/catering/eventos/incidencias/${idIncidencia}/resolver`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id_empresa: idEmpresa,
                usuario_id: usuarioId,
                resolucion,
                estado
            })
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.message || 'Error al resolver incidencia');
        }
        return await res.json();
    }
};