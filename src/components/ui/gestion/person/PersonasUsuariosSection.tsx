import React, { useState, useEffect } from 'react';
import { useGlobal } from '../../../../context/GlobalContext';
import { useToast } from '../../../../hooks/base/useToast';
import { Toast } from '../../../common/Toast';
import { Modal } from '../../../common/modal/Modal';
import { DataTable, Column } from '../../../common/DataTable';
import { FilterSection, FilterField } from '../../../common/FilterSection';
import { ActivityLog } from '../../../common/ActivityLog';
import { Persona, Usuario, Empresa, HistorialEntry, TIPOS_PERSONA, ROLES } from '../../../../features/types/person';
import { personaApi } from '../../../../services/api/personaApi';
import { usuarioApi } from '../../../../services/api/usuarioApi';
import { historialApi } from '../../../../services/api/historialApi';
import { useAuth } from '../../../../features/auth/context/AuthContext';

// Filtros para la tabla de personas
const personaFilters: FilterField[] = [
    { id: 'search', label: 'Nombre/Documento', type: 'text', placeholder: 'Nombre, email o documento' },
    {
        id: 'tipo', label: 'Tipo', type: 'select', options: [
            { value: '', label: 'Todos' },
            ...TIPOS_PERSONA
        ]
    },
    { id: 'empresa', label: 'Empresa', type: 'select', options: [{ value: '', label: 'Todas' }] },
    {
        id: 'tieneUsuario', label: 'Usuario', type: 'select', options: [
            { value: '', label: 'Todos' },
            { value: 'true', label: 'Con usuario' },
            { value: 'false', label: 'Sin usuario' }
        ]
    }
];

// Campos del formulario de persona
const personaFormFields = [
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

// Campos del formulario de usuario (básicos)
const usuarioFormFields = [
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

// Tipo extendido para Usuario con historial
type UsuarioConHistorial = Usuario & { historial: HistorialEntry[] };

export const PersonasUsuariosSection: React.FC = () => {
    const {
        empresas,
        personas,
        setPersonas,
        usuarios,
        setUsuarios,
        addActivity,
        addToHistory,
        getNombrePersona,
        getNombreEmpresa,
        activityLogs
    } = useGlobal();
    const { user } = useAuth();
    const { toasts, showToast, removeToast } = useToast();

    // Estados de filtros
    const [filterValues, setFilterValues] = useState({ search: '', tipo: '', empresa: '', tieneUsuario: '' });
    const [filteredData, setFilteredData] = useState<Persona[]>(personas);
    const [empresaOptions, setEmpresaOptions] = useState<{ value: string; label: string }[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Estados para modales
    const [modalOpen, setModalOpen] = useState(false);
    const [modalContent, setModalContent] = useState<{ title: string; icon: string; children: React.ReactNode; footer?: React.ReactNode } | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);

    // Estado del formulario de persona
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

    // Estado del formulario de usuario
    const [usuarioFormValues, setUsuarioFormValues] = useState<{
        username: string;
        id_rol: string;
        password: string;
        empresasIds: number[];
    }>({
        username: '',
        id_rol: '1',
        password: '',
        empresasIds: []
    });

    // Estado para el toggle "Crear/Editar usuario"
    const [crearUsuario, setCrearUsuario] = useState(false);

    // Estado para la empresa seleccionada en el selector de asignación
    const [selectedEmpresaId, setSelectedEmpresaId] = useState<number | ''>('');

    // Cargar opciones de empresas
    useEffect(() => {
        const options = empresas.filter(e => e.estado).map(e => ({
            value: String(e.id_empresa),
            label: e.empresa
        }));
        setEmpresaOptions(options);
        // Actualizar opciones en el formulario
        const formFieldsCopy = [...personaFormFields];
        const empresaField = formFieldsCopy.find(f => f.id === 'id_empresa');
        if (empresaField) {
            empresaField.options = [{ value: '', label: 'Seleccione empresa' }, ...options];
        }
        // Actualizar opciones del filtro de empresas
        const filterEmpresaField = personaFilters.find(f => f.id === 'empresa');
        if (filterEmpresaField) {
            filterEmpresaField.options = [{ value: '', label: 'Todas' }, ...options];
        }
        // Setear la primera empresa como seleccionada por defecto si hay opciones
        if (options.length > 0) {
            setSelectedEmpresaId(parseInt(options[0].value));
        }
    }, [empresas]);

    // Aplicar filtros
    useEffect(() => {
        let filtered = personas.filter(p => {
            const nombreCompleto = getNombrePersona(p).toLowerCase();
            const matchSearch = !filterValues.search ||
                nombreCompleto.includes(filterValues.search.toLowerCase()) ||
                (p.email && p.email.toLowerCase().includes(filterValues.search.toLowerCase())) ||
                p.numero_documento.includes(filterValues.search);
            const matchTipo = !filterValues.tipo || p.tipo_persona === filterValues.tipo;
            const matchEmpresa = !filterValues.empresa || String(p.id_empresa) === filterValues.empresa;

            let matchUsuario = true;
            if (filterValues.tieneUsuario === 'true') {
                matchUsuario = usuarios.some(u => u.id_persona === p.id_persona);
            } else if (filterValues.tieneUsuario === 'false') {
                matchUsuario = !usuarios.some(u => u.id_persona === p.id_persona);
            }
            return matchSearch && matchTipo && matchEmpresa && matchUsuario;
        });
        setFilteredData(filtered);
    }, [personas, usuarios, filterValues, getNombrePersona]);

    // --- Columnas de la tabla ---
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
            key: 'usuario',
            header: 'Usuario',
            render: (p) => {
                const usuario = usuarios.find(u => u.id_persona === p.id_persona);
                if (usuario) {
                    return (
                        <span className="dc-badge dc-badge-active">
                            <i className="fas fa-user-check"></i> {usuario.username}
                        </span>
                    );
                }
                return <span className="dc-badge dc-badge-inactive">Sin usuario</span>;
            }
        },
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

    // --- ABRIR MODAL DE CREACIÓN ---
    const openCreateModal = () => {
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
        setUsuarioFormValues({
            username: '',
            id_rol: '1',
            password: '',
            empresasIds: []
        });
        setCrearUsuario(false);
        if (empresaOptions.length > 0) {
            setSelectedEmpresaId(parseInt(empresaOptions[0].value));
        }
        setIsCreateModalOpen(true);
    };

    // --- FUNCIONES PARA GESTIONAR EMPRESAS DEL USUARIO ---
    const handleAsignarEmpresa = () => {
        if (selectedEmpresaId === '') {
            showToast('Seleccione una empresa para asignar', 'warning', 'Campos incompletos');
            return;
        }
        const empresaId = Number(selectedEmpresaId);
        if (usuarioFormValues.empresasIds.includes(empresaId)) {
            showToast('Esta empresa ya está asignada al usuario', 'warning', 'Empresa duplicada');
            return;
        }
        setUsuarioFormValues(prev => ({
            ...prev,
            empresasIds: [...prev.empresasIds, empresaId]
        }));
        showToast('Empresa asignada correctamente', 'success', 'Asignación');
    };

    const handleRemoverEmpresa = (empresaId: number) => {
        setUsuarioFormValues(prev => ({
            ...prev,
            empresasIds: prev.empresasIds.filter(id => id !== empresaId)
        }));
        showToast('Empresa removida', 'info', 'Remoción');
    };

    // --- CREAR PERSONA (y usuario opcional) ---
    const handleCreate = async () => {
        if (!formValues.numDoc || !formValues.celular || !formValues.id_empresa) {
            showToast('Documento, celular y empresa son obligatorios', 'warning', 'Campos incompletos');
            return;
        }

        if (crearUsuario) {
            if (!usuarioFormValues.username || !usuarioFormValues.password) {
                showToast('Username y contraseña son obligatorios', 'warning', 'Campos incompletos');
                return;
            }
            if (usuarios.some(u => u.username === usuarioFormValues.username)) {
                showToast('Este nombre de usuario ya existe', 'error', 'Error');
                return;
            }
            if (usuarioFormValues.empresasIds.length === 0) {
                showToast('Debe asignar al menos una empresa al usuario', 'warning', 'Empresas requeridas');
                return;
            }
        }

        setIsSubmitting(true);
        try {
            // 1. Crear la persona
            const personaPayload = {
                id_empresa: parseInt(formValues.id_empresa),
                tipo_persona: formValues.tipo as any,
                tipo_documento: formValues.tipoDoc as any,
                numero_documento: formValues.numDoc,
                razon_social: formValues.razonSocial || null,
                nombre: formValues.nombre || null,
                apellido: formValues.apellido || null,
                email: formValues.email || null,
                celular: formValues.celular,
                estado: true
            };

            const nuevaPersona = await personaApi.create(personaPayload);
            setPersonas([nuevaPersona, ...personas]);

            const nombreCompleto = getNombrePersona(nuevaPersona);
            await addActivity('INSERT', 'personas', `Nueva persona: ${nombreCompleto}`);
            await addToHistory(nuevaPersona, nombreCompleto, 'CREACIÓN', `Persona creada: ${nombreCompleto}`);

            // 2. Si se eligió crear usuario, crearlo con sus empresas
            if (crearUsuario) {
                const usuarioPayload = {
                    id_persona: nuevaPersona.id_persona,
                    username: usuarioFormValues.username,
                    password: usuarioFormValues.password,
                    id_rol: parseInt(usuarioFormValues.id_rol) as 1 | 2 | 3 | 4,
                    estado: true,
                    empresasIds: usuarioFormValues.empresasIds
                };

                const nuevoUsuario = await usuarioApi.create(usuarioPayload);
                setUsuarios([nuevoUsuario, ...usuarios]);

                await addActivity('INSERT', 'usuarios', `Nuevo usuario: ${usuarioFormValues.username}`);
                await addToHistory(
                    nuevoUsuario,
                    usuarioFormValues.username,
                    'CREACIÓN',
                    `Usuario creado para ${nombreCompleto} con ${usuarioFormValues.empresasIds.length} empresa(s)`
                );

                showToast(
                    `Persona "${nombreCompleto}" y usuario "${usuarioFormValues.username}" creados exitosamente`,
                    'success',
                    'Registro completo'
                );
            } else {
                showToast(`Persona "${nombreCompleto}" creada exitosamente`, 'success', 'Persona registrada');
            }

            setIsCreateModalOpen(false);
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
            setUsuarioFormValues({ username: '', id_rol: '1', password: '', empresasIds: [] });
            setCrearUsuario(false);
        } catch (error) {
            console.error('[PersonasUsuariosSection] Error al crear:', error);
            showToast('Error al crear el registro', 'error', 'Error');
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- VER DETALLE ---
    const handleView = async (persona: Persona) => {
        try {
            const historialPersona = await historialApi.getByEntity('personas', persona.id_persona);
            const personaConHistorial = { ...persona, historial: historialPersona };

            const usuario = usuarios.find(u => u.id_persona === persona.id_persona);
            let usuarioConHistorial: UsuarioConHistorial | null = null;
            let empresasUsuario: Empresa[] = [];

            if (usuario) {
                const historialUsuario = await historialApi.getByEntity('usuarios', usuario.id_usuario);
                usuarioConHistorial = { ...usuario, historial: historialUsuario } as UsuarioConHistorial;
                // Obtener empresas del usuario desde el contexto global
                const ids = (usuario as any).empresasIds || [];
                empresasUsuario = empresas.filter(e => ids.includes(e.id_empresa));
            }

            const camposPersona = [
                { label: 'TIPO', value: personaConHistorial.tipo_persona.replace('_', ' ') },
                { label: 'DOCUMENTO', value: `${personaConHistorial.tipo_documento}: ${personaConHistorial.numero_documento}` },
                { label: 'NOMBRE COMPLETO', value: getNombrePersona(personaConHistorial) },
                { label: 'EMAIL', value: personaConHistorial.email || '-' },
                { label: 'CELULAR', value: personaConHistorial.celular },
                { label: 'EMPRESA', value: getNombreEmpresa(personaConHistorial.id_empresa) },
                { label: 'ESTADO', value: personaConHistorial.estado ? 'ACTIVO' : 'INACTIVO' }
            ];

            const camposUsuario = usuarioConHistorial ? [
                { label: 'USERNAME', value: usuarioConHistorial.username },
                { label: 'ROL', value: ROLES[usuarioConHistorial.id_rol] },
                { label: 'ESTADO', value: usuarioConHistorial.estado ? 'ACTIVO' : 'INACTIVO' }
            ] : [];

            const historialHtml = (registros: HistorialEntry[]) => {
                if (!registros || registros.length === 0) {
                    return <div className="dc-history-entry">Sin historial registrado</div>;
                }
                return registros.map((h, idx) => (
                    <div key={idx} className="dc-history-entry">
                        <div>
                            <span className="dc-history-date">{h.fecha}</span>
                            <span className="dc-history-user"><i className="fas fa-user-circle"></i> {h.usuario}</span>
                        </div>
                        <div className="dc-history-action">{h.accion}</div>
                        <div className="dc-history-desc">{h.descripcion}</div>
                    </div>
                ));
            };

            setModalContent({
                title: `Detalle de ${getNombrePersona(personaConHistorial)}`,
                icon: 'fa-eye',
                children: (
                    <>
                        <div className="dc-info-card">
                            <h4><i className="fas fa-user-circle"></i> DATOS PERSONALES</h4>
                            <div className="dc-info-grid">
                                {camposPersona.map(campo => (
                                    <div key={campo.label} className="dc-info-item">
                                        <span className="dc-info-label">{campo.label}</span>
                                        <span className="dc-info-value">{campo.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {usuarioConHistorial && (
                            <div className="dc-info-card">
                                <h4><i className="fas fa-key"></i> CREDENCIALES DE USUARIO</h4>
                                <div className="dc-info-grid">
                                    {camposUsuario.map(campo => (
                                        <div key={campo.label} className="dc-info-item">
                                            <span className="dc-info-label">{campo.label}</span>
                                            <span className="dc-info-value">{campo.value}</span>
                                        </div>
                                    ))}
                                </div>
                                <div style={{ marginTop: '1rem' }}>
                                    <strong>Empresas asignadas:</strong>
                                    {empresasUsuario.length > 0 ? (
                                        <ul style={{ listStyle: 'none', padding: 0, marginTop: '0.5rem' }}>
                                            {empresasUsuario.map(e => (
                                                <li key={e.id_empresa} style={{ padding: '0.2rem 0', borderBottom: '1px solid #f0e2e6' }}>
                                                    <span className="dc-badge">{e.ruc}</span> {e.empresa}
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p style={{ color: 'var(--color-gray)' }}>Sin empresas asignadas</p>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="dc-history-card">
                            <h4><i className="fas fa-history"></i> HISTORIAL DE CAMBIOS</h4>
                            <div className="dc-history-log">
                                {historialHtml(personaConHistorial.historial)}
                            </div>
                        </div>

                        {usuarioConHistorial && (
                            <div className="dc-history-card" style={{ marginTop: '1rem' }}>
                                <h4><i className="fas fa-history"></i> HISTORIAL DEL USUARIO</h4>
                                <div className="dc-history-log">
                                    {historialHtml(usuarioConHistorial.historial)}
                                </div>
                            </div>
                        )}
                    </>
                ),
                footer: <button className="dc-btn secondary" onClick={() => setModalOpen(false)}><i className="fas fa-times"></i> Cerrar</button>
            });
            setModalOpen(true);
        } catch (error) {
            console.error('[PersonasUsuariosSection] Error cargando detalle:', error);
            showToast('Error al cargar el detalle', 'error', 'Error');
        }
    };

    // --- EDITAR ---
    const openEditModal = (persona: Persona) => {
        setSelectedPersona(persona);
        setFormValues({
            tipo: persona.tipo_persona,
            tipoDoc: persona.tipo_documento,
            numDoc: persona.numero_documento,
            nombre: persona.nombre || '',
            apellido: persona.apellido || '',
            razonSocial: persona.razon_social || '',
            email: persona.email || '',
            celular: persona.celular,
            id_empresa: String(persona.id_empresa)
        });

        const usuario = usuarios.find(u => u.id_persona === persona.id_persona);
        if (usuario) {
            setUsuarioFormValues({
                username: usuario.username,
                id_rol: String(usuario.id_rol),
                password: '',
                empresasIds: (usuario as any).empresasIds || []
            });
            setCrearUsuario(true);
        } else {
            setUsuarioFormValues({ username: '', id_rol: '1', password: '', empresasIds: [] });
            setCrearUsuario(false);
        }

        setIsEditModalOpen(true);
    };

    // --- GUARDAR EDICIÓN ---
    const handleUpdate = async () => {
        if (!selectedPersona) return;

        if (!formValues.numDoc || !formValues.celular || !formValues.id_empresa) {
            showToast('Documento, celular y empresa son obligatorios', 'warning', 'Campos incompletos');
            return;
        }

        if (crearUsuario) {
            if (!usuarioFormValues.username) {
                showToast('Username es obligatorio', 'warning', 'Campos incompletos');
                return;
            }
            const usuarioExistente = usuarios.find(u =>
                u.username === usuarioFormValues.username &&
                u.id_persona !== selectedPersona.id_persona
            );
            if (usuarioExistente) {
                showToast('Este nombre de usuario ya existe', 'error', 'Error');
                return;
            }
            const usuarioActual = usuarios.find(u => u.id_persona === selectedPersona.id_persona);
            if (!usuarioActual && !usuarioFormValues.password) {
                showToast('La contraseña es obligatoria para crear un usuario', 'warning', 'Campos incompletos');
                return;
            }
            if (usuarioFormValues.empresasIds.length === 0) {
                showToast('Debe asignar al menos una empresa al usuario', 'warning', 'Empresas requeridas');
                return;
            }
        }

        setIsSubmitting(true);
        try {
            // 1. Actualizar la persona
            const personaPayload: any = {
                id_empresa: parseInt(formValues.id_empresa),
                tipo_persona: selectedPersona.tipo_persona,
                tipo_documento: selectedPersona.tipo_documento,
                numero_documento: selectedPersona.numero_documento,
                razon_social: selectedPersona.razon_social,
                nombre: formValues.nombre || null,
                apellido: formValues.apellido || null,
                email: formValues.email || null,
                celular: formValues.celular,
                estado: selectedPersona.estado
            };

            const personaActualizada = await personaApi.update(selectedPersona.id_persona, personaPayload);
            setPersonas(prev => prev.map(p =>
                p.id_persona === personaActualizada.id_persona ? personaActualizada : p
            ));

            const nombreCompleto = getNombrePersona(personaActualizada);
            await addActivity('MODIFICAR', 'personas', `Persona actualizada: ${nombreCompleto}`);

            const cambiosPersona = [];
            if (formValues.nombre !== selectedPersona.nombre) cambiosPersona.push(`Nombre: "${selectedPersona.nombre}" → "${formValues.nombre}"`);
            if (formValues.apellido !== selectedPersona.apellido) cambiosPersona.push(`Apellido: "${selectedPersona.apellido}" → "${formValues.apellido}"`);
            if (formValues.email !== selectedPersona.email) cambiosPersona.push(`Email: "${selectedPersona.email}" → "${formValues.email}"`);
            if (formValues.celular !== selectedPersona.celular) cambiosPersona.push(`Celular: "${selectedPersona.celular}" → "${formValues.celular}"`);
            if (parseInt(formValues.id_empresa) !== selectedPersona.id_empresa) {
                cambiosPersona.push(`Empresa: "${getNombreEmpresa(selectedPersona.id_empresa)}" → "${getNombreEmpresa(parseInt(formValues.id_empresa))}"`);
            }

            if (cambiosPersona.length > 0) {
                await addToHistory(personaActualizada, nombreCompleto, 'MODIFICACIÓN', cambiosPersona.join(', '));
            }

            // 2. Gestionar usuario y sus empresas
            const usuarioActual = usuarios.find(u => u.id_persona === selectedPersona.id_persona);

            if (crearUsuario) {
                if (usuarioActual) {
                    // Actualizar usuario existente
                    const usuarioPayload: any = {
                        id_persona: selectedPersona.id_persona,
                        username: usuarioFormValues.username,
                        id_rol: parseInt(usuarioFormValues.id_rol) as 1 | 2 | 3 | 4,
                        estado: usuarioActual.estado,
                        empresasIds: usuarioFormValues.empresasIds
                    };

                    const usuarioActualizado = await usuarioApi.update(usuarioActual.id_usuario, usuarioPayload);
                    setUsuarios(prev => prev.map(u =>
                        u.id_usuario === usuarioActualizado.id_usuario ? { ...usuarioActualizado, empresasIds: usuarioFormValues.empresasIds } : u
                    ));

                    await addActivity('MODIFICAR', 'usuarios', `Usuario actualizado: ${usuarioFormValues.username}`);
                    const cambiosUsuario = [];
                    if (usuarioFormValues.username !== usuarioActual.username) {
                        cambiosUsuario.push(`Username: "${usuarioActual.username}" → "${usuarioFormValues.username}"`);
                    }
                    if (parseInt(usuarioFormValues.id_rol) !== usuarioActual.id_rol) {
                        cambiosUsuario.push(`Rol: "${ROLES[usuarioActual.id_rol]}" → "${ROLES[parseInt(usuarioFormValues.id_rol)]}"`);
                    }
                    cambiosUsuario.push(`Empresas asignadas: ${usuarioFormValues.empresasIds.length} empresa(s)`);
                    if (cambiosUsuario.length > 0) {
                        await addToHistory(usuarioActualizado, usuarioFormValues.username, 'MODIFICACIÓN', cambiosUsuario.join(', '));
                    }

                    showToast(`Persona y usuario actualizados correctamente`, 'success', 'Actualizado');
                } else {
                    // Crear nuevo usuario
                    if (!usuarioFormValues.password) {
                        showToast('La contraseña es obligatoria para crear un usuario', 'warning', 'Campos incompletos');
                        setIsSubmitting(false);
                        return;
                    }
                    const nuevoUsuarioPayload = {
                        id_persona: selectedPersona.id_persona,
                        username: usuarioFormValues.username,
                        password: usuarioFormValues.password,
                        id_rol: parseInt(usuarioFormValues.id_rol) as 1 | 2 | 3 | 4,
                        estado: true,
                        empresasIds: usuarioFormValues.empresasIds
                    };

                    const nuevoUsuario = await usuarioApi.create(nuevoUsuarioPayload);
                    setUsuarios([nuevoUsuario, ...usuarios]);

                    await addActivity('INSERT', 'usuarios', `Nuevo usuario: ${usuarioFormValues.username}`);
                    await addToHistory(
                        nuevoUsuario,
                        usuarioFormValues.username,
                        'CREACIÓN',
                        `Usuario creado para ${nombreCompleto} con ${usuarioFormValues.empresasIds.length} empresa(s)`
                    );

                    showToast(`Persona actualizada y usuario "${usuarioFormValues.username}" creado`, 'success', 'Actualizado');
                }
            } else {
                if (usuarioActual) {
                    await usuarioApi.delete(usuarioActual.id_usuario);
                    setUsuarios(prev => prev.filter(u => u.id_usuario !== usuarioActual.id_usuario));
                    await addActivity('ELIMINAR', 'usuarios', `Usuario eliminado: ${usuarioActual.username}`);
                    showToast(`Persona actualizada y usuario eliminado`, 'success', 'Actualizado');
                } else {
                    showToast('Persona actualizada correctamente', 'success', 'Actualizado');
                }
            }

            setIsEditModalOpen(false);
            setSelectedPersona(null);
        } catch (error) {
            console.error('[PersonasUsuariosSection] Error al actualizar:', error);
            showToast('Error al actualizar el registro', 'error', 'Error');
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- ELIMINAR ---
    const handleDelete = (persona: Persona) => {
        const nombre = getNombrePersona(persona);
        const handleConfirm = async () => {
            setIsSubmitting(true);
            try {
                await personaApi.delete(persona.id_persona);
                setPersonas(prev => prev.filter(p => p.id_persona !== persona.id_persona));
                setUsuarios(prev => prev.filter(u => u.id_persona !== persona.id_persona));
                await addActivity('ELIMINAR', 'personas', `Eliminado "${nombre}"`);
                showToast(`"${nombre}" ha sido eliminado correctamente`, 'success', 'Eliminado');
                setModalOpen(false);
            } catch (error) {
                console.error('[PersonasUsuariosSection] Error al eliminar:', error);
                showToast('Error al eliminar el registro', 'error', 'Error');
            } finally {
                setIsSubmitting(false);
            }
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
                    <p>
                        Esta acción es <strong>irreversible</strong>.
                        {usuarios.some(u => u.id_persona === persona.id_persona) && (
                            <span style={{ color: 'var(--color-peligro)', fontWeight: 'bold' }}>
                                {' '}También se eliminará el usuario asociado.
                            </span>
                        )}
                    </p>
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

    // --- ACTIVITY LOGS ---
    const actividadLogs = activityLogs.filter(log =>
        log.modulo === 'personas' || log.modulo === 'usuarios' || log.modulo === 'personas-usuarios'
    ).slice(0, 5);

    // --- RENDER ---
    return (
        <div data-tab="personas-usuarios">
            <div>
                <div style={{ marginBottom: '1.5rem' }}>
                    <button className="dc-btn" onClick={openCreateModal}>
                        <i className="fas fa-plus-circle"></i> Nueva Persona
                    </button>
                </div>

                <FilterSection
                    title="Filtrar personas"
                    filters={personaFilters}
                    values={filterValues}
                    onChange={(id, value) => setFilterValues(prev => ({ ...prev, [id]: value }))}
                    onClear={() => setFilterValues({ search: '', tipo: '', empresa: '', tieneUsuario: '' })}
                />

                <div className="dc-results-count">
                    <i className="fas fa-list-ul"></i> Mostrando {filteredData.length} de {personas.length} personas
                </div>

                <DataTable
                    columns={columns}
                    data={filteredData}
                    emptyMessage="👤 No hay personas registradas"
                    actions={(item) => (
                        <>
                            <i className="fas fa-eye" onClick={() => handleView(item)} title="Ver detalle"></i>
                            <i className="fas fa-edit" onClick={() => openEditModal(item)} title="Editar"></i>
                            <i className="fas fa-trash-alt" onClick={() => handleDelete(item)} title="Eliminar"></i>
                        </>
                    )}
                />

                <ActivityLog logs={actividadLogs} title="Actividad reciente · Personas y Usuarios" />

                {/* Modal de ver detalle */}
                <Modal
                    isOpen={modalOpen}
                    onClose={() => setModalOpen(false)}
                    title={modalContent?.title || ''}
                    icon={modalContent?.icon}
                    footer={modalContent?.footer}
                >
                    {modalContent?.children}
                </Modal>

                {/* Modal de creación */}
                <Modal
                    isOpen={isCreateModalOpen}
                    onClose={() => setIsCreateModalOpen(false)}
                    title="Nueva Persona"
                    icon="fa-user-plus"
                    footer={
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', width: '100%' }}>
                            <button className="dc-btn secondary" onClick={() => setIsCreateModalOpen(false)}>
                                <i className="fas fa-times"></i> Cancelar
                            </button>
                            <button className="dc-btn success" onClick={handleCreate} disabled={isSubmitting}>
                                {isSubmitting ? 'Registrando...' : <><i className="fas fa-save"></i> Registrar</>}
                            </button>
                        </div>
                    }
                >
                    {/* Formulario de persona */}
                    <div className="dc-form-grid" style={{ marginBottom: '1rem' }}>
                        {personaFormFields.map((field) => {
                            const fieldOptions = field.id === 'id_empresa'
                                ? [{ value: '', label: 'Seleccione empresa' }, ...empresaOptions]
                                : field.options;
                            return (
                                <div key={field.id} className="dc-input-group" style={{ flex: 1, minWidth: '150px' }}>
                                    <label>{field.label}</label>
                                    {field.type === 'select' ? (
                                        <select
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

                    {/* Toggle para crear usuario */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.5rem 0', borderTop: '1px solid #f0d6db', marginTop: '0.5rem' }}>
                        <label style={{ fontWeight: '600', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={crearUsuario}
                                onChange={(e) => setCrearUsuario(e.target.checked)}
                                style={{ marginRight: '0.5rem' }}
                            />
                            Crear usuario para esta persona
                        </label>
                    </div>

                    {/* Campos de usuario y gestión de empresas */}
                    {crearUsuario && (
                        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #f0d6db' }}>
                            <div className="dc-form-grid" style={{ marginBottom: '1rem' }}>
                                {usuarioFormFields.map((field) => (
                                    <div key={field.id} className="dc-input-group" style={{ flex: 1, minWidth: '150px' }}>
                                        <label>{field.label}</label>
                                        <input
                                            type={field.type === 'password' ? 'password' : 'text'}
                                            placeholder={field.placeholder}
                                            value={(usuarioFormValues as any)[field.id] || ''}
                                            onChange={(e) => setUsuarioFormValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                                            required={field.required}
                                        />
                                    </div>
                                ))}
                            </div>

                            <div style={{ borderTop: '1px solid #f0d6db', paddingTop: '1rem', marginTop: '0.5rem' }}>
                                <h4 style={{ marginBottom: '0.5rem' }}>
                                    <i className="fas fa-building"></i> Asignar Empresa
                                </h4>
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                                    <div className="dc-input-group" style={{ flex: 1, minWidth: '150px' }}>
                                        <label>Seleccione una empresa</label>
                                        <select
                                            value={selectedEmpresaId}
                                            onChange={(e) => setSelectedEmpresaId(Number(e.target.value))}
                                            style={{ width: '100%', padding: '0.5rem' }}
                                        >
                                            {empresaOptions.map(opt => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <button
                                        className="dc-btn info"
                                        onClick={handleAsignarEmpresa}
                                        style={{ marginBottom: '0.25rem' }}
                                    >
                                        <i className="fas fa-plus"></i> Asignar
                                    </button>
                                </div>

                                {usuarioFormValues.empresasIds.length > 0 ? (
                                    <div className="dc-table-wrapper" style={{ marginTop: '0.5rem' }}>
                                        <table className="dc-table">
                                            <thead>
                                                <tr>
                                                    <th>RUC</th>
                                                    <th>Empresa</th>
                                                    <th>Acciones</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {usuarioFormValues.empresasIds.map(id => {
                                                    const empresa = empresas.find(e => e.id_empresa === id);
                                                    if (!empresa) return null;
                                                    return (
                                                        <tr key={id}>
                                                            <td>{empresa.ruc}</td>
                                                            <td>{empresa.empresa}</td>
                                                            <td>
                                                                <button
                                                                    className="dc-btn danger"
                                                                    style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
                                                                    onClick={() => handleRemoverEmpresa(id)}
                                                                >
                                                                    <i className="fas fa-trash"></i> Remover
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <p style={{ color: 'var(--color-gray)', marginTop: '0.5rem' }}>
                                        No hay empresas asignadas. Seleccione una y presione "Asignar".
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </Modal>

                {/* Modal de edición */}
                <Modal
                    isOpen={isEditModalOpen}
                    onClose={() => {
                        setIsEditModalOpen(false);
                        setSelectedPersona(null);
                    }}
                    title={`Editar ${selectedPersona ? getNombrePersona(selectedPersona) : ''}`}
                    icon="fa-edit"
                    footer={
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', width: '100%' }}>
                            <button className="dc-btn secondary" onClick={() => setIsEditModalOpen(false)}>
                                <i className="fas fa-times"></i> Cancelar
                            </button>
                            <button className="dc-btn success" onClick={handleUpdate} disabled={isSubmitting}>
                                {isSubmitting ? 'Guardando...' : <><i className="fas fa-save"></i> Guardar Cambios</>}
                            </button>
                        </div>
                    }
                >
                    <div className="dc-form-grid" style={{ marginBottom: '1rem' }}>
                        {personaFormFields.map((field) => {
                            const fieldOptions = field.id === 'id_empresa'
                                ? [{ value: '', label: 'Seleccione empresa' }, ...empresaOptions]
                                : field.options;
                            if (field.type === 'select') {
                                return (
                                    <div key={field.id} className="dc-input-group" style={{ flex: 1, minWidth: '150px' }}>
                                        <label>{field.label}</label>
                                        <select
                                            value={(formValues as any)[field.id] || ''}
                                            onChange={(e) => setFormValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                                            required={field.required}
                                        >
                                            {fieldOptions?.map(opt => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                );
                            } else if (field.id === 'nombre' || field.id === 'apellido' || field.id === 'email' || field.id === 'celular') {
                                return (
                                    <div key={field.id} className="dc-input-group" style={{ flex: 1, minWidth: '150px' }}>
                                        <label>{field.label}</label>
                                        <input
                                            type={field.type}
                                            placeholder={field.placeholder}
                                            value={(formValues as any)[field.id] || ''}
                                            onChange={(e) => setFormValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                                            required={field.required}
                                        />
                                    </div>
                                );
                            }
                            return null;
                        })}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.5rem 0', borderTop: '1px solid #f0d6db', marginTop: '0.5rem' }}>
                        <label style={{ fontWeight: '600', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={crearUsuario}
                                onChange={(e) => setCrearUsuario(e.target.checked)}
                                style={{ marginRight: '0.5rem' }}
                            />
                            {usuarios.some(u => u.id_persona === selectedPersona?.id_persona) ? 'Editar usuario' : 'Crear usuario'}
                        </label>
                    </div>

                    {crearUsuario && (
                        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #f0d6db' }}>
                            <div className="dc-form-grid" style={{ marginBottom: '1rem' }}>
                                {usuarioFormFields.map((field) => {
                                    const usuarioActual = usuarios.find(u => u.id_persona === selectedPersona?.id_persona);
                                    if (field.id === 'password' && usuarioActual) {
                                        return (
                                            <div key={field.id} className="dc-input-group" style={{ flex: 1, minWidth: '150px' }}>
                                                <label>{field.label} (opcional)</label>
                                                <input
                                                    type="password"
                                                    placeholder="Dejar vacío para no cambiar"
                                                    value={(usuarioFormValues as any)[field.id] || ''}
                                                    onChange={(e) => setUsuarioFormValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                                                />
                                            </div>
                                        );
                                    }
                                    return (
                                        <div key={field.id} className="dc-input-group" style={{ flex: 1, minWidth: '150px' }}>
                                            <label>{field.label}</label>
                                            <input
                                                type={field.id === 'password' ? 'password' : 'text'}
                                                placeholder={field.placeholder}
                                                value={(usuarioFormValues as any)[field.id] || ''}
                                                onChange={(e) => setUsuarioFormValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                                                required={!usuarioActual && field.required}
                                            />
                                        </div>
                                    );
                                })}
                            </div>

                            <div style={{ borderTop: '1px solid #f0d6db', paddingTop: '1rem', marginTop: '0.5rem' }}>
                                <h4 style={{ marginBottom: '0.5rem' }}>
                                    <i className="fas fa-building"></i> Asignar Empresa
                                </h4>
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                                    <div className="dc-input-group" style={{ flex: 1, minWidth: '150px' }}>
                                        <label>Seleccione una empresa</label>
                                        <select
                                            value={selectedEmpresaId}
                                            onChange={(e) => setSelectedEmpresaId(Number(e.target.value))}
                                            style={{ width: '100%', padding: '0.5rem' }}
                                        >
                                            {empresaOptions.map(opt => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <button
                                        className="dc-btn info"
                                        onClick={handleAsignarEmpresa}
                                        style={{ marginBottom: '0.25rem' }}
                                    >
                                        <i className="fas fa-plus"></i> Asignar
                                    </button>
                                </div>

                                {usuarioFormValues.empresasIds.length > 0 ? (
                                    <div className="dc-table-wrapper" style={{ marginTop: '0.5rem' }}>
                                        <table className="dc-table">
                                            <thead>
                                                <tr>
                                                    <th>RUC</th>
                                                    <th>Empresa</th>
                                                    <th>Acciones</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {usuarioFormValues.empresasIds.map(id => {
                                                    const empresa = empresas.find(e => e.id_empresa === id);
                                                    if (!empresa) return null;
                                                    return (
                                                        <tr key={id}>
                                                            <td>{empresa.ruc}</td>
                                                            <td>{empresa.empresa}</td>
                                                            <td>
                                                                <button
                                                                    className="dc-btn danger"
                                                                    style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
                                                                    onClick={() => handleRemoverEmpresa(id)}
                                                                >
                                                                    <i className="fas fa-trash"></i> Remover
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <p style={{ color: 'var(--color-gray)', marginTop: '0.5rem' }}>
                                        No hay empresas asignadas. Seleccione una y presione "Asignar".
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
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