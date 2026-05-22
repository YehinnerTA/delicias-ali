import React from 'react';
import { InventoryProvider } from '../../context/InventoryContext';
import MainLayout from '../partials/MainLayout';
import { InventoryBase } from '../../components/ui/InventoryBase';
import { CateringSection } from '../../components/ui/gestion/inventory/CateringSection';
import { PasteleriaSection } from '../../components/ui/gestion/inventory/TiendaSection';
import { TabConfig } from '../../features/types/person';
import '../../theme/section/catering.css';

const tabs: TabConfig[] = [
    { id: 'catering', label: 'Catering · Insumos', icon: 'fa-boxes' },
    { id: 'tienda', label: 'Pastelería · Lotes', icon: 'fa-cake-candles' }
];

const InventoryManagement: React.FC = () => {
    return (
        <InventoryProvider>
            <MainLayout>
                <div className="dc-catering-container">
                    <div className="dc-catering-header-card">
                        <div className="dc-title">
                            <h1><i className="fas fa-crown"></i> Delicias Catering</h1>
                            <p>Materia prima · Utensilios · Postres por lotes con trazabilidad</p>
                        </div>
                    </div>
                    <InventoryBase tabs={tabs}>
                        <CateringSection data-tab="catering" />
                        <PasteleriaSection data-tab="tienda" />
                    </InventoryBase>
                </div>
            </MainLayout>
        </InventoryProvider>
    );
};

export default InventoryManagement;