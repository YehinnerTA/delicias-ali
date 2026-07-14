import React, { useState, useEffect } from 'react';
import { Switch, Route, useHistory, useLocation } from 'react-router-dom';
import { useAuth } from '../features/auth/context/AuthContext';
import { SplashLoader } from '../pages/security/SplashScreen';
import { Login } from '../features/auth/components/Login';
import { RUCSelectorMenu } from '../features/company/components/RUCSelectorMenu';
import Home from '../pages/section/Home';
import PersonManagement from '../pages/section/PersonManagement';
import InventoryManagement from '../pages/section/InventoryManagement';
import SalesManagement from '../pages/section/SalesManagement';
import CateringManagement from '../pages/section/CateringManagement';

export const AppRoutes: React.FC = () => {
    const { isAuthenticated, isLoading } = useAuth();
    const history = useHistory();
    const location = useLocation();
    const [showSplash, setShowSplash] = useState(true);

    useEffect(() => {
        const hasShownSplash = sessionStorage.getItem('splashShown');
        if (hasShownSplash) {
            setShowSplash(false);
        } else {
            sessionStorage.setItem('splashShown', 'true');
        }
    }, []);

    useEffect(() => {
        if (isLoading || showSplash) return;
        const currentPath = location.pathname;

        const protectedPaths = [
            '/home',
            '/ruc-selector',
            '/person-management',
            '/inventory-management',
            '/sales-management',
            '/catering-management'
        ];

        if (isAuthenticated) {
            if (currentPath === '/' || currentPath === '/login' || currentPath === '/SplashScreen') {
                history.replace('/home');
            }
        } else {
            if (protectedPaths.includes(currentPath)) {
                history.replace('/');
            }
        }
    }, [isAuthenticated, isLoading, showSplash, location.pathname, history]);

    if (isLoading) {
        return <SplashLoader />;
    }

    if (showSplash && !isAuthenticated) {
        return <SplashLoader onComplete={() => {
            setShowSplash(false);
        }} />;
    }

    return (
        <Switch>
            <Route exact path="/" component={Login} />
            <Route path="/login" component={Login} />
            <Route path="/SplashScreen" component={SplashLoader} />

            <Route path="/ruc-selector" component={RUCSelectorMenu} />
            <Route path="/home" component={Home} />
            <Route path="/person-management" component={PersonManagement} />
            <Route path="/inventory-management" component={InventoryManagement} />
            <Route path="/sales-management" component={SalesManagement} />
            <Route path="/catering-management" component={CateringManagement} />

            <Route path="*">
                {isAuthenticated ? <Home /> : <Login />}
            </Route>
        </Switch>
    );
};