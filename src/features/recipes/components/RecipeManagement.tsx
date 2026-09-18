import React, { useState, useEffect } from 'react';
import { RecipeList } from './RecipeList';
import { RecipeModal } from './modals/RecipeModal';
import { Receta } from '../../types/recipe';
import { recetaApi } from '../../../services/api/recetaApi';
import { useRecipes } from '../context/RecipeContext';
import { useCompany } from '../../../features/company/context/CompanyContext';
import { useToast } from '../../../hooks/base/useToast';
import { Modal } from '../../../components/common/modal/Modal';

export const RecipeManagement: React.FC = () => {
    const { categorias, ingredientes, refreshIngredientes, proveedores, refreshRecetas } = useRecipes();
    const { getSelectedCompanyId } = useCompany();
    const { showToast } = useToast();
    const id_empresa = getSelectedCompanyId() ?? 0;

    const [recetas, setRecetas] = useState<Receta[]>([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [selectedReceta, setSelectedReceta] = useState<Receta | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const loadRecetas = async () => {
        if (!id_empresa) return;
        setIsLoading(true);
        try {
            const data = await recetaApi.getAll(id_empresa);
            setRecetas(data);
        } catch (error) {
            console.error('[RecipeManagement] Error cargando recetas:', error);
            showToast('Error al cargar recetas', 'error', 'Error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadRecetas();
    }, [id_empresa]);

    const handleCreate = () => {
        setSelectedReceta(null);
        setModalOpen(true);
    };

    const handleEdit = (receta: Receta) => {
        setSelectedReceta(receta);
        setModalOpen(true);
    };

    const handleView = (receta: Receta) => {
        setSelectedReceta(receta);
        setViewModalOpen(true);
    };

    const handleSuccess = () => {
        loadRecetas();
        refreshRecetas();
    };

    const getTipoPreparacionLabel = (tipo: string) => {
        const map: Record<string, string> = {
            'por_unidad': 'Por Unidad',
            'por_molde': 'Por Molde',
            'por_lote': 'Por Lote'
        };
        return map[tipo] || tipo;
    };

    const getCategoriaLabel = (cat: string) => {
        const map: Record<string, string> = {
            'entrada': 'Entrada',
            'plato_principal': 'Plato Principal',
            'postre': 'Postre',
            'bebida': 'Bebida',
            'salsa': 'Salsa',
            'panificado': 'Panificado'
        };
        return map[cat] || cat;
    };

    const getDificultadLabel = (d: string) => {
        const map: Record<string, string> = {
            'fácil': 'Fácil',
            'media': 'Media',
            'difícil': 'Difícil'
        };
        return map[d] || d;
    };

    return (
        <div>
            <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <button className="dc-btn" onClick={handleCreate}>
                    <i className="fas fa-plus-circle"></i> Nueva Receta
                </button>
            </div>

            {isLoading ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                    <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem' }}></i>
                    <p>Cargando recetas...</p>
                </div>
            ) : (
                <RecipeList
                    recetas={recetas}
                    onEdit={handleEdit}
                    onView={handleView}
                    onRefresh={loadRecetas}
                />
            )}

            <RecipeModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSuccess={handleSuccess}
                receta={selectedReceta}
                categorias={categorias}
                ingredientesExistentes={ingredientes}
                proveedores={proveedores || []}
                onRefreshIngredientes={refreshIngredientes}
            />

            <Modal
                isOpen={viewModalOpen}
                onClose={() => setViewModalOpen(false)}
                title={`Detalle de ${selectedReceta?.nombre || ''}`}
                icon="fa-book"
            >
                {selectedReceta && (
                    <>
                        <div className="dc-info-card">
                            <h4><i className="fas fa-info-circle"></i> Información Básica</h4>
                            <div className="dc-info-grid">
                                <div className="dc-info-item">
                                    <span className="dc-info-label">NOMBRE</span>
                                    <span className="dc-info-value">{selectedReceta.nombre}</span>
                                </div>
                                <div className="dc-info-item">
                                    <span className="dc-info-label">DESCRIPCIÓN</span>
                                    <span className="dc-info-value">{selectedReceta.descripcion || '-'}</span>
                                </div>
                                <div className="dc-info-item">
                                    <span className="dc-info-label">CATEGORÍA</span>
                                    <span className="dc-info-value">
                                        <span className="dc-badge">{getCategoriaLabel(selectedReceta.categoria_receta)}</span>
                                    </span>
                                </div>
                                <div className="dc-info-item">
                                    <span className="dc-info-label">TIPO PREPARACIÓN</span>
                                    <span className="dc-info-value">
                                        <span className="dc-badge dc-badge-active">{getTipoPreparacionLabel(selectedReceta.tipo_preparacion)}</span>
                                    </span>
                                </div>
                                <div className="dc-info-item">
                                    <span className="dc-info-label">ESTADO</span>
                                    <span className="dc-info-value">
                                        <span className={`dc-badge ${selectedReceta.estado ? 'dc-badge-active' : 'dc-badge-inactive'}`}>
                                            {selectedReceta.estado ? 'ACTIVA' : 'INACTIVA'}
                                        </span>
                                    </span>
                                </div>
                                <div className="dc-info-item">
                                    <span className="dc-info-label">CREADO POR</span>
                                    <span className="dc-info-value">{selectedReceta.created_by || '-'}</span>
                                </div>
                            </div>
                        </div>

                        {selectedReceta.servicios && selectedReceta.servicios.length > 0 && (
                            <div className="dc-info-card">
                                <h4><i className="fas fa-concierge-bell"></i> Servicios donde aparece ({selectedReceta.servicios.length})</h4>
                                <div className="dc-table-wrapper">
                                    <table className="dc-table">
                                        <thead>
                                            <tr>
                                                <th>Servicio</th>
                                                <th>Producto</th>
                                                <th>Precio</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedReceta.servicios.map((s, idx) => (
                                                <tr key={idx}>
                                                    <td>
                                                        <span className="dc-badge dc-badge-active">{s.tipo_servicio.nombre}</span>
                                                    </td>
                                                    <td>{s.nombre_producto}</td>
                                                    <td>S/ {s.precio.toFixed(2)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Cálculo de Porciones */}
                        <div className="dc-info-card">
                            <h4><i className="fas fa-calculator"></i> Cálculo de Porciones</h4>
                            <div className="dc-info-grid">
                                <div className="dc-info-item">
                                    <span className="dc-info-label">
                                        {selectedReceta.tipo_preparacion === 'por_unidad'
                                            ? 'UNIDADES BASE'
                                            : selectedReceta.tipo_preparacion === 'por_molde'
                                                ? 'MOLDES BASE'
                                                : 'LOTES BASE'}
                                    </span>
                                    <span className="dc-info-value">{selectedReceta.cantidad_base}</span>
                                </div>

                                {/* ✅ Solo mostrar porciones_por_unidad si NO es "por_unidad" */}
                                {selectedReceta.tipo_preparacion !== 'por_unidad' && (
                                    <div className="dc-info-item">
                                        <span className="dc-info-label">
                                            {selectedReceta.tipo_preparacion === 'por_molde'
                                                ? 'PORCIONES POR MOLDE'
                                                : 'PORCIONES POR LOTE'}
                                        </span>
                                        <span className="dc-info-value">{selectedReceta.porciones_por_unidad}</span>
                                    </div>
                                )}

                                <div className="dc-info-item">
                                    <span className="dc-info-label">TOTAL PORCIONES</span>
                                    <span className="dc-info-value">
                                        <strong style={{ color: '#28a745', fontSize: '1.1rem' }}>
                                            {selectedReceta.porciones_total} porciones
                                        </strong>
                                    </span>
                                </div>
                                <div className="dc-info-item">
                                    <span className="dc-info-label">RENDIMIENTO</span>
                                    <span className="dc-info-value">{selectedReceta.rendimiento}%</span>
                                </div>
                            </div>
                        </div>

                        {(selectedReceta.tiempo_preparacion || selectedReceta.tiempo_coccion || selectedReceta.dificultad) && (
                            <div className="dc-info-card">
                                <h4><i className="fas fa-clock"></i> Información Adicional</h4>
                                <div className="dc-info-grid">
                                    {selectedReceta.tiempo_preparacion && (
                                        <div className="dc-info-item">
                                            <span className="dc-info-label">TIEMPO PREPARACIÓN</span>
                                            <span className="dc-info-value">{selectedReceta.tiempo_preparacion} min</span>
                                        </div>
                                    )}
                                    {selectedReceta.tiempo_coccion && (
                                        <div className="dc-info-item">
                                            <span className="dc-info-label">TIEMPO COCCIÓN</span>
                                            <span className="dc-info-value">{selectedReceta.tiempo_coccion} min</span>
                                        </div>
                                    )}
                                    {selectedReceta.dificultad && (
                                        <div className="dc-info-item">
                                            <span className="dc-info-label">DIFICULTAD</span>
                                            <span className="dc-info-value">{getDificultadLabel(selectedReceta.dificultad)}</span>
                                        </div>
                                    )}
                                    {selectedReceta.costo_estimado && (
                                        <div className="dc-info-item">
                                            <span className="dc-info-label">COSTO ESTIMADO</span>
                                            <span className="dc-info-value">S/ {selectedReceta.costo_estimado.toFixed(2)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="dc-info-card">
                            <h4><i className="fas fa-box"></i> Ingredientes ({selectedReceta.ingredientes.length})</h4>
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
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedReceta.ingredientes.map((ing, idx) => (
                                            <tr key={idx}>
                                                <td><strong>{ing.nombre}</strong></td>
                                                <td>
                                                    {ing.categoria ? (
                                                        <span className="dc-badge dc-badge-active">{ing.categoria.nombre}</span>
                                                    ) : '-'}
                                                </td>
                                                <td>{ing.cantidad}</td>
                                                <td>{ing.unidad}</td>
                                                <td>{ing.notas || '-'}</td>
                                                <td>{ing.es_opcional ? '☑' : '☐'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {selectedReceta.pasos && selectedReceta.pasos.length > 0 && (
                            <div className="dc-info-card">
                                <h4><i className="fas fa-list-ol"></i> Pasos de Preparación ({selectedReceta.pasos.length})</h4>
                                <div style={{ padding: '0.5rem' }}>
                                    {selectedReceta.pasos.map((paso, idx) => (
                                        <div
                                            key={idx}
                                            style={{
                                                display: 'flex',
                                                gap: '0.75rem',
                                                padding: '0.75rem',
                                                borderBottom: '1px solid #f0e2e6',
                                                alignItems: 'flex-start'
                                            }}
                                        >
                                            <div style={{
                                                background: '#dc3545',
                                                color: 'white',
                                                borderRadius: '50%',
                                                width: '32px',
                                                height: '32px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontWeight: 'bold',
                                                flexShrink: 0
                                            }}>
                                                {paso.orden}
                                            </div>
                                            <div style={{ flex: 1, paddingTop: '0.25rem' }}>
                                                {paso.descripcion}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {(!selectedReceta.pasos || selectedReceta.pasos.length === 0) && (
                            <div className="dc-info-card" style={{ opacity: 0.6 }}>
                                <h4><i className="fas fa-list-ol"></i> Pasos de Preparación</h4>
                                <p style={{ color: 'var(--color-gray)', fontStyle: 'italic', padding: '0.5rem' }}>
                                    No se registraron pasos de preparación para esta receta.
                                </p>
                            </div>
                        )}
                    </>
                )}
            </Modal>
        </div>
    );
};