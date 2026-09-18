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
    id_evento: number;
    etapa: string;
    tipo: string;
    descripcion: string;
    impacto: string | null;
    id_usuario: number;
    created_at: string;
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

    reportarIncidencia: async (idEvento: number, idEmpresa: number, usuarioId: number, data: {
        etapa: string;
        tipo: string;
        descripcion: string;
        impacto?: string;
    }): Promise<Incidencia> => {
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

    getMetricas: async (idEvento: number, idEmpresa: number): Promise<any> => {
        const res = await fetch(`${API_URL}/catering/eventos/${idEvento}/metricas?id_empresa=${idEmpresa}`);
        if (!res.ok) throw new Error('Error al obtener métricas');
        return await res.json();
    }
};