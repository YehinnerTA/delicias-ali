import React from 'react';
import { Modal } from '../Modal';
import { useCateringSales } from '../../../../context/CateringContext';
import { useToast } from '../../../../hooks/base/useToast';
import { VentaCatering } from '../../../../features/types/catering';

interface CateringCancelModalProps {
    isOpen: boolean;
    onClose: () => void;
    venta: VentaCatering | null;
    onSuccess: () => void;
}

export const CateringCancelModal: React.FC<CateringCancelModalProps> = ({ isOpen, onClose, venta, onSuccess }) => {
    const { ventas, setVentas, addActivity, addToHistory } = useCateringSales();
    const { showToast } = useToast();

    if (!venta) return null;

    const handleAnular = () => {
        venta.estado = "anulada";
        addToHistory(venta, "ANULACIÓN", "Venta anulada");
        addActivity("ANULAR", "ventas", venta.numero);
        setVentas([...ventas]);
        showToast("Venta anulada", "success", "Anulación");
        onSuccess();
        onClose();
    };

    const modalFooter = (
        <>
            <button className="dc-btn secondary" onClick={onClose}>Cancelar</button>
            <button className="dc-btn danger" onClick={handleAnular}>Sí, Anular Venta</button>
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