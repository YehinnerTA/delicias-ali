import { Postre, Lote } from '../../features/types/inventory';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const mapLoteToFrontend = (l: any): Lote => ({
    id: l.id,
    postre_id: l.postre_id,
    stock: parseInt(l.stock) || 0,
    fechaVencimiento: l.fecha_vencimiento,
    diasDuracion: parseInt(l.dias_duracion) || 0,
    fechaRegistro: l.fecha_registro,
    registradoPor: l.registrado_por_nombre || l.registrado_por,
    ultimaEdicion: l.ultima_edicion,
    historial: []
});

const mapToFrontend = (data: any): Postre => ({
    id: data.id,
    nombre: data.nombre,
    precio: parseFloat(data.precio) || 0,
    lotes: (data.lotes || []).map(mapLoteToFrontend),
    historial: []
});

export const postreApi = {
    getAll: async (): Promise<Postre[]> => {
        const res = await fetch(`${API_URL}/postres`);
        if (!res.ok) throw new Error('Error al obtener postres');
        const data = await res.json();
        return data.map(mapToFrontend);
    },

    create: async (
        postre: Omit<Postre, 'id' | 'historial' | 'lotes'> & { lotes: any[]; usuario_id: number }
    ): Promise<Postre> => {
        const res = await fetch(`${API_URL}/postres`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nombre: postre.nombre,
                precio: postre.precio,
                lotes: postre.lotes,
                usuario_id: postre.usuario_id
            })
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