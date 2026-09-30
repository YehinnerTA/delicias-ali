import { useState, useEffect, useCallback, useMemo } from 'react';
import { useCompany } from '../../features/company/context/CompanyContext';
import { useCateringService } from '../../context/CateringContext';
import { cateringEventoApi, Incidencia } from '../../services/api/cateringEventoApi';

export interface IncidenciaEnriquecida extends Incidencia {
    numeroEvento: string;
    clienteEvento: string;
}

export interface IncidenciasCocina {
    incidencias: IncidenciaEnriquecida[];
    totalAbiertas: number;
    totalCriticas: number;
    isLoading: boolean;
}

const ESTADOS_INCIDENCIA_VISIBLES: readonly Incidencia['estado'][] = [
    'abierta',
    'en_revision',
];

export const useIncidenciasCocina = (): IncidenciasCocina => {
    const { getSelectedCompanyId } = useCompany();
    const { ventas: cateringVentas } = useCateringService();

    const [incidencias, setIncidencias] = useState<IncidenciaEnriquecida[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const eventosRecientes = useMemo(() => {
        return cateringVentas.slice(0, 10);
    }, [cateringVentas]);

    const loadData = useCallback(async () => {
        const idEmpresa = getSelectedCompanyId();
        if (!idEmpresa || eventosRecientes.length === 0) {
            setIncidencias([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        try {
            const resultados = await Promise.all(
                eventosRecientes.map(async (ev) => {
                    const idEvento = ev.eventoData?.id_evento;
                    if (!idEvento) return [];

                    try {
                        const incs = await cateringEventoApi.getIncidencias(
                            idEvento,     // ← CAMBIO AQUÍ
                            idEmpresa
                        );
                        return incs
                            .filter((i) =>
                                ESTADOS_INCIDENCIA_VISIBLES.includes(i.estado)
                            )
                            .map<IncidenciaEnriquecida>((i) => ({
                                ...i,
                                numeroEvento: ev.numero,
                                clienteEvento: ev.cliente,
                            }));
                    } catch {
                        return [];
                    }
                })
            );

            const aplanado = resultados
                .flat()
                .sort(
                    (a, b) =>
                        new Date(b.created_at).getTime() -
                        new Date(a.created_at).getTime()
                )
                .slice(0, 10);

            setIncidencias(aplanado);
        } catch (err) {
            console.error('[useIncidenciasCocina] Error:', err);
        } finally {
            setIsLoading(false);
        }
    }, [getSelectedCompanyId, eventosRecientes]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    return useMemo(() => {
        const totalAbiertas = incidencias.filter(
            (i) => i.estado === 'abierta'
        ).length;
        const totalCriticas = incidencias.filter(
            (i) => i.severidad === 'critica'
        ).length;

        return { incidencias, totalAbiertas, totalCriticas, isLoading };
    }, [incidencias, isLoading]);
};