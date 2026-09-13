import { CategoriaAlimento, Persona } from '../../features/types/person';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export interface Ingrediente {
    id: number;
    id_empresa: number;
    nombre: string;
    unidad: string;
    id_categoria: number | null;
    categoria?: CategoriaAlimento | null;
    proveedores?: Persona[];
}

const mapToFrontend = (data: any): Ingrediente => ({
    id: data.id,
    id_empresa: data.id_empresa,
    nombre: data.nombre,
    unidad: data.unidad,
    id_categoria: data.id_categoria,
    categoria: data.categoria || null,
    proveedores: data.proveedores || []
});

export const ingredienteApi = {
    getAll: async (id_empresa: number): Promise<Ingrediente[]> => {
        const res = await fetch(`${API_URL}/ingredientes?id_empresa=${id_empresa}`);
        if (!res.ok) throw new Error('Error al obtener ingredientes');
        const data = await res.json();
        return data.map(mapToFrontend);
    },

    getById: async (id: number, id_empresa: number): Promise<Ingrediente> => {
        const res = await fetch(`${API_URL}/ingredientes/${id}?id_empresa=${id_empresa}`);
        if (!res.ok) throw new Error('Error al obtener ingrediente');
        const data = await res.json();
        return mapToFrontend(data);
    },

    create: async (ingrediente: Omit<Ingrediente, 'id' | 'categoria' | 'proveedores'>): Promise<Ingrediente> => {
        const res = await fetch(`${API_URL}/ingredientes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(ingrediente)
        });
        if (!res.ok) throw new Error('Error al crear ingrediente');
        const data = await res.json();
        return mapToFrontend(data);
    },

    update: async (id: number, ingrediente: Partial<Ingrediente>): Promise<Ingrediente> => {
        const res = await fetch(`${API_URL}/ingredientes/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(ingrediente)
        });
        if (!res.ok) throw new Error('Error al actualizar ingrediente');
        const data = await res.json();
        return mapToFrontend(data);
    },

    delete: async (id: number, id_empresa: number): Promise<void> => {
        const res = await fetch(`${API_URL}/ingredientes/${id}?id_empresa=${id_empresa}`, {
            method: 'DELETE'
        });
        if (!res.ok) throw new Error('Error al eliminar ingrediente');
    }
};