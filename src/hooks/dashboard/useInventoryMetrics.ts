import { useMemo } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { CateringItem, Postre } from '../../features/types/inventory';

export interface AlertaInventario {
    id: number;
    nombre: string;
    tipo: 'insumo' | 'postre';
    stock: number;
    minimo: number;
    severidad: 'critica' | 'media' | 'baja';
    motivo: 'stock_bajo' | 'por_vencer';
    diasParaVencer?: number;
}

export interface InventoryMetrics {
    totalItems: number;
    totalInsumos: number;
    totalPostres: number;
    itemsStockBajo: number;
    insumosPorVencer: number;
    postresPorVencer: number;
    alertas: AlertaInventario[];
    isLoading: boolean;
}

const UMBRAL_STOCK_INSUMO = 10;
const UMBRAL_STOCK_POSTRE = 5;
const DIAS_VENCIMIENTO_ALERTA = 7;

export const useInventoryMetrics = (): InventoryMetrics => {
    const { cateringItems, postresItems, getDiasRestantes, isLoading } = useInventory();

    return useMemo(() => {
        const alertas: AlertaInventario[] = [];

        // Insumos con stock bajo
        cateringItems.forEach((item: CateringItem) => {
            if (item.stock <= UMBRAL_STOCK_INSUMO) {
                const severidad: AlertaInventario['severidad'] =
                    item.stock <= UMBRAL_STOCK_INSUMO / 2 ? 'critica' : 'media';

                alertas.push({
                    id: item.id,
                    nombre: item.nombre,
                    tipo: 'insumo',
                    stock: item.stock,
                    minimo: UMBRAL_STOCK_INSUMO,
                    severidad,
                    motivo: 'stock_bajo',
                });
            }

            // Insumos con vencimiento próximo
            if (item.tiene_vencimiento && item.fecha_vencimiento) {
                const dias = getDiasRestantes(item.fecha_vencimiento);
                if (dias >= 0 && dias <= DIAS_VENCIMIENTO_ALERTA) {
                    alertas.push({
                        id: item.id + 100000,
                        nombre: item.nombre,
                        tipo: 'insumo',
                        stock: item.stock,
                        minimo: UMBRAL_STOCK_INSUMO,
                        severidad: dias <= 2 ? 'critica' : dias <= 4 ? 'media' : 'baja',
                        motivo: 'por_vencer',
                        diasParaVencer: dias,
                    });
                }
            }
        });

        // Postres con lotes por vencer
        let postresPorVencerCount = 0;
        let insumosPorVencerCount = 0;

        postresItems.forEach((postre: Postre) => {
            const lotesActivos = (postre.lotes || []).filter(
                (l) => l.descartado !== 1 && l.descartado !== true && l.stock > 0
            );

            lotesActivos.forEach((lote) => {
                const dias = getDiasRestantes(lote.fechaVencimiento);
                if (dias >= 0 && dias <= DIAS_VENCIMIENTO_ALERTA) {
                    postresPorVencerCount++;
                    alertas.push({
                        id: lote.id + 200000,
                        nombre: `${postre.nombre} (lote #${lote.id})`,
                        tipo: 'postre',
                        stock: lote.stock,
                        minimo: UMBRAL_STOCK_POSTRE,
                        severidad: dias <= 2 ? 'critica' : dias <= 4 ? 'media' : 'baja',
                        motivo: 'por_vencer',
                        diasParaVencer: dias,
                    });
                }
            });
        });

        // Contar insumos por vencer
        insumosPorVencerCount = alertas.filter(
            (a) => a.tipo === 'insumo' && a.motivo === 'por_vencer'
        ).length;

        const itemsStockBajo = alertas.filter((a) => a.motivo === 'stock_bajo').length;

        // Ordenar alertas: críticas primero, luego por motivo
        alertas.sort((a, b) => {
            const sevOrder = { critica: 0, media: 1, baja: 2 };
            if (sevOrder[a.severidad] !== sevOrder[b.severidad]) {
                return sevOrder[a.severidad] - sevOrder[b.severidad];
            }
            if (a.motivo !== b.motivo) {
                return a.motivo === 'stock_bajo' ? -1 : 1;
            }
            return a.nombre.localeCompare(b.nombre);
        });

        return {
            totalItems: cateringItems.length + postresItems.length,
            totalInsumos: cateringItems.length,
            totalPostres: postresItems.length,
            itemsStockBajo,
            insumosPorVencer: insumosPorVencerCount,
            postresPorVencer: postresPorVencerCount,
            alertas,
            isLoading,
        };
    }, [cateringItems, postresItems, getDiasRestantes, isLoading]);
};