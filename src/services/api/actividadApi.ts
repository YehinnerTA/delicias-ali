import { ActivityLog } from '../../features/types/person';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Mapeo de backend a frontend
const mapToFrontend = (data: any): ActivityLog => ({
    timestamp: data.timestamp || data.created_at,
    accion: data.accion,
    modulo: data.modulo,
    detalle: data.detalle,
    usuario: data.usuario
});

export const actividadApi = {
    /**
     * Obtener todas las actividades (últimos 50 registros)
     */
    getAll: async (): Promise<ActivityLog[]> => {
        const response = await fetch(`${API_URL}/actividad`);
        if (!response.ok) throw new Error('Error al obtener actividad');
        const data = await response.json();
        return data.map(mapToFrontend);
    },

    /**
     * Crear una nueva actividad
     */
    create: async (actividad: Omit<ActivityLog, 'timestamp'>): Promise<ActivityLog> => {
        const payload = {
            modulo: actividad.modulo,
            accion: actividad.accion,
            detalle: actividad.detalle,
            usuario: actividad.usuario
        };
        const response = await fetch(`${API_URL}/actividad`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error('Error al crear actividad');
        const data = await response.json();
        return mapToFrontend(data);
    }
};