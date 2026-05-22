import React, { useState, useEffect } from 'react';
import { useInventory } from '../../../../context/InventoryContext';
import { useToast } from '../../../../hooks/base/useToast';
import { Toast } from '../../../common/Toast';
import { Modal } from '../../../common/Modal';
import { DataTable, Column } from '../../../common/DataTable';
import { FilterSection, FilterField } from '../../../common/FilterSection';
import { FormCard, FormField } from '../../../common/FormCard';
import { ActivityLog } from '../../../common/ActivityLog';
import { CateringItem } from '../../../../features/types/inventory';

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

// Convertir CateringFilters a Record<string, string>
const filtersToRecord = (filters: { nombre: string; tipo: string; stockMin: string }): Record<string, string> => ({
    nombre: filters.nombre,
    tipo: filters.tipo,
    stockMin: filters.stockMin
});

// Convertir Record<string, string> a CateringFilters
const recordToFilters = (record: Record<string, string>): { nombre: string; tipo: string; stockMin: string } => ({
    nombre: record.nombre || '',
    tipo: record.tipo || '',
    stockMin: record.stockMin || ''
});

export const CateringSection: React.FC = () => {
    const {
        cateringItems, setCateringItems,
        cateringFilters, setCateringFilters,
        addActivity, addToHistory,
        activityLogs
    } = useInventory();
    const { toasts, showToast, removeToast } = useToast();

    const [formValues, setFormValues] = useState({ nombre: '', stock: '0', tipo: 'materia prima' });
    const [modalOpen, setModalOpen] = useState(false);
    const [modalContent, setModalContent] = useState<{ title: string; icon: string; children: React.ReactNode; footer?: React.ReactNode } | null>(null);
    const [filteredData, setFilteredData] = useState<CateringItem[]>(cateringItems);

    // Estado para los valores del filtro en formato Record
    const [filterValues, setFilterValues] = useState<Record<string, string>>(filtersToRecord(cateringFilters));

    // Sincronizar filtros cuando cambian externamente
    useEffect(() => {
        setFilterValues(filtersToRecord(cateringFilters));
    }, [cateringFilters]);

    useEffect(() => {
        let filtered = cateringItems.filter(item => {
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
        showToast("Filtros de insumos limpiados", "info", "Filtros reseteados");
    };

    const columns: Column<CateringItem>[] = [
        { key: 'nombre', header: 'Nombre', render: (item) => <strong>{item.nombre}</strong> },
        { key: 'stock', header: 'Stock' },
        { key: 'tipo', header: 'Tipo', render: (item) => <span className="dc-badge">{item.tipo}</span> },
        { key: 'registradoPor', header: 'Registrado por' },
        { key: 'ultimaEdicion', header: 'Última edición' }
    ];

    const handleAddItem = () => {
        if (!formValues.nombre) {
            showToast('Nombre requerido', 'warning', 'Campos incompletos');
            return;
        }

        const now = new Date().toLocaleString();
        const newItem: CateringItem = {
            id: Date.now(),
            nombre: formValues.nombre,
            stock: parseInt(formValues.stock) || 0,
            tipo: formValues.tipo as 'materia prima' | 'utensilio',
            registradoPor: "Chef Ana (ana@delicias.com)",
            ultimaEdicion: now,
            historial: [{ fecha: now, usuario: "Chef Ana (ana@delicias.com)", accion: "CREACIÓN", descripcion: `Creado con stock ${formValues.stock}` }]
        };

        setCateringItems([...cateringItems, newItem]);
        addActivity("INSERT", "catering", `Nuevo ${formValues.tipo}: "${formValues.nombre}"`);
        showToast(`Insumo "${formValues.nombre}" creado exitosamente`, "success", "Insumo registrado");
        setFormValues({ nombre: '', stock: '0', tipo: 'materia prima' });
    };

    const handleView = (item: CateringItem) => {
        const campos = [
            { label: 'NOMBRE', value: item.nombre },
            { label: 'STOCK', value: `${item.stock} unidades` },
            { label: 'TIPO', value: item.tipo },
            { label: 'REGISTRADO POR', value: item.registradoPor },
            { label: 'ÚLTIMA EDICIÓN', value: item.ultimaEdicion }
        ];

        setModalContent({
            title: `Detalle de ${item.nombre}`,
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
                            {(item.historial || []).map((h, idx) => (
                                <div key={idx} className="dc-history-entry">
                                    <div>
                                        <span className="dc-history-date">{h.fecha}</span>
                                        <span className="dc-history-user"><i className="fas fa-user-circle"></i> {h.usuario}</span>
                                    </div>
                                    <div className="dc-history-action">{h.accion}</div>
                                    <div className="dc-history-desc">{h.descripcion}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            ),
            footer: <button className="dc-btn secondary" onClick={() => setModalOpen(false)}><i className="fas fa-times"></i> Cerrar</button>
        });
        setModalOpen(true);
    };

    const handleEdit = (item: CateringItem) => {
        const oldStock = item.stock;
        const handleSave = () => {
            const inc = parseInt((document.getElementById('incStock') as HTMLInputElement)?.value) || 0;
            if (inc < 0) {
                showToast("Valor inválido", "error", "Error");
                return;
            }
            const nuevoStock = item.stock + inc;
            const desc = `Stock: ${oldStock} → ${nuevoStock} (+${inc})`;
            item.stock = nuevoStock;
            item.ultimaEdicion = new Date().toLocaleString();
            addToHistory(item, item.nombre, "MODIFICACIÓN", desc);
            addActivity("MODIFICAR", "catering", `${item.nombre}: ${desc}`);
            setCateringItems([...cateringItems]);
            showToast(`Stock actualizado a ${nuevoStock} unidades`, "success", "Stock actualizado");
            setModalOpen(false);
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
                    <button className="dc-btn success" onClick={handleSave}><i className="fas fa-save"></i> Guardar Cambios</button>
                    <button className="dc-btn secondary" onClick={() => setModalOpen(false)}><i className="fas fa-times"></i> Cancelar</button>
                </>
            )
        });
        setModalOpen(true);
    };

    const handleDelete = (item: CateringItem) => {
        const handleConfirm = () => {
            setCateringItems(cateringItems.filter(i => i.id !== item.id));
            addActivity("ELIMINAR", "catering", `Eliminado "${item.nombre}"`);
            showToast(`"${item.nombre}" ha sido eliminado correctamente`, "success", "Eliminado");
            setModalOpen(false);
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
                    <button className="dc-btn danger" onClick={handleConfirm}><i className="fas fa-trash"></i> Sí, Eliminar</button>
                    <button className="dc-btn secondary" onClick={() => setModalOpen(false)}><i className="fas fa-ban"></i> Cancelar</button>
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