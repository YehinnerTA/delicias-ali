import React, { useState, useEffect } from 'react';
import { useGlobal } from '../../../../context/GlobalContext';
import { useToast } from '../../../../hooks/base/useToast';
import { Toast } from '../../../common/Toast';
import { Modal } from '../../../common/Modal';
import { DataTable, Column } from '../../../common/DataTable';
import { FilterSection, FilterField } from '../../../common/FilterSection';
import { FormCard, FormField } from '../../../common/FormCard';
import { ActivityLog } from '../../../common/ActivityLog';
import { Empresa } from '../../../../features/types/person';

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

const empresaFormFields: FormField[] = [
    { id: 'ruc', label: 'RUC (11 dígitos)', type: 'text', placeholder: '20123456789', required: true },
    { id: 'nombre', label: 'Nombre / Razón Social', type: 'text', placeholder: 'Ej: Distribuciones del Valle S.A.C.', required: true }
];

export const EmpresasSection: React.FC = () => {
    const { empresas, setEmpresas, addActivity, addToHistory, getNombreEmpresa, activityLogs } = useGlobal();
    const { toasts, showToast, removeToast } = useToast();

    const [filterValues, setFilterValues] = useState({ search: '', estado: '' });
    const [formValues, setFormValues] = useState({ ruc: '', nombre: '' });
    const [modalOpen, setModalOpen] = useState(false);
    const [modalContent, setModalContent] = useState<{ title: string; icon: string; children: React.ReactNode; footer?: React.ReactNode } | null>(null);
    const [filteredData, setFilteredData] = useState<Empresa[]>(empresas);

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

    const handleAddEmpresa = () => {
        if (!formValues.ruc || !formValues.nombre) {
            showToast('RUC y nombre son requeridos', 'warning', 'Campos incompletos');
            return;
        }
        if (empresas.some(e => e.ruc === formValues.ruc)) {
            showToast('Ya existe una empresa con este RUC', 'error', 'Error');
            return;
        }

        const nueva: Empresa = {
            id_empresa: Date.now(),
            ruc: formValues.ruc,
            empresa: formValues.nombre,
            estado: true,
            historial: []
        };
        nueva.historial = [{
            fecha: new Date().toLocaleString(),
            usuario: "Admin (admin@delicias.com)",
            accion: "CREACIÓN",
            descripcion: `Empresa creada: ${formValues.nombre}`
        }];

        setEmpresas([...empresas, nueva]);
        addActivity("INSERT", "empresas", `Nueva empresa: ${formValues.nombre} (RUC:${formValues.ruc})`);
        showToast(`Empresa "${formValues.nombre}" creada exitosamente`, "success", "Empresa registrada");
        setFormValues({ ruc: '', nombre: '' });
    };

    const handleView = (empresa: Empresa) => {
        const campos = [
            { label: 'RUC', value: empresa.ruc },
            { label: 'EMPRESA', value: empresa.empresa },
            { label: 'ESTADO', value: empresa.estado ? 'ACTIVO' : 'INACTIVO' }
        ];

        setModalContent({
            title: `Detalle de ${empresa.empresa}`,
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
                            {(empresa.historial || []).map((h, idx) => (
                                <div key={idx} className="dc-history-entry">
                                    <div>
                                        <span className="dc-history-date">{h.fecha}</span>
                                        <span className="dc-history-user"><i className="fas fa-user-circle"></i> {h.usuario}</span>
                                    </div>
                                    <div className="dc-history-action">{h.accion}</div>
                                    <div className="dc-history-desc">{h.descripcion}</div>
                                </div>
                            ))}
                            {(!empresa.historial || empresa.historial.length === 0) && (
                                <div className="dc-history-entry">Sin historial registrado</div>
                            )}
                        </div>
                    </div>
                </>
            ),
            footer: <button className="dc-btn secondary" onClick={() => setModalOpen(false)}><i className="fas fa-times"></i> Cerrar</button>
        });
        setModalOpen(true);
    };

    const handleEdit = (empresa: Empresa) => {
        const handleSave = () => {
            const newNombre = (document.getElementById('edit_nombre') as HTMLInputElement)?.value;
            const newEstado = (document.getElementById('edit_estado') as HTMLSelectElement)?.value === 'true';

            if (newNombre && newNombre !== empresa.empresa) {
                addToHistory(empresa, empresa.empresa, "MODIFICACIÓN", `Empresa: "${empresa.empresa}" → "${newNombre}"`);
                empresa.empresa = newNombre;
            }
            if (newEstado !== empresa.estado) {
                addToHistory(empresa, empresa.empresa, "MODIFICACIÓN", `Estado: "${empresa.estado}" → "${newEstado}"`);
                empresa.estado = newEstado;
            }

            setEmpresas([...empresas]);
            addActivity("MODIFICAR", "empresas", `Registro actualizado`);
            showToast("Registro actualizado correctamente", "success", "Actualizado");
            setModalOpen(false);
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
        const handleConfirm = () => {
            setEmpresas(empresas.filter(e => e.id_empresa !== empresa.id_empresa));
            addActivity("ELIMINAR", "empresas", `Eliminado "${empresa.empresa}"`);
            showToast(`"${empresa.empresa}" ha sido eliminado correctamente`, "success", "Eliminado");
            setModalOpen(false);
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
                <FormCard
                    title="Nueva Empresa"
                    fields={empresaFormFields}
                    values={formValues}
                    onChange={(id, value) => setFormValues(prev => ({ ...prev, [id]: value }))}
                    onSubmit={handleAddEmpresa}
                />

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