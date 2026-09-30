import { useMemo } from 'react';
import { useVentas } from '../../context/SalesContext';
import { useCateringService } from '../../context/CateringContext';

export interface TopProducto {
    nombre: string;
    cantidad: number;
    total: number;
    origen: 'tienda' | 'eventos' | 'ambos';
}

export type TopProductsVista = 'unidades' | 'soles' | 'porcentaje';

export const useTopProducts = (
    periodo: 'hoy' | '7d' | '30d' | 'mes' = '30d',
    limite: number = 5
): { top: TopProducto[]; isLoading: boolean } => {
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

        const map = new Map<string, TopProducto>();

        // Tienda física
        ventas.forEach((v) => {
            if (!dentroPeriodo(new Date(v.fecha))) return;
            v.productos.forEach((p) => {
                const key = p.nombre.trim().toLowerCase();
                const existente = map.get(key);
                if (existente) {
                    existente.cantidad += p.cantidad;
                    existente.total += p.cantidad * p.precio;
                    if (existente.origen === 'eventos') existente.origen = 'ambos';
                } else {
                    map.set(key, {
                        nombre: p.nombre,
                        cantidad: p.cantidad,
                        total: p.cantidad * p.precio,
                        origen: 'tienda',
                    });
                }
            });
        });

        // Catering eventos
        cateringVentas.forEach((v) => {
            if (!dentroPeriodo(new Date(v.fecha))) return;
            v.servicios?.forEach((serv) => {
                serv.productos?.forEach((p) => {
                    const key = p.nombre.trim().toLowerCase();
                    const existente = map.get(key);
                    if (existente) {
                        existente.cantidad += p.cantidad;
                        existente.total += p.cantidad * p.precio;
                        if (existente.origen === 'tienda') existente.origen = 'ambos';
                    } else {
                        map.set(key, {
                            nombre: p.nombre,
                            cantidad: p.cantidad,
                            total: p.cantidad * p.precio,
                            origen: 'eventos',
                        });
                    }
                });
            });
        });

        const top = Array.from(map.values())
            .sort((a, b) => b.total - a.total)
            .slice(0, limite);

        return {
            top,
            isLoading: loadingVentas || loadingCatering,
        };
    }, [ventas, cateringVentas, periodo, limite, loadingVentas, loadingCatering]);
};