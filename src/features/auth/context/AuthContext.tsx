import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthState } from '../types/index.auth';
import { loginApi, verifyTokenApi, logout } from '../services/authApi';

interface AuthContextType extends AuthState {
    login: (email: string, password: string, rememberMe: boolean) => Promise<boolean>;
    logout: () => void;
    verifySession: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [state, setState] = useState<AuthState>({
        user: null,
        token: null,
        isLoading: true,
        isAuthenticated: false
    });

    // Verificar sesión al cargar la app
    useEffect(() => {
        verifySession();
    }, []);

    const verifySession = async (): Promise<boolean> => {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
        const user = userStr ? JSON.parse(userStr) : null;

        if (!token || !user) {
            setState({ user: null, token: null, isLoading: false, isAuthenticated: false });
            return false;
        }

        try {
            const response = await verifyTokenApi();

            if (response.success && response.user) {
                setState({
                    user: response.user,
                    token: token,
                    isLoading: false,
                    isAuthenticated: true
                });
                return true;
            } else {
                logout();
                setState({ user: null, token: null, isLoading: false, isAuthenticated: false });
                return false;
            }
        } catch (error) {
            logout();
            setState({ user: null, token: null, isLoading: false, isAuthenticated: false });
            return false;
        }
    };

    const login = async (email: string, password: string, rememberMe: boolean): Promise<boolean> => {
        setState(prev => ({ ...prev, isLoading: true }));

        try {
            const response = await loginApi({ email, password, rememberMe });

            if (response.success && response.token && response.user) {
                // El loginApi ya guarda en localStorage/sessionStorage
                setState({
                    user: response.user,
                    token: response.token,
                    isLoading: false,
                    isAuthenticated: true
                });
                return true;
            } else {
                setState(prev => ({ ...prev, isLoading: false }));
                return false;
            }
        } catch (error) {
            setState(prev => ({ ...prev, isLoading: false }));
            return false;
        }
    };

    const handleLogout = (): void => {
        logout();
        setState({
            user: null,
            token: null,
            isLoading: false,
            isAuthenticated: false
        });
    };

    return (
        <AuthContext.Provider value={{ ...state, login, logout: handleLogout, verifySession }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};