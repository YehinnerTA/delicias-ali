import React, { useState, useEffect } from 'react';
import { Modal } from '../Modal';
import { Venta, HistorialEntry } from '../../../../features/types/sales';
import { historialApi } from '../../../../services/api/historialApi';
import { useToast } from '../../../../hooks/base/useToast';

interface DetalleVentaModalProps {
    isOpen: boolean;
    onClose: () => void;
    venta: Venta | null;
}

type TabType = 'detalle' | 'historial';

export const DetalleVentaModal: React.FC<DetalleVentaModalProps> = ({ isOpen, onClose, venta }) => {
    const [activeTab, setActiveTab] = useState<TabType>('detalle');
    const [historial, setHistorial] = useState<HistorialEntry[]>([]);
    const [isLoadingHistorial, setIsLoadingHistorial] = useState(false);
    const { showToast } = useToast();

    useEffect(() => {
        if (isOpen && venta?.id) {
            cargarHistorial(venta.id);
        }
    }, [isOpen, venta]);

    const cargarHistorial = async (ventaId: number) => {
        setIsLoadingHistorial(true);
        try {
            const data = await historialApi.getByEntity('ventas', ventaId);
            setHistorial(data);
        } catch (error) {
            console.error('[DetalleVentaModal] Error al cargar historial:', error);
            showToast('Error al cargar el historial', 'error', 'Error');
            setHistorial([]);
        } finally {
            setIsLoadingHistorial(false);
        }
    };

    if (!venta) return null;

    const prodHtml = venta.productos.map((p, idx) => (
        <div key={p.id || idx} className="detalle-producto-item">
            <div><strong>{p.nombre}</strong> - S/ {p.precio.toFixed(2)}</div>
            <div>Cant: {p.cantidad} | Subtotal: S/ {(p.cantidad * p.precio).toFixed(2)}</div>
        </div>
    ));

    const devHtml = (venta.devoluciones || []).map((d, idx) => (
        <div key={idx} className="devolucion-card">   {/* ← CORREGIDO: usar idx */}
            <small>{d.fecha}</small><br />
            <strong>NC: {d.notaCredito}</strong><br />
            Monto: S/ {d.monto.toFixed(2)}<br />
            Motivo: {d.motivo}<br />
            Productos: {d.productos.map(p => `${p.nombre} x${p.cantidad}`).join(', ')}
        </div>
    ));

    const histHtml = (historial.length > 0 ? historial : venta.historial || []).map((h, idx) => (
        <div key={idx} className="dc-history-entry">   {/* ← CORREGIDO: usar idx */}
            <div>
                <span className="dc-history-date">{h.fecha}</span>
                <span className="dc-history-user"><i className="fas fa-user-circle"></i> {h.usuario}</span>
            </div>
            <div className="dc-history-action">{h.accion}</div>
            <div className="dc-history-desc">{h.descripcion}</div>
        </div>
    ));

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Detalle de Venta - ${venta.numero}`} icon="fa-receipt">
            {/* Tabs internos */}
            <div className="dc-tabs">
                <button
                    className={`dc-tab-btn ${activeTab === 'detalle' ? 'active' : ''}`}
                    onClick={() => setActiveTab('detalle')}
                >
                    <i className="fas fa-info-circle"></i> Detalle
                </button>
                <button
                    className={`dc-tab-btn ${activeTab === 'historial' ? 'active' : ''}`}
                    onClick={() => setActiveTab('historial')}
                >
                    <i className="fas fa-history"></i> Historial
                </button>
            </div>

            {activeTab === 'detalle' && (
                <>
                    <div className="detalle-venta-card">
                        <div className="dc-info-card">
                            <h4><i className="fa fa-info-circle"></i> Información de la Venta</h4>
                            <div className="dc-info-grid">
                                <div className="dc-info-item">
                                    <div className="dc-info-label">Venta</div>
                                    <div className="dc-info-value">{venta.numero}</div>
                                </div>
                                <div className="dc-info-item">
                                    <div className="dc-info-label">Fecha</div>
                                    <div className="dc-info-value">{venta.fecha}</div>
                                </div>
                                <div className="dc-info-item">
                                    <div className="dc-info-label">Cliente</div>
                                    <div className="dc-info-value">{venta.cliente}</div>
                                </div>
                                <div className="dc-info-item">
                                    <div className="dc-info-label">Pago</div>
                                    <div className="dc-info-value">{venta.metodoPago}</div>
                                </div>
                            </div>
                            <h4 className="detalle-subtitulo">Productos</h4>
                            {prodHtml}
                        </div>
                        <div className="detalle-totales">
                            <div>Subtotal: S/ {venta.subtotal.toFixed(2)}</div>
                            <div>Descuento: S/ {(venta.descuento || 0).toFixed(2)}</div>
                            <div>IGV: S/ {venta.igv.toFixed(2)}</div>
                            <div className="total-grande"><strong>TOTAL: S/ {venta.total.toFixed(2)}</strong></div>
                        </div>
                    </div>
                    {devHtml.length > 0 && (
                        <div className="detalle-venta-card notas-credito">
                            <h4>Notas de Crédito</h4>
                            {devHtml}
                        </div>
                    )}
                </>
            )}

            {activeTab === 'historial' && (
                <div>
                    <h4 style={{ marginBottom: '1rem' }}>{venta.numero} - {venta.cliente}</h4>
                    <div className="detalle-venta-card">
                        {isLoadingHistorial ? (
                            <div style={{ textAlign: 'center', padding: '2rem' }}>
                                <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem' }}></i>
                                <p>Cargando historial...</p>
                            </div>
                        ) : (
                            <>
                                {histHtml.length > 0 ? histHtml : <p>Sin historial registrado</p>}
                            </>
                        )}
                    </div>
                </div>
            )}
        </Modal>
    );
};