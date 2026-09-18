import React, { useState, useEffect } from 'react';
import { Modal } from '../../../../components/common/modal/Modal';
import { CategoriaAlimento, Persona } from '../../../types/person';
import { Receta, IngredienteReceta, PasoReceta } from '../../../types/recipe';
import { recetaApi } from '../../../../services/api/recetaApi';
import { ingredienteApi, Ingrediente } from '../../../../services/api/ingredienteApi';
import { useCompany } from '../../../../features/company/context/CompanyContext';
import { useToast } from '../../../../hooks/base/useToast';
import { normalizeText } from '../../../../utils/normalizeText';

interface RecipeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    receta?: Receta | null;
    categorias: CategoriaAlimento[];
    ingredientesExistentes: Ingrediente[];
    proveedores: Persona[];
    onRefreshIngredientes: () => void;
}

export const RecipeModal: React.FC<RecipeModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    receta,
    categorias,
    ingredientesExistentes,
    proveedores,
    onRefreshIngredientes
}) => {
    const { getSelectedCompanyId } = useCompany();
    const { showToast } = useToast();
    const id_empresa = getSelectedCompanyId() ?? 0;

    const [nombre, setNombre] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [categoriaReceta, setCategoriaReceta] = useState('plato_principal');
    const [tipoPreparacion, setTipoPreparacion] = useState<'por_unidad' | 'por_molde' | 'por_lote'>('por_unidad');
    const [cantidadBase, setCantidadBase] = useState(1);
    const [porcionesPorUnidad, setPorcionesPorUnidad] = useState(1);

    const [tiempoPreparacion, setTiempoPreparacion] = useState<number | ''>('');
    const [tiempoCoccion, setTiempoCoccion] = useState<number | ''>('');
    const [dificultad, setDificultad] = useState('media');
    const [rendimiento, setRendimiento] = useState(100);

    const [ingredientes, setIngredientes] = useState<IngredienteReceta[]>([]);
    const [nombreIngrediente, setNombreIngrediente] = useState('');
    const [unidadIngrediente, setUnidadIngrediente] = useState('unidades');
    const [cantidadIngrediente, setCantidadIngrediente] = useState<number>(1);
    const [notasIngrediente, setNotasIngrediente] = useState('');
    const [esOpcional, setEsOpcional] = useState(false);
    const [categoriaIngrediente, setCategoriaIngrediente] = useState<number | null>(null);
    const [sugerencias, setSugerencias] = useState<Ingrediente[]>([]);
    const [showSugerencias, setShowSugerencias] = useState(false);

    const [formaAgrupacion, setFormaAgrupacion] = useState<'categoria' | 'proveedor'>('categoria');
    const [proveedoresSeleccionados, setProveedoresSeleccionados] = useState<number[]>([]);

    const [incluirPasos, setIncluirPasos] = useState(false);
    const [pasos, setPasos] = useState<PasoReceta[]>([]);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const isEdit = !!receta;

    const esIngredienteNuevo = nombreIngrediente.trim() !== '' &&
        !ingredientesExistentes.find(i => normalizeText(i.nombre) === normalizeText(nombreIngrediente));

    const proveedoresSugeridos = categoriaIngrediente ? proveedores.filter(p => { return true; }) : [];

    const getEtiquetaCantidadBase = () => {
        switch (tipoPreparacion) {
            case 'por_unidad': return '¿Cuántas unidades rinde la receta?';
            case 'por_molde': return '¿Cuántos moldes?';
            case 'por_lote': return '¿Cuántos lotes?';
        }
    };

    const getEtiquetaPorciones = () => {
        switch (tipoPreparacion) {
            case 'por_unidad': return '¿Porciones por unidad?';
            case 'por_molde': return '¿Porciones por molde?';
            case 'por_lote': return '¿Porciones por lote?';
        }
    };

    useEffect(() => {
        if (receta) {
            setNombre(receta.nombre);
            setDescripcion(receta.descripcion || '');
            setCategoriaReceta(receta.categoria_receta);
            setTipoPreparacion(receta.tipo_preparacion);
            setCantidadBase(receta.cantidad_base);
            setPorcionesPorUnidad(receta.porciones_por_unidad);
            setTiempoPreparacion(receta.tiempo_preparacion ?? '');
            setTiempoCoccion(receta.tiempo_coccion ?? '');
            setDificultad(receta.dificultad);
            setRendimiento(receta.rendimiento);
            setIngredientes(receta.ingredientes || []);
            setPasos(receta.pasos || []);
            setIncluirPasos((receta.pasos || []).length > 0);
        } else {
            setNombre('');
            setDescripcion('');
            setCategoriaReceta('plato_principal');
            setTipoPreparacion('por_unidad');
            setCantidadBase(0);
            setPorcionesPorUnidad(0);
            setTiempoPreparacion('');
            setTiempoCoccion('');
            setDificultad('facil');
            setRendimiento(0);
            setIngredientes([]);
            setPasos([]);
            setIncluirPasos(false);
        }
        resetIngredienteForm();
    }, [receta, isOpen]);

    const resetIngredienteForm = () => {
        setNombreIngrediente('');
        setUnidadIngrediente('unidades');
        setCantidadIngrediente(0);
        setNotasIngrediente('');
        setEsOpcional(false);
        setCategoriaIngrediente(null);
        setSugerencias([]);
        setShowSugerencias(false);
        setFormaAgrupacion('categoria');
        setProveedoresSeleccionados([]);
    };

    useEffect(() => {
        if (tipoPreparacion === 'por_unidad' && porcionesPorUnidad !== 1) {
            setPorcionesPorUnidad(1);
        }
    }, [tipoPreparacion]);

    const handleBuscarIngrediente = (valor: string) => {
        setNombreIngrediente(valor);
        if (!valor.trim()) {
            setSugerencias([]);
            setShowSugerencias(false);
            return;
        }
        const nombreNormalizado = normalizeText(valor);
        const encontrados = ingredientesExistentes.filter(i =>
            i.nombre.toLowerCase().includes(nombreNormalizado.toLowerCase())
        ).slice(0, 5);
        setSugerencias(encontrados);
        setShowSugerencias(encontrados.length > 0);
    };

    const seleccionarIngrediente = (ingrediente: Ingrediente) => {
        setNombreIngrediente(ingrediente.nombre);
        setUnidadIngrediente(ingrediente.unidad);
        setCategoriaIngrediente(ingrediente.id_categoria);
        setSugerencias([]);
        setShowSugerencias(false);
    };

    const toggleProveedor = (id: number) => {
        setProveedoresSeleccionados(prev =>
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
        );
    };

    const agregarIngrediente = () => {
        const nombreNorm = normalizeText(nombreIngrediente);
        if (!nombreNorm) {
            showToast('Ingrese el nombre del ingrediente', 'warning', 'Campos incompletos');
            return;
        }
        if (cantidadIngrediente <= 0) {
            showToast('La cantidad debe ser mayor a 0', 'warning', 'Cantidad inválida');
            return;
        }

        const ingredienteExistente = ingredientesExistentes.find(i =>
            normalizeText(i.nombre) === nombreNorm
        );

        if (ingredienteExistente) {
            const yaAgregado = ingredientes.find(i => i.id_ingrediente === ingredienteExistente.id);
            if (yaAgregado) {
                showToast('Este ingrediente ya está en la receta', 'warning', 'Duplicado');
                return;
            }
            setIngredientes([...ingredientes, {
                id_ingrediente: ingredienteExistente.id,
                nombre: ingredienteExistente.nombre,
                cantidad: cantidadIngrediente,
                unidad: ingredienteExistente.unidad,
                notas: notasIngrediente.trim() || null,
                es_opcional: esOpcional,
                id_categoria: ingredienteExistente.id_categoria,
                categoria: ingredienteExistente.categoria || null,
                esNuevo: false
            }]);
        } else {
            if (formaAgrupacion === 'categoria') {
                if (!categoriaIngrediente) {
                    showToast('Seleccione una categoría para el nuevo ingrediente', 'warning', 'Categoría requerida');
                    return;
                }
            } else {
                if (proveedoresSeleccionados.length === 0) {
                    showToast('Seleccione al menos un proveedor', 'warning', 'Proveedor requerido');
                    return;
                }
            }

            const categoria = categoriaIngrediente
                ? categorias.find(c => c.id === categoriaIngrediente) || null
                : null;

            setIngredientes([...ingredientes, {
                id_ingrediente: null,
                nombre: nombreNorm,
                cantidad: cantidadIngrediente,
                unidad: normalizeText(unidadIngrediente),
                notas: notasIngrediente.trim() || null,
                es_opcional: esOpcional,
                id_categoria: categoriaIngrediente || null,
                categoria: categoria,
                esNuevo: true,
                forma_agrupacion: formaAgrupacion,
                proveedores_ids: formaAgrupacion === 'proveedor' ? proveedoresSeleccionados : []
            } as any]);
        }
        resetIngredienteForm();
    };

    const eliminarIngrediente = (index: number) => {
        setIngredientes(prev => prev.filter((_, i) => i !== index));
    };

    const agregarPaso = () => {
        setPasos([...pasos, { orden: pasos.length + 1, descripcion: '' }]);
    };

    const actualizarPaso = (index: number, descripcion: string) => {
        setPasos(prev => prev.map((p, i) => i === index ? { ...p, descripcion } : p));
    };

    const eliminarPaso = (index: number) => {
        setPasos(prev => prev.filter((_, i) => i !== index).map((p, i) => ({ ...p, orden: i + 1 })));
    };

    const handleSubmit = async () => {
        const nombreNorm = normalizeText(nombre);
        if (!nombreNorm) {
            showToast('El nombre de la receta es obligatorio', 'warning', 'Campos incompletos');
            return;
        }
        if (ingredientes.length === 0) {
            showToast('Agregue al menos un ingrediente', 'warning', 'Campos incompletos');
            return;
        }

        setIsSubmitting(true);
        try {
            const ingredientesFinales: IngredienteReceta[] = [];
            for (const ing of ingredientes) {
                if (ing.esNuevo && ing.id_ingrediente === null) {
                    const formaAgrup = (ing as any).forma_agrupacion || 'categoria';
                    const proveedoresIds = (ing as any).proveedores_ids || [];

                    const nuevoIng = await ingredienteApi.create({
                        id_empresa,
                        nombre: ing.nombre,
                        unidad: ing.unidad,
                        id_categoria: ing.id_categoria,
                        forma_agrupacion: formaAgrup,
                        proveedores: proveedoresIds
                    });
                    ingredientesFinales.push({ ...ing, id_ingrediente: nuevoIng.id, esNuevo: false });
                } else {
                    ingredientesFinales.push(ing);
                }
            }

            await onRefreshIngredientes();

            const pasosFinales = incluirPasos
                ? pasos.filter(p => p.descripcion.trim()).map((p, i) => ({ orden: i + 1, descripcion: p.descripcion.trim() }))
                : [];

            const recetaPayload: any = {
                id_empresa,
                nombre: nombreNorm,
                descripcion: descripcion.trim() || null,
                id_producto_carta: null,
                categoria_receta: categoriaReceta,
                tipo_preparacion: tipoPreparacion,
                cantidad_base: cantidadBase,
                porciones_por_unidad: tipoPreparacion === 'por_unidad' ? 1 : porcionesPorUnidad,
                tiempo_preparacion: tiempoPreparacion || null,
                tiempo_coccion: tiempoCoccion || null,
                dificultad,
                rendimiento,
                created_by: 'admin',
                ingredientes: ingredientesFinales.map(i => ({
                    id_ingrediente: i.id_ingrediente,
                    cantidad: i.cantidad,
                    unidad: i.unidad,
                    notas: i.notas,
                    es_opcional: i.es_opcional
                })),
                pasos: pasosFinales
            };

            if (isEdit && receta) {
                await recetaApi.update(receta.id, recetaPayload);
                showToast(`Receta "${nombreNorm}" actualizada`, 'success', 'Actualizado');
            } else {
                await recetaApi.create(recetaPayload);
                showToast(`Receta "${nombreNorm}" creada`, 'success', 'Creado');
            }

            onSuccess();
            onClose();
        } catch (error) {
            console.error('[RecipeModal] Error al guardar:', error);
            showToast('Error al guardar la receta', 'error', 'Error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const modalFooter = (
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', width: '100%' }}>
            <button className="dc-btn success" onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? 'Guardando...' : <><i className="fas fa-save"></i> {isEdit ? 'Actualizar' : 'Crear'}</>}
            </button>
        </div>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isEdit ? 'Editar Receta' : 'Nueva Receta'}
            icon={isEdit ? 'fa-edit' : 'fa-book'}
            footer={modalFooter}
        >
            {/* ============================================== */}
            {/* INFORMACIÓN BÁSICA */}
            {/* ============================================== */}
            <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ marginBottom: '0.75rem' }}>
                    <i className="fas fa-info-circle"></i> Información Básica
                </h4>
                <div className="dc-form-grid">
                    <div className="dc-input-group">
                        <label>Nombre <span style={{ color: 'red' }}>*</span></label>
                        <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Sándwich Premium" />
                    </div>
                    <div className="dc-input-group">
                        <label>Descripción</label>
                        <input type="text" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Descripción breve" />
                    </div>
                    <div className="dc-input-group">
                        <label>Categoría</label>
                        <select value={categoriaReceta} onChange={(e) => setCategoriaReceta(e.target.value)}>
                            <option value="entrada">Entrada</option>
                            <option value="plato_principal">Plato Principal</option>
                            <option value="postre">Postre</option>
                            <option value="bebida">Bebida</option>
                            <option value="salsa">Salsa</option>
                            <option value="panificado">Panificado</option>
                        </select>
                    </div>
                </div>

                {/* Tipo de preparación */}
                <div style={{ marginTop: '1rem' }}>
                    <label style={{ fontWeight: '600', display: 'block', marginBottom: '0.5rem' }}>Tipo de preparación:</label>
                    <div className="dc-tabs" style={{ marginBottom: '1rem' }}>
                        {[
                            { value: 'por_unidad', label: 'Por Unidad' },
                            { value: 'por_molde', label: 'Por Molde' },
                            { value: 'por_lote', label: 'Por Lote' }
                        ].map(t => (
                            <button
                                key={t.value}
                                type="button"
                                className={`dc-tab-btn ${tipoPreparacion === t.value ? 'active' : ''}`}
                                onClick={() => setTipoPreparacion(t.value as any)}
                            >
                                <strong>{t.label}</strong>
                                <br />
                            </button>
                        ))}
                    </div>
                </div>

                {/* Cálculo de porciones */}
                <div style={{ marginTop: '1rem' }}>
                    <div className="dc-form-grid">
                        <div className="dc-input-group">
                            <label>{getEtiquetaCantidadBase()}</label>
                            <input
                                type="number"
                                min="0"
                                step="0"
                                value={cantidadBase}
                                onChange={(e) => setCantidadBase(parseFloat(e.target.value) || 0)}
                            />
                        </div>
                        {tipoPreparacion !== 'por_unidad' && (
                            <div className="dc-input-group">
                                <label>{getEtiquetaPorciones()}</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0"
                                    value={porcionesPorUnidad}
                                    onChange={(e) => setPorcionesPorUnidad(parseInt(e.target.value) || 0)}
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Info adicional */}
                <div className="dc-form-grid" style={{ marginTop: '1rem' }}>
                    <div className="dc-input-group">
                        <label>Tiempo prep. (min)</label>
                        <input type="number" min="0" value={tiempoPreparacion} onChange={(e) => setTiempoPreparacion(e.target.value ? parseInt(e.target.value) : '')} />
                    </div>
                    <div className="dc-input-group">
                        <label>Tiempo cocción (min)</label>
                        <input type="number" min="0" value={tiempoCoccion} onChange={(e) => setTiempoCoccion(e.target.value ? parseInt(e.target.value) : '')} />
                    </div>
                    <div className="dc-input-group">
                        <label>Dificultad</label>
                        <select value={dificultad} onChange={(e) => setDificultad(e.target.value)}>
                            <option value="fácil">Fácil</option>
                            <option value="media">Media</option>
                            <option value="difícil">Difícil</option>
                        </select>
                    </div>
                    <div className="dc-input-group">
                        <label>Rendimiento (%)</label>
                        <input type="number" min="1" max="100" value={rendimiento} onChange={(e) => setRendimiento(parseFloat(e.target.value) || 100)} />
                    </div>
                </div>
            </div>

            {/* ============================================== */}
            {/* INGREDIENTES */}
            {/* ============================================== */}
            <div style={{ borderTop: '1px solid #f0d6db', paddingTop: '1rem' }}>
                <h4 style={{ marginBottom: '0.75rem' }}>
                    <i className="fas fa-box"></i> Ingredientes
                </h4>

                {/* Formulario para agregar ingrediente */}
                <div className="dc-form-grid" style={{ marginBottom: '1rem' }}>
                    <div className="dc-input-group">
                        <label>Ingrediente</label>
                        <input
                            type="text"
                            placeholder="Escriba el nombre..."
                            value={nombreIngrediente}
                            onChange={(e) => handleBuscarIngrediente(e.target.value)}
                            onFocus={() => sugerencias.length > 0 && setShowSugerencias(true)}
                            onBlur={() => setTimeout(() => setShowSugerencias(false), 200)}
                        />
                        {showSugerencias && sugerencias.length > 0 && (
                            <div>
                                {sugerencias.map(sug => (
                                    <div key={sug.id} onMouseDown={() => seleccionarIngrediente(sug)}>
                                        <strong>{sug.nombre}</strong>
                                        {sug.categoria && <span>({sug.categoria.nombre})</span>}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="dc-input-group">
                        <label>Cantidad</label>
                        <input type="number" min="0.01" step="0.01" value={cantidadIngrediente} onChange={(e) => setCantidadIngrediente(parseFloat(e.target.value) || 0)} />
                    </div>
                    <div className="dc-input-group">
                        <label>Unidad</label>
                        <input type="text" placeholder="kg, unidades..." value={unidadIngrediente} onChange={(e) => setUnidadIngrediente(e.target.value)} />
                    </div>

                    <div className="dc-input-group">
                        <label>Notas</label>
                        <input type="text" placeholder="Ej: Pan artesanal" value={notasIngrediente} onChange={(e) => setNotasIngrediente(e.target.value)} />
                    </div>
                    <div className="dc-input-group" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: 'auto', flex: '0 0 auto', gap: '4px' }}>
                        <input style={{ width: '16px', height: '16px' }} type="checkbox" id="esOpcional" checked={esOpcional} onChange={(e) => setEsOpcional(e.target.checked)} />
                        <label htmlFor="esOpcional" style={{ whiteSpace: 'nowrap' }}>Opcional</label>
                    </div>
                </div>

                {esIngredienteNuevo && (
                    <div>
                        <div className="dc-tabs" style={{ marginBottom: '1rem' }}>
                            {[
                                { value: 'categoria', label: 'Por Categoría' },
                                { value: 'proveedor', label: 'Por Proveedor' }
                            ].map(t => (
                                <button
                                    key={t.value}
                                    type="button"
                                    className={`dc-tab-btn ${formaAgrupacion === t.value ? 'active' : ''}`}
                                    onClick={() => setFormaAgrupacion(t.value as any)}
                                >
                                    <strong>{t.label}</strong>
                                    <br />
                                </button>
                            ))}
                        </div>

                        {esIngredienteNuevo && formaAgrupacion === 'categoria' && (
                            <div className="dc-input-group" style={{ marginBottom: '1rem' }}>
                                <label>Categoría</label>
                                <select
                                    value={categoriaIngrediente ?? ''}
                                    onChange={(e) => setCategoriaIngrediente(e.target.value ? Number(e.target.value) : null)}
                                >
                                    <option value="">Seleccione...</option>
                                    {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                </select>
                            </div>
                        )}

                        {formaAgrupacion === 'categoria' && categoriaIngrediente && (
                            <div style={{ marginBottom: '1rem' }}>
                                <strong>Se vincularán todos los proveedores de:</strong>
                                {categorias.find(c => c.id === categoriaIngrediente)?.nombre}
                            </div>
                        )}

                        {formaAgrupacion === 'proveedor' && (
                            <div>
                                <strong style={{ display: 'block', marginBottom: '0.5rem' }}>
                                    Seleccione los proveedores ({proveedoresSeleccionados.length}):
                                </strong>
                                {!proveedores || proveedores.length === 0 ? (
                                    <p style={{ color: 'var(--color-gray)' }}>No hay proveedores registrados</p>
                                ) : (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                        {proveedores.map(prov => {
                                            const isSelected = proveedoresSeleccionados.includes(prov.id_persona);
                                            return (
                                                <button
                                                    key={prov.id_persona}
                                                    type="button"
                                                    className={`dc-btn ${isSelected ? 'success' : 'secondary'}`}
                                                    onClick={() => toggleProveedor(prov.id_persona)}
                                                >
                                                    {isSelected ? <i className="fas fa-check-circle"></i> : <i className="fas fa-circle"></i>}
                                                    {' '}{prov.nombre || prov.razon_social}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Botón agregar ingrediente */}
                <div style={{ textAlign: 'right', marginBottom: '1rem' }}>
                    <button className="dc-btn info" onClick={agregarIngrediente}>
                        <i className="fas fa-plus"></i> Agregar ingrediente
                    </button>
                </div>

                {/* Tabla de ingredientes agregados */}
                {ingredientes.length > 0 ? (
                    <div className="dc-table-wrapper">
                        <table className="dc-table">
                            <thead>
                                <tr>
                                    <th>Ingrediente</th>
                                    <th>Categoría</th>
                                    <th>Cantidad</th>
                                    <th>Unidad</th>
                                    <th>Agrupación</th>
                                    <th>Opc.</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {ingredientes.map((ing, idx) => (
                                    <tr key={idx} style={{ background: ing.esNuevo ? '#fff9e6' : 'transparent' }}>
                                        <td>
                                            <strong>{ing.nombre}</strong>
                                            {ing.esNuevo && <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem', background: '#ffc107', padding: '2px 6px', borderRadius: '8px' }}>NUEVO</span>}
                                        </td>
                                        <td>{ing.categoria ? <span className="dc-badge dc-badge-active">{ing.categoria.nombre}</span> : '-'}</td>
                                        <td>{ing.cantidad}</td>
                                        <td>{ing.unidad}</td>
                                        <td>
                                            {ing.esNuevo ? (
                                                (ing as any).forma_agrupacion === 'proveedor' ? (
                                                    <span className="dc-badge" style={{ background: '#17a2b8', color: 'black' }}>
                                                        <i className="fas fa-truck"></i> {(ing as any).proveedores_ids?.length || 0} proveedor(es)
                                                    </span>
                                                ) : (
                                                    <span className="dc-badge dc-badge-active">
                                                        <i className="fas fa-tags"></i> Por Categoría
                                                    </span>
                                                )
                                            ) : '-'}
                                        </td>
                                        <td>{ing.es_opcional ? '☑' : '☐'}</td>
                                        <td>
                                            <i className="fas fa-trash dc-eliminar" onClick={() => eliminarIngrediente(idx)}></i>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p style={{ color: 'var(--color-gray)', textAlign: 'center', padding: '1rem' }}>
                        No hay ingredientes agregados
                    </p>
                )}
            </div>

            {/* ============================================== */}
            {/* PASOS DE PREPARACIÓN (Opcional) */}
            {/* ============================================== */}
            <div style={{ marginTop: '1.5rem', borderTop: '1px solid #f0d6db', paddingTop: '1rem' }}>
                <label style={{ display: 'flex', gap: '0.5rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={incluirPasos} onChange={(e) => setIncluirPasos(e.target.checked)} />
                    Pasos de preparación (opcional)
                </label>

                {incluirPasos && (
                    <div style={{ marginTop: '1rem' }}>
                        {pasos.map((paso, idx) => (
                            <div key={idx} className='dc-input-group'>
                                <span>Paso {idx + 1}:</span>
                                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                                    <input
                                        type="text"
                                        value={paso.descripcion}
                                        onChange={(e) => actualizarPaso(idx, e.target.value)}
                                        placeholder="Descripción del paso"
                                        style={{ flex: 1, padding: '0.5rem' }}
                                    />
                                    <button className="dc-btn danger" onClick={() => eliminarPaso(idx)}>
                                        <i className="fas fa-trash"></i>
                                    </button>
                                </div>
                            </div>
                        ))}
                        <button className="dc-btn info" onClick={agregarPaso}>
                            <i className="fas fa-plus"></i> Agregar paso
                        </button>
                    </div>
                )}
            </div>
        </Modal>
    );
};