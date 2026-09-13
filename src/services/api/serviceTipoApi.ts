const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export interface ServiceTipo {
    id: number;
    clave: string;
    nombre: string;
    descripcion: string | null;
    created_at?: string;
    updated_at?: string;
}

export const serviceTipoApi = {
    getAll: async (): Promise<ServiceTipo[]> => {
        const res = await fetch(`${API_URL}/service-tipos`);
        if (!res.ok) throw new Error('Error al obtener tipos de servicio');
        return await res.json();
    },

    getById: async (id: number): Promise<ServiceTipo> => {
        const res = await fetch(`${API_URL}/service-tipos/${id}`);
        if (!res.ok) throw new Error('Error al obtener tipo de servicio');
        return await res.json();
    },

    create: async (data: Omit<ServiceTipo, 'id' | 'created_at' | 'updated_at'>): Promise<ServiceTipo> => {
        const res = await fetch(`${API_URL}/service-tipos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.message || 'Error al crear tipo de servicio');
        }
        return await res.json();
    },

    update: async (id: number, data: Partial<ServiceTipo>): Promise<ServiceTipo> => {
        const res = await fetch(`${API_URL}/service-tipos/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.message || 'Error al actualizar tipo de servicio');
        }
        return await res.json();
    },

    delete: async (id: number): Promise<void> => {
        const res = await fetch(`${API_URL}/service-tipos/${id}`, {
            method: 'DELETE'
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.message || 'Error al eliminar tipo de servicio');
        }
    }
};