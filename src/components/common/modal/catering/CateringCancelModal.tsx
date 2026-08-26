import React, { useState } from 'react';
import { Modal } from '../Modal';
import { useCateringService } from '../../../../context/CateringContext';
import { useAuth } from '../../../../features/auth/context/AuthContext';
import { useCompany } from '../../../../features/company/context/CompanyContext';
import { useToast } from '../../../../hooks/base/useToast';
import { VentaCatering } from '../../../../features/types/catering';

interface CateringCancelModalProps {
    isOpen: boolean;
    onClose: () => void;
    venta: VentaCatering | null;
    onSuccess: () => void;
}

export const CateringCancelModal: React.FC<CateringCancelModalProps> = ({ isOpen, onClose, venta, onSuccess }) => {
    const { addActivity, addToHistory, refreshData } = useCateringService();
    const { user } = useAuth();
    const { getSelectedCompanyId } = useCompany();
    const id_empresa = getSelectedCompanyId() ?? 0;
    const { showToast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!venta) return null;

    const handleAnular = async () => {
        if (!id_empresa) {
            showToast('No se ha seleccionado una empresa', 'warning', 'Advertencia');
            return;
        }
        const userId = user?.id;
        if (!userId) {
            showToast('No se pudo identificar al usuario', 'error', 'Error de autenticación');
            return;
        }

        setIsSubmitting(true);
        try {
            const { cateringServiceApi } = await import('../../../../services/api/cateringServiceApi');
            await cateringServiceApi.anular(venta.id, id_empresa);

            await refreshData();

            await addActivity("ANULAR", "ventas", `${venta.numero} anulada`);
            await addToHistory(venta, "ANULACIÓN", "Venta anulada");

            showToast(`Venta ${venta.numero} anulada correctamente`, "success", "Anulación");
            onSuccess();
            onClose();
        } catch (error) {
            console.error('[CateringCancelModal] Error al anular venta:', error);
            showToast('Error al anular la venta', 'error', 'Error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const modalFooter = (
        <>
            <button className="dc-btn danger" onClick={handleAnular} disabled={isSubmitting}>
                {isSubmitting ? 'Anulando...' : 'Sí, Anular Venta'}
            </button>
        </>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Anular Venta" icon="fa-exclamation-triangle" footer={modalFooter}>
            <div className="service-divider fase-body">
                <i className="fas fa-exclamation-triangle dc-btn advertence"></i>
                <p>¿Anular {venta.numero}?</p>
                <p>Cliente: {venta.cliente}<br />Total: S/ {venta.total.toFixed(2)}</p>
                <p className="dc-eliminar">Esta acción no se puede deshacer.</p>
            </div>
        </Modal>
    );
};