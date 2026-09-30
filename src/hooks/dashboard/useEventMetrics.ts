import { useMemo } from 'react';
import { useCateringService } from '../../context/CateringContext';
import { VentaCatering } from '../../features/types/catering';

export interface EventoPorEtapa {
    etapa: string;
    label: string;
    cantidad: number;
    color: string;
}

export interface ProximoEvento {
    id: number;
    numero: string;
    cliente: string;
    horario: string;
    personas: number;
    direccion: string | null;
    referencia: string | null;
    estado_flujo: string;
}

export interface EventMetrics {
    totalHoy: number;
    totalAyer: number;
    totalMes: number;
    totalPeriodo: number;
    eventosHoy: number;
    eventosActivos: number;
    eventosPorEtapa: EventoPorEtapa[];
    proximosEventosHoy: ProximoEvento[];
    totalPersonasHoy: number;
    isLoading: boolean;
}

const ESTADOS_ACTIVOS = [
    'pendiente_verificacion',
    'compra_pendiente',
    'en_preparacion',
    'listo_para_envio',
    'en_transito',
    'en_evento',
    'en_retorno',
    'retornado',
];

const ETAPA_LABELS: Record<string, string> = {
    pendiente_verificacion: 'Pendiente verificación',
    compra_pendiente: 'Compra pendiente',
    en_preparacion: 'En preparación',
    listo_para_envio: 'Listo para envío',
    en_transito: 'En tránsito',
    en_evento: 'En evento',
    en_retorno: 'En retorno',
    retornado: 'Retornado',
    cerrado: 'Cerrado',
    cancelado: 'Cancelado',
};

const ETAPA_COLORS: Record<string, string> = {
    pendiente_verificacion: '#ff0019',
    compra_pendiente: '#fd7e14',
    en_preparacion: '#ffc107',
    listo_para_envio: '#17a2b8',
    en_transito: '#4f8cf7',
    en_evento: '#00811e',
    en_retorno: '#a66cff',
    retornado: '#6c757d',
    cerrado: '#adb5bd',
    cancelado: '#dc3545',
};

const isSameDay = (a: Date, b: Date): boolean =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

const isYesterday = (date: Date, ref: Date): boolean => {
    const ayer = new Date(ref);
    ayer.setDate(ayer.getDate() - 1);
    return isSameDay(date, ayer);
};

const isSameMonth = (a: Date, b: Date): boolean =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();

const filterByPeriodo = (
    ventas: VentaCatering[],
    periodo: 'hoy' | '7d' | '30d' | 'mes'
): VentaCatering[] => {
    const now = new Date();
    return ventas.filter((v) => {
        const fecha = new Date(v.fecha);
        switch (periodo) {
            case 'hoy':
                return isSameDay(fecha, now);
            case '7d': {
                const hace7 = new Date(now);
                hace7.setDate(hace7.getDate() - 6);
                hace7.setHours(0, 0, 0, 0);
                return fecha >= hace7;
            }
            case '30d': {
                const hace30 = new Date(now);
                hace30.setDate(hace30.getDate() - 29);
                hace30.setHours(0, 0, 0, 0);
                return fecha >= hace30;
            }
            case 'mes':
                return isSameMonth(fecha, now);
            default:
                return true;
        }
    });
};

const getHorario = (v: VentaCatering): string =>
    v.eventoData?.horario || new Date(v.fecha).toLocaleTimeString('es-PE', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });

export const useEventMetrics = (
    periodo: 'hoy' | '7d' | '30d' | 'mes' = 'hoy'
): EventMetrics => {
    const { ventas, isLoading } = useCateringService();

    return useMemo(() => {
        const now = new Date();

        const ventasHoy = ventas.filter((v) => isSameDay(new Date(v.fecha), now));
        const ventasAyer = ventas.filter((v) => isYesterday(new Date(v.fecha), now));
        const ventasMes = ventas.filter((v) => isSameMonth(new Date(v.fecha), now));
        const ventasPeriodo = filterByPeriodo(ventas, periodo);

        const totalHoy = ventasHoy.reduce((acc, v) => acc + v.total, 0);
        const totalAyer = ventasAyer.reduce((acc, v) => acc + v.total, 0);
        const totalMes = ventasMes.reduce((acc, v) => acc + v.total, 0);
        const totalPeriodo = ventasPeriodo.reduce((acc, v) => acc + v.total, 0);

        const eventosActivos = ventas.filter((v) => {
            const estado = v.eventoData?.estado_flujo || '';
            return ESTADOS_ACTIVOS.includes(estado);
        }).length;

        const eventosPorEtapaMap = new Map<string, number>();
        ventas.forEach((v) => {
            const estado = v.eventoData?.estado_flujo;
            if (!estado) return;
            if (!ESTADOS_ACTIVOS.includes(estado)) return;
            eventosPorEtapaMap.set(estado, (eventosPorEtapaMap.get(estado) || 0) + 1);
        });

        const eventosPorEtapa: EventoPorEtapa[] = ESTADOS_ACTIVOS.map((etapa) => ({
            etapa,
            label: ETAPA_LABELS[etapa] || etapa,
            cantidad: eventosPorEtapaMap.get(etapa) || 0,
            color: ETAPA_COLORS[etapa] || '#6c757d',
        }));

        const proximosEventosHoy: ProximoEvento[] = ventasHoy
            .filter((v) => {
                const estado = v.eventoData?.estado_flujo || '';
                return ESTADOS_ACTIVOS.includes(estado);
            })
            .map((v) => ({
                id: v.id,
                numero: v.numero,
                cliente: v.cliente,
                horario: getHorario(v),
                personas: v.eventoData?.personas || 0,
                direccion: v.eventoData?.direccion || null,
                referencia: v.eventoData?.referencia || null,
                estado_flujo: v.eventoData?.estado_flujo || '',
            }))
            .sort((a, b) => a.horario.localeCompare(b.horario));

        const totalPersonasHoy = ventasHoy.reduce(
            (acc, v) => acc + (v.eventoData?.personas || 0),
            0
        );

        return {
            totalHoy,
            totalAyer,
            totalMes,
            totalPeriodo,
            eventosHoy: ventasHoy.length,
            eventosActivos,
            eventosPorEtapa,
            proximosEventosHoy,
            totalPersonasHoy,
            isLoading,
        };
    }, [ventas, periodo, isLoading]);
};