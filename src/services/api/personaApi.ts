import { Persona } from '../../features/types/person';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const mapToFrontend = (data: any): Persona => ({
    id_persona: data.id,
    id_empresa: data.id_empresa,
    tipo_persona: data.tipo_persona,
    tipo_documento: data.tipo_documento,
    numero_documento: data.numero_documento,
    razon_social: data.razon_social,
    nombre: data.nombre,
    apellido: data.apellido,
    email: data.email,
    celular: data.celular,
    estado: data.estado === 1,
    historial: []
});

export const personaApi = {
    getAll: async (id_empresa: number): Promise<Persona[]> => {
        const res = await fetch(`${API_URL}/personas?id_empresa=${id_empresa}`);
        if (!res.ok) throw new Error('Error al obtener personas');
        const data = await res.json();
        return data.map(mapToFrontend);
    },

    searchByDocumento: async (id_empresa: number, numero_documento: string): Promise<Persona | null> => {
        try {
            const res = await fetch(`${API_URL}/personas/search?numero=${numero_documento}&id_empresa=${id_empresa}`);
            if (res.status === 404) {
                return null;
            }
            if (!res.ok) {
                throw new Error('Error al buscar persona');
            }
            const data = await res.json();
            return mapToFrontend(data);
        } catch (error) {
            console.error('[personaApi.searchByDocumento] Error:', error);
            throw error;
        }
    },

    create: async (persona: Omit<Persona, 'id_persona' | 'historial'>): Promise<Persona> => {
        const res = await fetch(`${API_URL}/personas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(persona)
        });
        if (!res.ok) throw new Error('Error al crear persona');
        const data = await res.json();
        return mapToFrontend(data);
    },

    update: async (id: number, persona: Partial<Persona>): Promise<Persona> => {
        const res = await fetch(`${API_URL}/personas/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(persona)
        });
        if (!res.ok) throw new Error('Error al actualizar persona');
        const data = await res.json();
        return mapToFrontend(data);
    },

    delete: async (id: number, id_empresa: number): Promise<void> => {
        const res = await fetch(`${API_URL}/personas/${id}?id_empresa=${id_empresa}`, {
            method: 'DELETE'
        });
        if (!res.ok) throw new Error('Error al eliminar persona');
    }
};