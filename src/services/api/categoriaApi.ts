import { CategoriaAlimento } from '../../features/types/person';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const mapToFrontend = (data: any): CategoriaAlimento => ({
    id: data.id,
    id_empresa: data.id_empresa,
    nombre: data.nombre,
    descripcion: data.descripcion || null
});

export const categoriaApi = {
    getAll: async (id_empresa: number): Promise<CategoriaAlimento[]> => {
        const res = await fetch(`${API_URL}/categorias?id_empresa=${id_empresa}`);
        if (!res.ok) throw new Error('Error al obtener categorías');
        const data = await res.json();
        return data.map(mapToFrontend);
    },

    getById: async (id: number, id_empresa: number): Promise<CategoriaAlimento> => {
        const res = await fetch(`${API_URL}/categorias/${id}?id_empresa=${id_empresa}`);
        if (!res.ok) throw new Error('Error al obtener categoría');
        const data = await res.json();
        return mapToFrontend(data);
    },

    create: async (categoria: Omit<CategoriaAlimento, 'id'>): Promise<CategoriaAlimento> => {
        const res = await fetch(`${API_URL}/categorias`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(categoria)
        });
        if (!res.ok) throw new Error('Error al crear categoría');
        const data = await res.json();
        return mapToFrontend(data);
    },

    update: async (id: number, categoria: Partial<CategoriaAlimento>): Promise<CategoriaAlimento> => {
        const res = await fetch(`${API_URL}/categorias/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(categoria)
        });
        if (!res.ok) throw new Error('Error al actualizar categoría');
        const data = await res.json();
        return mapToFrontend(data);
    },

    delete: async (id: number, id_empresa: number): Promise<void> => {
        const res = await fetch(`${API_URL}/categorias/${id}?id_empresa=${id_empresa}`, {
            method: 'DELETE'
        });
        if (!res.ok) throw new Error('Error al eliminar categoría');
    }
};