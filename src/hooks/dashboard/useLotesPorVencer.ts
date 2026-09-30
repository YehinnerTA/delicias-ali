import { useMemo } from 'react';
import { useInventory } from '../../context/InventoryContext';

export interface LotePorVencer {
    id: number;
    nombre: string;
    tipo: 'postre' | 'insumo';
    stock: number;
    unidad: string;
    fechaVencimiento: string;
    diasRestantes: number;
    severidad: 'critica' | 'media' | 'baja';
}

export interface LotesPorVencer {
    lotes: LotePorVencer[];
    totalPorVencer: number;
    isLoading: boolean;
}

const DIAS_CRITICO = 2;
const DIAS_MEDIA = 4;
const DIAS_BAJA = 7;

export const useLotesPorVencer = (maxItems: number = 5): LotesPorVencer => {
    const { cateringItems, postresItems, getDiasRestantes, isLoading } =
        useInventory();

    return useMemo(() => {
        const lista: LotePorVencer[] = [];

        // Insumos con vencimiento
        cateringItems.forEach((item) => {
            if (!item.tiene_vencimiento || !item.fecha_vencimiento) return;
            const dias = getDiasRestantes(item.fecha_vencimiento);
            if (dias < 0 || dias > DIAS_BAJA) return;

            lista.push({
                id: item.id,
                nombre: item.nombre,
                tipo: 'insumo',
                stock: item.stock,
                unidad: item.unidad_medida,
                fechaVencimiento: item.fecha_vencimiento,
                diasRestantes: dias,
                severidad:
                    dias <= DIAS_CRITICO
                        ? 'critica'
                        : dias <= DIAS_MEDIA
                            ? 'media'
                            : 'baja',
            });
        });

        // Postres por lotes
        postresItems.forEach((postre) => {
            (postre.lotes || []).forEach((lote) => {
                if (lote.descartado === 1 || lote.descartado === true) return;
                if (lote.stock <= 0) return;

                const dias = getDiasRestantes(lote.fechaVencimiento);
                if (dias < 0 || dias > DIAS_BAJA) return;

                lista.push({
                    id: lote.id + 100000,
                    nombre: `${postre.nombre} (L-${lote.id})`,
                    tipo: 'postre',
                    stock: lote.stock,
                    unidad: 'u',
                    fechaVencimiento: lote.fechaVencimiento,
                    diasRestantes: dias,
                    severidad:
                        dias <= DIAS_CRITICO
                            ? 'critica'
                            : dias <= DIAS_MEDIA
                                ? 'media'
                                : 'baja',
                });
            });
        });

        lista.sort((a, b) => a.diasRestantes - b.diasRestantes);

        return {
            lotes: lista.slice(0, maxItems),
            totalPorVencer: lista.length,
            isLoading,
        };
    }, [cateringItems, postresItems, getDiasRestantes, isLoading, maxItems]);
};