import { useMemo } from 'react';
import { useVentas } from '../../context/SalesContext';
import { Venta } from '../../features/types/sales';

export interface RecentTransactions {
    transactions: Venta[];
    isLoading: boolean;
}

export const useRecentTransactions = (limite: number = 6): RecentTransactions => {
    const { ventas, isLoading } = useVentas();

    return useMemo(() => {
        const ordenadas = [...ventas].sort(
            (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
        );

        return {
            transactions: ordenadas.slice(0, limite),
            isLoading,
        };
    }, [ventas, limite, isLoading]);
};