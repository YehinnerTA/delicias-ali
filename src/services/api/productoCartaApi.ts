import { ServiceTipo } from './serviceTipoApi';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export interface RecetaVinculada {
    id: number;
    nombre: string;
    categoria?: string;
    tipo_preparacion?: string;
    porciones_total?: number;
}

export interface ProductoCarta {
    id: number;
    id_tipo_servicio: number;
    id_receta: number;
    nombre: string;
    precio: number;
    tipo_servicio: ServiceTipo;
    receta: RecetaVinculada;
    created_at?: string;
    updated_at?: string;
}

export const productoCartaApi = {
    getAll: async (): Promise<ProductoCarta[]> => {
        const res = await fetch(`${API_URL}/productos-carta`);
        if (!res.ok) throw new Error('Error al obtener productos de carta');
        return await res.json();
    },

    getById: async (id: number): Promise<ProductoCarta> => {
        const res = await fetch(`${API_URL}/productos-carta/${id}`);
        if (!res.ok) throw new Error('Error al obtener producto de carta');
        return await res.json();
    },

    getByTipoServicio: async (id_tipo_servicio: number): Promise<ProductoCarta[]> => {
        const res = await fetch(`${API_URL}/service-tipos/${id_tipo_servicio}/productos`);
        if (!res.ok) throw new Error('Error al obtener productos del servicio');
        return await res.json();
    },

    create: async (data: { id_tipo_servicio: number; id_receta: number; precio: number }): Promise<ProductoCarta> => {
        const res = await fetch(`${API_URL}/productos-carta`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.message || 'Error al crear producto de carta');
        }
        return await res.json();
    },

    update: async (id: number, data: { id_tipo_servicio: number; id_receta: number; precio: number }): Promise<ProductoCarta> => {
        const res = await fetch(`${API_URL}/productos-carta/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.message || 'Error al actualizar producto de carta');
        }
        return await res.json();
    },

    delete: async (id: number): Promise<void> => {
        const res = await fetch(`${API_URL}/productos-carta/${id}`, {
            method: 'DELETE'
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.message || 'Error al eliminar producto de carta');
        }
    }
};