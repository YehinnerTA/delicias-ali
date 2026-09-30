import { useMemo } from 'react';
import { useVentas } from '../../context/SalesContext';
import { useCateringService } from '../../context/CateringContext';

export interface TrendPoint {
    fecha: string;
    fechaCompleta: string;
    tienda: number;
    eventos: number;
    total: number;
    tiendaAnterior?: number;
    eventosAnterior?: number;
    totalAnterior?: number;
}

export interface SalesTrend {
    data: TrendPoint[];
    totalPeriodo: number;
    mejorDia: TrendPoint | null;
    promedioDiario: number;
    vsPeriodoAnterior: number;
    isLoading: boolean;
}

const formatLabel = (date: Date, granularidad: 'dia' | 'semana'): string => {
    if (granularidad === 'semana') {
        return date.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' });
    }
    return date.toLocaleDateString('es-PE', {
        weekday: 'short',
        day: 'numeric',
    });
};

const isSameDay = (a: Date, b: Date): boolean =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

export const useSalesTrend = (
    dias: number = 7,
    compararConAnterior: boolean = true
): SalesTrend => {
    const { ventas, isLoading: loadingVentas } = useVentas();
    const { ventas: cateringVentas, isLoading: loadingCatering } = useCateringService();

    return useMemo(() => {
        const now = new Date();
        const data: TrendPoint[] = [];

        const diasArray: Date[] = [];
        for (let i = dias - 1; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            d.setHours(0, 0, 0, 0);
            diasArray.push(d);
        }

        const diasAnteriorArray: Date[] = [];
        if (compararConAnterior) {
            for (let i = dias - 1; i >= 0; i--) {
                const d = new Date(now);
                d.setDate(d.getDate() - i - dias);
                d.setHours(0, 0, 0, 0);
                diasAnteriorArray.push(d);
            }
        }

        diasArray.forEach((dia, idx) => {
            const ventasTienda = ventas.filter((v) =>
                isSameDay(new Date(v.fecha), dia)
            );
            const ventasEventos = cateringVentas.filter((v) =>
                isSameDay(new Date(v.fecha), dia)
            );

            const tienda = ventasTienda.reduce((acc, v) => acc + v.total, 0);
            const eventos = ventasEventos.reduce((acc, v) => acc + v.total, 0);

            const punto: TrendPoint = {
                fecha: formatLabel(dia, 'dia'),
                fechaCompleta: dia.toISOString().slice(0, 10),
                tienda,
                eventos,
                total: tienda + eventos,
            };

            if (compararConAnterior && diasAnteriorArray[idx]) {
                const diaAnt = diasAnteriorArray[idx];
                const tiendaAnt = ventas
                    .filter((v) => isSameDay(new Date(v.fecha), diaAnt))
                    .reduce((acc, v) => acc + v.total, 0);
                const eventosAnt = cateringVentas
                    .filter((v) => isSameDay(new Date(v.fecha), diaAnt))
                    .reduce((acc, v) => acc + v.total, 0);

                punto.tiendaAnterior = tiendaAnt;
                punto.eventosAnterior = eventosAnt;
                punto.totalAnterior = tiendaAnt + eventosAnt;
            }

            data.push(punto);
        });

        const totalPeriodo = data.reduce((acc, d) => acc + d.total, 0);
        const promedioDiario = data.length > 0 ? totalPeriodo / data.length : 0;

        const mejorDia = data.reduce<TrendPoint | null>(
            (mejor, d) => (!mejor || d.total > mejor.total ? d : mejor),
            null
        );

        const totalAnterior = data.reduce(
            (acc, d) => acc + (d.totalAnterior || 0),
            0
        );

        const vsPeriodoAnterior =
            totalAnterior > 0
                ? ((totalPeriodo - totalAnterior) / totalAnterior) * 100
                : 0;

        return {
            data,
            totalPeriodo,
            mejorDia,
            promedioDiario,
            vsPeriodoAnterior,
            isLoading: loadingVentas || loadingCatering,
        };
    }, [ventas, cateringVentas, dias, compararConAnterior, loadingVentas, loadingCatering]);
};