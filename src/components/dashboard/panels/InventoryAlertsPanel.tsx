import React from 'react';
import {
    useInventoryMetrics,
    AlertaInventario,
} from '../../../hooks/dashboard/useInventoryMetrics';

const SEVERIDAD_ICONS: Record<string, string> = {
    critica: '🔴',
    media: '🟠',
    baja: '🟡',
};

interface InventoryAlertsPanelProps {
    maxItems?: number;
    soloStockBajo?: boolean;
}

const InventoryAlertsPanel: React.FC<InventoryAlertsPanelProps> = ({
    maxItems = 6,
    soloStockBajo = false,
}) => {
    const metrics = useInventoryMetrics();
    const { isLoading } = metrics;

    const alertas = soloStockBajo
        ? metrics.alertas.filter((a) => a.motivo === 'stock_bajo')
        : metrics.alertas;

    const visible = alertas.slice(0, maxItems);
    const totalCriticas = alertas.filter((a) => a.severidad === 'critica').length;
    const totalMedias = alertas.filter((a) => a.severidad === 'media').length;

    if (isLoading) {
        return (
            <div className="dc-panel-loading">
                <div className="dc-panel-loading-spinner" />
                <span>Cargando alertas...</span>
            </div>
        );
    }

    if (alertas.length === 0) {
        return (
            <div className="dc-panel-empty dc-panel-empty--success">
                <span className="dc-panel-empty-icon">✅</span>
                <span className="dc-panel-empty-title">
                    {soloStockBajo ? 'Insumos en orden' : 'Inventario en orden'}
                </span>
                <span className="dc-panel-empty-desc">
                    {soloStockBajo
                        ? 'Todos los insumos sobre el mínimo'
                        : 'Sin alertas activas'}
                </span>
            </div>
        );
    }

    return (
        <div className="dc-inventory-alerts">
            <div className="dc-inventory-summary">
                <span className="dc-inventory-summary-item dc-inventory-summary--danger">
                    🔴 {totalCriticas} críticas
                </span>
                <span className="dc-inventory-summary-item dc-inventory-summary--warning">
                    🟠 {totalMedias} medias
                </span>
                {!soloStockBajo && (
                    <>
                        <span className="dc-inventory-summary-item dc-inventory-summary--info">
                            Stock bajo: {metrics.itemsStockBajo}
                        </span>
                        <span className="dc-inventory-summary-item dc-inventory-summary--neutral">
                            Por vencer:{' '}
                            {metrics.insumosPorVencer + metrics.postresPorVencer}
                        </span>
                    </>
                )}
            </div>

            <div className="dc-inventory-list">
                {visible.map((alerta: AlertaInventario) => (
                    <div
                        key={`${alerta.tipo}-${alerta.id}`}
                        className={`dc-inventory-item dc-inventory-item--${alerta.severidad}`}
                    >
                        <span className="dc-inventory-item-icon">
                            {SEVERIDAD_ICONS[alerta.severidad]}
                        </span>
                        <span className="dc-inventory-item-nombre">{alerta.nombre}</span>
                        <span className="dc-inventory-item-badge">
                            {alerta.motivo === 'stock_bajo' ? (
                                <>
                                    {alerta.stock} / {alerta.minimo}
                                </>
                            ) : (
                                <>vence en {alerta.diasParaVencer}d</>
                            )}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default InventoryAlertsPanel;