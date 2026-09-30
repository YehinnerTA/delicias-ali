import React from 'react';

export type KpiVariant = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
export type TrendDirection = 'up' | 'down' | 'flat';

interface KpiTrend {
    value: number;
    direction: TrendDirection;
    label?: string;
}

interface KpiCardProps {
    icon: string;
    label: string;
    value: string | number;
    sub?: string;
    trend?: KpiTrend;
    variant?: KpiVariant;
    isLoading?: boolean;
}

const formatTrendValue = (value: number, direction: TrendDirection): string => {
    const abs = Math.abs(value);
    const sign = direction === 'up' ? '+' : direction === 'down' ? '-' : '';
    return `${sign}${abs.toFixed(1)}%`;
};

const getTrendIcon = (direction: TrendDirection): string => {
    if (direction === 'up') return '▲';
    if (direction === 'down') return '▼';
    return '▬';
};

const KpiCard: React.FC<KpiCardProps> = ({
    icon,
    label,
    value,
    sub,
    trend,
    variant = 'primary',
    isLoading = false,
}) => {
    if (isLoading) {
        return (
            <div className="dc-kpi-card dc-kpi-card--loading">
                <div className="dc-kpi-skeleton-icon" />
                <div className="dc-kpi-skeleton-lines">
                    <div className="dc-kpi-skeleton-line dc-kpi-skeleton-line--short" />
                    <div className="dc-kpi-skeleton-line dc-kpi-skeleton-line--long" />
                    <div className="dc-kpi-skeleton-line dc-kpi-skeleton-line--short" />
                </div>
            </div>
        );
    }

    return (
        <div className={`dc-kpi-card dc-kpi-card--${variant}`}>
            <div className={`dc-kpi-icon dc-kpi-icon--${variant}`}>
                <span>{icon}</span>
            </div>

            <div className="dc-kpi-body">
                <span className="dc-kpi-label">{label}</span>
                <span className="dc-kpi-value">{value}</span>

                <div className="dc-kpi-footer">
                    {sub && <span className="dc-kpi-sub">{sub}</span>}

                    {trend && (
                        <span className={`dc-kpi-trend dc-kpi-trend--${trend.direction}`}>
                            <span className="dc-kpi-trend-icon">{getTrendIcon(trend.direction)}</span>
                            {formatTrendValue(trend.value, trend.direction)}
                            {trend.label && <span className="dc-kpi-trend-label"> {trend.label}</span>}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default KpiCard;