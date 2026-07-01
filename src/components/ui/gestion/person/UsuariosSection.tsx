import React, { useState, useEffect } from 'react';
import { useGlobal } from '../../../../context/GlobalContext';
import { useToast } from '../../../../hooks/base/useToast';
import { Toast } from '../../../common/Toast';
import { Modal } from '../../../common/modal/Modal';
import { DataTable, Column } from '../../../common/DataTable';
import { FilterSection, FilterField } from '../../../common/FilterSection';
import { ActivityLog } from '../../../common/ActivityLog';
import { Usuario, ROLES } from '../../../../features/types/person';
import { usuarioApi } from '../../../../services/api/usuarioApi';
import { historialApi } from '../../../../services/api/historialApi';
import { useAuth } from '../../../../features/auth/context/AuthContext';

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

const usuarioFormFields = [
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
    const { user } = useAuth();
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
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    useEffect(() => {
        const options = personas.filter(p => p.estado).map(p => ({
            value: String(p.id_persona),
            label: `${getNombrePersona(p)} - ${p.email || p.celular}`
        }));
        setPersonaOptions(options);
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

    const openCreateModal = () => {
        setFormValues({
            id_persona: '',
            username: '',
            id_rol: '1',
            password: ''
        });
        setIsCreateModalOpen(true);
    };

    // --- CREAR ---
    const handleAddUsuario = async () => {
        if (!formValues.id_persona || !formValues.username || !formValues.password) {
            showToast("Complete todos los campos", "warning", "Campos incompletos");
            return;
        }
        if (usuarios.some(u => u.username === formValues.username)) {
            showToast("Este nombre de usuario ya existe", "error", "Error");
            return;
        }

        setIsSubmitting(true);
        try {
            const persona = personas.find(p => p.id_persona === parseInt(formValues.id_persona));
            const payload = {
                id_persona: parseInt(formValues.id_persona),
                username: formValues.username,
                password: formValues.password,
                id_rol: parseInt(formValues.id_rol) as 1 | 2 | 3 | 4,
                estado: true
            };

            const nuevo = await usuarioApi.create(payload);

            setUsuarios([nuevo, ...usuarios]);

            const nombrePersona = persona ? getNombrePersona(persona) : 'N/A';
            await addActivity("INSERT", "usuarios", `Nuevo usuario: ${formValues.username}`);
            await addToHistory(nuevo, formValues.username, "CREACIÓN", `Usuario creado para ${nombrePersona}`);

            showToast(`Usuario "${formValues.username}" creado exitosamente`, "success", "Usuario registrado");

            setIsCreateModalOpen(false);
            setFormValues({
                id_persona: '',
                username: '',
                id_rol: '1',
                password: ''
            });
        } catch (error) {
            console.error('[UsuariosSection] Error al crear usuario:', error);
            showToast('Error al crear el usuario', 'error', 'Error');
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- VER (con historial) ---
    const handleView = async (usuario: Usuario) => {
        try {
            const historial = await historialApi.getByEntity('usuarios', usuario.id_usuario);
            const usuarioConHistorial = { ...usuario, historial };

            const persona = personas.find(p => p.id_persona === usuario.id_persona);
            const campos = [
                { label: 'USERNAME', value: usuarioConHistorial.username },
                { label: 'PERSONA', value: persona ? getNombrePersona(persona) : 'N/A' },
                { label: 'EMAIL', value: persona?.email || '-' },
                { label: 'ROL', value: ROLES[usuarioConHistorial.id_rol] },
                { label: 'ESTADO', value: usuarioConHistorial.estado ? 'ACTIVO' : 'INACTIVO' }
            ];

            setModalContent({
                title: `Detalle de ${usuarioConHistorial.username}`,
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
                                {(usuarioConHistorial.historial || []).length > 0 ? (
                                    usuarioConHistorial.historial.map((h, idx) => (
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
            console.error('[UsuariosSection] Error cargando historial:', error);
            showToast('Error al cargar el historial', 'error', 'Error');
        }
    };

    // --- EDITAR ---
    const handleEdit = (usuario: Usuario) => {
        const handleSave = async () => {
            const newUsername = (document.getElementById('edit_username') as HTMLInputElement)?.value;
            const newRol = parseInt((document.getElementById('edit_id_rol') as HTMLSelectElement)?.value);
            const newEstado = (document.getElementById('edit_estado') as HTMLSelectElement)?.value === 'true';
            const newPersona = parseInt((document.getElementById('edit_id_persona') as HTMLSelectElement)?.value);

            if (
                newUsername === usuario.username &&
                newRol === usuario.id_rol &&
                newEstado === usuario.estado &&
                newPersona === usuario.id_persona
            ) {
                showToast('No se realizaron cambios', 'info', 'Sin cambios');
                setModalOpen(false);
                return;
            }

            setIsSubmitting(true);
            try {
                const payload: any = {
                    id_persona: newPersona,
                    username: newUsername,
                    id_rol: newRol,
                    estado: newEstado
                };

                const actualizado = await usuarioApi.update(usuario.id_usuario, payload);

                setUsuarios(prev => prev.map(u =>
                    u.id_usuario === actualizado.id_usuario ? actualizado : u
                ));

                const cambios = [];
                if (newUsername !== usuario.username) cambios.push(`Username: "${usuario.username}" → "${newUsername}"`);
                if (newRol !== usuario.id_rol) cambios.push(`Rol: "${ROLES[usuario.id_rol]}" → "${ROLES[newRol]}"`);
                if (newEstado !== usuario.estado) cambios.push(`Estado: "${usuario.estado}" → "${newEstado}"`);
                if (newPersona !== usuario.id_persona) {
                    const oldPersona = personas.find(p => p.id_persona === usuario.id_persona);
                    const newPersonaObj = personas.find(p => p.id_persona === newPersona);
                    cambios.push(`Persona: "${oldPersona ? getNombrePersona(oldPersona) : 'N/A'}" → "${newPersonaObj ? getNombrePersona(newPersonaObj) : 'N/A'}"`);
                }

                if (cambios.length > 0) {
                    await addActivity("MODIFICAR", "usuarios", `Usuario actualizado: ${newUsername}`);
                    await addToHistory(actualizado, newUsername, "MODIFICACIÓN", cambios.join(', '));
                }

                showToast("Usuario actualizado correctamente", "success", "Actualizado");
                setModalOpen(false);
            } catch (error) {
                console.error('[UsuariosSection] Error al actualizar usuario:', error);
                showToast('Error al actualizar el usuario', 'error', 'Error');
            } finally {
                setIsSubmitting(false);
            }
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
    const handleDelete = (usuario: Usuario) => {
        const handleConfirm = async () => {
            setIsSubmitting(true);
            try {
                await usuarioApi.delete(usuario.id_usuario);

                setUsuarios(prev => prev.filter(u => u.id_usuario !== usuario.id_usuario));

                await addActivity("ELIMINAR", "usuarios", `Eliminado "${usuario.username}"`);

                showToast(`"${usuario.username}" ha sido eliminado correctamente`, "success", "Eliminado");
                setModalOpen(false);
            } catch (error) {
                console.error('[UsuariosSection] Error al eliminar usuario:', error);
                showToast('Error al eliminar el usuario', 'error', 'Error');
            } finally {
                setIsSubmitting(false);
            }
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

    const usuarioActivityLogs = activityLogs.filter(log => log.modulo === 'usuarios').slice(0, 5);

    return (
        <div data-tab="usuarios">
            <div>
                <div style={{ marginBottom: '1.5rem' }}>
                    <button className="dc-btn" onClick={openCreateModal}>
                        <i className="fas fa-plus-circle"></i> Nuevo Usuario
                    </button>
                </div>

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

                <Modal
                    isOpen={isCreateModalOpen}
                    onClose={() => setIsCreateModalOpen(false)}
                    title="Nuevo Usuario"
                    icon="fa-user-plus"
                    footer={
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', width: '100%' }}>
                            <button className="dc-btn secondary" onClick={() => setIsCreateModalOpen(false)}>
                                <i className="fas fa-times"></i> Cancelar
                            </button>
                            <button className="dc-btn success" onClick={handleAddUsuario} disabled={isSubmitting}>
                                {isSubmitting ? 'Registrando...' : <><i className="fas fa-save"></i> Registrar</>}
                            </button>
                        </div>
                    }
                >
                    <div className="dc-form-grid">
                        {usuarioFormFields.map((field) => {
                            const fieldOptions = field.id === 'id_persona'
                                ? [{ value: '', label: 'Seleccione persona' }, ...personaOptions]
                                : field.options;
                            return (
                                <div key={field.id} className="dc-input-group" style={{ flex: 1, minWidth: '150px' }}>
                                    <label>{field.label}</label>
                                    {field.type === 'select' ? (
                                        <select
                                            id={field.id}
                                            value={(formValues as any)[field.id] || ''}
                                            onChange={(e) => setFormValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                                            required={field.required}
                                        >
                                            {fieldOptions?.map(opt => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <input
                                            type={field.type}
                                            id={field.id}
                                            placeholder={field.placeholder}
                                            value={(formValues as any)[field.id] || ''}
                                            onChange={(e) => setFormValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                                            required={field.required}
                                        />
                                    )}
                                </div>
                            );
                        })}
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