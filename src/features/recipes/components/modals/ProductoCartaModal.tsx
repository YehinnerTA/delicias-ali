import React, { useState, useEffect } from 'react';
import { Modal } from '../../../../components/common/modal/Modal';
import { ProductoCarta, productoCartaApi } from '../../../../services/api/productoCartaApi';
import { ServiceTipo } from '../../../../services/api/serviceTipoApi';
import { Receta } from '../../../types/recipe';
import { useToast } from '../../../../hooks/base/useToast';
import { normalizeText } from '../../../../utils/normalizeText';

interface ProductoCartaModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    productoCarta?: ProductoCarta | null;
    serviceTipos: ServiceTipo[];
    recetas: Receta[];
}

export const ProductoCartaModal: React.FC<ProductoCartaModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    productoCarta,
    serviceTipos,
    recetas
}) => {
    const { showToast } = useToast();
    const [idTipoServicio, setIdTipoServicio] = useState<number | ''>('');
    const [idReceta, setIdReceta] = useState<number | ''>('');
    const [nombre, setNombre] = useState('');
    const [precio, setPrecio] = useState<number>(0);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isEdit = !!productoCarta;

    useEffect(() => {
        if (productoCarta) {
            setIdTipoServicio(productoCarta.id_tipo_servicio);
            setIdReceta(productoCarta.id_receta || '');
            setNombre(productoCarta.nombre);
            setPrecio(productoCarta.precio);
        } else {
            setIdTipoServicio(serviceTipos.length > 0 ? serviceTipos[0].id : '');
            setIdReceta('');
            setNombre('');
            setPrecio(0);
        }
    }, [productoCarta, isOpen, serviceTipos]);

    const handleRecetaChange = (value: string) => {
        const idRec = value ? Number(value) : '';
        setIdReceta(idRec);

        if (idRec) {
            const receta = recetas.find(r => r.id === idRec);
            if (receta && !nombre.trim()) {
                setNombre(receta.nombre);
            }
        }
    };

    const handleSubmit = async () => {
        if (!idTipoServicio) {
            showToast('Seleccione un tipo de servicio', 'warning', 'Campos incompletos');
            return;
        }
        if (!nombre.trim()) {
            showToast('El nombre es obligatorio', 'warning', 'Campos incompletos');
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                id_tipo_servicio: Number(idTipoServicio),
                id_receta: idReceta ? Number(idReceta) : null,
                nombre: normalizeText(nombre.trim()),
                precio: precio || 0
            };

            if (isEdit && productoCarta) {
                await productoCartaApi.update(productoCarta.id, payload);
                showToast(`Producto "${payload.nombre}" actualizado`, 'success', 'Actualizado');
            } else {
                await productoCartaApi.create(payload);
                showToast(`Producto "${payload.nombre}" creado`, 'success', 'Creado');
            }
            onSuccess();
            onClose();
        } catch (error) {
            console.error('[ProductoCartaModal] Error:', error);
            showToast(error instanceof Error ? error.message : 'Error al guardar', 'error', 'Error');
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
            title={isEdit ? 'Editar Producto de Carta' : 'Nuevo Producto de Carta'}
            icon={isEdit ? 'fa-edit' : 'fa-utensils'}
            footer={modalFooter}
        >
            <div className="dc-form-grid">
                <div className="dc-input-group">
                    <label>Tipo de Servicio <span style={{ color: 'red' }}>*</span></label>
                    <select value={idTipoServicio} onChange={(e) => setIdTipoServicio(Number(e.target.value))}>
                        <option value="">Seleccione...</option>
                        {serviceTipos.map(st => (
                            <option key={st.id} value={st.id}>{st.nombre}</option>
                        ))}
                    </select>
                </div>

                <div className="dc-input-group">
                    <label>Receta Vinculada (opcional)</label>
                    <select value={idReceta} onChange={(e) => handleRecetaChange(e.target.value)}>
                        <option value="">Sin receta (producto simple)</option>
                        {recetas.map(r => (
                            <option key={r.id} value={r.id}>{r.nombre}</option>
                        ))}
                    </select>
                    <small style={{ color: 'var(--color-gray)' }}>
                        Seleccione una receta si este producto requiere preparación
                    </small>
                </div>

                <div className="dc-input-group">
                    <label>Nombre <span style={{ color: 'red' }}>*</span></label>
                    <input
                        type="text"
                        placeholder="Ej: Sándwich Premium"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        required
                    />
                </div>
                <div className="dc-input-group">
                    <label>Precio (S/)</label>
                    <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={precio}
                        onChange={(e) => setPrecio(parseFloat(e.target.value) || 0)}
                    />
                </div>
            </div>
        </Modal>
    );
};