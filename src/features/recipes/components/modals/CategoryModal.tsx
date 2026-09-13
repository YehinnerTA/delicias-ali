import React, { useState, useEffect } from 'react';
import { Modal } from '../../../../components/common/modal/Modal';
import { CategoriaAlimento } from '../../../types/person';
import { categoriaApi } from '../../../../services/api/categoriaApi';
import { useCompany } from '../../../../features/company/context/CompanyContext';
import { useToast } from '../../../../hooks/base/useToast';
import { normalizeText } from '../../../../utils/normalizeText';

interface CategoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    categoria?: CategoriaAlimento | null;
}

export const CategoryModal: React.FC<CategoryModalProps> = ({ isOpen, onClose, onSuccess, categoria }) => {
    const { getSelectedCompanyId } = useCompany();
    const { showToast } = useToast();
    const id_empresa = getSelectedCompanyId() ?? 0;

    const [nombre, setNombre] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isEdit = !!categoria;

    useEffect(() => {
        if (categoria) {
            setNombre(categoria.nombre);
            setDescripcion(categoria.descripcion || '');
        } else {
            setNombre('');
            setDescripcion('');
        }
    }, [categoria, isOpen]);

    const handleSubmit = async () => {
        const nombreNormalizado = normalizeText(nombre);
        const descripcionNormalizada = descripcion.trim();

        if (!nombre.trim()) {
            showToast('El nombre es obligatorio', 'warning', 'Campos incompletos');
            return;
        }

        setIsSubmitting(true);
        try {
            if (isEdit && categoria) {
                await categoriaApi.update(categoria.id, {
                    id_empresa,
                    nombre: nombreNormalizado,
                    descripcion: descripcionNormalizada || null
                });
                showToast(`Categoría "${nombreNormalizado}" actualizada`, 'success', 'Actualizado');
            } else {
                await categoriaApi.create({
                    id_empresa,
                    nombre: nombreNormalizado,
                    descripcion: descripcionNormalizada || null
                });
                showToast(`Categoría "${nombreNormalizado}" creada`, 'success', 'Creado');
            }
            onSuccess();
            onClose();
        } catch (error) {
            console.error('[CategoryModal] Error al guardar:', error);
            showToast('Error al guardar la categoría', 'error', 'Error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const modalFooter = (
        <div>
            <button className="dc-btn success" onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? 'Guardando...' : <><i className="fas fa-save"></i> {isEdit ? 'Actualizar' : 'Crear'}</>}
            </button>
        </div>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isEdit ? 'Editar Categoría' : 'Nueva Categoría'}
            icon={isEdit ? 'fa-edit' : 'fa-tag'}
            footer={modalFooter}
        >
            <div className="dc-form-grid">
                <div className="dc-input-group">
                    <label>Nombre</label>
                    <input
                        type="text"
                        placeholder="Ej: Lácteos, Carnes Rojas, Panificados"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        required
                    />
                    {nombre && (
                        <small style={{ color: 'var(--color-gray)', display: 'block', marginTop: '0.25rem' }}>
                            Se guardará como: <strong>{normalizeText(nombre)}</strong>
                        </small>
                    )}
                </div>
                <div className="dc-input-group">
                    <label>Descripción</label>
                    <textarea
                        placeholder="Descripción de la categoría (opcional)"
                        value={descripcion}
                        onChange={(e) => setDescripcion(e.target.value)}
                        rows={3}
                    />
                </div>
            </div>
        </Modal>
    );
};