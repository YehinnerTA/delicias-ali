import React from 'react';
import { useInventoryStatusByCategory } from '../../../hooks/dashboard/useInventoryStatusByCategory';

interface InventoryStatusChartProps {
    height?: number;
}

const InventoryStatusChart: React.FC<InventoryStatusChartProps> = () => {
    const { insumos, postres, isLoading } = useInventoryStatusByCategory();

    if (isLoading) {
        return (
            <div className="dc-panel-loading">
                <div className="dc-panel-loading-spinner" />
                <span>Cargando estado del inventario...</span>
            </div>
        );
    }

    const renderBloque = (
        titulo: string,
        total: number,
        slices: Array<{ label: string; cantidad: number; porcentaje: number; color: string }>
    ) => (
        <div className="dc-inventory-status-block" key={titulo}>
            <div className="dc-inventory-status-block-header">
                <span className="dc-inventory-status-block-title">{titulo}</span>
                <span className="dc-inventory-status-block-total">
                    {total} {total === 1 ? 'ítem' : 'ítems'}
                </span>
            </div>

            {slices.map((s) => (
                <div className="dc-inventory-status-bar-row" key={s.label}>
                    <span className="dc-inventory-status-bar-label">{s.label}</span>
                    <div className="dc-inventory-status-bar-track">
                        <div
                            className="dc-inventory-status-bar-fill"
                            style={{
                                width: `${s.porcentaje}%`,
                                background: s.color,
                            }}
                        />
                    </div>
                    <span className="dc-inventory-status-bar-value">
                        {s.porcentaje.toFixed(0)}%
                        <span className="dc-inventory-status-bar-count">
                            {' '}
                            ({s.cantidad})
                        </span>
                    </span>
                </div>
            ))}
        </div>
    );

    return (
        <div className="dc-inventory-status">
            {renderBloque(insumos.titulo, insumos.total, insumos.slices)}
            {renderBloque(postres.titulo, postres.total, postres.slices)}
        </div>
    );
};

export default InventoryStatusChart;