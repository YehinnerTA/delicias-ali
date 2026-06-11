import React from 'react';
import { Modal } from '../Modal';
import { useVentas } from '../../../../context/SalesContext';
import { useToast } from '../../../../hooks/base/useToast';
import { Venta } from '../../../../features/types/sales';

interface AnularVentaModalProps {
    isOpen: boolean;
    onClose: () => void;
    venta: Venta | null;
    onSuccess: () => void;
}

export const AnularVentaModal: React.FC<AnularVentaModalProps> = ({ isOpen, onClose, venta, onSuccess }) => {
    const { ventas, setVentas, addActivity, addToHistory } = useVentas();
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
            <div style={{ textAlign: 'center', padding: '1rem' }}>
                <i className="fas fa-exclamation-triangle" style={{ fontSize: '3rem', color: 'var(--color-advertencia)' }}></i>
                <p>¿Anular {venta.numero}?</p>
                <p>Cliente: {venta.cliente}<br />Total: S/ {venta.total.toFixed(2)}</p>
                <p className="dc-eliminar">Esta acción no se puede deshacer.</p>
            </div>
        </Modal>
    );
};