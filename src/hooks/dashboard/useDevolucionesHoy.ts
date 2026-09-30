import { useMemo } from 'react';
import { useVentas } from '../../context/SalesContext';

export interface DevolucionDia {
    id: string;
    hora: string;
    ventaNumero: string;
    ventaId: number;
    monto: number;
    notaCredito: string;
    motivo: string;
    usuario: string;
    productos: Array<{ nombre: string; cantidad: number; precio: number }>;
}

export interface DevolucionesHoy {
    devoluciones: DevolucionDia[];
    total: number;
    cantidad: number;
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

export const useDevolucionesHoy = (): DevolucionesHoy => {
    const { ventas, isLoading } = useVentas();

    return useMemo(() => {
        const devoluciones: DevolucionDia[] = [];

        ventas.forEach((venta) => {
            (venta.devoluciones || []).forEach((dev, idx) => {
                const fechaDev = new Date(dev.fecha);
                if (!isToday(fechaDev)) return;

                devoluciones.push({
                    id: `${venta.id}-${idx}`,
                    hora: fechaDev.toLocaleTimeString('es-PE', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false,
                    }),
                    ventaNumero: venta.numero,
                    ventaId: venta.id,
                    monto: dev.monto || 0,
                    notaCredito: dev.notaCredito || '—',
                    motivo: dev.motivo || 'Sin motivo',
                    usuario: dev.usuario || 'N/A',
                    productos: (dev.productos || []).map((p) => ({
                        nombre: p.nombre,
                        cantidad: p.cantidad,
                        precio: p.precio,
                    })),
                });
            });
        });

        devoluciones.sort((a, b) => b.hora.localeCompare(a.hora));

        const total = devoluciones.reduce((acc, d) => acc + d.monto, 0);

        return {
            devoluciones,
            total,
            cantidad: devoluciones.length,
            isLoading,
        };
    }, [ventas, isLoading]);
};