import React, { useState, useEffect } from 'react';
import { Modal } from '../../../../components/common/modal/Modal';
import { CategoriaAlimento } from '../../../types/person';
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
    onRefreshIngredientes: () => void;
}

export const RecipeModal: React.FC<RecipeModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    receta,
    categorias,
    ingredientesExistentes,
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

    const [incluirPasos, setIncluirPasos] = useState(false);
    const [pasos, setPasos] = useState<PasoReceta[]>([]);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const isEdit = !!receta;

    const porcionesTotal = cantidadBase * porcionesPorUnidad;

    const getEtiquetaCantidadBase = () => {
        switch (tipoPreparacion) {
            case 'por_unidad': return '¿Cuántas unidades?';
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
            setCantidadBase(1);
            setPorcionesPorUnidad(1);
            setTiempoPreparacion('');
            setTiempoCoccion('');
            setDificultad('media');
            setRendimiento(100);
            setIngredientes([]);
            setPasos([]);
            setIncluirPasos(false);
        }
        resetIngredienteForm();
    }, [receta, isOpen]);

    const resetIngredienteForm = () => {
        setNombreIngrediente('');
        setUnidadIngrediente('unidades');
        setCantidadIngrediente(1);
        setNotasIngrediente('');
        setEsOpcional(false);
        setCategoriaIngrediente(null);
        setSugerencias([]);
        setShowSugerencias(false);
    };

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
            if (!categoriaIngrediente) {
                showToast('Seleccione una categoría para el nuevo ingrediente', 'warning', 'Categoría requerida');
                return;
            }
            const categoria = categorias.find(c => c.id === categoriaIngrediente) || null;
            setIngredientes([...ingredientes, {
                id_ingrediente: null,
                nombre: nombreNorm,
                cantidad: cantidadIngrediente,
                unidad: normalizeText(unidadIngrediente),
                notas: notasIngrediente.trim() || null,
                es_opcional: esOpcional,
                id_categoria: categoriaIngrediente,
                categoria: categoria,
                esNuevo: true
            }]);
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
                    const nuevoIng = await ingredienteApi.create({
                        id_empresa,
                        nombre: ing.nombre,
                        unidad: ing.unidad,
                        id_categoria: ing.id_categoria
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
                porciones_por_unidad: porcionesPorUnidad,
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
            <button className="dc-btn secondary" onClick={onClose}>Cancelar</button>
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
            <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ marginBottom: '0.75rem' }}><i className="fas fa-info-circle"></i> Información Básica</h4>
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

                <div style={{ marginTop: '1rem' }}>
                    <label style={{ fontWeight: '600', display: 'block', marginBottom: '0.5rem' }}>Tipo de preparación:</label>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {[
                            { value: 'por_unidad', label: 'Por Unidad', desc: 'Alfajor, Sándwich' },
                            { value: 'por_molde', label: 'Por Molde', desc: 'Torta, Lasaña' },
                            { value: 'por_lote', label: 'Por Lote', desc: 'Salsa, Masa base' }
                        ].map(t => (
                            <button
                                key={t.value}
                                type="button"
                                className={`dc-btn ${tipoPreparacion === t.value ? 'success' : 'secondary'}`}
                                onClick={() => setTipoPreparacion(t.value as any)}
                                style={{ flex: 1, minWidth: '120px', padding: '0.5rem', textAlign: 'left' }}
                            >
                                <strong>{t.label}</strong>
                                <br />
                                <small style={{ opacity: 0.7 }}>{t.desc}</small>
                            </button>
                        ))}
                    </div>
                </div>

                <div style={{ marginTop: '1rem', padding: '1rem', background: '#f9f9f9', borderRadius: '8px' }}>
                    <div className="dc-form-grid">
                        <div className="dc-input-group">
                            <label>{getEtiquetaCantidadBase()}</label>
                            <input
                                type="number"
                                min="1"
                                step="1"
                                value={cantidadBase}
                                onChange={(e) => setCantidadBase(parseFloat(e.target.value) || 1)}
                            />
                        </div>
                        <div className="dc-input-group">
                            <label>{getEtiquetaPorciones()}</label>
                            <input
                                type="number"
                                min="1"
                                step="1"
                                value={porcionesPorUnidad}
                                onChange={(e) => setPorcionesPorUnidad(parseInt(e.target.value) || 1)}
                            />
                        </div>
                        <div className="dc-input-group">
                            <label>Total de porciones</label>
                            <input
                                type="text"
                                value={`${porcionesTotal} porciones`}
                                readOnly
                                style={{ background: '#e9ecef', fontWeight: 'bold' }}
                            />
                        </div>
                    </div>
                </div>

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

            <div style={{ marginTop: '1.5rem', borderTop: '1px solid #f0d6db', paddingTop: '1rem' }}>
                <h4 style={{ marginBottom: '0.75rem' }}><i className="fas fa-box"></i> Ingredientes</h4>

                <div className="dc-form-grid" style={{ marginBottom: '1rem', position: 'relative' }}>
                    <div className="dc-input-group" style={{ position: 'relative' }}>
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
                            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #ccc', borderRadius: '4px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', zIndex: 1000, maxHeight: '200px', overflowY: 'auto' }}>
                                {sugerencias.map(sug => (
                                    <div key={sug.id} style={{ padding: '0.5rem', cursor: 'pointer', borderBottom: '1px solid #f0f0f0' }} onMouseDown={() => seleccionarIngrediente(sug)}>
                                        <strong>{sug.nombre}</strong>
                                        {sug.categoria && <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem', color: '#666' }}>({sug.categoria.nombre})</span>}
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
                    {nombreIngrediente && !ingredientesExistentes.find(i => normalizeText(i.nombre) === normalizeText(nombreIngrediente)) && (
                        <div className="dc-input-group">
                            <label>Categoría <span style={{ color: 'red' }}>*</span></label>
                            <select value={categoriaIngrediente ?? ''} onChange={(e) => setCategoriaIngrediente(e.target.value ? Number(e.target.value) : null)}>
                                <option value="">Seleccione...</option>
                                {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                            </select>
                        </div>
                    )}
                    <div className="dc-input-group">
                        <label>Notas</label>
                        <input type="text" placeholder="Ej: Pan artesanal" value={notasIngrediente} onChange={(e) => setNotasIngrediente(e.target.value)} />
                    </div>
                    <div className="dc-input-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingTop: '1.5rem' }}>
                        <input type="checkbox" id="esOpcional" checked={esOpcional} onChange={(e) => setEsOpcional(e.target.checked)} />
                        <label htmlFor="esOpcional" style={{ margin: 0 }}>Opcional</label>
                    </div>
                    <button className="dc-btn info" onClick={agregarIngrediente} style={{ alignSelf: 'flex-end', marginBottom: '0.25rem' }}>
                        <i className="fas fa-plus"></i> Agregar
                    </button>
                </div>

                {ingredientes.length > 0 ? (
                    <div className="dc-table-wrapper">
                        <table className="dc-table">
                            <thead>
                                <tr>
                                    <th>Ingrediente</th>
                                    <th>Categoría</th>
                                    <th>Cantidad</th>
                                    <th>Unidad</th>
                                    <th>Notas</th>
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
                                        <td>{ing.notas || '-'}</td>
                                        <td>{ing.es_opcional ? '☑' : '☐'}</td>
                                        <td><i className="fas fa-trash dc-eliminar" onClick={() => eliminarIngrediente(idx)}></i></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p style={{ color: 'var(--color-gray)', textAlign: 'center', padding: '1rem' }}>No hay ingredientes agregados</p>
                )}
            </div>

            <div style={{ marginTop: '1.5rem', borderTop: '1px solid #f0d6db', paddingTop: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: '600' }}>
                    <input type="checkbox" checked={incluirPasos} onChange={(e) => setIncluirPasos(e.target.checked)} />
                    Incluir pasos de preparación (opcional)
                </label>

                {incluirPasos && (
                    <div style={{ marginTop: '1rem' }}>
                        {pasos.map((paso, idx) => (
                            <div key={idx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                                <span style={{ fontWeight: 'bold', minWidth: '60px' }}>Paso {idx + 1}:</span>
                                <input type="text" value={paso.descripcion} onChange={(e) => actualizarPaso(idx, e.target.value)} placeholder="Descripción del paso" style={{ flex: 1, padding: '0.5rem' }} />
                                <button className="dc-btn danger" onClick={() => eliminarPaso(idx)}><i className="fas fa-trash"></i></button>
                            </div>
                        ))}
                        <button className="dc-btn info" onClick={agregarPaso}><i className="fas fa-plus"></i> Agregar paso</button>
                    </div>
                )}
            </div>
        </Modal>
    );
};