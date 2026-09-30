import React from 'react';

interface SkeletonCardProps {
    variant?: 'kpi' | 'chart' | 'panel';
    lines?: number;
}

const SkeletonCard: React.FC<SkeletonCardProps> = ({ variant = 'kpi', lines = 3 }) => {
    if (variant === 'chart') {
        return (
            <div className="dc-skeleton-card dc-skeleton-card--chart">
                <div className="dc-skeleton-line dc-skeleton-line--title" />
                <div className="dc-skeleton-chart-area" />
            </div>
        );
    }

    if (variant === 'panel') {
        return (
            <div className="dc-skeleton-card dc-skeleton-card--panel">
                <div className="dc-skeleton-line dc-skeleton-line--title" />
                {Array.from({ length: lines }).map((_, i) => (
                    <div key={i} className="dc-skeleton-line dc-skeleton-line--row" />
                ))}
            </div>
        );
    }

    return (
        <div className="dc-skeleton-card dc-skeleton-card--kpi">
            <div className="dc-skeleton-circle" />
            <div className="dc-skeleton-lines">
                <div className="dc-skeleton-line dc-skeleton-line--short" />
                <div className="dc-skeleton-line dc-skeleton-line--long" />
                <div className="dc-skeleton-line dc-skeleton-line--short" />
            </div>
        </div>
    );
};

export default SkeletonCard;