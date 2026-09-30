import { useMemo } from 'react';
import { useGlobal } from '../../context/GlobalContext';

export interface ProveedoresResumen {
    total: number;
    activos: number;
    inactivos: number;
    isLoading: boolean;
}

export const useProveedoresResumen = (): ProveedoresResumen => {
    const { personas, isLoading } = useGlobal();

    return useMemo(() => {
        const proveedores = personas.filter(
            (p) => p.tipo_persona === 'proveedor'
        );

        const activos = proveedores.filter((p) => p.estado).length;
        const inactivos = proveedores.length - activos;

        return {
            total: proveedores.length,
            activos,
            inactivos,
            isLoading,
        };
    }, [personas, isLoading]);
};