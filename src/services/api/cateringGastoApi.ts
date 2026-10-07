import type {
    GastoEvento,
    ResumenGastos,
    CreateGastoPayload,
    UpdateGastoPayload,
    GastoFilters
} from '../../features/types/catering';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const cateringGastoApi = {
    getByEvento: async (filtros: GastoFilters): Promise<GastoEvento[]> => {
        let url = `${API_URL}/catering/gastos?evento_id=${filtros.evento_id}&id_empresa=${filtros.id_empresa}`;
        if (filtros.categoria) url += `&categoria=${filtros.categoria}`;
        if (filtros.etapa) url += `&etapa=${filtros.etapa}`;

        const res = await fetch(url);
        if (!res.ok) throw new Error('Error al obtener gastos del evento');
        return await res.json();
    },

    getById: async (id: number, idEmpresa: number): Promise<GastoEvento> => {
        const res = await fetch(`${API_URL}/catering/gastos/${id}?id_empresa=${idEmpresa}`);
        if (!res.ok) throw new Error('Error al obtener gasto');
        return await res.json();
    },

    getResumen: async (eventoId: number, idEmpresa: number): Promise<ResumenGastos> => {
        const res = await fetch(
            `${API_URL}/catering/gastos/resumen?evento_id=${eventoId}&id_empresa=${idEmpresa}`
        );
        if (!res.ok) throw new Error('Error al obtener resumen de gastos');
        return await res.json();
    },

    create: async (payload: CreateGastoPayload): Promise<GastoEvento> => {
        const res = await fetch(`${API_URL}/catering/gastos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.message || 'Error al crear gasto');
        }
        return await res.json();
    },

    update: async (id: number, payload: UpdateGastoPayload): Promise<GastoEvento> => {
        const res = await fetch(`${API_URL}/catering/gastos/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.message || 'Error al actualizar gasto');
        }
        return await res.json();
    },

    delete: async (id: number, idEmpresa: number): Promise<void> => {
        const res = await fetch(`${API_URL}/catering/gastos/${id}?id_empresa=${idEmpresa}`, {
            method: 'DELETE'
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.message || 'Error al eliminar gasto');
        }
    }
};