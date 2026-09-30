import { useState, useEffect, useCallback, useMemo } from 'react';
import { useCompany } from '../../features/company/context/CompanyContext';
import { useCateringService } from '../../context/CateringContext';
import {
    cateringEventoApi,
    PreparacionReceta,
} from '../../services/api/cateringEventoApi';

export interface PreparacionEnriquecida extends PreparacionReceta {
    idEvento: number;
    numeroEvento: string;
    clienteEvento: string;
    horaInicioDate: Date;
}

export interface PreparacionesMetrics {
    preparaciones: PreparacionEnriquecida[];
    totalEnProgreso: number;
    totalPausadas: number;
    enTiempo: number;
    retrasadas: number;
    isLoading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
}

const ESTADOS_EVENTOS_ACTIVOS = [
    'en_preparacion',
    'compra_pendiente',
    'pendiente_verificacion',
    'listo_para_envio',
    'en_transito',
    'en_evento',
];

export const usePreparacionesMetrics = (): PreparacionesMetrics => {
    const { getSelectedCompanyId } = useCompany();
    const { ventas: cateringVentas } = useCateringService();

    const [preparaciones, setPreparaciones] = useState<PreparacionEnriquecida[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const eventosActivos = useMemo(() => {
        return cateringVentas.filter((v) => {
            const estado = v.eventoData?.estado_flujo || '';
            return ESTADOS_EVENTOS_ACTIVOS.includes(estado);
        });
    }, [cateringVentas]);

    const loadData = useCallback(async () => {
        const idEmpresa = getSelectedCompanyId();
        if (!idEmpresa) {
            setPreparaciones([]);
            setIsLoading(false);
            return;
        }

        if (eventosActivos.length === 0) {
            setPreparaciones([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const resultados = await Promise.all(
                eventosActivos.map(async (evento) => {
                    const idEvento = evento.eventoData?.id_evento;
                    if (!idEvento) return [];

                    try {
                        const preps = await cateringEventoApi.getPreparaciones(
                            idEvento,        // ← CAMBIO AQUÍ: id del evento
                            idEmpresa
                        );
                        return preps.map<PreparacionEnriquecida>((p) => ({
                            ...p,
                            idEvento,
                            numeroEvento: evento.numero,
                            clienteEvento: evento.cliente,
                            horaInicioDate: new Date(p.hora_inicio),
                        }));
                    } catch (err) {
                        console.warn(
                            `[usePreparacionesMetrics] Error en evento ${idEvento}:`,
                            err
                        );
                        return [];
                    }
                })
            );

            const aplanado = resultados
                .flat()
                .filter((p) => p.estado !== 'completado')
                .sort(
                    (a, b) =>
                        a.horaInicioDate.getTime() - b.horaInicioDate.getTime()
                );

            setPreparaciones(aplanado);
        } catch (err) {
            console.error('[usePreparacionesMetrics] Error:', err);
            setError('Error al cargar preparaciones');
        } finally {
            setIsLoading(false);
        }
    }, [getSelectedCompanyId, eventosActivos]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    return useMemo(() => {
        const ahora = Date.now();

        const totalEnProgreso = preparaciones.filter(
            (p) => p.estado === 'en_progreso'
        ).length;
        const totalPausadas = preparaciones.filter(
            (p) => p.estado === 'pausado'
        ).length;

        // En tiempo: tiempo transcurrido <= tiempo estimado (o sin estimado)
        const enTiempo = preparaciones.filter((p) => {
            const transcurridoMin = Math.floor(
                (ahora - p.horaInicioDate.getTime()) / 60000
            );
            return transcurridoMin <= 60; // umbral por defecto si no hay estimado
        }).length;

        const retrasadas = preparaciones.length - enTiempo;

        return {
            preparaciones,
            totalEnProgreso,
            totalPausadas,
            enTiempo,
            retrasadas,
            isLoading,
            error,
            refresh: loadData,
        };
    }, [preparaciones, isLoading, error, loadData]);
};