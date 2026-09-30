import React, { useMemo } from 'react';
import { useEventMetrics, ProximoEvento } from '../../../hooks/dashboard/useEventMetrics';

interface EventosLogisticaPanelProps {
    maxItems?: number;
}

const ESTADOS_LOGISTICOS = [
    'compra_pendiente',
    'listo_para_envio',
    'en_transito',
    'en_retorno',
];

const ESTADO_LABELS: Record<string, string> = {
    compra_pendiente: 'Compra pendiente',
    listo_para_envio: 'Listo para envío',
    en_transito: 'En tránsito',
    en_retorno: 'En retorno',
};

const ESTADO_CLASSES: Record<string, string> = {
    compra_pendiente: 'estado-naranja',
    listo_para_envio: 'estado-info',
    en_transito: 'estado-azul',
    en_retorno: 'estado-morado',
};

const EventosLogisticaPanel: React.FC<EventosLogisticaPanelProps> = ({
    maxItems = 5,
}) => {
    const { proximosEventosHoy, isLoading } = useEventMetrics('hoy');

    const eventos = useMemo(
        () =>
            proximosEventosHoy
                .filter((e) => ESTADOS_LOGISTICOS.includes(e.estado_flujo))
                .slice(0, maxItems),
        [proximosEventosHoy, maxItems]
    );

    if (isLoading) {
        return (
            <div className="dc-panel-loading">
                <div className="dc-panel-loading-spinner" />
                <span>Cargando eventos...</span>
            </div>
        );
    }

    if (eventos.length === 0) {
        return (
            <div className="dc-panel-empty dc-panel-empty--success">
                <span className="dc-panel-empty-icon">✅</span>
                <span className="dc-panel-empty-title">
                    Sin eventos en fase logística
                </span>
                <span className="dc-panel-empty-desc">
                    Todo despachado o aún sin asignar
                </span>
            </div>
        );
    }

    return (
        <div className="dc-eventos-logistica">
            {eventos.map((evento: ProximoEvento) => (
                <div
                    key={evento.id}
                    className={`dc-evento-log-item dc-evento-log-item--${evento.estado_flujo}`}
                >
                    <div className="dc-evento-log-header">
                        <span className="dc-evento-log-hora">
                            🕐 {evento.horario}
                        </span>
                        <span
                            className={`dc-evento-log-estado ${ESTADO_CLASSES[evento.estado_flujo] || 'estado-gris'
                                }`}
                        >
                            {ESTADO_LABELS[evento.estado_flujo] || evento.estado_flujo}
                        </span>
                    </div>

                    <div className="dc-evento-log-cliente">{evento.cliente}</div>

                    <div className="dc-evento-log-meta">
                        <span>👥 {evento.personas} personas</span>
                        {evento.direccion && (
                            <span className="dc-evento-log-dir">
                                📍 {evento.direccion}
                            </span>
                        )}
                    </div>

                    <div className="dc-evento-log-acciones">
                        <span className="dc-evento-log-link">
                            Ver checklist →
                        </span>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default EventosLogisticaPanel;