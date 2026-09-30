import { useMemo } from 'react';
import { useRecipes } from '../../features/recipes/context/RecipeContext';

export interface RecetasMetrics {
    totalRecetas: number;
    recetasActivas: number;
    recetasInactivas: number;
    isLoading: boolean;
}

export const useRecetasMetrics = (): RecetasMetrics => {
    const recipeCtx = useRecipes() as any;
    const recetas = recipeCtx?.recetas || [];
    const isLoading = recipeCtx?.isLoading || false;

    return useMemo(() => {
        const totalRecetas = recetas.length;
        const recetasActivas = recetas.filter(
            (r: any) => r.estado === 1 || r.estado === true
        ).length;
        const recetasInactivas = totalRecetas - recetasActivas;

        return {
            totalRecetas,
            recetasActivas,
            recetasInactivas,
            isLoading,
        };
    }, [recetas, isLoading]);
};