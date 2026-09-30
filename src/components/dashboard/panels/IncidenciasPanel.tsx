import React from 'react';
import {
    useIncidenciasCocina,
    IncidenciaEnriquecida,
} from '../../../hooks/dashboard/useIncidenciasCocina';

interface IncidenciasPanelProps {
    maxItems?: number;
}

const SEVERIDAD_ICONS: Record<string, string> = {
    critica: '🔴',
    media: '🟠',
    baja: '🟡',
};

const SEVERIDAD_LABELS: Record<string, string> = {
    critica: 'CRÍTICA',
    media: 'MEDIA',
    baja: 'BAJA',
};

const ESTADO_LABELS: Record<string, string> = {
    abierta: 'Abierta',
    en_revision: 'En revisión',
};

const IncidenciasPanel: React.FC<IncidenciasPanelProps> = ({ maxItems = 5 }) => {
    const { incidencias, totalCriticas, isLoading } = useIncidenciasCocina();
    const visibles = incidencias.slice(0, maxItems);

    if (isLoading) {
        return (
            <div className="dc-panel-loading">
                <div className="dc-panel-loading-spinner" />
                <span>Cargando incidencias...</span>
            </div>
        );
    }

    if (visibles.length === 0) {
        return (
            <div className="dc-panel-empty dc-panel-empty--success">
                <span className="dc-panel-empty-icon">✅</span>
                <span className="dc-panel-empty-title">Sin incidencias activas</span>
                <span className="dc-panel-empty-desc">Todo marcha bien</span>
            </div>
        );
    }

    return (
        <div className="dc-incidencias">
            {totalCriticas > 0 && (
                <div className="dc-incidencias-alert">
                    🔴 {totalCriticas}{' '}
                    {totalCriticas === 1 ? 'incidencia crítica' : 'incidencias críticas'}
                </div>
            )}

            <div className="dc-incidencias-list">
                {visibles.map((inc: IncidenciaEnriquecida) => (
                    <div
                        key={inc.id}
                        className={`dc-incidencia-item dc-incidencia-item--${inc.severidad}`}
                    >
                        <div className="dc-incidencia-header">
                            <span className="dc-incidencia-sev">
                                {SEVERIDAD_ICONS[inc.severidad]}{' '}
                                {SEVERIDAD_LABELS[inc.severidad]}
                            </span>
                            <span className="dc-incidencia-hora">
                                {new Date(inc.created_at).toLocaleTimeString('es-PE', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12: false,
                                })}
                            </span>
                        </div>

                        <div className="dc-incidencia-desc">{inc.descripcion}</div>

                        <div className="dc-incidencia-meta">
                            <span>Evento {inc.numeroEvento}</span>
                            <span>·</span>
                            <span>{inc.etapa}</span>
                            <span>·</span>
                            <span className="dc-incidencia-estado">
                                {ESTADO_LABELS[inc.estado] || inc.estado}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default IncidenciasPanel;