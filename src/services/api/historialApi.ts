import { HistorialEntry } from '../../features/types/hist_act';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const mapToFrontend = (data: any): HistorialEntry => ({
    fecha: data.fecha || data.created_at,
    usuario: data.usuario,
    accion: data.accion,
    descripcion: data.descripcion
});

export const historialApi = {
    getByEntity: async (entidad: string, idEntidad: number): Promise<HistorialEntry[]> => {
        const response = await fetch(`${API_URL}/historial/${entidad}/${idEntidad}`);
        if (!response.ok) throw new Error('Error al obtener historial');
        const data = await response.json();
        return data.map(mapToFrontend);
    },
    create: async (historial: Omit<HistorialEntry, 'fecha'> & { entidad: string; id_entidad: number }): Promise<HistorialEntry> => {
        const payload = {
            entidad: historial.entidad,
            id_entidad: historial.id_entidad,
            accion: historial.accion,
            descripcion: historial.descripcion,
            usuario: historial.usuario
        };
        const response = await fetch(`${API_URL}/historial`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error('Error al crear historial');
        const data = await response.json();
        return mapToFrontend(data);
    }
};