import React from 'react';
import { Modal } from '../Modal';
import { useVentas } from '../../../../context/SalesContext';
import { useAuth } from '../../../../features/auth/context/AuthContext';
import { useToast } from '../../../../hooks/base/useToast';
import { Venta } from '../../../../features/types/sales';

interface AnularVentaModalProps {
    isOpen: boolean;
    onClose: () => void;
    venta: Venta | null;
    onSuccess: () => void;
}

export const AnularVentaModal: React.FC<AnularVentaModalProps> = ({ isOpen, onClose, venta, onSuccess }) => {
    const { addActivity, addToHistory, refreshData } = useVentas();
    const { user } = useAuth();
    const { showToast } = useToast();
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    if (!venta) return null;

    const handleAnular = async () => {
        if (!venta) return;

        const userId = user?.id;
        if (!userId) {
            showToast('No se pudo identificar al usuario', 'error', 'Error de autenticación');
            return;
        }

        setIsSubmitting(true);
        try {
            const { ventaApi } = await import('../../../../services/api/ventaApi');
            await ventaApi.anular(venta.id);

            await refreshData();

            await addActivity("ANULAR", "ventas", `${venta.numero} anulada`);
            await addToHistory(venta, "ANULACIÓN", "Venta anulada");

            showToast(`Venta ${venta.numero} anulada correctamente`, "success", "Anulación");
            onSuccess();
            onClose();
        } catch (error) {
            console.error('[AnularVentaModal] Error al anular venta:', error);
            showToast('Error al anular la venta', 'error', 'Error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const modalFooter = (
        <>
            <button className="dc-btn secondary" onClick={onClose}>Cancelar</button>
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