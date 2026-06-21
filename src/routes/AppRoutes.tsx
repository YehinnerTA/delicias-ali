import React, { useState, useEffect } from 'react';
import { Switch, Route, useHistory } from 'react-router-dom';
import { useAuth } from '../features/auth/context/AuthContext';
import { SplashLoader } from '../pages/security/SplashScreen';
import { Login } from '../features/auth/components/Login';
import { RUCSelectorMenu } from '../pages/selection/RUCSelectorMenu';
import Home from '../pages/section/Home';
import PersonManagement from '../pages/section/PersonManagement';
import InventoryManagement from '../pages/section/InventoryManagement';
import SalesManagement from '../pages/section/SalesManagement';
import CateringManagement from '../pages/section/CateringManagement';

export const AppRoutes: React.FC = () => {
    const { isAuthenticated, isLoading } = useAuth();
    const history = useHistory();
    const [showSplash, setShowSplash] = useState(true);

    // Mostrar Splash al inicio
    useEffect(() => {
        const hasShownSplash = sessionStorage.getItem('splashShown');
        if (hasShownSplash) {
            setShowSplash(false);
        } else {
            // Primera carga, mostrar Splash
            sessionStorage.setItem('splashShown', 'true');
        }
    }, []);

    // Si está cargando la autenticación, mostrar Splash
    if (isLoading) {
        return <SplashLoader />;
    }

    // Si el usuario está autenticado, redirigir a /home
    if (isAuthenticated) {
        // Si está en login o splash, redirigir a home
        const currentPath = window.location.pathname;
        if (currentPath === '/' || currentPath === '/login' || currentPath === '/SplashScreen') {
            history.replace('/home');
        }
    }

    // Si no está autenticado y está en una ruta protegida, redirigir a login
    const protectedPaths = ['/home', '/ruc-selector', '/person-management', '/inventory-management', '/sales-management', '/catering-management'];
    const currentPath = window.location.pathname;
    if (!isAuthenticated && protectedPaths.includes(currentPath)) {
        history.replace('/');
    }

    const handleSplashComplete = () => {
        setShowSplash(false);
        // Si no está autenticado, ir a login
        if (!isAuthenticated) {
            history.replace('/');
        }
    };

    // Mostrar Splash solo si no se ha mostrado antes y no está autenticado
    if (showSplash && !isAuthenticated) {
        return <SplashLoader onComplete={handleSplashComplete} />;
    }

    return (
        <Switch>
            {/* Rutas públicas */}
            <Route exact path="/" component={Login} />
            <Route path="/login" component={Login} />
            <Route path="/SplashScreen" component={SplashLoader} />

            {/* Rutas protegidas (requieren autenticación) */}
            <Route path="/ruc-selector" component={RUCSelectorMenu} />
            <Route path="/home" component={Home} />
            <Route path="/person-management" component={PersonManagement} />
            <Route path="/inventory-management" component={InventoryManagement} />
            <Route path="/sales-management" component={SalesManagement} />
            <Route path="/catering-management" component={CateringManagement} />

            {/* Si no coincide ninguna ruta, redirigir según autenticación */}
            <Route path="*">
                {isAuthenticated ? <Home /> : <Login />}
            </Route>
        </Switch>
    );
};