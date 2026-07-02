import React, { useState, useEffect } from 'react';
import { useInventory } from '../../../../context/InventoryContext';
import { useToast } from '../../../../hooks/base/useToast';
import { useAuth } from '../../../../features/auth/context/AuthContext';
import { Toast } from '../../../common/Toast';
import { Modal } from '../../../common/modal/Modal';
import { DataTable, Column } from '../../../common/DataTable';
import { FilterSection, FilterField } from '../../../common/FilterSection';
import { FormCard, FormField } from '../../../common/FormCard';
import { ActivityLog } from '../../../common/ActivityLog';
import { CateringItem } from '../../../../features/types/inventory';
import { cateringItemApi } from '../../../../services/api/cateringApi';
import { historialApi } from '../../../../services/api/historialApi';

const cateringFiltersConfig: FilterField[] = [
    { id: 'nombre', label: 'Buscar por nombre', type: 'text', placeholder: 'Ej: Harina, Batidora...' },
    {
        id: 'tipo', label: 'Tipo', type: 'select', options: [
            { value: '', label: 'Todos' },
            { value: 'materia prima', label: 'Materia Prima' },
            { value: 'utensilio', label: 'Utensilio' }
        ]
    },
    { id: 'stockMin', label: 'Stock mínimo', type: 'number', placeholder: '0' }
];

const cateringFormFields: FormField[] = [
    { id: 'nombre', label: 'Nombre', type: 'text', placeholder: 'Ej: Harina orgánica', required: true },
    { id: 'stock', label: 'Stock inicial', type: 'text', placeholder: '0', required: true },
    {
        id: 'tipo', label: 'Tipo', type: 'select', options: [
            { value: 'materia prima', label: 'Materia Prima' },
            { value: 'utensilio', label: 'Utensilio' }
        ]
    }
];

const filtersToRecord = (filters: { nombre: string; tipo: string; stockMin: string }): Record<string, string> => ({
    nombre: filters.nombre,
    tipo: filters.tipo,
    stockMin: filters.stockMin
});

const recordToFilters = (record: Record<string, string>): { nombre: string; tipo: string; stockMin: string } => ({
    nombre: record.nombre || '',
    tipo: record.tipo || '',
    stockMin: record.stockMin || ''
});

export const CateringSection: React.FC = () => {
    const {
        cateringItems,
        setCateringItems,
        cateringFilters,
        setCateringFilters,
        addActivity,
        addToHistory,
        activityLogs
    } = useInventory();
    const { user } = useAuth();
    const { toasts, showToast, removeToast } = useToast();

    const [formValues, setFormValues] = useState({ nombre: '', stock: '0', tipo: 'materia prima' });
    const [modalOpen, setModalOpen] = useState(false);
    const [modalContent, setModalContent] = useState<{ title: string; icon: string; children: React.ReactNode; footer?: React.ReactNode } | null>(null);
    const [filteredData, setFilteredData] = useState<CateringItem[]>(cateringItems);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [filterValues, setFilterValues] = useState<Record<string, string>>(filtersToRecord(cateringFilters));

    useEffect(() => {
        setFilterValues(filtersToRecord(cateringFilters));
    }, [cateringFilters]);

    useEffect(() => {
        const filtered = cateringItems.filter(item => {
            const matchNombre = !filterValues.nombre ||
                item.nombre.toLowerCase().includes(filterValues.nombre.toLowerCase());
            const matchTipo = !filterValues.tipo || item.tipo === filterValues.tipo;
            const matchStockMin = !filterValues.stockMin ||
                item.stock >= parseInt(filterValues.stockMin);
            return matchNombre && matchTipo && matchStockMin;
        });
        setFilteredData(filtered);
    }, [cateringItems, filterValues]);

    const handleFilterChange = (id: string, value: string) => {
        const newFilters = { ...filterValues, [id]: value };
        setFilterValues(newFilters);
        setCateringFilters(recordToFilters(newFilters));
    };

    const handleClearFilters = () => {
        setFilterValues({ nombre: '', tipo: '', stockMin: '' });
        setCateringFilters({ nombre: '', tipo: '', stockMin: '' });
        showToast('Filtros de insumos limpiados', 'info', 'Filtros reseteados');
    };

    const columns: Column<CateringItem>[] = [
        { key: 'nombre', header: 'Nombre', render: (item) => <strong>{item.nombre}</strong> },
        { key: 'stock', header: 'Stock' },
        { key: 'tipo', header: 'Tipo', render: (item) => <span className="dc-badge">{item.tipo}</span> },
        { key: 'registradoPor', header: 'Registrado por' },
        { key: 'ultimaEdicion', header: 'Última edición' }
    ];

    // --- CREAR ---
    const handleAddItem = async () => {
        if (!formValues.nombre) {
            showToast('Nombre requerido', 'warning', 'Campos incompletos');
            return;
        }

        const userId = user?.id;
        if (!userId) {
            showToast('No se pudo identificar al usuario', 'error', 'Error de autenticación');
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                nombre: formValues.nombre,
                stock: parseInt(formValues.stock) || 0,
                tipo: formValues.tipo as 'materia prima' | 'utensilio',
                usuario_id: userId
            };

            const newItem = await cateringItemApi.create(payload);
            setCateringItems([newItem, ...cateringItems]);

            await addActivity('INSERT', 'catering', `Nuevo ${formValues.tipo}: "${formValues.nombre}"`);
            await addToHistory(newItem, formValues.nombre, 'CREACIÓN', `Creado con stock ${formValues.stock}`);

            showToast(`Insumo "${formValues.nombre}" creado exitosamente`, 'success', 'Insumo registrado');
            setFormValues({ nombre: '', stock: '0', tipo: 'materia prima' });
        } catch (error) {
            console.error('[CateringSection] Error al crear insumo:', error);
            showToast('Error al crear el insumo', 'error', 'Error');
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- VER (con historial completo desde API) ---
    const handleView = async (item: CateringItem) => {
        try {
            // ✅ Cargar historial completo desde la API
            const historial = await historialApi.getByEntity('catering_items', item.id);
            const itemConHistorial = { ...item, historial };

            const campos = [
                { label: 'NOMBRE', value: itemConHistorial.nombre },
                { label: 'STOCK', value: `${itemConHistorial.stock} unidades` },
                { label: 'TIPO', value: itemConHistorial.tipo },
                { label: 'REGISTRADO POR', value: itemConHistorial.registradoPor },
                { label: 'ÚLTIMA EDICIÓN', value: itemConHistorial.ultimaEdicion }
            ];

            setModalContent({
                title: `Detalle de ${itemConHistorial.nombre}`,
                icon: 'fa-eye',
                children: (
                    <>
                        <div className="dc-info-card">
                            <h4><i className="fas fa-info-circle"></i> Información del Insumo</h4>
                            <div className="dc-info-grid">
                                {campos.map(campo => (
                                    <div key={campo.label} className="dc-info-item">
                                        <span className="dc-info-label">{campo.label}</span>
                                        <span className="dc-info-value">{campo.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="dc-history-card">
                            <h4><i className="fas fa-history"></i> Historial de Cambios</h4>
                            <div className="dc-history-log">
                                {itemConHistorial.historial && itemConHistorial.historial.length > 0 ? (
                                    itemConHistorial.historial.map((h, idx) => (
                                        <div key={idx} className="dc-history-entry">
                                            <div>
                                                <span className="dc-history-date">{h.fecha}</span>
                                                <span className="dc-history-user"><i className="fas fa-user-circle"></i> {h.usuario}</span>
                                            </div>
                                            <div className="dc-history-action">{h.accion}</div>
                                            <div className="dc-history-desc">{h.descripcion}</div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="dc-history-entry">Sin historial registrado</div>
                                )}
                            </div>
                        </div>
                    </>
                ),
                footer: <button className="dc-btn secondary" onClick={() => setModalOpen(false)}><i className="fas fa-times"></i> Cerrar</button>
            });
            setModalOpen(true);
        } catch (error) {
            console.error('[CateringSection] Error cargando historial:', error);
            showToast('Error al cargar el historial', 'error', 'Error');
        }
    };

    // --- EDITAR ---
    const handleEdit = (item: CateringItem) => {
        const oldStock = item.stock;

        const handleSave = async () => {
            const inc = parseInt((document.getElementById('incStock') as HTMLInputElement)?.value) || 0;
            if (inc < 0) {
                showToast('Valor inválido', 'error', 'Error');
                return;
            }
            const nuevoStock = item.stock + inc;

            setIsSubmitting(true);
            try {
                const updatedItem = await cateringItemApi.update(item.id, { stock: nuevoStock });

                setCateringItems(
                    cateringItems.map((i: CateringItem) =>
                        i.id === updatedItem.id ? updatedItem : i
                    )
                );

                const desc = `Stock: ${oldStock} → ${nuevoStock} (+${inc})`;
                await addToHistory(updatedItem, item.nombre, 'MODIFICACIÓN', desc);
                await addActivity('MODIFICAR', 'catering', `${item.nombre}: ${desc}`);

                showToast(`Stock actualizado a ${nuevoStock} unidades`, 'success', 'Stock actualizado');
                setModalOpen(false);
            } catch (error) {
                console.error('[CateringSection] Error al actualizar stock:', error);
                showToast('Error al actualizar el stock', 'error', 'Error');
            } finally {
                setIsSubmitting(false);
            }
        };

        setModalContent({
            title: `Editar ${item.nombre}`,
            icon: 'fa-edit',
            children: (
                <>
                    <div className="stock-info" style={{ background: '#feeef2', padding: '0.8rem', borderRadius: '1rem', marginBottom: '1rem' }}>
                        📦 Stock actual: {item.stock} unidades
                    </div>
                    <div className="dc-modal-field">
                        <label><i className="fas fa-plus-circle"></i> Agregar stock (cantidad)</label>
                        <input type="number" id="incStock" defaultValue="0" min="0" />
                    </div>
                </>
            ),
            footer: (
                <>
                    <button className="dc-btn success" onClick={handleSave} disabled={isSubmitting}>
                        {isSubmitting ? 'Guardando...' : <><i className="fas fa-save"></i> Guardar Cambios</>}
                    </button>
                    <button className="dc-btn secondary" onClick={() => setModalOpen(false)}>
                        <i className="fas fa-times"></i> Cancelar
                    </button>
                </>
            )
        });
        setModalOpen(true);
    };

    // --- ELIMINAR ---
    const handleDelete = (item: CateringItem) => {
        const handleConfirm = async () => {
            setIsSubmitting(true);
            try {
                await cateringItemApi.delete(item.id);
                setCateringItems(cateringItems.filter((i: CateringItem) => i.id !== item.id));
                await addActivity('ELIMINAR', 'catering', `Eliminado "${item.nombre}"`);
                showToast(`"${item.nombre}" ha sido eliminado correctamente`, 'success', 'Eliminado');
                setModalOpen(false);
            } catch (error) {
                console.error('[CateringSection] Error al eliminar insumo:', error);
                showToast('Error al eliminar el insumo', 'error', 'Error');
            } finally {
                setIsSubmitting(false);
            }
        };

        setModalContent({
            title: `Eliminar ${item.nombre}`,
            icon: 'fa-trash-alt',
            children: (
                <>
                    <div className="dc-warning-box">
                        <i className="fas fa-exclamation-triangle"></i>
                        <p><strong>¡Atención!</strong> Estás a punto de eliminar "{item.nombre}"</p>
                    </div>
                    <p>Esta acción es <strong>irreversible</strong>. Se perderán todos los datos asociados a este registro.</p>
                    <p>¿Confirmas que deseas proceder con la eliminación?</p>
                </>
            ),
            footer: (
                <>
                    <button className="dc-btn danger" onClick={handleConfirm} disabled={isSubmitting}>
                        {isSubmitting ? 'Eliminando...' : <><i className="fas fa-trash"></i> Sí, Eliminar</>}
                    </button>
                    <button className="dc-btn secondary" onClick={() => setModalOpen(false)}>
                        <i className="fas fa-ban"></i> Cancelar
                    </button>
                </>
            )
        });
        setModalOpen(true);
    };

    const cateringActivityLogs = activityLogs.filter(log => log.modulo === 'catering').slice(0, 6);

    return (
        <div data-tab="catering">
            <div>
                <FormCard
                    title="Nuevo insumo / utensilio"
                    fields={cateringFormFields}
                    values={formValues}
                    onChange={(id, value) => setFormValues(prev => ({ ...prev, [id]: value }))}
                    onSubmit={handleAddItem}
                    submitText={isSubmitting ? 'Registrando...' : 'Registrar'}
                />

                <FilterSection
                    title="Filtrar insumos"
                    filters={cateringFiltersConfig}
                    values={filterValues}
                    onChange={handleFilterChange}
                    onClear={handleClearFilters}
                />

                <div className="dc-results-count">
                    <i className="fas fa-list-ul"></i> Mostrando {filteredData.length} de {cateringItems.length} insumos
                </div>

                <DataTable
                    columns={columns}
                    data={filteredData}
                    emptyMessage="📭 No se encontraron insumos"
                    actions={(item) => (
                        <>
                            <i className="fas fa-eye" onClick={() => handleView(item)} title="Ver detalle"></i>
                            <i className="fas fa-edit" onClick={() => handleEdit(item)} title="Editar stock"></i>
                            <i className="fas fa-trash-alt" onClick={() => handleDelete(item)} title="Eliminar"></i>
                        </>
                    )}
                />

                <ActivityLog logs={cateringActivityLogs} title="Actividad reciente · Catering" />

                <Modal
                    isOpen={modalOpen}
                    onClose={() => setModalOpen(false)}
                    title={modalContent?.title || ''}
                    icon={modalContent?.icon}
                    footer={modalContent?.footer}
                >
                    {modalContent?.children}
                </Modal>
            </div>

            <div className="dc-toast-container">
                {toasts.map(toast => (
                    <Toast key={toast.id} toast={toast} onClose={removeToast} />
                ))}
            </div>
        </div>
    );
};