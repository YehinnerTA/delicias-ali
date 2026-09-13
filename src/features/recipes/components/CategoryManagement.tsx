import React, { useState } from 'react';
import { CategoryList } from './CategoryList';
import { CategoryModal } from './modals/CategoryModal';
import { CategoriaAlimento } from '../../types/person';
import { useRecipes } from '../context/RecipeContext';

export const CategoryManagement: React.FC = () => {
    const { refreshCategorias } = useRecipes();
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<CategoriaAlimento | null>(null);

    const handleCreate = () => {
        setSelectedCategory(null);
        setModalOpen(true);
    };

    const handleEdit = (categoria: CategoriaAlimento) => {
        setSelectedCategory(categoria);
        setModalOpen(true);
    };

    const handleSuccess = () => {
        refreshCategorias();
    };

    return (
        <div>
            <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <button className="dc-btn" onClick={handleCreate}>
                    <i className="fas fa-plus-circle"></i> Nueva Categoría
                </button>
            </div>

            <CategoryList onEdit={handleEdit} onRefresh={refreshCategorias} />

            <CategoryModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSuccess={handleSuccess}
                categoria={selectedCategory}
            />
        </div>
    );
};