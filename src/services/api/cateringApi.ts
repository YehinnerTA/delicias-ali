import { CateringItem } from '../../features/types/inventory';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const mapToFrontend = (data: any): CateringItem => ({
    id: data.id,
    id_empresa: data.id_empresa,
    nombre: data.nombre,
    stock: data.stock,
    tipo: data.tipo,
    registradoPor: data.registrado_por_nombre || data.registrado_por,
    ultimaEdicion: data.ultima_edicion,
    historial: []
});

export const cateringItemApi = {
    getAll: async (id_empresa: number): Promise<CateringItem[]> => {
        const res = await fetch(`${API_URL}/catering-items?id_empresa=${id_empresa}`);
        if (!res.ok) throw new Error('Error al obtener insumos');
        const data = await res.json();
        return data.map(mapToFrontend);
    },

    create: async (
        item: Omit<CateringItem, 'id' | 'historial' | 'registradoPor' | 'ultimaEdicion'> & { usuario_id: number; id_empresa: number }
    ): Promise<CateringItem> => {
        const res = await fetch(`${API_URL}/catering-items`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nombre: item.nombre,
                stock: item.stock,
                tipo: item.tipo,
                usuario_id: item.usuario_id,
                id_empresa: item.id_empresa
            })
        });
        if (!res.ok) throw new Error('Error al crear insumo');
        const data = await res.json();
        return mapToFrontend(data);
    },

    update: async (id: number, item: Partial<CateringItem>): Promise<CateringItem> => {
        const res = await fetch(`${API_URL}/catering-items/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item)
        });
        if (!res.ok) throw new Error('Error al actualizar insumo');
        const data = await res.json();
        return mapToFrontend(data);
    },

    delete: async (id: number, id_empresa: number): Promise<void> => {
        const res = await fetch(`${API_URL}/catering-items/${id}?id_empresa=${id_empresa}`, {
            method: 'DELETE'
        });
        if (!res.ok) throw new Error('Error al eliminar insumo');
    }
};