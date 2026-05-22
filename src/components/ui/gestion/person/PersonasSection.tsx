import React, { useState, useEffect } from 'react';
import { useGlobal } from '../../../../context/GlobalContext';
import { useToast } from '../../../../hooks/base/useToast';
import { Toast } from '../../../common/Toast';
import { Modal } from '../../../common/Modal';
import { DataTable, Column } from '../../../common/DataTable';
import { FilterSection, FilterField } from '../../../common/FilterSection';
import { FormCard, FormField } from '../../../common/FormCard';
import { ActivityLog } from '../../../common/ActivityLog';
import { Persona, TIPOS_PERSONA, ROLES } from '../../../../features/types/person';

const personaFilters: FilterField[] = [
    { id: 'search', label: 'Nombre/Documento', type: 'text', placeholder: 'Nombre, email o documento' },
    {
        id: 'tipo', label: 'Tipo', type: 'select', options: [
            { value: '', label: 'Todos' },
            ...TIPOS_PERSONA
        ]
    },
    { id: 'empresa', label: 'Empresa', type: 'select', options: [{ value: '', label: 'Todas' }] }
];

const personaFormFields: FormField[] = [
    { id: 'tipo', label: 'Tipo', type: 'select', options: TIPOS_PERSONA },
    {
        id: 'tipoDoc', label: 'Tipo Documento', type: 'select', options: [
            { value: 'DNI', label: 'DNI' },
            { value: 'RUC', label: 'RUC' }
        ]
    },
    { id: 'numDoc', label: 'N° Documento', type: 'text', placeholder: 'DNI o RUC', required: true },
    { id: 'nombre', label: 'Nombre(s)', type: 'text', placeholder: 'Nombre' },
    { id: 'apellido', label: 'Apellido', type: 'text', placeholder: 'Apellido' },
    { id: 'razonSocial', label: 'Razón Social', type: 'text', placeholder: 'Solo para cliente jurídico' },
    { id: 'email', label: 'Email', type: 'email', placeholder: 'correo@ejemplo.com' },
    { id: 'celular', label: 'Celular', type: 'text', placeholder: '+51 987654321', required: true },
    { id: 'id_empresa', label: 'Empresa', type: 'select', options: [] }
];

export const PersonasSection: React.FC = () => {
    const { empresas, personas, setPersonas, addActivity, addToHistory, getNombrePersona, getNombreEmpresa, activityLogs } = useGlobal();
    const { toasts, showToast, removeToast } = useToast();

    const [filterValues, setFilterValues] = useState({ search: '', tipo: '', empresa: '' });
    const [formValues, setFormValues] = useState({
        tipo: 'proveedor',
        tipoDoc: 'DNI',
        numDoc: '',
        nombre: '',
        apellido: '',
        razonSocial: '',
        email: '',
        celular: '',
        id_empresa: ''
    });
    const [modalOpen, setModalOpen] = useState(false);
    const [modalContent, setModalContent] = useState<{ title: string; icon: string; children: React.ReactNode; footer?: React.ReactNode } | null>(null);
    const [filteredData, setFilteredData] = useState<Persona[]>(personas);
    const [empresaOptions, setEmpresaOptions] = useState<{ value: string; label: string }[]>([]);

    useEffect(() => {
        const options = empresas.filter(e => e.estado).map(e => ({ value: String(e.id_empresa), label: e.empresa }));
        setEmpresaOptions(options);
        // Actualizar opciones en el formulario
        const formFieldsCopy = [...personaFormFields];
        const empresaField = formFieldsCopy.find(f => f.id === 'id_empresa');
        if (empresaField) empresaField.options = [{ value: '', label: 'Seleccione empresa' }, ...options];
    }, [empresas]);

    useEffect(() => {
        let filtered = personas.filter(p => {
            const nombreCompleto = getNombrePersona(p).toLowerCase();
            const matchSearch = !filterValues.search ||
                nombreCompleto.includes(filterValues.search.toLowerCase()) ||
                (p.email && p.email.toLowerCase().includes(filterValues.search.toLowerCase())) ||
                p.numero_documento.includes(filterValues.search);
            const matchTipo = !filterValues.tipo || p.tipo_persona === filterValues.tipo;
            const matchEmpresa = !filterValues.empresa || String(p.id_empresa) === filterValues.empresa;
            return matchSearch && matchTipo && matchEmpresa;
        });
        setFilteredData(filtered);
    }, [personas, filterValues, getNombrePersona]);

    const columns: Column<Persona>[] = [
        {
            key: 'tipo_persona',
            header: 'Tipo',
            render: (p) => <span className="dc-badge">{p.tipo_persona.replace('_', ' ')}</span>
        },
        {
            key: 'numero_documento',
            header: 'Documento',
            render: (p) => `${p.tipo_documento}: ${p.numero_documento}`
        },
        { key: 'nombre_completo', header: 'Nombre completo', render: (p) => getNombrePersona(p) },
        { key: 'email', header: 'Email', render: (p) => p.email || '-' },
        { key: 'celular', header: 'Celular' },
        { key: 'empresa', header: 'Empresa', render: (p) => getNombreEmpresa(p.id_empresa) },
        {
            key: 'estado',
            header: 'Estado',
            render: (p) => (
                <span className={`dc-badge ${p.estado ? 'dc-badge-active' : 'dc-badge-inactive'}`}>
                    {p.estado ? 'ACTIVO' : 'INACTIVO'}
                </span>
            )
        }
    ];

    const handleAddPersona = () => {
        if (!formValues.numDoc || !formValues.celular || !formValues.id_empresa) {
            showToast("Documento, celular y empresa son obligatorios", "warning", "Campos incompletos");
            return;
        }

        const nueva: Persona = {
            id_persona: Date.now(),
            id_empresa: parseInt(formValues.id_empresa),
            tipo_persona: formValues.tipo as any,
            tipo_documento: formValues.tipoDoc as any,
            numero_documento: formValues.numDoc,
            razon_social: formValues.razonSocial || null,
            nombre: formValues.nombre || null,
            apellido: formValues.apellido || null,
            email: formValues.email || null,
            celular: formValues.celular,
            estado: true,
            historial: []
        };
        nueva.historial = [{
            fecha: new Date().toLocaleString(),
            usuario: "Admin (admin@delicias.com)",
            accion: "CREACIÓN",
            descripcion: `Persona creada: ${getNombrePersona(nueva)}`
        }];

        setPersonas([...personas, nueva]);
        addActivity("INSERT", "personas", `Nuevo ${formValues.tipo}: ${getNombrePersona(nueva)}`);
        showToast(`${formValues.tipo.replace('_', ' ')} "${getNombrePersona(nueva)}" creado exitosamente`, "success", "Persona registrada");

        setFormValues({
            tipo: 'proveedor',
            tipoDoc: 'DNI',
            numDoc: '',
            nombre: '',
            apellido: '',
            razonSocial: '',
            email: '',
            celular: '',
            id_empresa: ''
        });
    };

    const handleView = (persona: Persona) => {
        const campos = [
            { label: 'TIPO', value: persona.tipo_persona.replace('_', ' ') },
            { label: 'DOCUMENTO', value: `${persona.tipo_documento}: ${persona.numero_documento}` },
            { label: 'NOMBRE COMPLETO', value: getNombrePersona(persona) },
            { label: 'EMAIL', value: persona.email || '-' },
            { label: 'CELULAR', value: persona.celular },
            { label: 'EMPRESA', value: getNombreEmpresa(persona.id_empresa) },
            { label: 'ESTADO', value: persona.estado ? 'ACTIVO' : 'INACTIVO' }
        ];

        setModalContent({
            title: `Detalle de ${getNombrePersona(persona)}`,
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
                            {(persona.historial || []).map((h, idx) => (
                                <div key={idx} className="dc-history-entry">
                                    <div>
                                        <span className="dc-history-date">{h.fecha}</span>
                                        <span className="dc-history-user"><i className="fas fa-user-circle"></i> {h.usuario}</span>
                                    </div>
                                    <div className="dc-history-action">{h.accion}</div>
                                    <div className="dc-history-desc">{h.descripcion}</div>
                                </div>
                            ))}
                            {(!persona.historial || persona.historial.length === 0) && (
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

    const handleEdit = (persona: Persona) => {
        const handleSave = () => {
            const newNombre = (document.getElementById('edit_nombre') as HTMLInputElement)?.value;
            const newApellido = (document.getElementById('edit_apellido') as HTMLInputElement)?.value;
            const newEmail = (document.getElementById('edit_email') as HTMLInputElement)?.value;
            const newCelular = (document.getElementById('edit_celular') as HTMLInputElement)?.value;
            const newEstado = (document.getElementById('edit_estado') as HTMLSelectElement)?.value === 'true';
            const newEmpresa = parseInt((document.getElementById('edit_id_empresa') as HTMLSelectElement)?.value);

            let cambios = [];
            if (newNombre !== persona.nombre) cambios.push(`Nombre: "${persona.nombre}" → "${newNombre}"`);
            if (newApellido !== persona.apellido) cambios.push(`Apellido: "${persona.apellido}" → "${newApellido}"`);
            if (newEmail !== persona.email) cambios.push(`Email: "${persona.email}" → "${newEmail}"`);
            if (newCelular !== persona.celular) cambios.push(`Celular: "${persona.celular}" → "${newCelular}"`);
            if (newEstado !== persona.estado) cambios.push(`Estado: "${persona.estado}" → "${newEstado}"`);
            if (newEmpresa !== persona.id_empresa) cambios.push(`Empresa: "${getNombreEmpresa(persona.id_empresa)}" → "${getNombreEmpresa(newEmpresa)}"`);

            if (cambios.length > 0) {
                addToHistory(persona, getNombrePersona(persona), "MODIFICACIÓN", cambios.join(', '));
                persona.nombre = newNombre;
                persona.apellido = newApellido;
                persona.email = newEmail;
                persona.celular = newCelular;
                persona.estado = newEstado;
                persona.id_empresa = newEmpresa;
                setPersonas([...personas]);
                addActivity("MODIFICAR", "personas", `Registro actualizado: ${cambios.join(', ')}`);
                showToast("Registro actualizado correctamente", "success", "Actualizado");
            } else {
                showToast("No se realizaron cambios", "info", "Sin cambios");
            }
            setModalOpen(false);
        };

        setModalContent({
            title: `Editar ${getNombrePersona(persona)}`,
            icon: 'fa-edit',
            children: (
                <div className="dc-form-row">
                    <div className="dc-modal-field">
                        <label><i className="fas fa-user"></i> Nombre</label>
                        <input type="text" id="edit_nombre" defaultValue={persona.nombre || ''} />
                    </div>
                    <div className="dc-modal-field">
                        <label><i className="fas fa-user"></i> Apellido</label>
                        <input type="text" id="edit_apellido" defaultValue={persona.apellido || ''} />
                    </div>
                    <div className="dc-modal-field">
                        <label><i className="fas fa-envelope"></i> Email</label>
                        <input type="email" id="edit_email" defaultValue={persona.email || ''} />
                    </div>
                    <div className="dc-modal-field">
                        <label><i className="fas fa-phone"></i> Celular</label>
                        <input type="text" id="edit_celular" defaultValue={persona.celular} />
                    </div>
                    <div className="dc-modal-field">
                        <label><i className="fas fa-building"></i> Empresa</label>
                        <select id="edit_id_empresa" defaultValue={persona.id_empresa}>
                            {empresas.map(e => (
                                <option key={e.id_empresa} value={e.id_empresa}>{e.empresa}</option>
                            ))}
                        </select>
                    </div>
                    <div className="dc-modal-field">
                        <label><i className="fas fa-toggle-on"></i> Estado</label>
                        <select id="edit_estado" defaultValue={String(persona.estado)}>
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

    const handleDelete = (persona: Persona) => {
        const nombre = getNombrePersona(persona);
        const handleConfirm = () => {
            setPersonas(personas.filter(p => p.id_persona !== persona.id_persona));
            addActivity("ELIMINAR", "personas", `Eliminado "${nombre}"`);
            showToast(`"${nombre}" ha sido eliminado correctamente`, "success", "Eliminado");
            setModalOpen(false);
        };

        setModalContent({
            title: `Eliminar ${nombre}`,
            icon: 'fa-trash-alt',
            children: (
                <>
                    <div className="dc-warning-box">
                        <i className="fas fa-exclamation-triangle"></i>
                        <p><strong>¡Atención!</strong> Estás a punto de eliminar "{nombre}"</p>
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

    const personaActivityLogs = activityLogs.filter(log => log.modulo === 'personas').slice(0, 5);

    // Actualizar opciones del filtro de empresas
    useEffect(() => {
        const filterEmpresaField = personaFilters.find(f => f.id === 'empresa');
        if (filterEmpresaField) {
            filterEmpresaField.options = [{ value: '', label: 'Todas' }, ...empresas.map(e => ({ value: String(e.id_empresa), label: e.empresa }))];
        }
    }, [empresas]);

    return (
        <div data-tab="personas">
            <div>
                <FormCard
                    title="Nueva Persona"
                    fields={personaFormFields.map(f => f.id === 'id_empresa' ? { ...f, options: [{ value: '', label: 'Seleccione empresa' }, ...empresaOptions] } : f)}
                    values={formValues}
                    onChange={(id, value) => setFormValues(prev => ({ ...prev, [id]: value }))}
                    onSubmit={handleAddPersona}
                />

                <FilterSection
                    title="Filtrar personas"
                    filters={personaFilters.map(f => f.id === 'empresa' ? { ...f, options: [{ value: '', label: 'Todas' }, ...empresas.map(e => ({ value: String(e.id_empresa), label: e.empresa }))] } : f)}
                    values={filterValues}
                    onChange={(id, value) => setFilterValues(prev => ({ ...prev, [id]: value }))}
                    onClear={() => setFilterValues({ search: '', tipo: '', empresa: '' })}
                />

                <div className="dc-results-count">
                    <i className="fas fa-list-ul"></i> Mostrando {filteredData.length} de {personas.length} personas
                </div>

                <DataTable
                    columns={columns}
                    data={filteredData}
                    emptyMessage="👤 No hay personas"
                    actions={(item) => (
                        <>
                            <i className="fas fa-eye" onClick={() => handleView(item)} title="Ver detalle"></i>
                            <i className="fas fa-edit" onClick={() => handleEdit(item)} title="Editar"></i>
                            <i className="fas fa-trash-alt" onClick={() => handleDelete(item)} title="Eliminar"></i>
                        </>
                    )}
                />

                <ActivityLog logs={personaActivityLogs} title="Actividad reciente · Personas" />

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