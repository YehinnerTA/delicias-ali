import React, { useState } from 'react';
import { DataTable, Column } from '../../../components/common/DataTable';
import { Modal } from '../../../components/common/modal/Modal';
import { ProductoCarta, productoCartaApi } from '../../../services/api/productoCartaApi';
import { useToast } from '../../../hooks/base/useToast';

interface ProductoCartaListProps {
    productosCarta: ProductoCarta[];
    onEdit: (pc: ProductoCarta) => void;
    onRefresh: () => void;
}

export const ProductoCartaList: React.FC<ProductoCartaListProps> = ({ productosCarta, onEdit, onRefresh }) => {
    const { showToast } = useToast();
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [selected, setSelected] = useState<ProductoCarta | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const columns: Column<ProductoCarta>[] = [
        { key: 'id', header: 'ID', render: (p) => <strong>#{p.id}</strong> },
        { key: 'nombre', header: 'Nombre', render: (p) => <strong>{p.nombre}</strong> },
        {
            key: 'tipo_servicio',
            header: 'Tipo de Servicio',
            render: (p) => <span className="dc-badge dc-badge-active">{p.tipo_servicio.nombre}</span>
        },
        {
            key: 'receta',
            header: 'Receta Vinculada',
            render: (p) => p.receta ? (
                <span className="dc-badge" style={{ background: '#17a2b8', color: 'white' }}>
                    <i className="fas fa-book"></i> {p.receta.nombre}
                </span>
            ) : (
                <span style={{ color: 'var(--color-gray)' }}>Sin receta</span>
            )
        },
        { key: 'precio', header: 'Precio', render: (p) => `S/ ${p.precio.toFixed(2)}` }
    ];

    const confirmDelete = async () => {
        if (!selected) return;
        setIsDeleting(true);
        try {
            await productoCartaApi.delete(selected.id);
            showToast(`Producto "${selected.nombre}" eliminado`, 'success', 'Eliminado');
            onRefresh();
            setDeleteModalOpen(false);
            setSelected(null);
        } catch (error) {
            console.error('[ProductoCartaList] Error:', error);
            showToast(error instanceof Error ? error.message : 'Error al eliminar', 'error', 'Error');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <>
            <div className="dc-results-count">
                <i className="fas fa-utensils"></i> {productosCarta.length} productos de carta
            </div>

            <DataTable
                columns={columns}
                data={productosCarta}
                emptyMessage="🍽️ No hay productos de carta registrados"
                actions={(item) => (
                    <>
                        <i className="fas fa-edit" onClick={() => onEdit(item)} title="Editar"></i>
                        <i className="fas fa-trash-alt" onClick={() => { setSelected(item); setDeleteModalOpen(true); }} title="Eliminar"></i>
                    </>
                )}
            />

            <Modal
                isOpen={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                title="Eliminar Producto de Carta"
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
                <p>¿Eliminar el producto <strong>"{selected?.nombre}"</strong>?</p>
                <p style={{ color: 'var(--color-gray)', fontSize: '0.9rem' }}>
                    No se puede eliminar si está en ventas.
                </p>
            </Modal>
        </>
    );
};