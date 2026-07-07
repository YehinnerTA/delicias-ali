import React, { useState, useEffect } from 'react';
import { useInventory } from '../../../../context/InventoryContext';
import { useToast } from '../../../../hooks/base/useToast';
import { useAuth } from '../../../../features/auth/context/AuthContext';
import { useCompany } from '../../../../features/company/context/CompanyContext';
import { Toast } from '../../../common/Toast';
import { Modal } from '../../../common/modal/Modal';
import { DataTable, Column } from '../../../common/DataTable';
import { FilterSection, FilterField } from '../../../common/FilterSection';
import { FormCard, FormField } from '../../../common/FormCard';
import { ActivityLog } from '../../../common/ActivityLog';
import { Postre } from '../../../../features/types/inventory';
import { postreApi } from '../../../../services/api/postreApi';
import { loteApi } from '../../../../services/api/loteApi';
import { historialApi } from '../../../../services/api/historialApi';

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
    { id: 'precio', label: 'Precio unitario', type: 'text', placeholder: '0.00', required: true },
    { id: 'stock', label: 'Stock (unidades)', type: 'text', placeholder: '0', required: true },
    { id: 'diasVenc', label: 'Días hasta vencimiento', type: 'text', placeholder: 'Ej: 7', required: true }
];

const filtersToRecord = (filters: { nombre: string; estado: string }): Record<string, string> => ({
    nombre: filters.nombre,
    estado: filters.estado
});

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
    const { user } = useAuth();
    const { getSelectedCompanyId } = useCompany(); // ✅ Cambio aquí
    const { toasts, showToast, removeToast } = useToast();

    const [formValues, setFormValues] = useState({ nombre: '', precio: '0', stock: '0', diasVenc: '7' });
    const [modalOpen, setModalOpen] = useState(false);
    const [modalContent, setModalContent] = useState<{ title: string; icon: string; children: React.ReactNode; footer?: React.ReactNode } | null>(null);
    const [filteredData, setFilteredData] = useState<Postre[]>(postresItems);
    const [filterValues, setFilterValues] = useState<Record<string, string>>(filtersToRecord(postreFilters));
    const [isSubmitting, setIsSubmitting] = useState(false);

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
        { key: 'precio', header: 'Precio', render: (item) => `$${item.precio.toFixed(2)}` },
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
                                    {l.fechaVencimiento} - {estado.texto}
                                </span>
                                · {l.stock} und ·
                                <span className="dc-badge">{l.diasDuracion} días</span>
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
        }
    ];

    const handleAddPostre = async () => {
        if (!formValues.nombre || !formValues.diasVenc || parseInt(formValues.diasVenc) <= 0 ||
            parseInt(formValues.stock) <= 0 || parseFloat(formValues.precio) <= 0) {
            showToast("Complete todos los campos del lote inicial", "warning", "Campos incompletos");
            return;
        }

        const userId = user?.id;
        const empresaId = getSelectedCompanyId();
        if (!userId || !empresaId) {
            showToast('No se pudo identificar al usuario o empresa', 'error', 'Error de autenticación');
            return;
        }

        setIsSubmitting(true);
        try {
            const fechaVencimiento = calcularFechaVencimiento(parseInt(formValues.diasVenc));
            const nuevoLote = {
                stock: parseInt(formValues.stock),
                fecha_vencimiento: fechaVencimiento,
                dias_duracion: parseInt(formValues.diasVenc),
                fecha_registro: new Date().toISOString().split('T')[0],
            };

            const nuevoPostre = await postreApi.create({
                nombre: formValues.nombre,
                precio: parseFloat(formValues.precio),
                lotes: [nuevoLote],
                usuario_id: userId,
                id_empresa: empresaId
            });

            const todosLosPostres = await postreApi.getAll(empresaId);
            setPostresItems(todosLosPostres);

            await addActivity('INSERT', 'tienda', `Nuevo postre "${formValues.nombre}" con lote (${formValues.stock} und, ${formValues.diasVenc} días de duración)`);
            await addToHistory(nuevoPostre, formValues.nombre, 'CREACIÓN', `Postre creado con lote inicial de ${formValues.stock} und`);

            showToast(`Postre "${formValues.nombre}" creado exitosamente`, "success", "Postre registrado");
            setFormValues({ nombre: '', precio: '0', stock: '0', diasVenc: '7' });
        } catch (error) {
            console.error('[TiendaSection] Error al crear postre:', error);
            showToast('Error al crear el postre', 'error', 'Error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleView = async (postre: Postre) => {
        try {
            const historialPostre = await historialApi.getByEntity('postres', postre.id);

            const historialesLotes = await Promise.all(
                postre.lotes.map(async (lote) => {
                    const hist = await historialApi.getByEntity('lotes', lote.id);
                    return hist.map((entry: any) => ({
                        ...entry,
                        _loteId: lote.id,
                        _loteInfo: `Lote ${lote.id} (vence ${lote.fechaVencimiento})`
                    }));
                })
            );

            const historialCombinado = [
                ...historialPostre.map((h: any) => ({ ...h, _tipo: 'Postre' })),
                ...historialesLotes.flat().map((h: any) => ({ ...h, _tipo: 'Lote' }))
            ];

            historialCombinado.sort((a, b) => {
                return new Date(b.fecha).getTime() - new Date(a.fecha).getTime();
            });

            const postreConHistorial = {
                ...postre,
                historial: historialCombinado
            };

            const stockTotal = postreConHistorial.lotes.reduce((s, l) => s + l.stock, 0);

            setModalContent({
                title: `Detalle de ${postreConHistorial.nombre}`,
                icon: 'fa-eye',
                children: (
                    <>
                        <div className="dc-info-card">
                            <h4><i className="fas fa-info-circle"></i> Información del Postre</h4>
                            <div className="dc-info-grid">
                                <div className="dc-info-item">
                                    <span className="dc-info-label">NOMBRE</span>
                                    <span className="dc-info-value">{postreConHistorial.nombre}</span>
                                </div>
                                <div className="dc-info-item">
                                    <span className="dc-info-label">PRECIO</span>
                                    <span className="dc-info-value">${postreConHistorial.precio.toFixed(2)}</span>
                                </div>
                                <div className="dc-info-item">
                                    <span className="dc-info-label">CANTIDAD DE LOTES</span>
                                    <span className="dc-info-value">{postreConHistorial.lotes.length}</span>
                                </div>
                                <div className="dc-info-item">
                                    <span className="dc-info-label">STOCK TOTAL</span>
                                    <span className="dc-info-value">{stockTotal} unidades</span>
                                </div>
                            </div>
                        </div>

                        <div className="dc-info-card">
                            <h4><i className="fas fa-boxes"></i> Detalle de Lotes</h4>
                            {postreConHistorial.lotes.map((l, idx) => {
                                const diasRestantes = getDiasRestantes(l.fechaVencimiento);
                                const estado = diasRestantes < 0 ? "VENCIDO" : (diasRestantes <= 2 ? "PRÓXIMO" : "Vigente");
                                return (
                                    <div key={idx} className="batch-group" style={{ border: '1px solid #f0d6db', borderRadius: '1rem', marginBottom: '1rem', padding: '1rem', background: '#fffbfc' }}>
                                        <strong>Lote {idx + 1}</strong> | Vence: {l.fechaVencimiento}
                                        <span className={`dc-badge ${diasRestantes < 0 ? 'badge-expired' : (diasRestantes <= 2 ? 'badge-near-expiry' : '')}`}>
                                            {estado} ({Math.abs(diasRestantes)} días {diasRestantes < 0 ? 'vencidos' : 'restantes'})
                                        </span><br />
                                        ⏱️ Duración original: {l.diasDuracion} días<br />
                                        📦 Stock: {l.stock}<br />
                                        📅 Registro: {l.fechaRegistro}
                                    </div>
                                );
                            })}
                        </div>

                        <div className="dc-history-card">
                            <h4><i className="fas fa-history"></i> Historial de Cambios</h4>
                            <div className="dc-history-log">
                                {postreConHistorial.historial && postreConHistorial.historial.length > 0 ? (
                                    postreConHistorial.historial.map((h, idx) => (
                                        <div key={idx} className="dc-history-entry">
                                            <div>
                                                <span className="dc-history-date">{h.fecha}</span>
                                                <span className="dc-history-user"><i className="fas fa-user-circle"></i> {h.usuario}</span>
                                                <span className="dc-badge" style={{ marginLeft: '0.5rem', fontSize: '0.6rem' }}>
                                                    {h._tipo}
                                                </span>
                                                {h._tipo === 'Lote' && h._loteInfo && (
                                                    <span style={{ marginLeft: '0.5rem', fontSize: '0.65rem', color: '#666' }}>
                                                        ({h._loteInfo})
                                                    </span>
                                                )}
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
            console.error('[TiendaSection] Error cargando historial:', error);
            showToast('Error al cargar el historial', 'error', 'Error');
        }
    };

    const handleAddLote = (postre: Postre) => {
        const handleSave = async () => {
            const stockN = parseInt((document.getElementById('newLoteStock') as HTMLInputElement)?.value);
            const diasN = parseInt((document.getElementById('newLoteDias') as HTMLInputElement)?.value);

            if (!stockN || stockN <= 0 || !diasN || diasN <= 0) {
                showToast("Complete campos válidos (stock > 0, días > 0)", "error", "Error");
                return;
            }

            const userId = user?.id;
            const empresaId = getSelectedCompanyId();
            if (!userId || !empresaId) {
                showToast('No se pudo identificar al usuario o empresa', 'error', 'Error de autenticación');
                return;
            }

            setIsSubmitting(true);
            try {
                const fechaVencimiento = calcularFechaVencimiento(diasN);
                const nuevoLote = await loteApi.create({
                    postre_id: postre.id,
                    stock: stockN,
                    fechaVencimiento: fechaVencimiento,
                    diasDuracion: diasN,
                    fechaRegistro: new Date().toISOString().split('T')[0],
                    usuario_id: userId,
                    id_empresa: empresaId
                });

                const updatedPostres = postresItems.map(p =>
                    p.id === postre.id ? { ...p, lotes: [...p.lotes, nuevoLote] } : p
                );
                setPostresItems(updatedPostres);

                await addActivity('MODIFICAR', 'tienda', `Postre "${postre.nombre}": nuevo lote +${stockN} und, ${diasN} días de duración`);
                await addToHistory(nuevoLote, postre.nombre, 'CREACIÓN', `Lote agregado: +${stockN} und`);

                showToast(`Nuevo lote agregado a "${postre.nombre}"`, "success", "Lote creado");
                setModalOpen(false);
            } catch (error) {
                console.error('[TiendaSection] Error al agregar lote:', error);
                showToast('Error al agregar el lote', 'error', 'Error');
            } finally {
                setIsSubmitting(false);
            }
        };

        setModalContent({
            title: `Agregar lote - ${postre.nombre}`,
            icon: 'fa-plus-circle',
            children: (
                <>
                    <div className="stock-info" style={{ background: '#feeef2', padding: '0.8rem', borderRadius: '1rem', marginBottom: '1rem' }}>
                        <strong>Nuevo lote para {postre.nombre}</strong><br />
                        Los valores actuales se mantienen. Este nuevo lote se sumará al inventario.
                    </div>
                    <div className="dc-modal-field">
                        <label><i className="fas fa-boxes"></i> Stock a agregar (nuevo lote)</label>
                        <input type="number" id="newLoteStock" min="1" required />
                    </div>
                    <div className="dc-modal-field">
                        <label><i className="fas fa-calendar-day"></i> Días hasta vencimiento (nuevo lote)</label>
                        <input type="number" id="newLoteDias" min="1" required placeholder="Ej: 7" />
                    </div>
                </>
            ),
            footer: (
                <>
                    <button className="dc-btn success" onClick={handleSave} disabled={isSubmitting}>
                        {isSubmitting ? 'Creando...' : <><i className="fas fa-save"></i> Crear lote</>}
                    </button>
                    <button className="dc-btn secondary" onClick={() => setModalOpen(false)}><i className="fas fa-times"></i> Cancelar</button>
                </>
            )
        });
        setModalOpen(true);
    };

    const handleDelete = (postre: Postre) => {
        const handleConfirm = async () => {
            const empresaId = getSelectedCompanyId();
            if (!empresaId) {
                showToast('No se pudo identificar la empresa', 'error', 'Error de autenticación');
                return;
            }

            setIsSubmitting(true);
            try {
                await postreApi.delete(postre.id, empresaId);
                setPostresItems(postresItems.filter(p => p.id !== postre.id));
                await addActivity('ELIMINAR', 'tienda', `Eliminado "${postre.nombre}"`);
                showToast(`"${postre.nombre}" ha sido eliminado correctamente`, "success", "Eliminado");
                setModalOpen(false);
            } catch (error) {
                console.error('[TiendaSection] Error al eliminar postre:', error);
                showToast('Error al eliminar el postre', 'error', 'Error');
            } finally {
                setIsSubmitting(false);
            }
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
                    <button className="dc-btn danger" onClick={handleConfirm} disabled={isSubmitting}>
                        {isSubmitting ? 'Eliminando...' : <><i className="fas fa-trash"></i> Sí, Eliminar</>}
                    </button>
                    <button className="dc-btn secondary" onClick={() => setModalOpen(false)}><i className="fas fa-ban"></i> Cancelar</button>
                </>
            )
        });
        setModalOpen(true);
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
                    submitText={isSubmitting ? 'Creando...' : 'Crear lote inicial'}
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