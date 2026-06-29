import { Empresa } from '../../features/types/person';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Mapeo de backend a frontend
const mapToFrontend = (data: any): Empresa => ({
    id_empresa: data.id,
    ruc: data.ruc,
    empresa: data.nombre,
    estado: data.estado === 1,
    historial: []
});

const mapToBackend = (data: Partial<Empresa>) => ({
    id: data.id_empresa,
    ruc: data.ruc,
    nombre: data.empresa,
    estado: data.estado ? 1 : 0
});

export const empresaApi = {
    getAll: async (): Promise<Empresa[]> => {
        const res = await fetch(`${API_URL}/empresas`);
        if (!res.ok) throw new Error('Error al obtener empresas');
        const data = await res.json();
        return data.map(mapToFrontend);
    },
    create: async (empresa: Omit<Empresa, 'id_empresa' | 'historial'> & { creado_por?: number | null }): Promise<Empresa> => {
        const payload = { ruc: empresa.ruc, nombre: empresa.empresa, creado_por: empresa.creado_por || null };
        const res = await fetch(`${API_URL}/empresas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('Error al crear empresa');
        const data = await res.json();
        return mapToFrontend(data);
    },
    update: async (id: number, empresa: Partial<Empresa>): Promise<Empresa> => {
        const payload = mapToBackend(empresa);
        const res = await fetch(`${API_URL}/empresas/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('Error al actualizar empresa');
        const data = await res.json();
        return mapToFrontend(data);
    },
    delete: async (id: number): Promise<void> => {
        const res = await fetch(`${API_URL}/empresas/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Error al eliminar empresa');
    }
};