export interface LoginCredentials {
    email: string;
    password: string;
    rememberMe?: boolean;
}

export interface Empresa {
    id_empresa: number;
    ruc: string;
    nombre: string;
    es_predeterminada: boolean;
}

export interface User {
    id: number;
    usuario: string;
    email: string;
    nombre_completo: string;
    id_rol: number;
    empresas: Empresa[];
}

export interface LoginResponse {
    success: boolean;
    message: string;
    token?: string;
    user?: User;
}

export interface AuthState {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    isAuthenticated: boolean;
}