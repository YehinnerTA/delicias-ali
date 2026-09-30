import React from 'react';
import { useProveedoresResumen } from '../../../hooks/dashboard/useProveedoresResumen';

const ProveedoresResumenPanel: React.FC = () => {
    const { total, activos, inactivos, isLoading } = useProveedoresResumen();

    if (isLoading) {
        return (
            <div className="dc-panel-loading">
                <div className="dc-panel-loading-spinner" />
                <span>Cargando proveedores...</span>
            </div>
        );
    }

    if (total === 0) {
        return (
            <div className="dc-panel-empty">
                <span className="dc-panel-empty-icon">🏢</span>
                <span className="dc-panel-empty-title">
                    Sin proveedores registrados
                </span>
                <span className="dc-panel-empty-desc">
                    Registra proveedores en el módulo Personas
                </span>
            </div>
        );
    }

    const porcentajeActivos = total > 0 ? (activos / total) * 100 : 0;

    return (
        <div className="dc-proveedores-resumen">
            <div className="dc-proveedores-total">
                <span className="dc-proveedores-total-value">{total}</span>
                <span className="dc-proveedores-total-label">
                    {total === 1 ? 'proveedor' : 'proveedores'}
                </span>
            </div>

            <div className="dc-proveedores-detalle">
                <div className="dc-proveedores-item">
                    <span className="dc-proveedores-item-label">
                        <span className="dc-dot dc-dot--success" /> Activos
                    </span>
                    <span className="dc-proveedores-item-value">
                        {activos} ({porcentajeActivos.toFixed(0)}%)
                    </span>
                </div>

                <div className="dc-proveedores-item">
                    <span className="dc-proveedores-item-label">
                        <span className="dc-dot dc-dot--neutral" /> Inactivos
                    </span>
                    <span className="dc-proveedores-item-value">
                        {inactivos} ({(100 - porcentajeActivos).toFixed(0)}%)
                    </span>
                </div>
            </div>

            <div className="dc-proveedores-bar-track">
                <div
                    className="dc-proveedores-bar-fill"
                    style={{ width: `${porcentajeActivos}%` }}
                />
            </div>
        </div>
    );
};

export default ProveedoresResumenPanel;