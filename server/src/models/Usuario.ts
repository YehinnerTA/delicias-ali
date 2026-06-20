export interface Usuario {
    id: number;
    usuario: string;
    email: string;
    password_hash: string;
    nombre_completo: string;
    estado: number;
    created_at: Date;
    updated_at: Date;
}

export interface UsuarioEmpresa {
    id: number;
    usuario_id: number;
    empresa_id: number;
    es_predeterminada: number;
}

export interface LoginResponse {
    success: boolean;
    message: string;
    token?: string;
    user?: {
        id: number;
        usuario: string;
        email: string;
        nombre_completo: string;
        empresas: Array<{
            id: number;
            ruc: string;
            nombre: string;
            es_predeterminada: boolean;
        }>;
    };
}