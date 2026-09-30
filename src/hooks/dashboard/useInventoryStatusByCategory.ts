import { useMemo } from 'react';
import { useInventory } from '../../context/InventoryContext';

export interface StatusSlice {
    label: string;
    cantidad: number;
    porcentaje: number;
    color: string;
}

export interface InventoryStatusBlock {
    titulo: string;
    total: number;
    slices: StatusSlice[];
}

export interface InventoryStatus {
    insumos: InventoryStatusBlock;
    postres: InventoryStatusBlock;
    isLoading: boolean;
}

const UMBRAL_INSUMO = 10;
const UMBRAL_POSTRE = 5;

export const useInventoryStatusByCategory = (): InventoryStatus => {
    const { cateringItems, postresItems, isLoading } = useInventory();

    return useMemo(() => {
        // ============ INSUMOS ============
        let insumosOptimos = 0;
        let insumosBajos = 0;
        let insumosCriticos = 0;

        cateringItems.forEach((item) => {
            if (item.stock < UMBRAL_INSUMO) {
                insumosCriticos++;
            } else if (item.stock < UMBRAL_INSUMO * 1.5) {
                insumosBajos++;
            } else {
                insumosOptimos++;
            }
        });

        const totalInsumos =
            insumosOptimos + insumosBajos + insumosCriticos;

        const insumosSlices: StatusSlice[] = [
            {
                label: 'Óptimo',
                cantidad: insumosOptimos,
                porcentaje:
                    totalInsumos > 0 ? (insumosOptimos / totalInsumos) * 100 : 0,
                color: '#00811e',
            },
            {
                label: 'Bajo',
                cantidad: insumosBajos,
                porcentaje:
                    totalInsumos > 0 ? (insumosBajos / totalInsumos) * 100 : 0,
                color: '#ffc107',
            },
            {
                label: 'Crítico',
                cantidad: insumosCriticos,
                porcentaje:
                    totalInsumos > 0 ? (insumosCriticos / totalInsumos) * 100 : 0,
                color: '#ff0019',
            },
        ];

        // ============ POSTRES (por lotes) ============
        let postresVigentes = 0;
        let postresPorVencer = 0;
        let postresVencidos = 0;

        const ahora = new Date();
        ahora.setHours(0, 0, 0, 0);

        postresItems.forEach((postre) => {
            const lotesActivos = (postre.lotes || []).filter(
                (l) => l.descartado !== 1 && l.descartado !== true
            );

            if (lotesActivos.length === 0) return;

            lotesActivos.forEach((lote) => {
                const venc = new Date(lote.fechaVencimiento);
                venc.setHours(0, 0, 0, 0);
                const dias = Math.ceil(
                    (venc.getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24)
                );

                if (dias < 0) {
                    postresVencidos++;
                } else if (dias <= 7) {
                    postresPorVencer++;
                } else {
                    postresVigentes++;
                }
            });
        });

        const totalLotes = postresVigentes + postresPorVencer + postresVencidos;

        const postresSlices: StatusSlice[] = [
            {
                label: 'Vigentes',
                cantidad: postresVigentes,
                porcentaje:
                    totalLotes > 0 ? (postresVigentes / totalLotes) * 100 : 0,
                color: '#00811e',
            },
            {
                label: 'Por vencer',
                cantidad: postresPorVencer,
                porcentaje:
                    totalLotes > 0 ? (postresPorVencer / totalLotes) * 100 : 0,
                color: '#ffc107',
            },
            {
                label: 'Vencidos',
                cantidad: postresVencidos,
                porcentaje:
                    totalLotes > 0 ? (postresVencidos / totalLotes) * 100 : 0,
                color: '#ff0019',
            },
        ];

        return {
            insumos: {
                titulo: 'Insumos',
                total: totalInsumos,
                slices: insumosSlices,
            },
            postres: {
                titulo: 'Postres con lotes',
                total: totalLotes,
                slices: postresSlices,
            },
            isLoading,
        };
    }, [cateringItems, postresItems, isLoading]);
};