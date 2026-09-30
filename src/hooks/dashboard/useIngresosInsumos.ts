import { useMemo } from 'react';
import { useInventory } from '../../context/InventoryContext';

export interface IngresoSemana {
    semana: string;
    cantidad: number;
    fechaInicio: string;
}

export interface IngresosInsumos {
    data: IngresoSemana[];
    total: number;
    promedioSemanal: number;
    isLoading: boolean;
}

const getWeekKey = (date: Date): { key: string; label: string; inicio: Date } => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    // Lunes como inicio de semana
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);

    const key = d.toISOString().slice(0, 10);
    const label = `Sem ${d.getDate()}/${d.getMonth() + 1}`;
    return { key, label, inicio: d };
};

export const useIngresosInsumos = (semanas: number = 4): IngresosInsumos => {
    const { cateringItems, isLoading } = useInventory();

    return useMemo(() => {
        const ahora = new Date();
        ahora.setHours(0, 0, 0, 0);

        const semanasMap = new Map<
            string,
            { label: string; cantidad: number; inicio: Date }
        >();

        // Inicializar las últimas N semanas con 0
        for (let i = semanas - 1; i >= 0; i--) {
            const d = new Date(ahora);
            d.setDate(d.getDate() - i * 7);
            const { key, label, inicio } = getWeekKey(d);
            semanasMap.set(key, { label, cantidad: 0, inicio });
        }

        // Sumar items por semana
        cateringItems.forEach((item) => {
            const fecha = new Date(item.createdAt || item.ultimaEdicion);
            if (!fecha || isNaN(fecha.getTime())) return;
            const { key } = getWeekKey(fecha);
            const entry = semanasMap.get(key);
            if (entry) {
                entry.cantidad += 1;
            }
        });

        const data: IngresoSemana[] = Array.from(semanasMap.entries())
            .map(([key, value]) => ({
                semana: value.label,
                cantidad: value.cantidad,
                fechaInicio: key,
            }))
            .sort((a, b) => a.fechaInicio.localeCompare(b.fechaInicio));

        const total = data.reduce((acc, d) => acc + d.cantidad, 0);
        const promedioSemanal = data.length > 0 ? total / data.length : 0;

        return {
            data,
            total,
            promedioSemanal,
            isLoading,
        };
    }, [cateringItems, semanas, isLoading]);
};