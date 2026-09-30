import React, { ReactNode } from 'react';

interface ChartCardProps {
    title: string;
    icon?: string;
    subtitle?: string;
    actions?: ReactNode;
    children: ReactNode;
    className?: string;
    fullWidth?: boolean;
    isLoading?: boolean;
    isEmpty?: boolean;
    emptyMessage?: string;
}

const ChartCard: React.FC<ChartCardProps> = ({
    title,
    icon,
    subtitle,
    actions,
    children,
    className = '',
    fullWidth = false,
    isLoading = false,
    isEmpty = false,
    emptyMessage = 'Sin datos disponibles',
}) => {
    return (
        <div className={`dc-chart-card ${fullWidth ? 'dc-chart-card--full' : ''} ${className}`}>
            <div className="dc-chart-card-header">
                <div className="dc-chart-card-title-group">
                    <h3 className="dc-chart-card-title">
                        {icon && <span className="dc-chart-card-icon">{icon}</span>}
                        {title}
                    </h3>
                    {subtitle && <p className="dc-chart-card-subtitle">{subtitle}</p>}
                </div>

                {actions && <div className="dc-chart-card-actions">{actions}</div>}
            </div>

            <div className="dc-chart-card-body">
                {isLoading ? (
                    <div className="dc-chart-skeleton">
                        <div className="dc-chart-skeleton-bar" />
                        <div className="dc-chart-skeleton-spinner">Cargando...</div>
                    </div>
                ) : isEmpty ? (
                    <div className="dc-chart-empty">
                        <span className="dc-chart-empty-icon">📭</span>
                        <span className="dc-chart-empty-text">{emptyMessage}</span>
                    </div>
                ) : (
                    children
                )}
            </div>
        </div>
    );
};

export default ChartCard;