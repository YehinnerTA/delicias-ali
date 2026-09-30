import { useMemo } from 'react';
import { useVentas } from '../../context/SalesContext';
import { Venta } from '../../features/types/sales';

export interface SalesMetrics {
    totalHoy: number;
    totalAyer: number;
    totalMes: number;
    totalPeriodo: number;
    transaccionesHoy: number;
    transaccionesPeriodo: number;
    ticketPromedio: number;
    ticketPromedioAyer: number;
    completadas: number;
    anuladas: number;
    devoluciones: number;
    porcentajeCompletadas: number;
    clientesUnicos: number;
    isLoading: boolean;
    ventasFiltradas: Venta[];
}

const isSameDay = (dateA: Date, dateB: Date): boolean =>
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate();

const isYesterday = (date: Date, ref: Date): boolean => {
    const ayer = new Date(ref);
    ayer.setDate(ayer.getDate() - 1);
    return isSameDay(date, ayer);
};

const isSameMonth = (dateA: Date, dateB: Date): boolean =>
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth();

const filterByPeriodo = (
    ventas: Venta[],
    periodo: 'hoy' | '7d' | '30d' | 'mes'
): Venta[] => {
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

export const useSalesMetrics = (
    periodo: 'hoy' | '7d' | '30d' | 'mes' = 'hoy'
): SalesMetrics => {
    const { ventas, isLoading } = useVentas();

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

        const transaccionesHoy = ventasHoy.length;
        const transaccionesPeriodo = ventasPeriodo.length;

        const ticketPromedio = transaccionesHoy > 0 ? totalHoy / transaccionesHoy : 0;
        const ticketPromedioAyer = ventasAyer.length > 0 ? totalAyer / ventasAyer.length : 0;

        const completadas = ventasPeriodo.filter((v) => v.estado === 'completada').length;
        const anuladas = ventasPeriodo.filter((v) => v.estado === 'anulada').length;
        const devoluciones = ventasPeriodo.filter((v) =>
            v.estado.includes('devolucion')
        ).length;
        const porcentajeCompletadas =
            transaccionesPeriodo > 0 ? (completadas / transaccionesPeriodo) * 100 : 0;

        const clientesSet = new Set<string>();
        ventasPeriodo.forEach((v) => {
            if (v.clienteDoc) clientesSet.add(v.clienteDoc);
        });

        return {
            totalHoy,
            totalAyer,
            totalMes,
            totalPeriodo,
            transaccionesHoy,
            transaccionesPeriodo,
            ticketPromedio,
            ticketPromedioAyer,
            completadas,
            anuladas,
            devoluciones,
            porcentajeCompletadas,
            clientesUnicos: clientesSet.size,
            isLoading,
            ventasFiltradas: ventasPeriodo,
        };
    }, [ventas, periodo, isLoading]);
};