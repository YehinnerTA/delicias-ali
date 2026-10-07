import React, { useState } from 'react';
import { Modal } from '../../Modal';
import { personaApi } from '../../../../../services/api/personaApi';
import { Persona } from '../../../../../features/types/person';
import { useToast } from '../../../../../hooks/base/useToast';

interface NuevoProveedorModalProps {
    isOpen: boolean;
    onClose: () => void;
    idEmpresa: number;
    onProveedorCreado: (proveedor: Persona) => void;
}

export const NuevoProveedorModal: React.FC<NuevoProveedorModalProps> = ({
    isOpen,
    onClose,
    idEmpresa,
    onProveedorCreado
}) => {
    const { showToast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [tipoDocumento, setTipoDocumento] = useState<'DNI' | 'RUC'>('RUC');
    const [numeroDocumento, setNumeroDocumento] = useState('');
    const [razonSocial, setRazonSocial] = useState('');
    const [telefono, setTelefono] = useState('');
    const [email, setEmail] = useState('');

    const resetForm = () => {
        setTipoDocumento('RUC');
        setNumeroDocumento('');
        setRazonSocial('');
        setTelefono('');
        setEmail('');
    };

    const handleGuardar = async () => {
        if (!numeroDocumento.trim()) {
            showToast('Ingrese el número de documento', 'warning', 'Campo requerido');
            return;
        }
        if (!razonSocial.trim()) {
            showToast('Ingrese la razón social o nombre', 'warning', 'Campo requerido');
            return;
        }
        if (!telefono.trim()) {
            showToast('Ingrese el teléfono', 'warning', 'Campo requerido');
            return;
        }

        if (tipoDocumento === 'DNI' && !/^\d{8}$/.test(numeroDocumento)) {
            showToast('El DNI debe tener 8 dígitos', 'warning', 'Formato inválido');
            return;
        }
        if (tipoDocumento === 'RUC' && !/^\d{11}$/.test(numeroDocumento)) {
            showToast('El RUC debe tener 11 dígitos', 'warning', 'Formato inválido');
            return;
        }

        setIsSubmitting(true);
        try {
            const nuevaPersona = await personaApi.create({
                id_empresa: idEmpresa,
                tipo_persona: 'proveedor',
                tipo_documento: tipoDocumento,
                numero_documento: numeroDocumento.trim(),
                razon_social: tipoDocumento === 'RUC' ? razonSocial.trim() : null,
                nombre: tipoDocumento === 'DNI' ? razonSocial.trim() : null,
                apellido: tipoDocumento === 'DNI' ? '' : null,
                email: email.trim() || '',
                celular: telefono.trim(),
                estado: true,
                categorias: []
            } as any);

            showToast(`Proveedor "${razonSocial}" creado`, 'success', 'Proveedor registrado');
            onProveedorCreado(nuevaPersona);
            resetForm();
            onClose();
        } catch (error: any) {
            console.error('[NuevoProveedorModal] Error:', error);
            showToast(error.message || 'Error al crear el proveedor', 'error', 'Error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        if (isSubmitting) return;
        resetForm();
        onClose();
    };

    const modalFooter = (
        <>
            <button className="dc-btn secondary" onClick={handleClose} disabled={isSubmitting}>
                <i className="fas fa-times"></i> Cancelar
            </button>
            <button className="dc-btn success" onClick={handleGuardar} disabled={isSubmitting}>
                {isSubmitting ? (
                    <><i className="fas fa-spinner fa-spin"></i> Guardando...</>
                ) : (
                    <><i className="fas fa-save"></i> Guardar Proveedor</>
                )}
            </button>
        </>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title="Nuevo Proveedor"
            icon="fa-user-plus"
            footer={modalFooter}
            size="md"
        >
            <div className="dc-form-grid">
                <div className="dc-input-group">
                    <label>Tipo de Documento:</label>
                    <select
                        value={tipoDocumento}
                        onChange={(e) => setTipoDocumento(e.target.value as 'DNI' | 'RUC')}
                        disabled={isSubmitting}
                    >
                        <option value="RUC">RUC</option>
                        <option value="DNI">DNI</option>
                    </select>
                </div>

                <div className="dc-input-group">
                    <label>N° Documento:</label>
                    <input
                        type="text"
                        placeholder={tipoDocumento === 'RUC' ? '11 dígitos' : '8 dígitos'}
                        value={numeroDocumento}
                        onChange={(e) => setNumeroDocumento(e.target.value.replace(/\D/g, ''))}
                        maxLength={tipoDocumento === 'RUC' ? 11 : 8}
                        disabled={isSubmitting}
                    />
                </div>

                <div className="dc-input-group" style={{ gridColumn: 'span 2' }}>
                    <label>{tipoDocumento === 'RUC' ? 'Razón Social:' : 'Nombre completo:'}</label>
                    <input
                        type="text"
                        placeholder={tipoDocumento === 'RUC' ? 'Ej: Distribuidora XYZ SAC' : 'Ej: Juan Pérez'}
                        value={razonSocial}
                        onChange={(e) => setRazonSocial(e.target.value)}
                        disabled={isSubmitting}
                    />
                </div>

                <div className="dc-input-group">
                    <label>Teléfono:</label>
                    <input
                        type="text"
                        placeholder="Ej: 999888777"
                        value={telefono}
                        onChange={(e) => setTelefono(e.target.value.replace(/\D/g, ''))}
                        maxLength={15}
                        disabled={isSubmitting}
                    />
                </div>

                <div className="dc-input-group">
                    <label>Email (opcional):</label>
                    <input
                        type="email"
                        placeholder="Ej: ventas@proveedor.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isSubmitting}
                    />
                </div>
            </div>
        </Modal>
    );
};