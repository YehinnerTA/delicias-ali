import React from 'react';
import { Route, Redirect } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface AuthGuardProps {
    path: string;
    component: React.ComponentType<any>;
    exact?: boolean;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ path, component: Component, exact = false }) => {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return <div>Cargando...</div>;
    }

    return (
        <Route
            exact={exact}
            path={path}
            render={(props) =>
                isAuthenticated ? (
                    <Component {...props} />
                ) : (
                    <Redirect to="/" />
                )
            }
        />
    );
};