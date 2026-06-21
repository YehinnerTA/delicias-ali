import { LoginCredentials, LoginResponse } from '../types/index.auth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const loginApi = async (credentials: LoginCredentials): Promise<LoginResponse> => {
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: credentials.email,
                password: credentials.password,
                rememberMe: credentials.rememberMe || false
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                message: data.message || 'Error al iniciar sesión'
            };
        }

        if (data.token) {
            if (credentials.rememberMe) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
            } else {
                sessionStorage.setItem('token', data.token);
                sessionStorage.setItem('user', JSON.stringify(data.user));
            }
        }

        return data;
    } catch (error) {
        console.error('Error en login:', error);
        return {
            success: false,
            message: 'Error de conexión con el servidor'
        };
    }
};

export const verifyTokenApi = async (): Promise<LoginResponse> => {
    try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');

        if (!token) {
            return {
                success: false,
                message: 'No hay sesión activa'
            };
        }

        const response = await fetch(`${API_URL}/auth/verify`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        const data = await response.json();

        if (!response.ok) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            sessionStorage.removeItem('token');
            sessionStorage.removeItem('user');
            return {
                success: false,
                message: data.message || 'Sesión expirada'
            };
        }

        return data;
    } catch (error) {
        console.error('Error al verificar token:', error);
        return {
            success: false,
            message: 'Error de conexión con el servidor'
        };
    }
};

export const logout = (): void => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
};

export const getToken = (): string | null => {
    return localStorage.getItem('token') || sessionStorage.getItem('token');
};

export const getUser = (): any | null => {
    const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
};

export const isAuthenticated = (): boolean => {
    return !!getToken();
};