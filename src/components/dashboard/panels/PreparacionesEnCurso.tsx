import React, { useState } from 'react';
import {
    usePreparacionesMetrics,
    PreparacionEnriquecida,
} from '../../../hooks/dashboard/usePreparacionesMetrics';
import { cateringEventoApi } from '../../../services/api/cateringEventoApi';
import { useCompany } from '../../../features/company/context/CompanyContext';
import { useAuth } from '../../../features/auth/context/AuthContext';

interface PreparacionesEnCursoProps {
    maxItems?: number;
}

const formatDuracion = (min: number): string => {
    if (min < 60) return `${min}min`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
};

const PreparacionesEnCurso: React.FC<PreparacionesEnCursoProps> = ({
    maxItems = 5,
}) => {
    const { preparaciones, isLoading, refresh } = usePreparacionesMetrics();
    const { getSelectedCompanyId } = useCompany();
    const { user } = useAuth();
    const [accionando, setAccionando] = useState<number | null>(null);

    const visibles = preparaciones.slice(0, maxItems);

    const handlePausar = async (prep: PreparacionEnriquecida) => {
        const idEmpresa = getSelectedCompanyId();
        if (!idEmpresa) return;
        setAccionando(prep.id);
        try {
            await cateringEventoApi.pausarPreparacion(
                prep.idEvento,
                prep.item,
                idEmpresa
            );
            await refresh();
        } catch (err) {
            console.error('[PreparacionesEnCurso] Error pausar:', err);
        } finally {
            setAccionando(null);
        }
    };

    const handleFinalizar = async (prep: PreparacionEnriquecida) => {
        const idEmpresa = getSelectedCompanyId();
        if (!idEmpresa || !user?.id) return;
        setAccionando(prep.id);
        try {
            await cateringEventoApi.finalizarPreparacion(
                prep.idEvento,
                prep.item,
                idEmpresa,
                user.id
            );
            await refresh();
        } catch (err) {
            console.error('[PreparacionesEnCurso] Error finalizar:', err);
        } finally {
            setAccionando(null);
        }
    };

    if (isLoading) {
        return (
            <div className="dc-panel-loading">
                <div className="dc-panel-loading-spinner" />
                <span>Cargando preparaciones...</span>
            </div>
        );
    }

    if (visibles.length === 0) {
        return (
            <div className="dc-panel-empty dc-panel-empty--success">
                <span className="dc-panel-empty-icon">🍳</span>
                <span className="dc-panel-empty-title">
                    Sin preparaciones en curso
                </span>
                <span className="dc-panel-empty-desc">
                    Todas las recetas están al día
                </span>
            </div>
        );
    }

    const ahora = Date.now();

    return (
        <div className="dc-preparaciones">
            {visibles.map((prep) => {
                const transcurridoMin = Math.floor(
                    (ahora - prep.horaInicioDate.getTime()) / 60000
                );
                const enTiempo = transcurridoMin <= 60;
                const isAccionando = accionando === prep.id;

                return (
                    <div key={`${prep.idEvento}-${prep.id}`} className="dc-prep-card">
                        <div className="dc-prep-header">
                            <span className="dc-prep-icon">⏱️</span>
                            <span className="dc-prep-item">{prep.item}</span>
                            <span
                                className={`dc-prep-estado ${prep.estado === 'pausado'
                                        ? 'estado-pausado'
                                        : enTiempo
                                            ? 'estado-en-tiempo'
                                            : 'estado-retrasado'
                                    }`}
                            >
                                {prep.estado === 'pausado'
                                    ? 'PAUSADA'
                                    : enTiempo
                                        ? 'EN TIEMPO'
                                        : 'RETRASADA'}
                            </span>
                        </div>

                        <div className="dc-prep-meta">
                            <span>📅 Evento {prep.numeroEvento}</span>
                            <span>·</span>
                            <span>{prep.clienteEvento}</span>
                        </div>

                        <div className="dc-prep-tiempos">
                            <span>
                                Inicio:{' '}
                                {prep.horaInicioDate.toLocaleTimeString('es-PE', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12: false,
                                })}
                            </span>
                            <span>·</span>
                            <span>Transcurrido: {formatDuracion(transcurridoMin)}</span>
                            {prep.iniciado_por_nombre && (
                                <>
                                    <span>·</span>
                                    <span>Chef: {prep.iniciado_por_nombre}</span>
                                </>
                            )}
                        </div>

                        <div className="dc-prep-actions">
                            <button
                                type="button"
                                className="dc-prep-btn dc-prep-btn--pausar"
                                onClick={() => handlePausar(prep)}
                                disabled={isAccionando || prep.estado === 'pausado'}
                            >
                                {isAccionando ? '...' : '⏸️ Pausar'}
                            </button>
                            <button
                                type="button"
                                className="dc-prep-btn dc-prep-btn--finalizar"
                                onClick={() => handleFinalizar(prep)}
                                disabled={isAccionando}
                            >
                                {isAccionando ? '...' : '✅ Finalizar'}
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default PreparacionesEnCurso;