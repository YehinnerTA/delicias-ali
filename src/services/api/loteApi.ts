import { Lote } from '../../features/types/inventory';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const mapToFrontend = (data: any): Lote => ({
    id: data.id,
    postre_id: data.postre_id,
    stock: data.stock,
    precio: data.precio,
    fechaVencimiento: data.fecha_vencimiento,
    diasDuracion: data.dias_duracion,
    fechaRegistro: data.fecha_registro,
    registradoPor: data.registrado_por_nombre || data.registrado_por,
    ultimaEdicion: data.ultima_edicion,
    historial: []
});

export const loteApi = {
    create: async (lote: Omit<Lote, 'id' | 'historial'>): Promise<Lote> => {
        const res = await fetch(`${API_URL}/lotes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                postre_id: lote.postre_id,
                stock: lote.stock,
                precio: lote.precio,
                fecha_vencimiento: lote.fechaVencimiento,
                dias_duracion: lote.diasDuracion,
                fecha_registro: lote.fechaRegistro || new Date().toISOString().split('T')[0],
                registrado_por: lote.registradoPor
            })
        });
        if (!res.ok) throw new Error('Error al crear lote');
        const data = await res.json();
        return mapToFrontend(data);
    },
    update: async (id: number, lote: Partial<Lote>): Promise<Lote> => {
        const res = await fetch(`${API_URL}/lotes/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(lote)
        });
        if (!res.ok) throw new Error('Error al actualizar lote');
        const data = await res.json();
        return mapToFrontend(data);
    },
    delete: async (id: number): Promise<void> => {
        const res = await fetch(`${API_URL}/lotes/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Error al eliminar lote');
    }
};