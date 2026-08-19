import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '../features/auth/context/AuthContext';
import { useCompany } from '../features/company/context/CompanyContext';
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
    const { getSelectedCompanyId } = useCompany();
    const [cateringItems, setCateringItems] = useState<CateringItem[]>([]);
    const [postresItems, setPostresItems] = useState<Postre[]>([]);
    const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
    const [cateringFilters, setCateringFilters] = useState<CateringFilters>({ nombre: '', tipo: '', stockMin: '' });
    const [postreFilters, setPostreFilters] = useState<PostreFilters>({ nombre: '', estado: '' });
    const [isLoading, setIsLoading] = useState(true);
    const [empresaId, setEmpresaId] = useState<number | null>(null);

    useEffect(() => {
        const id = getSelectedCompanyId();
        setEmpresaId(id);
    }, [getSelectedCompanyId]);

    const getTodayLocal = (): string => {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    const calcularFechaVencimiento = (dias: number): string => {
        if (!dias || dias <= 0) return getTodayLocal();
        const fecha = new Date();
        fecha.setDate(fecha.getDate() + dias);
        const y = fecha.getFullYear();
        const m = String(fecha.getMonth() + 1).padStart(2, '0');
        const d = String(fecha.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
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

    const loadData = async (id_empresa: number) => {
        setIsLoading(true);
        try {
            const [catData, posData, actData] = await Promise.all([
                cateringItemApi.getAll(id_empresa),
                postreApi.getAll(id_empresa),
                actividadApi.getAll()
            ]);

            setCateringItems(catData);
            setPostresItems(posData);
            setActivityLogs(actData);
            localStorage.setItem("cateringInv", JSON.stringify(catData));
            localStorage.setItem("postresLotes", JSON.stringify(posData));
            localStorage.setItem("inventoryAct", JSON.stringify(actData));
        } catch (error) {
            console.error('[InventoryContext] Error cargando desde API:', error);
            const localData = loadFromLocalStorage();
            setCateringItems(localData.cateringItems);
            setPostresItems(localData.postresItems);
            setActivityLogs(localData.activityLogs);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (empresaId !== null) {
            loadData(empresaId);
        }
    }, [empresaId]);

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

            if ('id_item' in item) {
                entidad = 'catering_lotes';
                idEntidad = (item as any).id;
            }
            else if ('tipo' in item && 'unidad_medida' in item) {
                entidad = 'catering_items';
                idEntidad = (item as any).id;
                esCateringItem = true;
            }
            else if ('postre_id' in item) {
                entidad = 'lotes';
                idEntidad = (item as any).id;
            }
            else if ('lotes' in item && Array.isArray((item as any).lotes)) {
                entidad = 'postres';
                idEntidad = (item as any).id;
            }
            else if ('id_usuario' in item) {
                entidad = 'usuarios';
                idEntidad = (item as any).id_usuario;
            }
            else if ('id_persona' in item) {
                entidad = 'personas';
                idEntidad = (item as any).id_persona;
            }
            else if ('id' in item && (item as any).id) {
                entidad = 'desconocido';
                idEntidad = (item as any).id;
                console.warn('[InventoryContext] Entidad no detectada, usando fallback:', { item, entidad, idEntidad });
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
                else if (entidad === 'postres') {
                    const updatedItem = item as unknown as Postre;
                    setPostresItems((prev) =>
                        prev.map((p) =>
                            p.id === updatedItem.id ? { ...p, historial: updatedItem.historial } : p
                        )
                    );
                }
            } else {
                console.warn('[InventoryContext] No se pudo detectar entidad para historial:', item);
            }
        } catch (error) {
            console.error('[InventoryContext] Error al agregar historial:', error);
        }
    };

    const refreshData = async () => {
        if (empresaId !== null) {
            await loadData(empresaId);
        }
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