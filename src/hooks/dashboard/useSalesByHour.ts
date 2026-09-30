import { useMemo } from 'react';
import { useVentas } from '../../context/SalesContext';

export interface HourlyPoint {
    hora: string;
    hora24: number;
    total: number;
    transacciones: number;
}

export interface SalesByHour {
    data: HourlyPoint[];
    horaPico: HourlyPoint | null;
    totalDia: number;
    promedioHora: number;
    isLoading: boolean;
}

const isToday = (date: Date): boolean => {
    const now = new Date();
    return (
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth() &&
        date.getDate() === now.getDate()
    );
};

export const useSalesByHour = (): SalesByHour => {
    const { ventas, isLoading } = useVentas();

    return useMemo(() => {
        const ventasHoy = ventas.filter((v) => isToday(new Date(v.fecha)));

        if (ventasHoy.length === 0) {
            return {
                data: [],
                horaPico: null,
                totalDia: 0,
                promedioHora: 0,
                isLoading,
            };
        }

        // Mapa de hora (0-23) -> { total, count }
        const horasMap = new Map<number, { total: number; count: number }>();

        ventasHoy.forEach((v) => {
            const hora = new Date(v.fecha).getHours();
            const actual = horasMap.get(hora) || { total: 0, count: 0 };
            actual.total += v.total;
            actual.count += 1;
            horasMap.set(hora, actual);
        });

        // Rango dinámico: min hora con datos -> max hora con datos
        const horasConDatos = Array.from(horasMap.keys()).sort((a, b) => a - b);
        const horaMin = Math.min(...horasConDatos);
        const horaMax = Math.max(...horasConDatos);

        // Extendemos 1 hora hacia cada lado para dar contexto (si es razonable)
        const inicio = Math.max(6, horaMin - 1);
        const fin = Math.min(23, horaMax + 1);

        const data: HourlyPoint[] = [];
        for (let h = inicio; h <= fin; h++) {
            const entry = horasMap.get(h) || { total: 0, count: 0 };
            data.push({
                hora: `${h.toString().padStart(2, '0')}:00`,
                hora24: h,
                total: entry.total,
                transacciones: entry.count,
            });
        }

        const totalDia = ventasHoy.reduce((acc, v) => acc + v.total, 0);
        const promedioHora = data.length > 0 ? totalDia / data.length : 0;

        const horaPico = data.reduce<HourlyPoint | null>(
            (max, d) => (!max || d.total > max.total ? d : max),
            null
        );

        return {
            data,
            horaPico,
            totalDia,
            promedioHora,
            isLoading,
        };
    }, [ventas, isLoading]);
};