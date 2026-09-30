import React from 'react';
import { useEventMetrics, ProximoEvento } from '../../../hooks/dashboard/useEventMetrics';

const ESTADO_LABELS: Record<string, string> = {
    pendiente_verificacion: 'Pendiente verif.',
    compra_pendiente: 'Compra pendiente',
    en_preparacion: 'En preparación',
    listo_para_envio: 'Listo para envío',
    en_transito: 'En tránsito',
    en_evento: 'En evento',
    en_retorno: 'En retorno',
    retornado: 'Retornado',
};

const ESTADO_CLASSES: Record<string, string> = {
    pendiente_verificacion: 'estado-rojo',
    compra_pendiente: 'estado-naranja',
    en_preparacion: 'estado-amarillo',
    listo_para_envio: 'estado-info',
    en_transito: 'estado-azul',
    en_evento: 'estado-verde',
    en_retorno: 'estado-morado',
    retornado: 'estado-gris',
};

interface UpcomingEventsPanelProps {
    maxItems?: number;
}

const UpcomingEventsPanel: React.FC<UpcomingEventsPanelProps> = ({ maxItems = 5 }) => {
    const { proximosEventosHoy, isLoading } = useEventMetrics('hoy');
    const eventos = proximosEventosHoy.slice(0, maxItems);

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
                <span className="dc-panel-empty-title">Sin eventos próximos hoy</span>
                <span className="dc-panel-empty-desc">Todo despejado por ahora</span>
            </div>
        );
    }

    return (
        <div className="dc-upcoming-events">
            {eventos.map((evento: ProximoEvento) => (
                <div key={evento.id} className="dc-event-card">
                    <div className="dc-event-hour">
                        <span className="dc-event-hour-value">{evento.horario}</span>
                    </div>

                    <div className="dc-event-body">
                        <div className="dc-event-header">
                            <span className="dc-event-cliente">{evento.cliente}</span>
                            <span
                                className={`dc-event-estado ${ESTADO_CLASSES[evento.estado_flujo] || 'estado-gris'
                                    }`}
                            >
                                {ESTADO_LABELS[evento.estado_flujo] || evento.estado_flujo}
                            </span>
                        </div>

                        <div className="dc-event-meta">
                            <span className="dc-event-personas">
                                👥 {evento.personas} personas
                            </span>
                            {evento.direccion && (
                                <span className="dc-event-direccion">
                                    📍 {evento.direccion}
                                </span>
                            )}
                        </div>

                        {evento.referencia && (
                            <div className="dc-event-referencia">
                                Ref: {evento.referencia}
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default UpcomingEventsPanel;