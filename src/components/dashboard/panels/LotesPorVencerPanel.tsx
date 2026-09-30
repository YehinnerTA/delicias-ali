import React from 'react';
import { useLotesPorVencer } from '../../../hooks/dashboard/useLotesPorVencer';

interface LotesPorVencerPanelProps {
    maxItems?: number;
}

const SEVERIDAD_ICONS: Record<string, string> = {
    critica: '🔴',
    media: '🟠',
    baja: '🟡',
};

const LotesPorVencerPanel: React.FC<LotesPorVencerPanelProps> = ({
    maxItems = 5,
}) => {
    const { lotes, totalPorVencer, isLoading } = useLotesPorVencer(maxItems);

    if (isLoading) {
        return (
            <div className="dc-panel-loading">
                <div className="dc-panel-loading-spinner" />
                <span>Cargando lotes...</span>
            </div>
        );
    }

    if (lotes.length === 0) {
        return (
            <div className="dc-panel-empty dc-panel-empty--success">
                <span className="dc-panel-empty-icon">✅</span>
                <span className="dc-panel-empty-title">
                    Sin lotes por vencer
                </span>
                <span className="dc-panel-empty-desc">
                    Todo vigente por más de 7 días
                </span>
            </div>
        );
    }

    return (
        <div className="dc-lotes-por-vencer">
            <div className="dc-lotes-summary">
                <span className="dc-lotes-summary-item">
                    Total: <strong>{totalPorVencer}</strong>{' '}
                    {totalPorVencer === 1 ? 'lote' : 'lotes'}
                </span>
                <span className="dc-lotes-summary-item">
                    Esta semana
                </span>
            </div>

            <div className="dc-lotes-list">
                {lotes.map((lote) => (
                    <div
                        key={`${lote.tipo}-${lote.id}`}
                        className={`dc-lote-item dc-lote-item--${lote.severidad}`}
                    >
                        <span className="dc-lote-icon">
                            {SEVERIDAD_ICONS[lote.severidad]}
                        </span>

                        <div className="dc-lote-body">
                            <span className="dc-lote-nombre">{lote.nombre}</span>
                            <span className="dc-lote-meta">
                                {lote.stock} {lote.unidad}
                            </span>
                        </div>

                        <span className="dc-lote-dias">
                            {lote.diasRestantes === 0
                                ? 'vence hoy'
                                : lote.diasRestantes === 1
                                    ? 'vence mañana'
                                    : `en ${lote.diasRestantes} días`}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default LotesPorVencerPanel;