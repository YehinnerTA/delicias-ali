import React, { useState } from 'react';
import { Modal } from '../Modal';
import { useVentas } from '../../../../context/SalesContext';
import { useToast } from '../../../../hooks/base/useToast';
import { Venta } from '../../../../features/types/sales';
import { generarVistaPreviaHTML, generarPDF } from '../../../../services/pdf/pdfService';

interface ReimprimirModalProps {
    isOpen: boolean;
    onClose: () => void;
    venta: Venta | null;
}

export const ReimprimirModal: React.FC<ReimprimirModalProps> = ({ isOpen, onClose, venta }) => {
    const { addToHistory } = useVentas();
    const { showToast } = useToast();
    const [tipoComprobante, setTipoComprobante] = useState<'ticket' | 'factura'>('ticket');

    if (!venta) return null;

    const handleReimprimir = () => {
        generarPDF(venta, tipoComprobante);
        addToHistory(venta, "REIMPRESIÓN", `Comprobante ${tipoComprobante} reimpreso`);
        showToast("Comprobante generado", "success", "Reimpresión");
        onClose();
    };

    const modalFooter = (
        <>
            <button className="dc-btn secondary" onClick={onClose}>Cancelar</button>
            <button className="dc-btn success" onClick={handleReimprimir}>Generar PDF</button>
        </>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Reimprimir Comprobante" icon="fa-print" footer={modalFooter}>
            <div className="detalle-venta-card">
                <div className="dc-info-card">
                    <h4><i className="fa fa-info-circle"></i> Información de la Venta</h4>
                    <div className="dc-info-grid">
                        <div className="dc-info-item">
                            <div className="dc-info-label">Venta</div>
                            <div className="dc-info-value">{venta.numero}</div>
                        </div>

                        <div className="dc-info-item">
                            <div className="dc-info-label">Cliente</div>
                            <div className="dc-info-value">{venta.cliente}</div>
                        </div>

                        <div className="dc-info-item">
                            <div className="dc-info-label">Total</div>
                            <div className="dc-info-value">S/ {venta.total.toFixed(2)}</div>
                        </div>
                    </div>
                </div>
                <div className="dc-input-group">
                    <label>Tipo de comprobante</label>
                    <select value={tipoComprobante} onChange={(e) => setTipoComprobante(e.target.value as 'ticket' | 'factura')}>
                        <option value="ticket">Ticket</option>
                        <option value="factura">Factura Electrónica</option>
                    </select>
                </div>
                <div className="notas-credito" dangerouslySetInnerHTML={{ __html: generarVistaPreviaHTML(venta, tipoComprobante) }} />
            </div>
        </Modal>
    );
};