import React from 'react';
import MainLayout from '../partials/MainLayout';
import { SalesProvider } from '../../context/SalesContext';
import { CateringServiceProvider } from '../../context/CateringContext';
import { InventoryProvider } from '../../context/InventoryContext';
import { GlobalProvider } from '../../context/GlobalContext';
import { RecipeProvider } from '../../features/recipes/context/RecipeContext';

import { useAuth } from '../../features/auth/context/AuthContext';

import AdminDashboard from './dashboards/AdminDashboard';
import ChefDashboard from './dashboards/ChefDashboard';
import CajeroDashboard from './dashboards/CajeroDashboard';
import LogisticaDashboard from './dashboards/LogisticaDashboard';

import '../../theme/section/home.css';
import '../../theme/section/dashboards/shared.css';
import '../../theme/section/dashboards/admin.css';

/**
 * Mapeo de id_rol a dashboard
 * Basado en la tabla `roles`:
 *   1 = Administrador
 *   2 = Chef
 *   3 = Cajero
 *   4 = Logistica
 */
const renderDashboardByRole = (idRol: number | undefined) => {
    switch (idRol) {
        case 1:
            return <AdminDashboard />;
        case 2:
            return <ChefDashboard />;
        case 3:
            return <CajeroDashboard />;
        case 4:
            return <LogisticaDashboard />;
        default:
            return <AdminDashboard />;
    }
};

const Home: React.FC = () => {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return (
            <MainLayout>
                <div className="dc-home-loading">
                    <div className="dc-home-loading-spinner" />
                    <span>Cargando...</span>
                </div>
            </MainLayout>
        );
    }

    return (
        <GlobalProvider>
            <SalesProvider>
                <CateringServiceProvider>
                    <InventoryProvider>
                        <RecipeProvider>
                            <MainLayout>{renderDashboardByRole(user?.id_rol)}</MainLayout>
                        </RecipeProvider>
                    </InventoryProvider>
                </CateringServiceProvider>
            </SalesProvider>
        </GlobalProvider>
    );
};

export default Home;