import { useMemo } from 'react';
import { useVentas } from '../../context/SalesContext';
import { useCateringService } from '../../context/CateringContext';

export interface PaymentSlice {
    metodo: string;
    label: string;
    monto: number;
    cantidad: number;
    porcentaje: number;
    color: string;
}

export interface PaymentDistribution {
    slices: PaymentSlice[];
    total: number;
    isLoading: boolean;
}

const METODO_LABELS: Record<string, string> = {
    EFECTIVO: 'Efectivo',
    TARJETA: 'Tarjeta',
    YAPE: 'Yape',
    PLIN: 'Plin',
};

const METODO_COLORS: Record<string, string> = {
    EFECTIVO: '#00811e',
    TARJETA: '#4f8cf7',
    YAPE: '#a66cff',
    PLIN: '#ffc107',
};

export const usePaymentDistribution = (
    periodo: 'hoy' | '7d' | '30d' | 'mes' = 'hoy'
): PaymentDistribution => {
    const { ventas, isLoading: loadingVentas } = useVentas();
    const { ventas: cateringVentas, isLoading: loadingCatering } = useCateringService();

    return useMemo(() => {
        const now = new Date();

        const dentroPeriodo = (fecha: Date): boolean => {
            switch (periodo) {
                case 'hoy':
                    return (
                        fecha.getFullYear() === now.getFullYear() &&
                        fecha.getMonth() === now.getMonth() &&
                        fecha.getDate() === now.getDate()
                    );
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
                    return (
                        fecha.getFullYear() === now.getFullYear() &&
                        fecha.getMonth() === now.getMonth()
                    );
                default:
                    return true;
            }
        };

        const map = new Map<string, { monto: number; cantidad: number }>();

        const procesar = (metodoPago: string, total: number) => {
            const metodo = (metodoPago || 'EFECTIVO').toUpperCase();
            const actual = map.get(metodo) || { monto: 0, cantidad: 0 };
            actual.monto += total;
            actual.cantidad += 1;
            map.set(metodo, actual);
        };

        ventas.forEach((v) => {
            if (dentroPeriodo(new Date(v.fecha))) {
                procesar(v.metodoPago, v.total);
            }
        });

        cateringVentas.forEach((v) => {
            if (dentroPeriodo(new Date(v.fecha))) {
                procesar(v.metodoPago, v.total);
            }
        });

        const total = Array.from(map.values()).reduce((acc, v) => acc + v.monto, 0);

        const slices: PaymentSlice[] = Array.from(map.entries())
            .map(([metodo, data]) => ({
                metodo,
                label: METODO_LABELS[metodo] || metodo,
                monto: data.monto,
                cantidad: data.cantidad,
                porcentaje: total > 0 ? (data.monto / total) * 100 : 0,
                color: METODO_COLORS[metodo] || '#6c757d',
            }))
            .sort((a, b) => b.monto - a.monto);

        return {
            slices,
            total,
            isLoading: loadingVentas || loadingCatering,
        };
    }, [ventas, cateringVentas, periodo, loadingVentas, loadingCatering]);
};