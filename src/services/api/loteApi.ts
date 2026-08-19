import { Lote } from '../../features/types/inventory';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const mapLoteToFrontend = (l: any): Lote => ({
    id: l.id,
    id_empresa: l.id_empresa,
    postre_id: l.postre_id,
    stock: parseInt(l.stock) || 0,
    fechaVencimiento: l.fecha_vencimiento,
    diasDuracion: parseInt(l.dias_duracion) || 0,
    fechaRegistro: l.fecha_registro,
    registradoPor: l.registrado_por_nombre || l.registrado_por,
    ultimaEdicion: l.ultima_edicion,
    descartado: l.descartado === 1 || l.descartado === true,
    historial: []
});

export const loteApi = {
    create: async (
        lote: Omit<Lote, 'id' | 'historial' | 'registradoPor' | 'ultimaEdicion' | 'descartado'> & { usuario_id: number; id_empresa: number }
    ): Promise<Lote> => {
        const res = await fetch(`${API_URL}/lotes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                postre_id: lote.postre_id,
                stock: lote.stock,
                fecha_vencimiento: lote.fechaVencimiento,
                dias_duracion: lote.diasDuracion,
                fecha_registro: lote.fechaRegistro || new Date().toISOString().split('T')[0],
                usuario_id: lote.usuario_id,
                id_empresa: lote.id_empresa
            })
        });
        if (!res.ok) throw new Error('Error al crear lote');
        const data = await res.json();
        return mapLoteToFrontend(data);
    },

    update: async (id: number, lote: Partial<Lote>): Promise<Lote> => {
        const payload: any = {
            stock: lote.stock,
            fecha_vencimiento: lote.fechaVencimiento,
            dias_duracion: lote.diasDuracion,
            id_empresa: lote.id_empresa
        };

        if (lote.descartado !== undefined) {
            payload.descartado = lote.descartado;
        }

        const res = await fetch(`${API_URL}/lotes/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('Error al actualizar lote');
        const data = await res.json();
        return mapLoteToFrontend(data);
    },

    delete: async (id: number, id_empresa: number): Promise<void> => {
        const res = await fetch(`${API_URL}/lotes/${id}?id_empresa=${id_empresa}`, {
            method: 'DELETE'
        });
        if (!res.ok) throw new Error('Error al eliminar lote');
    },

    descartar: async (id: number, id_empresa: number): Promise<Lote> => {
        const res = await fetch(`${API_URL}/lotes/${id}/descartar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_empresa })
        });
        if (!res.ok) throw new Error('Error al descartar lote');
        const data = await res.json();
        return mapLoteToFrontend(data);
    },

    createBulk: async (
        payload: {
            items: Array<{
                postre_id: number;
                stock: number;
                fecha_vencimiento: string;
                dias_duracion: number;
                fecha_registro?: string;
            }>;
            usuario_id: number;
            id_empresa: number;
        }
    ): Promise<{
        success: any[];
        errors: { index: number; message: string; data: any }[];
        total: number;
        successCount: number;
        errorCount: number;
    }> => {
        const res = await fetch(`${API_URL}/lotes/bulk`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.message || 'Error al procesar la carga masiva de lotes');
        }
        return await res.json();
    }
};