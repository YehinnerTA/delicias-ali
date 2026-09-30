import React from 'react';
import { useDevolucionesHoy } from '../../../hooks/dashboard/useDevolucionesHoy';

interface DevolucionesHoyPanelProps {
    maxItems?: number;
}

const DevolucionesHoyPanel: React.FC<DevolucionesHoyPanelProps> = ({
    maxItems = 5,
}) => {
    const { devoluciones, total, cantidad, isLoading } = useDevolucionesHoy();
    const visibles = devoluciones.slice(0, maxItems);

    if (isLoading) {
        return (
            <div className="dc-panel-loading">
                <div className="dc-panel-loading-spinner" />
                <span>Cargando devoluciones...</span>
            </div>
        );
    }

    if (cantidad === 0) {
        return (
            <div className="dc-panel-empty dc-panel-empty--success">
                <span className="dc-panel-empty-icon">✅</span>
                <span className="dc-panel-empty-title">Sin devoluciones hoy</span>
                <span className="dc-panel-empty-desc">
                    Todo va sobre ruedas
                </span>
            </div>
        );
    }

    return (
        <div className="dc-devoluciones">
            <div className="dc-devoluciones-summary">
                <span className="dc-devoluciones-summary-item">
                    Total: <strong>S/ {total.toFixed(2)}</strong>
                </span>
                <span className="dc-devoluciones-summary-item">
                    {cantidad} {cantidad === 1 ? 'caso' : 'casos'}
                </span>
            </div>

            <div className="dc-devoluciones-list">
                {visibles.map((dev) => (
                    <div key={dev.id} className="dc-devolucion-item">
                        <div className="dc-devolucion-header">
                            <span className="dc-devolucion-hora">🕐 {dev.hora}</span>
                            <span className="dc-devolucion-monto">
                                S/ {dev.monto.toFixed(2)}
                            </span>
                        </div>

                        <div className="dc-devolucion-meta">
                            <span className="dc-devolucion-venta">
                                {dev.ventaNumero}
                            </span>
                            <span>·</span>
                            <span className="dc-devolucion-nota">
                                Nota {dev.notaCredito}
                            </span>
                        </div>

                        <div className="dc-devolucion-motivo">
                            Motivo: {dev.motivo}
                        </div>

                        {dev.productos.length > 0 && (
                            <div className="dc-devolucion-productos">
                                {dev.productos.slice(0, 2).map((p, idx) => (
                                    <span
                                        key={idx}
                                        className="dc-devolucion-producto-tag"
                                    >
                                        {p.cantidad}× {p.nombre}
                                    </span>
                                ))}
                                {dev.productos.length > 2 && (
                                    <span className="dc-devolucion-producto-tag dc-devolucion-producto-tag--more">
                                        +{dev.productos.length - 2} más
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DevolucionesHoyPanel;