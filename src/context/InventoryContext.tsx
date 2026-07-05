import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '../features/auth/context/AuthContext';
import { CateringItem, Postre, ModuloInventario, CateringFilters, PostreFilters } from '../features/types/inventory';
import { ActivityLog } from '../features/types/hist_act';
import { cateringItemApi } from '../services/api/cateringApi';
import { postreApi } from '../services/api/postreApi';
import { actividadApi } from '../services/api/actividadApi';
import { historialApi } from '../services/api/historialApi';

interface InventoryContextType {
    cateringItems: CateringItem[];
    postresItems: Postre[];
    activityLogs: ActivityLog[];
    cateringFilters: CateringFilters;
    postreFilters: PostreFilters;
    setCateringItems: (items: CateringItem[]) => void;
    setPostresItems: (items: Postre[]) => void;
    setCateringFilters: (filters: CateringFilters) => void;
    setPostreFilters: (filters: PostreFilters) => void;
    addActivity: (accion: string, modulo: ModuloInventario, detalle: string) => Promise<void>;
    addToHistory: <T extends { historial: any[] }>(
        item: T,
        nombreItem: string,
        accion: string,
        descripcion: string
    ) => Promise<void>;
    refreshData: () => Promise<void>;
    calcularFechaVencimiento: (dias: number) => string;
    getDiasRestantes: (fechaVencimiento: string) => number;
    isLoading: boolean;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

const loadFromLocalStorage = () => {
    try {
        const storedCat = localStorage.getItem("cateringInv");
        const storedPos = localStorage.getItem("postresLotes");
        const storedAct = localStorage.getItem("inventoryAct");

        return {
            cateringItems: storedCat ? JSON.parse(storedCat) : [],
            postresItems: storedPos ? JSON.parse(storedPos) : [],
            activityLogs: storedAct ? JSON.parse(storedAct) : []
        };
    } catch (e) {
        console.warn('[InventoryContext] Error al leer localStorage:', e);
        return { cateringItems: [], postresItems: [], activityLogs: [] };
    }
};

export const InventoryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [cateringItems, setCateringItems] = useState<CateringItem[]>([]);
    const [postresItems, setPostresItems] = useState<Postre[]>([]);
    const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
    const [cateringFilters, setCateringFilters] = useState<CateringFilters>({ nombre: '', tipo: '', stockMin: '' });
    const [postreFilters, setPostreFilters] = useState<PostreFilters>({ nombre: '', estado: '' });
    const [isLoading, setIsLoading] = useState(true);

    const calcularFechaVencimiento = (dias: number): string => {
        if (!dias || dias <= 0) return new Date().toISOString().split('T')[0];
        const fecha = new Date();
        fecha.setDate(fecha.getDate() + dias);
        return fecha.toISOString().split('T')[0];
    };

    const getDiasRestantes = (fechaVencimiento: string): number => {
        const hoy = new Date();
        const venc = new Date(fechaVencimiento);
        const diffTime = venc.getTime() - hoy.getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    const getUsuarioActual = () => {
        if (user) {
            return user.nombre_completo || user.usuario || 'Usuario';
        }
        return 'Sistema';
    };

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [catData, posData, actData] = await Promise.all([
                cateringItemApi.getAll(),
                postreApi.getAll(),
                actividadApi.getAll()
            ]);

            if (catData.length > 0 || posData.length > 0) {
                setCateringItems(catData);
                setPostresItems(posData);
                setActivityLogs(actData);
                localStorage.setItem("cateringInv", JSON.stringify(catData));
                localStorage.setItem("postresLotes", JSON.stringify(posData));
                localStorage.setItem("inventoryAct", JSON.stringify(actData));
            } else {
                const localData = loadFromLocalStorage();
                setCateringItems(localData.cateringItems);
                setPostresItems(localData.postresItems);
                setActivityLogs(localData.activityLogs);
            }
        } catch (error) {
            console.error('[InventoryContext] Error cargando desde API, usando localStorage:', error);
            const localData = loadFromLocalStorage();
            setCateringItems(localData.cateringItems);
            setPostresItems(localData.postresItems);
            setActivityLogs(localData.activityLogs);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const addActivity = async (accion: string, modulo: ModuloInventario, detalle: string) => {
        try {
            const usuarioActual = getUsuarioActual();
            await actividadApi.create({ modulo, accion, detalle, usuario: usuarioActual });
            const updated = await actividadApi.getAll();
            setActivityLogs(updated);
        } catch (error) {
            console.error('[InventoryContext] Error al agregar actividad:', error);
        }
    };

    const addToHistory = async <T extends { historial: any[] }>(
        item: T,
        nombreItem: string,
        accion: string,
        descripcion: string
    ) => {
        try {
            let entidad = '';
            let idEntidad = 0;
            let esCateringItem = false;

            if ('id' in item && 'tipo' in item) {
                entidad = 'catering_items';
                idEntidad = (item as any).id;
                esCateringItem = true;
            } else if ('lotes' in item) {
                entidad = 'postres';
                idEntidad = (item as any).id;
            } else if ('postre_id' in item) {
                entidad = 'lotes';
                idEntidad = (item as any).id;
            }

            if (entidad && idEntidad) {
                const usuarioActual = getUsuarioActual();
                await historialApi.create({
                    entidad,
                    id_entidad: idEntidad,
                    accion,
                    descripcion: `${nombreItem} - ${descripcion}`,
                    usuario: usuarioActual
                });

                if (item.historial) {
                    item.historial.unshift({
                        fecha: new Date().toLocaleString(),
                        usuario: usuarioActual,
                        accion,
                        descripcion: `${nombreItem} - ${descripcion}`
                    });
                }

                if (esCateringItem) {
                    const updatedItem = item as unknown as CateringItem;
                    setCateringItems((prev) =>
                        prev.map((ci) =>
                            ci.id === updatedItem.id ? { ...ci, historial: updatedItem.historial } : ci
                        )
                    );
                }
            }
        } catch (error) {
            console.error('[InventoryContext] Error al agregar historial:', error);
        }
    };

    const refreshData = async () => {
        await loadData();
    };

    return (
        <InventoryContext.Provider value={{
            cateringItems,
            postresItems,
            activityLogs,
            cateringFilters,
            postreFilters,
            setCateringItems,
            setPostresItems,
            setCateringFilters,
            setPostreFilters,
            addActivity,
            addToHistory,
            refreshData,
            calcularFechaVencimiento,
            getDiasRestantes,
            isLoading
        }}>
            {children}
        </InventoryContext.Provider>
    );
};

export const useInventory = () => {
    const context = useContext(InventoryContext);
    if (!context) throw new Error('useInventory must be used within InventoryProvider');
    return context;
};