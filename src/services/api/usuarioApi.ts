import { Usuario } from '../../features/types/person';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const mapToFrontend = (data: any): Usuario => ({
    id_usuario: data.id,
    id_persona: data.id_persona,
    id_rol: data.id_rol,
    username: data.usuario,
    password_hash: data.password_hash,
    estado: data.estado === 1,
    historial: []
});

export const usuarioApi = {
    getAll: async (): Promise<Usuario[]> => {
        const res = await fetch(`${API_URL}/usuarios`);
        if (!res.ok) throw new Error('Error al obtener usuarios');
        const data = await res.json();
        return data.map(mapToFrontend);
    },

    create: async (
        usuario: Omit<Usuario, 'id_usuario' | 'historial' | 'password_hash'> & { password: string }
    ): Promise<Usuario> => {
        const payload = {
            id_persona: usuario.id_persona,
            usuario: usuario.username,
            password: usuario.password,   // ← backend lo hashea
            id_rol: usuario.id_rol
        };
        const res = await fetch(`${API_URL}/usuarios`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('Error al crear usuario');
        const data = await res.json();
        return mapToFrontend(data);
    },

    update: async (id: number, usuario: Partial<Usuario>): Promise<Usuario> => {
        const payload = {
            id_persona: usuario.id_persona,
            usuario: usuario.username,
            id_rol: usuario.id_rol,
            estado: usuario.estado ? 1 : 0
        };
        const res = await fetch(`${API_URL}/usuarios/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('Error al actualizar usuario');
        const data = await res.json();
        return mapToFrontend(data);
    },

    delete: async (id: number): Promise<void> => {
        const res = await fetch(`${API_URL}/usuarios/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Error al eliminar usuario');
    }
};