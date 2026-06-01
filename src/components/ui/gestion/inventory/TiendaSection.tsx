import React, { useState, useEffect } from 'react';
import { useInventory } from '../../../../context/InventoryContext';
import { useToast } from '../../../../hooks/base/useToast';
import { Toast } from '../../../common/Toast';
import { Modal } from '../../../common/modal/Modal';
import { DataTable, Column } from '../../../common/DataTable';
import { FilterSection, FilterField } from '../../../common/FilterSection';
import { FormCard, FormField } from '../../../common/FormCard';
import { ActivityLog } from '../../../common/ActivityLog';
import { Postre, Lote } from '../../../../features/types/inventory';

const postreFiltersConfig: FilterField[] = [
    { id: 'nombre', label: 'Buscar por nombre', type: 'text', placeholder: 'Ej: Cheesecake, Tarta...' },
    {
        id: 'estado', label: 'Estado vencimiento', type: 'select', options: [
            { value: '', label: 'Todos' },
            { value: 'vigente', label: 'Solo vigentes' },
            { value: 'vencido', label: 'Vencidos' },
            { value: 'proximo', label: 'Próximos a vencer (≤2 días)' }
        ]
    }
];

const postreFormFields: FormField[] = [
    { id: 'nombre', label: 'Nombre postre', type: 'text', placeholder: 'Ej: Tarta de fresa', required: true },
    { id: 'stock', label: 'Stock (unidades)', type: 'text', placeholder: '0', required: true },
    { id: 'precio', label: 'Precio unitario', type: 'text', placeholder: '0', required: true },
    { id: 'diasVenc', label: 'Días hasta vencimiento', type: 'text', placeholder: 'Ej: 7', required: true }
];

// Convertir PostreFilters a Record<string, string>
const filtersToRecord = (filters: { nombre: string; estado: string }): Record<string, string> => ({
    nombre: filters.nombre,
    estado: filters.estado
});

// Convertir Record<string, string> a PostreFilters
const recordToFilters = (record: Record<string, string>): { nombre: string; estado: string } => ({
    nombre: record.nombre || '',
    estado: record.estado || ''
});

export const PasteleriaSection: React.FC = () => {
    const {
        postresItems, setPostresItems,
        postreFilters, setPostreFilters,
        addActivity, addToHistory,
        calcularFechaVencimiento, getDiasRestantes,
        activityLogs
    } = useInventory();
    const { toasts, showToast, removeToast } = useToast();

    const [formValues, setFormValues] = useState({ nombre: '', stock: '0', precio: '0', diasVenc: '7' });
    const [modalOpen, setModalOpen] = useState(false);
    const [modalContent, setModalContent] = useState<{ title: string; icon: string; children: React.ReactNode; footer?: React.ReactNode } | null>(null);
    const [filteredData, setFilteredData] = useState<Postre[]>(postresItems);

    // Estado para los valores del filtro en formato Record
    const [filterValues, setFilterValues] = useState<Record<string, string>>(filtersToRecord(postreFilters));

    // Sincronizar filtros cuando cambian externamente
    useEffect(() => {
        setFilterValues(filtersToRecord(postreFilters));
    }, [postreFilters]);

    useEffect(() => {
        let filtered = postresItems.filter(postre => {
            const matchNombre = !filterValues.nombre ||
                postre.nombre.toLowerCase().includes(filterValues.nombre.toLowerCase());

            if (!filterValues.estado) return matchNombre;

            const hoy = new Date();
            if (filterValues.estado === 'vigente') {
                return matchNombre && postre.lotes.some(l => new Date(l.fechaVencimiento) >= hoy);
            }
            if (filterValues.estado === 'vencido') {
                return matchNombre && postre.lotes.some(l => new Date(l.fechaVencimiento) < hoy);
            }
            if (filterValues.estado === 'proximo') {
                const dosDias = new Date();
                dosDias.setDate(hoy.getDate() + 2);
                return matchNombre && postre.lotes.some(l => {
                    const venc = new Date(l.fechaVencimiento);
                    return venc >= hoy && venc <= dosDias;
                });
            }
            return matchNombre;
        });
        setFilteredData(filtered);
    }, [postresItems, filterValues]);

    const handleFilterChange = (id: string, value: string) => {
        const newFilters = { ...filterValues, [id]: value };
        setFilterValues(newFilters);
        setPostreFilters(recordToFilters(newFilters));
    };

    const handleClearFilters = () => {
        setFilterValues({ nombre: '', estado: '' });
        setPostreFilters({ nombre: '', estado: '' });
        showToast("Filtros de postres limpiados", "info", "Filtros reseteados");
    };

    const getEstadoLote = (fechaVencimiento: string): { className: string; texto: string } => {
        const diasRestantes = getDiasRestantes(fechaVencimiento);
        if (diasRestantes < 0) return { className: 'badge-expired', texto: 'VENCIDO' };
        if (diasRestantes <= 2) return { className: 'badge-near-expiry', texto: `¡PRÓXIMO! (${diasRestantes} días)` };
        return { className: '', texto: `Vigente (${diasRestantes} días)` };
    };

    const columns: Column<Postre>[] = [
        { key: 'nombre', header: 'Postre', render: (item) => <strong>{item.nombre}</strong> },
        {
            key: 'lotes',
            header: 'Lotes (stock por vencimiento)',
            render: (item) => (
                <>
                    {item.lotes.map((l, idx) => {
                        const estado = getEstadoLote(l.fechaVencimiento);
                        return (
                            <div key={idx} style={{ fontSize: '0.7rem', margin: '3px 0' }}>
                                <span className={`dc-badge ${estado.className}`}>
                                    📅 {l.fechaVencimiento} - {estado.texto}
                                </span>
                                · {l.stock} und · ${l.precio.toFixed(2)} ·
                                <span className="dc-badge">⏱️ {l.diasDuracion} días</span>
                            </div>
                        );
                    })}
                </>
            )
        },
        {
            key: 'stockTotal',
            header: 'Stock total',
            render: (item) => item.lotes.reduce((s, l) => s + l.stock, 0)
        },
        {
            key: 'precioProm',
            header: 'Precio promedio',
            render: (item) => {
                const stockTotal = item.lotes.reduce((s, l) => s + l.stock, 0);
                const precioProm = stockTotal > 0
                    ? item.lotes.reduce((s, l) => s + (l.precio * l.stock), 0) / stockTotal
                    : 0;
                return `$${precioProm.toFixed(2)}`;
            }
        }
    ];

    const handleAddPostre = () => {
        if (!formValues.nombre || !formValues.diasVenc || parseInt(formValues.diasVenc) <= 0 ||
            parseInt(formValues.stock) <= 0 || parseFloat(formValues.precio) <= 0) {
            showToast("Complete todos los campos del lote inicial", "warning", "Campos incompletos");
            return;
        }

        const fechaVencimiento = calcularFechaVencimiento(parseInt(formValues.diasVenc));
        const nuevoLote: Lote = {
            id: Date.now(),
            stock: parseInt(formValues.stock),
            precio: parseFloat(formValues.precio),
            fechaVencimiento,
            diasDuracion: parseInt(formValues.diasVenc),
            fechaRegistro: new Date().toLocaleDateString("es-ES"),
            registradoPor: "Chef Ana (ana@delicias.com)",
            ultimaEdicion: new Date().toLocaleString(),
            historial: [{
                fecha: new Date().toLocaleString(),
                usuario: "Chef Ana (ana@delicias.com)",
                accion: "CREACIÓN",
                descripcion: `Lote inicial: stock ${formValues.stock}, precio $${parseFloat(formValues.precio).toFixed(2)}, duración ${formValues.diasVenc} días (vence ${fechaVencimiento})`
            }]
        };

        const nuevoPostre: Postre = {
            id: Date.now(),
            nombre: formValues.nombre,
            lotes: [nuevoLote]
        };

        setPostresItems([...postresItems, nuevoPostre]);
        addActivity("INSERT", "tienda", `Nuevo postre "${formValues.nombre}" con lote (${formValues.stock} und, ${formValues.diasVenc} días de duración)`);
        showToast(`Postre "${formValues.nombre}" creado exitosamente`, "success", "Postre registrado");
        setFormValues({ nombre: '', stock: '0', precio: '0', diasVenc: '7' });
    };

    const handleView = (postre: Postre) => {
        const stockTotal = postre.lotes.reduce((s, l) => s + l.stock, 0);

        setModalContent({
            title: `Detalle de ${postre.nombre}`,
            icon: 'fa-eye',
            children: (
                <>
                    <div className="dc-info-card">
                        <h4><i className="fas fa-info-circle"></i> Información del Postre</h4>
                        <div className="dc-info-grid">
                            <div className="dc-info-item">
                                <span className="dc-info-label">NOMBRE</span>
                                <span className="dc-info-value">{postre.nombre}</span>
                            </div>
                            <div className="dc-info-item">
                                <span className="dc-info-label">CANTIDAD DE LOTES</span>
                                <span className="dc-info-value">{postre.lotes.length}</span>
                            </div>
                            <div className="dc-info-item">
                                <span className="dc-info-label">STOCK TOTAL</span>
                                <span className="dc-info-value">{stockTotal} unidades</span>
                            </div>
                        </div>
                    </div>
                    <div className="dc-info-card">
                        <h4><i className="fas fa-boxes"></i> Detalle de Lotes</h4>
                        {postre.lotes.map((l, idx) => {
                            const diasRestantes = getDiasRestantes(l.fechaVencimiento);
                            const estado = diasRestantes < 0 ? "VENCIDO" : (diasRestantes <= 2 ? "PRÓXIMO" : "Vigente");
                            return (
                                <div key={idx} className="batch-group" style={{ border: '1px solid #f0d6db', borderRadius: '1rem', marginBottom: '1rem', padding: '1rem', background: '#fffbfc' }}>
                                    <strong>Lote {idx + 1}</strong> | Vence: {l.fechaVencimiento}
                                    <span className={`dc-badge ${diasRestantes < 0 ? 'badge-expired' : (diasRestantes <= 2 ? 'badge-near-expiry' : '')}`}>
                                        {estado} ({Math.abs(diasRestantes)} días {diasRestantes < 0 ? 'vencidos' : 'restantes'})
                                    </span><br />
                                    ⏱️ Duración original: {l.diasDuracion} días<br />
                                    📦 Stock: {l.stock} | 💰 Precio: ${l.precio.toFixed(2)}<br />
                                    📅 Registro: {l.fechaRegistro}
                                </div>
                            );
                        })}
                    </div>
                </>
            ),
            footer: <button className="dc-btn secondary" onClick={() => setModalOpen(false)}><i className="fas fa-times"></i> Cerrar</button>
        });
        setModalOpen(true);
    };

    const handleAddLote = (postre: Postre) => {
        const handleSave = () => {
            const stockN = parseInt((document.getElementById('newLoteStock') as HTMLInputElement)?.value);
            const precioN = parseFloat((document.getElementById('newLotePrecio') as HTMLInputElement)?.value);
            const diasN = parseInt((document.getElementById('newLoteDias') as HTMLInputElement)?.value);

            if (!stockN || stockN <= 0 || !precioN || !diasN || diasN <= 0) {
                showToast("Complete campos válidos (stock > 0, precio > 0, días > 0)", "error", "Error");
                return;
            }

            const fechaVencimiento = calcularFechaVencimiento(diasN);
            const nuevoLote: Lote = {
                id: Date.now(),
                stock: stockN,
                precio: precioN,
                fechaVencimiento,
                diasDuracion: diasN,
                fechaRegistro: new Date().toLocaleDateString("es-ES"),
                registradoPor: "Chef Ana (ana@delicias.com)",
                ultimaEdicion: new Date().toLocaleString(),
                historial: [{
                    fecha: new Date().toLocaleString(),
                    usuario: "Chef Ana (ana@delicias.com)",
                    accion: "CREACIÓN",
                    descripcion: `Lote agregado: +${stockN} und, $${precioN.toFixed(2)}, duración ${diasN} días (vence ${fechaVencimiento})`
                }]
            };

            postre.lotes.push(nuevoLote);
            setPostresItems([...postresItems]);
            addActivity("MODIFICAR", "tienda", `Postre "${postre.nombre}": nuevo lote +${stockN} und, ${diasN} días de duración`);
            showToast(`Nuevo lote agregado a "${postre.nombre}"`, "success", "Lote creado");
            setModalOpen(false);
        };

        setModalContent({
            title: `Agregar lote - ${postre.nombre}`,
            icon: 'fa-plus-circle',
            children: (
                <>
                    <div className="stock-info" style={{ background: '#feeef2', padding: '0.8rem', borderRadius: '1rem', marginBottom: '1rem' }}>
                        <strong>➕ Nuevo lote para {postre.nombre}</strong><br />
                        Los valores actuales se mantienen. Este nuevo lote se sumará al inventario.
                    </div>
                    <div className="dc-modal-field">
                        <label><i className="fas fa-boxes"></i> Stock a agregar (nuevo lote)</label>
                        <input type="number" id="newLoteStock" min="1" required />
                    </div>
                    <div className="dc-modal-field">
                        <label><i className="fas fa-dollar-sign"></i> Precio unitario (nuevo lote)</label>
                        <input type="number" step="0.01" id="newLotePrecio" required />
                    </div>
                    <div className="dc-modal-field">
                        <label><i className="fas fa-calendar-day"></i> Días hasta vencimiento (nuevo lote)</label>
                        <input type="number" id="newLoteDias" min="1" required placeholder="Ej: 7" />
                    </div>
                </>
            ),
            footer: (
                <>
                    <button id="confirmLoteBtn" className="dc-btn success"><i className="fas fa-save"></i> Crear lote</button>
                    <button className="dc-btn secondary" onClick={() => setModalOpen(false)}><i className="fas fa-times"></i> Cancelar</button>
                </>
            )
        });
        setModalOpen(true);

        setTimeout(() => {
            const confirmBtn = document.getElementById('confirmLoteBtn');
            if (confirmBtn) {
                confirmBtn.onclick = handleSave;
            }
        }, 50);
    };

    const handleDelete = (postre: Postre) => {
        const handleConfirm = () => {
            setPostresItems(postresItems.filter(p => p.id !== postre.id));
            addActivity("ELIMINAR", "tienda", `Eliminado "${postre.nombre}"`);
            showToast(`"${postre.nombre}" ha sido eliminado correctamente`, "success", "Eliminado");
            setModalOpen(false);
        };

        setModalContent({
            title: `Eliminar ${postre.nombre}`,
            icon: 'fa-trash-alt',
            children: (
                <>
                    <div className="dc-warning-box">
                        <i className="fas fa-exclamation-triangle"></i>
                        <p><strong>¡Atención!</strong> Estás a punto de eliminar "{postre.nombre}"</p>
                    </div>
                    <p>Esta acción es <strong>irreversible</strong>. Se perderán todos los datos asociados a este registro.</p>
                    <p>¿Confirmas que deseas proceder con la eliminación?</p>
                </>
            ),
            footer: (
                <>
                    <button id="confirmDel" className="dc-btn danger"><i className="fas fa-trash"></i> Sí, Eliminar</button>
                    <button className="dc-btn secondary" onClick={() => setModalOpen(false)}><i className="fas fa-ban"></i> Cancelar</button>
                </>
            )
        });
        setModalOpen(true);

        setTimeout(() => {
            const delBtn = document.getElementById('confirmDel');
            if (delBtn) {
                delBtn.onclick = handleConfirm;
            }
        }, 50);
    };

    const tiendaActivityLogs = activityLogs.filter(log => log.modulo === 'tienda').slice(0, 6);

    return (
        <div data-tab="tienda">
            <div>
                <div className="info-note">
                    <i className="fas fa-info-circle"></i> La fecha de vencimiento se calcula automáticamente: hoy + días ingresados
                </div>

                <FormCard
                    title="Nuevo postre + primer lote"
                    fields={postreFormFields}
                    values={formValues}
                    onChange={(id, value) => setFormValues(prev => ({ ...prev, [id]: value }))}
                    onSubmit={handleAddPostre}
                    submitText="Crear lote inicial"
                />

                <FilterSection
                    title="Filtrar postres"
                    filters={postreFiltersConfig}
                    values={filterValues}
                    onChange={handleFilterChange}
                    onClear={handleClearFilters}
                />

                <div className="dc-results-count">
                    <i className="fas fa-list-ul"></i> Mostrando {filteredData.length} de {postresItems.length} postres
                </div>

                <DataTable
                    columns={columns}
                    data={filteredData}
                    emptyMessage="🍰 No se encontraron postres"
                    actions={(item) => (
                        <>
                            <i className="fas fa-eye" onClick={() => handleView(item)} title="Ver lotes"></i>
                            <i className="fas fa-edit" onClick={() => handleAddLote(item)} title="Agregar nuevo lote"></i>
                            <i className="fas fa-trash-alt" onClick={() => handleDelete(item)} title="Eliminar postre"></i>
                        </>
                    )}
                />

                <ActivityLog logs={tiendaActivityLogs} title="Actividad reciente · Postres" />

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