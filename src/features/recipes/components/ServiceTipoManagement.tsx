import React, { useState } from 'react';
import { ServiceTipoList } from './ServiceTipoList';
import { ServiceTipoModal } from './modals/ServiceTipoModal';
import { ServiceTipo } from '../../../services/api/serviceTipoApi';
import { useRecipes } from '../context/RecipeContext';

export const ServiceTipoManagement: React.FC = () => {
    const {
        serviceTipos,
        recetas,
        productosCarta,
        refreshServiceTipos,
        refreshProductosCarta
    } = useRecipes();
    const [modalOpen, setModalOpen] = useState(false);
    const [selected, setSelected] = useState<ServiceTipo | null>(null);

    const handleCreate = () => {
        setSelected(null);
        setModalOpen(true);
    };

    const handleEdit = (st: ServiceTipo) => {
        setSelected(st);
        setModalOpen(true);
    };

    const handleSuccess = () => {
        refreshServiceTipos();
    };

    return (
        <div>
            <div style={{ marginBottom: '1.5rem' }}>
                <button className="dc-btn" onClick={handleCreate}>
                    <i className="fas fa-plus-circle"></i> Nuevo Tipo de Servicio
                </button>
            </div>

            <ServiceTipoList
                serviceTipos={serviceTipos}
                onEdit={handleEdit}
                onRefresh={refreshServiceTipos}
            />

            <ServiceTipoModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSuccess={handleSuccess}
                serviceTipo={selected}
                recetas={recetas}
                productosCarta={productosCarta}
                onRefreshProductos={refreshProductosCarta}
            />
        </div>
    );
};