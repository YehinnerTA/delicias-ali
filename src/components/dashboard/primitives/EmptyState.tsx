import React from 'react';

interface EmptyStateProps {
    icon?: string;
    title: string;
    description?: string;
    action?: React.ReactNode;
    variant?: 'default' | 'success';
}

const EmptyState: React.FC<EmptyStateProps> = ({
    icon = '📭',
    title,
    description,
    action,
    variant = 'default',
}) => {
    return (
        <div className={`dc-empty-state dc-empty-state--${variant}`}>
            <span className="dc-empty-state-icon">{icon}</span>
            <span className="dc-empty-state-title">{title}</span>
            {description && <span className="dc-empty-state-desc">{description}</span>}
            {action && <div className="dc-empty-state-action">{action}</div>}
        </div>
    );
};

export default EmptyState;