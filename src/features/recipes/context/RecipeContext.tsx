import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CategoriaAlimento, Persona } from '../../types/person';
import { categoriaApi } from '../../../services/api/categoriaApi';
import { personaApi } from '../../../services/api/personaApi';
import { ingredienteApi, Ingrediente } from '../../../services/api/ingredienteApi';
import { serviceTipoApi, ServiceTipo } from '../../../services/api/serviceTipoApi';
import { productoCartaApi, ProductoCarta } from '../../../services/api/productoCartaApi';
import { recetaApi } from '../../../services/api/recetaApi';
import { Receta } from '../../types/recipe';
import { useCompany } from '../../../features/company/context/CompanyContext';
import { useToast } from '../../../hooks/base/useToast';

interface RecipeContextType {
    categorias: CategoriaAlimento[];
    ingredientes: Ingrediente[];
    proveedores: Persona[];
    serviceTipos: ServiceTipo[];
    productosCarta: ProductoCarta[];
    recetas: Receta[];
    isLoading: boolean;
    refreshCategorias: () => Promise<void>;
    refreshIngredientes: () => Promise<void>;
    refreshProveedores: () => Promise<void>;
    refreshServiceTipos: () => Promise<void>;
    refreshProductosCarta: () => Promise<void>;
    refreshRecetas: () => Promise<void>;
}

const RecipeContext = createContext<RecipeContextType | undefined>(undefined);

export const RecipeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { getSelectedCompanyId } = useCompany();
    const { showToast } = useToast();
    const [categorias, setCategorias] = useState<CategoriaAlimento[]>([]);
    const [ingredientes, setIngredientes] = useState<Ingrediente[]>([]);
    const [proveedores, setProveedores] = useState<Persona[]>([]);
    const [serviceTipos, setServiceTipos] = useState<ServiceTipo[]>([]);
    const [productosCarta, setProductosCarta] = useState<ProductoCarta[]>([]);
    const [recetas, setRecetas] = useState<Receta[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const id_empresa = getSelectedCompanyId() ?? 0;

    const loadCategorias = async () => {
        if (!id_empresa) return setCategorias([]);
        try {
            const data = await categoriaApi.getAll(id_empresa);
            setCategorias(data);
        } catch (error) {
            console.error('[RecipeContext] Error categorías:', error);
        }
    };

    const loadIngredientes = async () => {
        if (!id_empresa) return setIngredientes([]);
        try {
            const data = await ingredienteApi.getAll(id_empresa);
            setIngredientes(data);
        } catch (error) {
            console.error('[RecipeContext] Error ingredientes:', error);
        }
    };

    const loadProveedores = async () => {
        if (!id_empresa) return setProveedores([]);
        try {
            const data = await personaApi.getAll(id_empresa);
            setProveedores(data.filter(p => p.tipo_persona === 'proveedor'));
        } catch (error) {
            console.error('[RecipeContext] Error proveedores:', error);
        }
    };

    const loadServiceTipos = async () => {
        try {
            const data = await serviceTipoApi.getAll();
            setServiceTipos(data);
        } catch (error) {
            console.error('[RecipeContext] Error service tipos:', error);
        }
    };

    const loadProductosCarta = async () => {
        try {
            const data = await productoCartaApi.getAll();
            setProductosCarta(data);
        } catch (error) {
            console.error('[RecipeContext] Error productos carta:', error);
        }
    };

    const loadRecetas = async () => {
        if (!id_empresa) return setRecetas([]);
        try {
            const data = await recetaApi.getAll(id_empresa);
            setRecetas(data);
        } catch (error) {
            console.error('[RecipeContext] Error recetas:', error);
        }
    };

    const loadAll = async () => {
        setIsLoading(true);
        try {
            await Promise.all([
                loadCategorias(),
                loadIngredientes(),
                loadProveedores(),
                loadServiceTipos(),
                loadProductosCarta(),
                loadRecetas()
            ]);
        } catch (error) {
            console.error('[RecipeContext] Error cargando:', error);
            showToast('Error al cargar datos', 'error', 'Error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadAll();
    }, [id_empresa]);

    return (
        <RecipeContext.Provider value={{
            categorias,
            ingredientes,
            proveedores,
            serviceTipos,
            productosCarta,
            recetas,
            isLoading,
            refreshCategorias: loadCategorias,
            refreshIngredientes: loadIngredientes,
            refreshProveedores: loadProveedores,
            refreshServiceTipos: loadServiceTipos,
            refreshProductosCarta: loadProductosCarta,
            refreshRecetas: loadRecetas
        }}>
            {children}
        </RecipeContext.Provider>
    );
};

export const useRecipes = () => {
    const context = useContext(RecipeContext);
    if (!context) throw new Error('useRecipes must be used within RecipeProvider');
    return context;
};