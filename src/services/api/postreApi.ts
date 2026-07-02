import { Postre } from '../../features/types/inventory';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const mapToFrontend = (data: any): Postre => ({
    id: data.id,
    nombre: data.nombre,
    lotes: data.lotes || [],
    historial: []
});

export const postreApi = {
    getAll: async (): Promise<Postre[]> => {
        const res = await fetch(`${API_URL}/postres`);
        if (!res.ok) throw new Error('Error al obtener postres');
        const data = await res.json();
        return data.map(mapToFrontend);
    },
    create: async (postre: Omit<Postre, 'id' | 'historial' | 'lotes'> & { lotes: any[] }): Promise<Postre> => {
        const res = await fetch(`${API_URL}/postres`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(postre)
        });
        if (!res.ok) throw new Error('Error al crear postre');
        const data = await res.json();
        return mapToFrontend(data);
    },
    update: async (id: number, postre: Partial<Postre>): Promise<Postre> => {
        const res = await fetch(`${API_URL}/postres/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(postre)
        });
        if (!res.ok) throw new Error('Error al actualizar postre');
        const data = await res.json();
        return mapToFrontend(data);
    },
    delete: async (id: number): Promise<void> => {
        const res = await fetch(`${API_URL}/postres/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Error al eliminar postre');
    }
};