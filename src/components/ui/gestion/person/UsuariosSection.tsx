import React, { useState, useEffect } from 'react';
import { useGlobal } from '../../../../context/GlobalContext';
import { useToast } from '../../../../hooks/base/useToast';
import { Toast } from '../../../common/Toast';
import { Modal } from '../../../common/modal/Modal';
import { DataTable, Column } from '../../../common/DataTable';
import { FilterSection, FilterField } from '../../../common/FilterSection';
import { FormCard, FormField } from '../../../common/FormCard';
import { ActivityLog } from '../../../common/ActivityLog';
import { Usuario, ROLES } from '../../../../features/types/person';

const usuarioFilters: FilterField[] = [
    { id: 'search', label: 'Username / Persona', type: 'text', placeholder: 'Buscar...' },
    {
        id: 'rol', label: 'Rol', type: 'select', options: [
            { value: '', label: 'Todos' },
            { value: '1', label: 'Administrador' },
            { value: '2', label: 'Chef' },
            { value: '3', label: 'Cajero' },
            { value: '4', label: 'Logística' }
        ]
    }
];

const usuarioFormFields: FormField[] = [
    { id: 'id_persona', label: 'Persona', type: 'select', options: [], required: true },
    { id: 'username', label: 'Username', type: 'text', placeholder: 'Nombre de usuario', required: true },
    {
        id: 'id_rol', label: 'Rol', type: 'select', options: [
            { value: '1', label: 'Administrador' },
            { value: '2', label: 'Chef' },
            { value: '3', label: 'Cajero' },
            { value: '4', label: 'Logística' }
        ]
    },
    { id: 'password', label: 'Contraseña', type: 'password', placeholder: '********', required: true }
];

export const UsuariosSection: React.FC = () => {
    const { usuarios, setUsuarios, personas, addActivity, addToHistory, getNombrePersona, activityLogs } = useGlobal();
    const { toasts, showToast, removeToast } = useToast();

    const [filterValues, setFilterValues] = useState({ search: '', rol: '' });
    const [formValues, setFormValues] = useState({
        id_persona: '',
        username: '',
        id_rol: '1',
        password: ''
    });
    const [modalOpen, setModalOpen] = useState(false);
    const [modalContent, setModalContent] = useState<{ title: string; icon: string; children: React.ReactNode; footer?: React.ReactNode } | null>(null);
    const [filteredData, setFilteredData] = useState<Usuario[]>(usuarios);
    const [personaOptions, setPersonaOptions] = useState<{ value: string; label: string }[]>([]);

    useEffect(() => {
        const options = personas.filter(p => p.estado).map(p => ({ value: String(p.id_persona), label: `${getNombrePersona(p)} - ${p.email || p.celular}` }));
        setPersonaOptions(options);
        const formFieldsCopy = [...usuarioFormFields];
        const personaField = formFieldsCopy.find(f => f.id === 'id_persona');
        if (personaField) personaField.options = [{ value: '', label: 'Seleccione persona' }, ...options];
    }, [personas, getNombrePersona]);

    useEffect(() => {
        let filtered = usuarios.filter(u => {
            const persona = personas.find(p => p.id_persona === u.id_persona);
            const nombrePersona = persona ? getNombrePersona(persona).toLowerCase() : "";
            const matchSearch = !filterValues.search ||
                u.username.toLowerCase().includes(filterValues.search.toLowerCase()) ||
                nombrePersona.includes(filterValues.search.toLowerCase());
            const matchRol = !filterValues.rol || String(u.id_rol) === filterValues.rol;
            return matchSearch && matchRol;
        });
        setFilteredData(filtered);
    }, [usuarios, personas, filterValues, getNombrePersona]);

    const columns: Column<Usuario>[] = [
        { key: 'username', header: 'Username', render: (u) => <strong>{u.username}</strong> },
        {
            key: 'persona', header: 'Persona', render: (u) => {
                const persona = personas.find(p => p.id_persona === u.id_persona);
                return persona ? getNombrePersona(persona) : 'N/A';
            }
        },
        {
            key: 'email', header: 'Email', render: (u) => {
                const persona = personas.find(p => p.id_persona === u.id_persona);
                return persona?.email || '-';
            }
        },
        { key: 'rol', header: 'Rol', render: (u) => <span className="dc-badge">{ROLES[u.id_rol]}</span> },
        {
            key: 'estado',
            header: 'Estado',
            render: (u) => (
                <span className={`dc-badge ${u.estado ? 'dc-badge-active' : 'dc-badge-inactive'}`}>
                    {u.estado ? 'ACTIVO' : 'INACTIVO'}
                </span>
            )
        }
    ];

    const handleAddUsuario = () => {
        if (!formValues.id_persona || !formValues.username || !formValues.password) {
            showToast("Complete todos los campos", "warning", "Campos incompletos");
            return;
        }
        if (usuarios.some(u => u.username === formValues.username)) {
            showToast("Este nombre de usuario ya existe", "error", "Error");
            return;
        }

        const persona = personas.find(p => p.id_persona === parseInt(formValues.id_persona));
        const nuevo: Usuario = {
            id_usuario: Date.now(),
            id_persona: parseInt(formValues.id_persona),
            id_rol: parseInt(formValues.id_rol) as any,
            username: formValues.username,
            password_hash: btoa(formValues.password),
            estado: true,
            historial: []
        };
        nuevo.historial = [{
            fecha: new Date().toLocaleString(),
            usuario: "Admin (admin@delicias.com)",
            accion: "CREACIÓN",
            descripcion: `Usuario creado: ${formValues.username} (${ROLES[parseInt(formValues.id_rol)]})`
        }];

        setUsuarios([...usuarios, nuevo]);
        addActivity("INSERT", "usuarios", `Nuevo usuario: ${formValues.username}`);
        showToast(`Usuario "${formValues.username}" creado para ${getNombrePersona(persona!)}`, "success", "Usuario registrado");

        setFormValues({
            id_persona: '',
            username: '',
            id_rol: '1',
            password: ''
        });
    };

    const handleView = (usuario: Usuario) => {
        const persona = personas.find(p => p.id_persona === usuario.id_persona);
        const campos = [
            { label: 'USERNAME', value: usuario.username },
            { label: 'PERSONA', value: persona ? getNombrePersona(persona) : 'N/A' },
            { label: 'EMAIL', value: persona?.email || '-' },
            { label: 'ROL', value: ROLES[usuario.id_rol] },
            { label: 'ESTADO', value: usuario.estado ? 'ACTIVO' : 'INACTIVO' }
        ];

        setModalContent({
            title: `Detalle de ${usuario.username}`,
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
                            {(usuario.historial || []).map((h, idx) => (
                                <div key={idx} className="dc-history-entry">
                                    <div>
                                        <span className="dc-history-date">{h.fecha}</span>
                                        <span className="dc-history-user"><i className="fas fa-user-circle"></i> {h.usuario}</span>
                                    </div>
                                    <div className="dc-history-action">{h.accion}</div>
                                    <div className="dc-history-desc">{h.descripcion}</div>
                                </div>
                            ))}
                            {(!usuario.historial || usuario.historial.length === 0) && (
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

    const handleEdit = (usuario: Usuario) => {
        const handleSave = () => {
            const newUsername = (document.getElementById('edit_username') as HTMLInputElement)?.value;
            const newRol = parseInt((document.getElementById('edit_id_rol') as HTMLSelectElement)?.value);
            const newEstado = (document.getElementById('edit_estado') as HTMLSelectElement)?.value === 'true';
            const newPersona = parseInt((document.getElementById('edit_id_persona') as HTMLSelectElement)?.value);

            let cambios = [];
            if (newUsername !== usuario.username) cambios.push(`Username: "${usuario.username}" → "${newUsername}"`);
            if (newRol !== usuario.id_rol) cambios.push(`Rol: "${ROLES[usuario.id_rol]}" → "${ROLES[newRol]}"`);
            if (newEstado !== usuario.estado) cambios.push(`Estado: "${usuario.estado}" → "${newEstado}"`);
            if (newPersona !== usuario.id_persona) {
                const oldPersona = personas.find(p => p.id_persona === usuario.id_persona);
                const newPersonaObj = personas.find(p => p.id_persona === newPersona);
                cambios.push(`Persona: "${oldPersona ? getNombrePersona(oldPersona) : 'N/A'}" → "${newPersonaObj ? getNombrePersona(newPersonaObj) : 'N/A'}"`);
            }

            if (cambios.length > 0) {
                addToHistory(usuario, usuario.username, "MODIFICACIÓN", cambios.join(', '));
                usuario.username = newUsername;
                usuario.id_rol = newRol as any;
                usuario.estado = newEstado;
                usuario.id_persona = newPersona;
                setUsuarios([...usuarios]);
                addActivity("MODIFICAR", "usuarios", `Registro actualizado: ${cambios.join(', ')}`);
                showToast("Registro actualizado correctamente", "success", "Actualizado");
            } else {
                showToast("No se realizaron cambios", "info", "Sin cambios");
            }
            setModalOpen(false);
        };

        setModalContent({
            title: `Editar ${usuario.username}`,
            icon: 'fa-edit',
            children: (
                <div className="dc-form-row">
                    <div className="dc-modal-field">
                        <label><i className="fas fa-user"></i> Username</label>
                        <input type="text" id="edit_username" defaultValue={usuario.username} />
                    </div>
                    <div className="dc-modal-field">
                        <label><i className="fas fa-user-tag"></i> Rol</label>
                        <select id="edit_id_rol" defaultValue={usuario.id_rol}>
                            {Object.entries(ROLES).map(([value, label]) => (
                                <option key={value} value={value}>{label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="dc-modal-field">
                        <label><i className="fas fa-user"></i> Persona</label>
                        <select id="edit_id_persona" defaultValue={usuario.id_persona}>
                            {personas.map(p => (
                                <option key={p.id_persona} value={p.id_persona}>{getNombrePersona(p)}</option>
                            ))}
                        </select>
                    </div>
                    <div className="dc-modal-field">
                        <label><i className="fas fa-toggle-on"></i> Estado</label>
                        <select id="edit_estado" defaultValue={String(usuario.estado)}>
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

    const handleDelete = (usuario: Usuario) => {
        const handleConfirm = () => {
            setUsuarios(usuarios.filter(u => u.id_usuario !== usuario.id_usuario));
            addActivity("ELIMINAR", "usuarios", `Eliminado "${usuario.username}"`);
            showToast(`"${usuario.username}" ha sido eliminado correctamente`, "success", "Eliminado");
            setModalOpen(false);
        };

        setModalContent({
            title: `Eliminar ${usuario.username}`,
            icon: 'fa-trash-alt',
            children: (
                <>
                    <div className="dc-warning-box">
                        <i className="fas fa-exclamation-triangle"></i>
                        <p><strong>¡Atención!</strong> Estás a punto de eliminar "{usuario.username}"</p>
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

    const usuarioActivityLogs = activityLogs.filter(log => log.modulo === 'usuarios').slice(0, 5);

    return (
        <div data-tab="usuarios">
            <div>
                <FormCard
                    title="Nuevo Usuario"
                    fields={usuarioFormFields.map(f => f.id === 'id_persona' ? { ...f, options: [{ value: '', label: 'Seleccione persona' }, ...personaOptions] } : f)}
                    values={formValues}
                    onChange={(id, value) => setFormValues(prev => ({ ...prev, [id]: value }))}
                    onSubmit={handleAddUsuario}
                    submitText="Registrar usuario"
                />

                <FilterSection
                    title="Filtrar usuarios"
                    filters={usuarioFilters}
                    values={filterValues}
                    onChange={(id, value) => setFilterValues(prev => ({ ...prev, [id]: value }))}
                    onClear={() => setFilterValues({ search: '', rol: '' })}
                />

                <div className="dc-results-count">
                    <i className="fas fa-list-ul"></i> Mostrando {filteredData.length} de {usuarios.length} usuarios
                </div>

                <DataTable
                    columns={columns}
                    data={filteredData}
                    emptyMessage="🔐 No hay usuarios"
                    actions={(item) => (
                        <>
                            <i className="fas fa-eye" onClick={() => handleView(item)} title="Ver detalle"></i>
                            <i className="fas fa-edit" onClick={() => handleEdit(item)} title="Editar"></i>
                            <i className="fas fa-trash-alt" onClick={() => handleDelete(item)} title="Eliminar"></i>
                        </>
                    )}
                />

                <ActivityLog logs={usuarioActivityLogs} title="Actividad reciente · Usuarios" />

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