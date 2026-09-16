import React, { useState } from 'react';
import { DataTable, Column } from '../../../components/common/DataTable';
import { Modal } from '../../../components/common/modal/Modal';
import { ServiceTipo, serviceTipoApi } from '../../../services/api/serviceTipoApi';
import { useToast } from '../../../hooks/base/useToast';
import { useRecipes } from '../context/RecipeContext';

interface ServiceTipoListProps {
    serviceTipos: ServiceTipo[];
    onEdit: (st: ServiceTipo) => void;
    onRefresh: () => void;
}

export const ServiceTipoList: React.FC<ServiceTipoListProps> = ({ serviceTipos, onEdit, onRefresh }) => {
    const { productosCarta } = useRecipes();
    const { showToast } = useToast();
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [selected, setSelected] = useState<ServiceTipo | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const getProductosCount = (idTipoServicio: number) => {
        return productosCarta.filter(p => p.id_tipo_servicio === idTipoServicio).length;
    };

    const columns: Column<ServiceTipo>[] = [
        { key: 'id', header: 'ID', render: (s) => <strong>#{s.id}</strong> },
        { key: 'clave', header: 'Clave', render: (s) => <span className="dc-badge">{s.clave}</span> },
        { key: 'nombre', header: 'Nombre', render: (s) => <strong>{s.nombre}</strong> },
        { key: 'descripcion', header: 'Descripción', render: (s) => s.descripcion || '-' },
        {
            key: 'productos',
            header: 'Productos',
            render: (s) => {
                const count = getProductosCount(s.id);
                return count > 0 ? (
                    <span className="dc-badge dc-badge-active">
                        <i className="fas fa-utensils"></i> {count} producto(s)
                    </span>
                ) : (
                    <span className="dc-badge dc-badge-inactive">Sin productos</span>
                );
            }
        }
    ];

    const confirmDelete = async () => {
        if (!selected) return;
        setIsDeleting(true);
        try {
            await serviceTipoApi.delete(selected.id);
            showToast(`Tipo "${selected.nombre}" eliminado`, 'success', 'Eliminado');
            onRefresh();
            setDeleteModalOpen(false);
            setSelected(null);
        } catch (error) {
            console.error('[ServiceTipoList] Error:', error);
            showToast(error instanceof Error ? error.message : 'Error al eliminar', 'error', 'Error');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <>
            <div className="dc-results-count">
                <i className="fas fa-concierge-bell"></i> {serviceTipos.length} tipos de servicio
            </div>

            <DataTable
                columns={columns}
                data={serviceTipos}
                emptyMessage="🔔 No hay tipos de servicio registrados"
                actions={(item) => (
                    <>
                        <i className="fas fa-edit" onClick={() => onEdit(item)} title="Editar y gestionar productos"></i>
                        <i className="fas fa-trash-alt" onClick={() => { setSelected(item); setDeleteModalOpen(true); }} title="Eliminar"></i>
                    </>
                )}
            />

            <Modal
                isOpen={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                title="Eliminar Tipo de Servicio"
                icon="fa-trash-alt"
                footer={
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', width: '100%' }}>
                        <button className="dc-btn secondary" onClick={() => setDeleteModalOpen(false)}>Cancelar</button>
                        <button className="dc-btn danger" onClick={confirmDelete} disabled={isDeleting}>
                            {isDeleting ? 'Eliminando...' : <><i className="fas fa-trash"></i> Eliminar</>}
                        </button>
                    </div>
                }
            >
                <p>¿Eliminar el tipo de servicio <strong>"{selected?.nombre}"</strong>?</p>
                <p style={{ color: 'var(--color-peligro)', fontSize: '0.9rem' }}>
                    <i className="fas fa-exclamation-triangle"></i>{' '}
                    Se eliminarán también los <strong>{selected ? getProductosCount(selected.id) : 0} producto(s)</strong> asociados.
                </p>
            </Modal>
        </>
    );
};