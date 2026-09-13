import React, { useState } from 'react';
import { DataTable, Column } from '../../../components/common/DataTable';
import { FilterSection, FilterField } from '../../../components/common/FilterSection';
import { Modal } from '../../../components/common/modal/Modal';
import { Receta } from '../../types/recipe';
import { recetaApi } from '../../../services/api/recetaApi';
import { useCompany } from '../../../features/company/context/CompanyContext';
import { useToast } from '../../../hooks/base/useToast';
import { useRecipes } from '../context/RecipeContext';

const recipeFilters: FilterField[] = [
    { id: 'search', label: 'Buscar', type: 'text', placeholder: 'Nombre de la receta' }
];

interface RecipeListProps {
    recetas: Receta[];
    onEdit: (receta: Receta) => void;
    onView: (receta: Receta) => void;
    onRefresh: () => void;
}

export const RecipeList: React.FC<RecipeListProps> = ({ recetas, onEdit, onView, onRefresh }) => {
    const { getSelectedCompanyId } = useCompany();
    const { showToast } = useToast();
    const id_empresa = getSelectedCompanyId() ?? 0;

    const [filterValues, setFilterValues] = useState({ search: '' });
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [selectedReceta, setSelectedReceta] = useState<Receta | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const filteredData = recetas.filter(r => {
        if (!filterValues.search) return true;
        return r.nombre.toLowerCase().includes(filterValues.search.toLowerCase());
    });

    const columns: Column<Receta>[] = [
        { key: 'id', header: 'ID', render: (r) => <strong>#{r.id}</strong> },
        { key: 'nombre', header: 'Nombre', render: (r) => <strong>{r.nombre}</strong> },
        { key: 'descripcion', header: 'Descripción', render: (r) => r.descripcion || '-' },
        {
            key: 'ingredientes',
            header: 'Ingredientes',
            render: (r) => (
                <span className="dc-badge dc-badge-active">
                    <i className="fas fa-box"></i> {r.ingredientes.length}
                </span>
            )
        }
    ];

    const handleDelete = (receta: Receta) => {
        setSelectedReceta(receta);
        setDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!selectedReceta) return;
        setIsDeleting(true);
        try {
            await recetaApi.delete(selectedReceta.id, id_empresa);
            showToast(`Receta "${selectedReceta.nombre}" eliminada`, 'success', 'Eliminado');
            onRefresh();
            setDeleteModalOpen(false);
            setSelectedReceta(null);
        } catch (error) {
            console.error('[RecipeList] Error al eliminar:', error);
            showToast('Error al eliminar la receta', 'error', 'Error');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <>
            <FilterSection
                title="Filtrar recetas"
                filters={recipeFilters}
                values={filterValues}
                onChange={(id, value) => setFilterValues(prev => ({ ...prev, [id]: value }))}
                onClear={() => setFilterValues({ search: '' })}
            />

            <div className="dc-results-count">
                <i className="fas fa-book"></i> Mostrando {filteredData.length} de {recetas.length} recetas
            </div>

            <DataTable
                columns={columns}
                data={filteredData}
                emptyMessage="📖 No hay recetas registradas"
                actions={(item) => (
                    <>
                        <i className="fas fa-eye" onClick={() => onView(item)} title="Ver detalle"></i>
                        <i className="fas fa-edit" onClick={() => onEdit(item)} title="Editar"></i>
                        <i className="fas fa-trash-alt" onClick={() => handleDelete(item)} title="Eliminar"></i>
                    </>
                )}
            />

            <Modal
                isOpen={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                title="Eliminar Receta"
                icon="fa-trash-alt"
                footer={
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', width: '100%' }}>
                        <button className="dc-btn secondary" onClick={() => setDeleteModalOpen(false)}>
                            Cancelar
                        </button>
                        <button className="dc-btn danger" onClick={confirmDelete} disabled={isDeleting}>
                            {isDeleting ? 'Eliminando...' : <><i className="fas fa-trash"></i> Eliminar</>}
                        </button>
                    </div>
                }
            >
                <p>¿Estás seguro de eliminar la receta <strong>"{selectedReceta?.nombre}"</strong>?</p>
                <p style={{ color: 'var(--color-gray)', fontSize: '0.9rem' }}>
                    Esta acción es irreversible.
                </p>
            </Modal>
        </>
    );
};