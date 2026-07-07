import React, { useState, useEffect } from 'react';
import { useGlobal } from '../../../../context/GlobalContext';
import { useToast } from '../../../../hooks/base/useToast';
import { Toast } from '../../../common/Toast';
import { Modal } from '../../../common/modal/Modal';
import { DataTable, Column } from '../../../common/DataTable';
import { FilterSection, FilterField } from '../../../common/FilterSection';
import { ActivityLog } from '../../../common/ActivityLog';
import { Empresa } from '../../../../features/types/person';
import { empresaApi } from '../../../../services/api/empresaApi';
import { historialApi } from '../../../../services/api/historialApi';
import { useAuth } from '../../../../features/auth/context/AuthContext';

const empresaFilters: FilterField[] = [
    { id: 'search', label: 'RUC o Nombre', type: 'text', placeholder: 'Buscar...' },
    {
        id: 'estado', label: 'Estado', type: 'select', options: [
            { value: '', label: 'Todos' },
            { value: 'true', label: 'Activas' },
            { value: 'false', label: 'Inactivas' }
        ]
    }
];

const empresaFormFields = [
    { id: 'ruc', label: 'RUC (11 dígitos)', type: 'text', placeholder: '20123456789', required: true },
    { id: 'nombre', label: 'Nombre / Razón Social', type: 'text', placeholder: 'Ej: Distribuciones del Valle S.A.C.', required: true }
];

export const EmpresasSection: React.FC = () => {
    const { empresas, setEmpresas, addActivity, addToHistory, activityLogs } = useGlobal();
    const { user } = useAuth();
    const { toasts, showToast, removeToast } = useToast();

    const [filterValues, setFilterValues] = useState({ search: '', estado: '' });
    const [formValues, setFormValues] = useState({ ruc: '', nombre: '' });
    const [modalOpen, setModalOpen] = useState(false);
    const [modalContent, setModalContent] = useState<{ title: string; icon: string; children: React.ReactNode; footer?: React.ReactNode } | null>(null);
    const [filteredData, setFilteredData] = useState<Empresa[]>(empresas);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    useEffect(() => {
        let filtered = empresas.filter(e => {
            const matchSearch = !filterValues.search ||
                e.ruc.includes(filterValues.search) ||
                e.empresa.toLowerCase().includes(filterValues.search.toLowerCase());
            const matchEstado = !filterValues.estado || String(e.estado) === filterValues.estado;
            return matchSearch && matchEstado;
        });
        setFilteredData(filtered);
    }, [empresas, filterValues]);

    const columns: Column<Empresa>[] = [
        { key: 'ruc', header: 'RUC' },
        { key: 'empresa', header: 'Empresa', render: (e) => <strong>{e.empresa}</strong> },
        {
            key: 'estado',
            header: 'Estado',
            render: (e) => (
                <span className={`dc-badge ${e.estado ? 'dc-badge-active' : 'dc-badge-inactive'}`}>
                    {e.estado ? 'ACTIVA' : 'INACTIVA'}
                </span>
            )
        }
    ];

    const openCreateModal = () => {
        setFormValues({ ruc: '', nombre: '' });
        setIsCreateModalOpen(true);
    };

    const handleAddEmpresa = async () => {
        if (!formValues.ruc || !formValues.nombre) {
            showToast('RUC y nombre son requeridos', 'warning', 'Campos incompletos');
            return;
        }
        if (empresas.some(e => e.ruc === formValues.ruc)) {
            showToast('Ya existe una empresa con este RUC', 'error', 'Error');
            return;
        }

        setIsSubmitting(true);
        try {
            const nueva = await empresaApi.create({
                ruc: formValues.ruc,
                empresa: formValues.nombre,
                estado: true,
                creado_por: user?.id || null
            });

            setEmpresas([nueva, ...empresas]);
            await addActivity("INSERT", "empresas", `Nueva empresa: ${formValues.nombre} (RUC:${formValues.ruc})`);
            await addToHistory(nueva, formValues.nombre, "CREACIÓN", `Empresa creada por ${user?.nombre_completo || 'Admin'}`);

            showToast(`Empresa "${formValues.nombre}" creada exitosamente`, "success", "Empresa registrada");

            setIsCreateModalOpen(false);
            setFormValues({ ruc: '', nombre: '' });
        } catch (error) {
            console.error('[EmpresasSection] Error al crear empresa:', error);
            showToast('Error al crear la empresa', 'error', 'Error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleView = async (empresa: Empresa) => {
        try {
            const historial = await historialApi.getByEntity('empresas', empresa.id_empresa);
            const empresaConHistorial = { ...empresa, historial };

            const campos = [
                { label: 'RUC', value: empresaConHistorial.ruc },
                { label: 'EMPRESA', value: empresaConHistorial.empresa },
                { label: 'ESTADO', value: empresaConHistorial.estado ? 'ACTIVO' : 'INACTIVO' }
            ];

            setModalContent({
                title: `Detalle de ${empresaConHistorial.empresa}`,
                icon: 'fa-eye',
                children: (
                    <>
                        <div className="dc-info-card">
                            <h4><i className="fas fa-info-circle"></i> Información General</h4>
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
                                {(empresaConHistorial.historial || []).length > 0 ? (
                                    empresaConHistorial.historial.map((h, idx) => (
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
            console.error('[EmpresasSection] Error cargando historial:', error);
            showToast('Error al cargar el historial', 'error', 'Error');
        }
    };

    const handleEdit = (empresa: Empresa) => {
        const handleSave = async () => {
            const newNombre = (document.getElementById('edit_nombre') as HTMLInputElement)?.value;
            const newEstado = (document.getElementById('edit_estado') as HTMLSelectElement)?.value === 'true';

            if (!newNombre) {
                showToast('El nombre es requerido', 'warning', 'Campos incompletos');
                return;
            }

            setIsSubmitting(true);
            try {
                const payload: Partial<Empresa> = {
                    ruc: empresa.ruc,
                    empresa: newNombre,
                    estado: newEstado
                };

                const actualizada = await empresaApi.update(empresa.id_empresa, payload);

                setEmpresas(prev => prev.map(e =>
                    e.id_empresa === actualizada.id_empresa ? actualizada : e
                ));

                await addActivity("MODIFICAR", "empresas", `Empresa actualizada: ${newNombre}`);

                const cambios = [];
                if (newNombre !== empresa.empresa) cambios.push(`Nombre: "${empresa.empresa}" → "${newNombre}"`);
                if (newEstado !== empresa.estado) cambios.push(`Estado: "${empresa.estado}" → "${newEstado}"`);
                if (cambios.length > 0) {
                    await addToHistory(actualizada, newNombre, "MODIFICACIÓN", cambios.join(', '));
                }

                showToast("Empresa actualizada correctamente", "success", "Actualizado");
                setModalOpen(false);
            } catch (error) {
                console.error('[EmpresasSection] Error al actualizar empresa:', error);
                showToast('Error al actualizar la empresa', 'error', 'Error');
            } finally {
                setIsSubmitting(false);
            }
        };

        setModalContent({
            title: `Editar ${empresa.empresa}`,
            icon: 'fa-edit',
            children: (
                <div className="dc-form-row">
                    <div className="dc-modal-field">
                        <label><i className="fas fa-edit"></i> EMPRESA</label>
                        <input type="text" id="edit_nombre" defaultValue={empresa.empresa} />
                    </div>
                    <div className="dc-modal-field">
                        <label><i className="fas fa-toggle-on"></i> Estado</label>
                        <select id="edit_estado" defaultValue={String(empresa.estado)}>
                            <option value="true">Activo</option>
                            <option value="false">Inactivo</option>
                        </select>
                    </div>
                </div>
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

    const handleDelete = (empresa: Empresa) => {
        const handleConfirm = async () => {
            setIsSubmitting(true);
            try {
                await empresaApi.delete(empresa.id_empresa);
                setEmpresas(prev => prev.filter(e => e.id_empresa !== empresa.id_empresa));
                await addActivity("ELIMINAR", "empresas", `Eliminado "${empresa.empresa}"`);
                showToast(`"${empresa.empresa}" ha sido eliminado correctamente`, "success", "Eliminado");
                setModalOpen(false);
            } catch (error) {
                console.error('[EmpresasSection] Error al eliminar empresa:', error);
                showToast('Error al eliminar la empresa', 'error', 'Error');
            } finally {
                setIsSubmitting(false);
            }
        };

        setModalContent({
            title: `Eliminar ${empresa.empresa}`,
            icon: 'fa-trash-alt',
            children: (
                <>
                    <div className="dc-warning-box">
                        <i className="fas fa-exclamation-triangle"></i>
                        <p><strong>¡Atención!</strong> Estás a punto de eliminar "{empresa.empresa}"</p>
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

    const empresaActivityLogs = activityLogs.filter(log => log.modulo === 'empresas').slice(0, 5);

    return (
        <div data-tab="empresas">
            <div>
                {/* Botón para abrir el modal de creación */}
                <div style={{ marginBottom: '1.5rem' }}>
                    <button className="dc-btn" onClick={openCreateModal}>
                        <i className="fas fa-plus-circle"></i> Nueva Empresa
                    </button>
                </div>

                <FilterSection
                    title="Filtrar empresas"
                    filters={empresaFilters}
                    values={filterValues}
                    onChange={(id, value) => setFilterValues(prev => ({ ...prev, [id]: value }))}
                    onClear={() => setFilterValues({ search: '', estado: '' })}
                />

                <div className="dc-results-count">
                    <i className="fas fa-list-ul"></i> Mostrando {filteredData.length} de {empresas.length} empresas
                </div>

                <DataTable
                    columns={columns}
                    data={filteredData}
                    emptyMessage="📭 No hay empresas"
                    actions={(item) => (
                        <>
                            <i className="fas fa-eye" onClick={() => handleView(item)} title="Ver detalle"></i>
                            <i className="fas fa-edit" onClick={() => handleEdit(item)} title="Editar"></i>
                            <i className="fas fa-trash-alt" onClick={() => handleDelete(item)} title="Eliminar"></i>
                        </>
                    )}
                />

                <ActivityLog logs={empresaActivityLogs} title="Actividad reciente · Empresas" />

                {/* Modal para ver/editar/eliminar */}
                <Modal
                    isOpen={modalOpen}
                    onClose={() => setModalOpen(false)}
                    title={modalContent?.title || ''}
                    icon={modalContent?.icon}
                    footer={modalContent?.footer}
                >
                    {modalContent?.children}
                </Modal>

                {/* Modal para creación de empresa */}
                <Modal
                    isOpen={isCreateModalOpen}
                    onClose={() => setIsCreateModalOpen(false)}
                    title="Nueva Empresa"
                    icon="fa-building"
                    footer={
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', width: '100%' }}>
                            <button className="dc-btn secondary" onClick={() => setIsCreateModalOpen(false)}>
                                <i className="fas fa-times"></i> Cancelar
                            </button>
                            <button className="dc-btn success" onClick={handleAddEmpresa} disabled={isSubmitting}>
                                {isSubmitting ? 'Registrando...' : <><i className="fas fa-save"></i> Registrar</>}
                            </button>
                        </div>
                    }
                >
                    <div className="dc-form-grid">
                        {empresaFormFields.map((field) => (
                            <div key={field.id} className="dc-input-group" style={{ flex: 1, minWidth: '150px' }}>
                                <label>{field.label}</label>
                                <input
                                    type={field.type}
                                    id={field.id}
                                    placeholder={field.placeholder}
                                    value={(formValues as any)[field.id] || ''}
                                    onChange={(e) => setFormValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                                    required={field.required}
                                />
                            </div>
                        ))}
                    </div>
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