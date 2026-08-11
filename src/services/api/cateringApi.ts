import { CateringItem } from '../../features/types/inventory';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const mapToFrontend = (data: any): CateringItem => {
    let registradoPor = data.registrado_por;
    if (data.razon_social) {
        registradoPor = data.razon_social;
    } else if (data.registrado_por_nombre) {
        registradoPor = data.registrado_por_nombre;
        if (data.registrado_por_apellido) {
            registradoPor += ` ${data.registrado_por_apellido}`;
        }
    }
    return {
        id: data.id,
        id_empresa: data.id_empresa,
        nombre: data.nombre,
        stock: data.stock,
        tipo: data.tipo,
        unidad_medida: data.unidad_medida || 'unidad',
        tiene_vencimiento: data.tiene_vencimiento === 1 || data.tiene_vencimiento === true,
        fecha_vencimiento: data.fecha_vencimiento || null,
        dias_vida_util: data.dias_vida_util ? Number(data.dias_vida_util) : null,
        precio_compra: data.precio_compra !== null && data.precio_compra !== undefined ? Number(data.precio_compra) : null,
        id_proveedor: data.id_proveedor ? Number(data.id_proveedor) : null,
        registradoPor: registradoPor,
        ultimaEdicion: data.ultima_edicion,
        createdAt: data.created_at,
        historial: [],
        lotes: []
    };
};

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
                id_empresa: item.id_empresa,
                unidad_medida: item.unidad_medida,
                tiene_vencimiento: item.tiene_vencimiento,
                fecha_vencimiento: item.fecha_vencimiento || null,
                dias_vida_util: item.dias_vida_util || null,
                precio_compra: item.precio_compra || null,
                id_proveedor: item.id_proveedor || null
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