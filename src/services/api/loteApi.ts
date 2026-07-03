import { Lote } from '../../features/types/inventory';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const mapLoteToFrontend = (l: any): Lote => ({
    id: l.id,
    postre_id: l.postre_id,
    stock: parseInt(l.stock) || 0,
    precio: parseFloat(l.precio) || 0,
    fechaVencimiento: l.fecha_vencimiento,
    diasDuracion: parseInt(l.dias_duracion) || 0,
    fechaRegistro: l.fecha_registro,
    registradoPor: l.registrado_por_nombre || l.registrado_por,
    ultimaEdicion: l.ultima_edicion,
    historial: []
});

export const loteApi = {
    create: async (
        lote: Omit<Lote, 'id' | 'historial' | 'registradoPor' | 'ultimaEdicion'> & { usuario_id: number }
    ): Promise<Lote> => {
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
                usuario_id: lote.usuario_id
            })
        });
        if (!res.ok) throw new Error('Error al crear lote');
        const data = await res.json();
        return mapLoteToFrontend(data);
    },

    update: async (id: number, lote: Partial<Lote>): Promise<Lote> => {
        const res = await fetch(`${API_URL}/lotes/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                stock: lote.stock,
                precio: lote.precio,
                fecha_vencimiento: lote.fechaVencimiento,
                dias_duracion: lote.diasDuracion
            })
        });
        if (!res.ok) throw new Error('Error al actualizar lote');
        const data = await res.json();
        return mapLoteToFrontend(data);
    },

    delete: async (id: number): Promise<void> => {
        const res = await fetch(`${API_URL}/lotes/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Error al eliminar lote');
    }
};