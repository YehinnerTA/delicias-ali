import { useState, useEffect, useCallback, useMemo } from 'react';
import { useCompany } from '../../features/company/context/CompanyContext';
import { useCateringService } from '../../context/CateringContext';
import {
    cateringEventoApi,
    MetricasEvento,
} from '../../services/api/cateringEventoApi';

export interface RendimientoCocina {
    eficienciaPromedio: number;
    totalRealMin: number;
    totalEstimadoMin: number;
    diferenciaMin: number;
    eventosConDatos: number;
    topRecetasRapidas: Array<{ nombre: string; duracionMin: number }>;
    isLoading: boolean;
}

// Solo eventos donde ya hay etapas con tiempos medidos
const ESTADOS_CON_METRICAS = [
    'en_preparacion',
    'listo_para_envio',
    'en_transito',
    'en_evento',
    'en_retorno',
    'retornado',
    'cerrado',
];

export const useCocinaPerformance = (): RendimientoCocina => {
    const { getSelectedCompanyId } = useCompany();
    const { ventas: cateringVentas } = useCateringService();

    const [metricas, setMetricas] = useState<MetricasEvento[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const eventosConMetricas = useMemo(() => {
        return cateringVentas
            .filter((v) =>
                ESTADOS_CON_METRICAS.includes(v.eventoData?.estado_flujo || '')
            )
            .slice(0, 10);
    }, [cateringVentas]);

    const loadData = useCallback(async () => {
        const idEmpresa = getSelectedCompanyId();
        if (!idEmpresa || eventosConMetricas.length === 0) {
            setMetricas([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        try {
            const resultados = await Promise.all(
                eventosConMetricas.map((ev) => {
                    const idEvento = ev.eventoData?.id_evento;
                    if (!idEvento) return Promise.resolve(null);
                    return cateringEventoApi
                        .getMetricas(idEvento, idEmpresa)
                        .catch(() => null);
                })
            );
            setMetricas(resultados.filter((m): m is MetricasEvento => m !== null));
        } catch (err) {
            console.error('[useCocinaPerformance] Error:', err);
        } finally {
            setIsLoading(false);
        }
    }, [getSelectedCompanyId, eventosConMetricas]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    return useMemo(() => {
        // Solo eventos con etapas medidas (real > 0)
        const eventosConDatos = metricas.filter(
            (m) => (m.resumen?.total_real_min || 0) > 0
        );

        if (eventosConDatos.length === 0) {
            return {
                eficienciaPromedio: 0,
                totalRealMin: 0,
                totalEstimadoMin: 0,
                diferenciaMin: 0,
                eventosConDatos: 0,
                topRecetasRapidas: [],
                isLoading,
            };
        }

        const totalRealMin = eventosConDatos.reduce(
            (acc, m) => acc + (m.resumen.total_real_min || 0),
            0
        );
        const totalEstimadoMin = eventosConDatos.reduce(
            (acc, m) => acc + (m.resumen.total_estimado_min || 0),
            0
        );
        const diferenciaMin = totalRealMin - totalEstimadoMin;

        // Eficiencia: qué tan cerca estamos del estimado
        // 100% = perfecto | >100% = más rápido | <100% = más lento
        const eficienciaPromedio =
            totalEstimadoMin > 0
                ? (totalEstimadoMin / totalRealMin) * 100
                : 0;

        // Top recetas más rápidas (las que terminaron en menos tiempo)
        const prepMap = new Map<string, { totalMin: number; count: number }>();

        eventosConDatos.forEach((m) => {
            (m.preparaciones || []).forEach((p) => {
                if (p.estado !== 'completado' || !p.duracion_real_min) return;
                const current = prepMap.get(p.item) || { totalMin: 0, count: 0 };
                current.totalMin += p.duracion_real_min;
                current.count += 1;
                prepMap.set(p.item, current);
            });
        });

        const topRecetasRapidas = Array.from(prepMap.entries())
            .map(([nombre, data]) => ({
                nombre,
                duracionMin: data.totalMin / data.count,
            }))
            .sort((a, b) => a.duracionMin - b.duracionMin)
            .slice(0, 3);

        return {
            eficienciaPromedio,
            totalRealMin,
            totalEstimadoMin,
            diferenciaMin,
            eventosConDatos: eventosConDatos.length,
            topRecetasRapidas,
            isLoading,
        };
    }, [metricas, isLoading]);
};