import { CateringLote } from '../../features/types/inventory';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const mapCateringLoteToFrontend = (l: any): CateringLote => ({
    id: l.id,
    id_empresa: l.id_empresa,
    id_item: l.id_item,
    stock: parseInt(l.stock) || 0,
    fechaVencimiento: l.fecha_vencimiento || null,
    diasVidaUtil: l.dias_vida_util ? parseInt(l.dias_vida_util) : null,
    fechaRegistro: l.fecha_registro,
    registradoPor: l.registrado_por_nombre || l.registrado_por,
    created_at: l.created_at,
    updated_at: l.updated_at,
    descartado: l.descartado === 1 || l.descartado === true,
    historial: []
});

export const cateringLoteApi = {
    getAll: async (id_empresa: number): Promise<CateringLote[]> => {
        const res = await fetch(`${API_URL}/catering-lotes?id_empresa=${id_empresa}`);
        if (!res.ok) throw new Error('Error al obtener lotes de catering');
        const data = await res.json();
        return data.map(mapCateringLoteToFrontend);
    },

    getByItem: async (itemId: number, id_empresa: number): Promise<CateringLote[]> => {
        const res = await fetch(`${API_URL}/catering-lotes/item/${itemId}?id_empresa=${id_empresa}`);
        if (!res.ok) throw new Error('Error al obtener lotes del item');
        const data = await res.json();
        return data.map(mapCateringLoteToFrontend);
    },

    create: async (
        lote: Omit<CateringLote, 'id' | 'historial' | 'registradoPor' | 'created_at' | 'updated_at' | 'descartado'> & { usuario_id: number; id_empresa: number }
    ): Promise<CateringLote> => {
        const res = await fetch(`${API_URL}/catering-lotes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id_item: lote.id_item,
                stock: lote.stock,
                fecha_vencimiento: lote.fechaVencimiento,
                dias_vida_util: lote.diasVidaUtil,
                fecha_registro: lote.fechaRegistro || new Date().toISOString().split('T')[0],
                usuario_id: lote.usuario_id,
                id_empresa: lote.id_empresa
            })
        });
        if (!res.ok) throw new Error('Error al crear lote de catering');
        const data = await res.json();
        return mapCateringLoteToFrontend(data);
    },

    update: async (id: number, lote: Partial<CateringLote>): Promise<CateringLote> => {
        const res = await fetch(`${API_URL}/catering-lotes/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                stock: lote.stock,
                fecha_vencimiento: lote.fechaVencimiento,
                dias_vida_util: lote.diasVidaUtil,
                descartado: lote.descartado,
                id_empresa: lote.id_empresa
            })
        });
        if (!res.ok) throw new Error('Error al actualizar lote de catering');
        const data = await res.json();
        return mapCateringLoteToFrontend(data);
    },

    delete: async (id: number, id_empresa: number): Promise<void> => {
        const res = await fetch(`${API_URL}/catering-lotes/${id}?id_empresa=${id_empresa}`, {
            method: 'DELETE'
        });
        if (!res.ok) throw new Error('Error al eliminar lote de catering');
    },

    descartar: async (id: number, id_empresa: number): Promise<CateringLote> => {
        const res = await fetch(`${API_URL}/catering-lotes/${id}/descartar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_empresa })
        });
        if (!res.ok) throw new Error('Error al descartar lote');
        const data = await res.json();
        return mapCateringLoteToFrontend(data);
    }
};