import React, { useState } from 'react';
import { DataTable, Column } from '../../../components/common/DataTable';
import { FilterSection, FilterField } from '../../../components/common/FilterSection';
import { Modal } from '../../../components/common/modal/Modal';
import { CategoriaAlimento } from '../../types/person';
import { categoriaApi } from '../../../services/api/categoriaApi';
import { useCompany } from '../../../features/company/context/CompanyContext';
import { useToast } from '../../../hooks/base/useToast';
import { useRecipes } from '../context/RecipeContext';

const categoryFilters: FilterField[] = [
    { id: 'search', label: 'Buscar', type: 'text', placeholder: 'Nombre o descripción' }
];

interface CategoryListProps {
    onEdit: (categoria: CategoriaAlimento) => void;
    onRefresh: () => void;
}

export const CategoryList: React.FC<CategoryListProps> = ({ onEdit, onRefresh }) => {
    const { categorias, refreshCategorias } = useRecipes();
    const { getSelectedCompanyId } = useCompany();
    const { showToast } = useToast();
    const id_empresa = getSelectedCompanyId() ?? 0;

    const [filterValues, setFilterValues] = useState({ search: '' });
    const [filteredData, setFilteredData] = useState<CategoriaAlimento[]>(categorias);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<CategoriaAlimento | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    React.useEffect(() => {
        let filtered = categorias.filter(c => {
            const matchSearch = !filterValues.search ||
                c.nombre.toLowerCase().includes(filterValues.search.toLowerCase()) ||
                (c.descripcion && c.descripcion.toLowerCase().includes(filterValues.search.toLowerCase()));
            return matchSearch;
        });
        setFilteredData(filtered);
    }, [categorias, filterValues]);

    const columns: Column<CategoriaAlimento>[] = [
        { key: 'nombre', header: 'Nombre', render: (c) => <strong>{c.nombre}</strong> },
        { key: 'descripcion', header: 'Descripción', render: (c) => c.descripcion || '-' }
    ];

    const handleDelete = (categoria: CategoriaAlimento) => {
        setSelectedCategory(categoria);
        setDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!selectedCategory) return;
        setIsDeleting(true);
        try {
            await categoriaApi.delete(selectedCategory.id, id_empresa);
            showToast(`Categoría "${selectedCategory.nombre}" eliminada`, 'success', 'Eliminado');
            await refreshCategorias();
            onRefresh();
            setDeleteModalOpen(false);
            setSelectedCategory(null);
        } catch (error) {
            console.error('[CategoryList] Error al eliminar:', error);
            showToast('Error al eliminar la categoría', 'error', 'Error');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <>
            <div className="dc-results-count">
                <i className="fas fa-tags"></i> Mostrando {filteredData.length} de {categorias.length} categorías
            </div>

            <DataTable
                columns={columns}
                data={filteredData}
                emptyMessage="🏷️ No hay categorías registradas"
                actions={(item) => (
                    <>
                        <i className="fas fa-edit" onClick={() => onEdit(item)} title="Editar"></i>
                        <i className="fas fa-trash-alt" onClick={() => handleDelete(item)} title="Eliminar"></i>
                    </>
                )}
            />

            <Modal
                isOpen={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                title="Eliminar Categoría"
                icon="fa-trash-alt"
                footer={
                    <div>
                        <button className="dc-btn danger" onClick={confirmDelete} disabled={isDeleting}>
                            {isDeleting ? 'Eliminando...' : <><i className="fas fa-trash"></i> Eliminar</>}
                        </button>
                    </div>
                }
            >
                <p>¿Estás seguro de eliminar la categoría <strong>"{selectedCategory?.nombre}"</strong>?</p>
                <p style={{ color: 'var(--color-gray)', fontSize: '0.9rem' }}>
                    Esta acción es irreversible y afectará a los ingredientes y proveedores que usen esta categoría.
                </p>
            </Modal>
        </>
    );
};