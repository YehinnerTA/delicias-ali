import React, { useState } from 'react';
import { RecipeProvider } from '../../features/recipes/context/RecipeContext';
import { CategoryManagement } from '../../features/recipes/components/CategoryManagement';
import { ServiceTipoManagement } from '../../features/recipes/components/ServiceTipoManagement';
import { RecipeManagement as RecipeList } from '../../features/recipes/components/RecipeManagement';
import MainLayout from '../partials/MainLayout';
import '../../theme/section/management.css';

type TabType = 'categorias' | 'servicios' | 'recetas';

const RecipeContent: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TabType>('categorias');

    return (
        <div className="dc-catering-container">
            <div className="dc-catering-header-card">
                <div className="dc-title">
                    <h1><i className="fas fa-utensils"></i> Gestión de Recetas</h1>
                    <p>Categorías · Tipos de Servicio · Recetas</p>
                </div>
            </div>

            <div className="dc-tabs" style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                    className={`dc-tab-btn ${activeTab === 'categorias' ? 'active' : ''}`}
                    onClick={() => setActiveTab('categorias')}
                >
                    <i className="fas fa-tags"></i> Categorías
                </button>
                <button
                    className={`dc-tab-btn ${activeTab === 'servicios' ? 'active' : ''}`}
                    onClick={() => setActiveTab('servicios')}
                >
                    <i className="fas fa-concierge-bell"></i> Tipos de Servicio
                </button>
                <button
                    className={`dc-tab-btn ${activeTab === 'recetas' ? 'active' : ''}`}
                    onClick={() => setActiveTab('recetas')}
                >
                    <i className="fas fa-book"></i> Recetas
                </button>
            </div>

            {activeTab === 'categorias' && <CategoryManagement />}
            {activeTab === 'servicios' && <ServiceTipoManagement />}
            {activeTab === 'recetas' && <RecipeList />}
        </div>
    );
};

const RecipeManagement: React.FC = () => {
    return (
        <RecipeProvider>
            <MainLayout>
                <RecipeContent />
            </MainLayout>
        </RecipeProvider>
    );
};

export default RecipeManagement;