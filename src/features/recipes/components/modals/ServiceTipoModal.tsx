import React, { useState, useEffect } from 'react';
import { Modal } from '../../../../components/common/modal/Modal';
import { ServiceTipo, serviceTipoApi } from '../../../../services/api/serviceTipoApi';
import { ProductoCarta, productoCartaApi } from '../../../../services/api/productoCartaApi';
import { Receta } from '../../../types/recipe';
import { useToast } from '../../../../hooks/base/useToast';
import { normalizeText } from '../../../../utils/normalizeText';

interface ServiceTipoModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    serviceTipo?: ServiceTipo | null;
    recetas: Receta[];
    productosCarta: ProductoCarta[];
    onRefreshProductos: () => void;
}

interface ProductoFormState {
    idProductoEditando: number | null;
    id_receta: number | '';
    nombre: string;
    precio: number;
}

export const ServiceTipoModal: React.FC<ServiceTipoModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    serviceTipo,
    recetas,
    productosCarta,
    onRefreshProductos
}) => {
    const { showToast } = useToast();
    const [clave, setClave] = useState('');
    const [nombre, setNombre] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [productoForm, setProductoForm] = useState<ProductoFormState>({
        idProductoEditando: null,
        id_receta: '',
        nombre: '',
        precio: 0
    });
    const [isSavingProducto, setIsSavingProducto] = useState(false);

    const isEdit = !!serviceTipo;

    const productosDelServicio = serviceTipo
        ? productosCarta.filter(p => p.id_tipo_servicio === serviceTipo.id)
        : [];

    useEffect(() => {
        if (serviceTipo) {
            setClave(serviceTipo.clave);
            setNombre(serviceTipo.nombre);
            setDescripcion(serviceTipo.descripcion || '');
        } else {
            setClave('');
            setNombre('');
            setDescripcion('');
        }
        resetProductoForm();
    }, [serviceTipo, isOpen]);

    const resetProductoForm = () => {
        setProductoForm({
            idProductoEditando: null,
            id_receta: '',
            nombre: '',
            precio: 0
        });
    };

    const handleRecetaChange = (value: string) => {
        const idRec = value ? Number(value) : '';
        setProductoForm(prev => ({ ...prev, id_receta: idRec }));

        if (idRec) {
            const receta = recetas.find(r => r.id === idRec);
            if (receta && !productoForm.nombre.trim()) {
                setProductoForm(prev => ({ ...prev, nombre: receta.nombre }));
            }
        }
    };

    const handleSubmit = async () => {
        if (!clave.trim() || !nombre.trim()) {
            showToast('Clave y nombre son obligatorios', 'warning', 'Campos incompletos');
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                clave: normalizeText(clave.trim()),
                nombre: normalizeText(nombre.trim()),
                descripcion: descripcion.trim() || null
            };

            if (isEdit && serviceTipo) {
                await serviceTipoApi.update(serviceTipo.id, payload);
                showToast(`Tipo "${payload.nombre}" actualizado`, 'success', 'Actualizado');
            } else {
                await serviceTipoApi.create(payload);
                showToast(`Tipo "${payload.nombre}" creado`, 'success', 'Creado');
            }
            onSuccess();
            onClose();
        } catch (error) {
            console.error('[ServiceTipoModal] Error:', error);
            showToast(error instanceof Error ? error.message : 'Error al guardar', 'error', 'Error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSaveProducto = async () => {
        if (!serviceTipo) {
            showToast('Primero guarde el tipo de servicio', 'warning', 'Acción requerida');
            return;
        }
        if (!productoForm.nombre.trim()) {
            showToast('El nombre del producto es obligatorio', 'warning', 'Campos incompletos');
            return;
        }

        setIsSavingProducto(true);
        try {
            const payload = {
                id_tipo_servicio: serviceTipo.id,
                id_receta: productoForm.id_receta ? Number(productoForm.id_receta) : null,
                nombre: normalizeText(productoForm.nombre.trim()),
                precio: productoForm.precio || 0
            };

            if (productoForm.idProductoEditando) {
                await productoCartaApi.update(productoForm.idProductoEditando, payload);
                showToast(`Producto "${payload.nombre}" actualizado`, 'success', 'Actualizado');
            } else {
                await productoCartaApi.create(payload);
                showToast(`Producto "${payload.nombre}" agregado`, 'success', 'Agregado');
            }

            await onRefreshProductos();
            resetProductoForm();
        } catch (error) {
            console.error('[ServiceTipoModal] Error guardando producto:', error);
            showToast(error instanceof Error ? error.message : 'Error al guardar producto', 'error', 'Error');
        } finally {
            setIsSavingProducto(false);
        }
    };

    const handleEditProducto = (producto: ProductoCarta) => {
        setProductoForm({
            idProductoEditando: producto.id,
            id_receta: producto.id_receta || '',
            nombre: producto.nombre,
            precio: producto.precio
        });
    };

    const handleDeleteProducto = async (producto: ProductoCarta) => {
        if (!window.confirm(`¿Eliminar "${producto.nombre}"?`)) return;

        try {
            await productoCartaApi.delete(producto.id);
            showToast(`Producto "${producto.nombre}" eliminado`, 'success', 'Eliminado');
            await onRefreshProductos();
        } catch (error) {
            console.error('[ServiceTipoModal] Error eliminando producto:', error);
            showToast(error instanceof Error ? error.message : 'Error al eliminar', 'error', 'Error');
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
            title={isEdit ? 'Editar Tipo de Servicio' : 'Nuevo Tipo de Servicio'}
            icon={isEdit ? 'fa-edit' : 'fa-concierge-bell'}
            footer={modalFooter}
        >
            <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ marginBottom: '0.75rem' }}>
                    <i className="fas fa-info-circle"></i> Información del Servicio
                </h4>
                <div className="dc-form-grid">
                    <div className="dc-input-group">
                        <label>Clave <span style={{ color: 'red' }}>*</span></label>
                        <input
                            type="text"
                            placeholder="Ej: Corporativo, Social"
                            value={clave}
                            onChange={(e) => setClave(e.target.value)}
                            required
                        />
                        <small style={{ color: 'var(--color-gray)' }}>Identificador único</small>
                    </div>
                    <div className="dc-input-group">
                        <label>Nombre <span style={{ color: 'red' }}>*</span></label>
                        <input
                            type="text"
                            placeholder="Ej: Corporativo Ejecutivo"
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                            required
                        />
                    </div>
                    <div className="dc-input-group">
                        <label>Descripción</label>
                        <textarea
                            placeholder="Descripción del servicio"
                            value={descripcion}
                            onChange={(e) => setDescripcion(e.target.value)}
                            rows={2}
                            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
                        />
                    </div>
                </div>
            </div>

            {isEdit && serviceTipo && (
                <div style={{ marginTop: '1.5rem', borderTop: '1px solid #f0d6db', paddingTop: '1rem' }}>
                    <h4 style={{ marginBottom: '0.75rem' }}>
                        <i className="fas fa-utensils"></i> Productos de Carta ({productosDelServicio.length})
                    </h4>

                    <div style={{
                        padding: '1rem',
                        background: productoForm.idProductoEditando ? '#fff9e6' : '#f9f9f9',
                        borderRadius: '8px',
                        marginBottom: '1rem'
                    }}>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                            <div className="dc-input-group" style={{ flex: 1, minWidth: '150px' }}>
                                <label>Receta</label>
                                <select
                                    value={productoForm.id_receta}
                                    onChange={(e) => handleRecetaChange(e.target.value)}
                                >
                                    <option value="">Sin receta (producto simple)</option>
                                    {recetas.map(r => (
                                        <option key={r.id} value={r.id}>{r.nombre}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="dc-input-group" style={{ flex: 1, minWidth: '150px' }}>
                                <label>Nombre del Producto <span style={{ color: 'red' }}>*</span></label>
                                <input
                                    type="text"
                                    placeholder="Ej: Sándwich Premium"
                                    value={productoForm.nombre}
                                    onChange={(e) => setProductoForm(prev => ({ ...prev, nombre: e.target.value }))}
                                />
                            </div>
                            <div className="dc-input-group" style={{ width: '120px' }}>
                                <label>Precio (S/)</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={productoForm.precio}
                                    onChange={(e) => setProductoForm(prev => ({ ...prev, precio: parseFloat(e.target.value) || 0 }))}
                                />
                            </div>
                            <button
                                className="dc-btn info"
                                onClick={handleSaveProducto}
                                disabled={isSavingProducto}
                                style={{ marginBottom: '0.25rem' }}
                            >
                                {isSavingProducto ? 'Guardando...' : (
                                    productoForm.idProductoEditando
                                        ? <><i className="fas fa-save"></i> Actualizar</>
                                        : <><i className="fas fa-plus"></i> Agregar</>
                                )}
                            </button>
                            {productoForm.idProductoEditando && (
                                <button
                                    className="dc-btn secondary"
                                    onClick={resetProductoForm}
                                    style={{ marginBottom: '0.25rem' }}
                                >
                                    <i className="fas fa-times"></i> Cancelar
                                </button>
                            )}
                        </div>
                    </div>

                    {productosDelServicio.length > 0 ? (
                        <div className="dc-table-wrapper">
                            <table className="dc-table">
                                <thead>
                                    <tr>
                                        <th>Receta</th>
                                        <th>Nombre del Producto</th>
                                        <th>Precio</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {productosDelServicio.map(p => (
                                        <tr key={p.id}>
                                            <td>
                                                {p.receta ? (
                                                    <span className="dc-badge dc-badge-active">
                                                        <i className="fas fa-book"></i> {p.receta.nombre}
                                                    </span>
                                                ) : (
                                                    <span style={{ color: 'var(--color-gray)' }}>Sin receta</span>
                                                )}
                                            </td>
                                            <td><strong>{p.nombre}</strong></td>
                                            <td>S/ {p.precio.toFixed(2)}</td>
                                            <td>
                                                <i
                                                    className="fas fa-edit"
                                                    onClick={() => handleEditProducto(p)}
                                                    title="Editar"
                                                    style={{ cursor: 'pointer', marginRight: '0.5rem' }}
                                                ></i>
                                                <i
                                                    className="fas fa-trash dc-eliminar"
                                                    onClick={() => handleDeleteProducto(p)}
                                                    title="Eliminar"
                                                ></i>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p style={{
                            color: 'var(--color-gray)',
                            textAlign: 'center',
                            padding: '1rem',
                            fontStyle: 'italic'
                        }}>
                            No hay productos agregados a este servicio
                        </p>
                    )}
                </div>
            )}

            {!isEdit && (
                <div style={{
                    marginTop: '1rem',
                    padding: '0.75rem',
                    background: '#e7f3ff',
                    borderRadius: '8px',
                    borderLeft: '4px solid #007bff'
                }}>
                    <i className="fas fa-info-circle" style={{ color: '#007bff' }}></i>
                    {' '}
                    <strong>Nota:</strong> Después de crear el tipo de servicio, podrá agregar los productos de carta desde la opción "Editar".
                </div>
            )}
        </Modal>
    );
};