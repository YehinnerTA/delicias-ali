import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Venta, CatalogoProducto, VentasFilters } from '../features/types/sales';
import { ActivityLog } from '../features/types/hist_act';
import { useAuth } from '../features/auth/context/AuthContext';
import { ventaApi } from '../services/api/ventaApi';
import { actividadApi } from '../services/api/actividadApi';
import { historialApi } from '../services/api/historialApi';

interface SalesContextType {
    ventas: Venta[];
    catalogoProductos: CatalogoProducto[];
    activityLogs: ActivityLog[];
    filters: VentasFilters;
    setVentas: (ventas: Venta[]) => void;
    setCatalogoProductos: (productos: CatalogoProducto[]) => void;
    addActivity: (accion: string, modulo: string, detalle: string) => Promise<void>;
    addToHistory: (venta: Venta, accion: string, descripcion: string) => Promise<void>;
    setFilters: (filters: VentasFilters) => void;
    getNextNumeroVenta: () => Promise<string>;
    refreshData: () => Promise<void>;
    isLoading: boolean;
}

const SalesContext = createContext<SalesContextType | undefined>(undefined);

export const SalesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [ventas, setVentas] = useState<Venta[]>([]);
    const [catalogoProductos, setCatalogoProductos] = useState<CatalogoProducto[]>([]);
    const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
    const [filters, setFilters] = useState<VentasFilters>({ search: '', estado: '', fecha: '' });
    const [isLoading, setIsLoading] = useState(true);

    const getUsuarioActual = () => {
        if (user) {
            return user.nombre_completo || user.usuario || 'Usuario';
        }
        return 'Sistema';
    };

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [ventasData, catalogoData, activityData] = await Promise.all([
                ventaApi.getAll(),
                ventaApi.getCatalogo(),
                actividadApi.getAll()
            ]);

            setVentas(ventasData);
            setCatalogoProductos(catalogoData);
            setActivityLogs(activityData.filter(log => log.modulo === 'ventas'));
        } catch (error) {
            console.error('[SalesContext] Error cargando datos:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const addActivity = async (accion: string, modulo: string, detalle: string) => {
        try {
            const usuarioActual = getUsuarioActual();
            await actividadApi.create({ modulo, accion, detalle, usuario: usuarioActual });
            const updated = await actividadApi.getAll();
            setActivityLogs(updated.filter(log => log.modulo === 'ventas'));
        } catch (error) {
            console.error('[SalesContext] Error al agregar actividad:', error);
        }
    };

    const addToHistory = async (venta: Venta, accion: string, descripcion: string) => {
        try {
            const usuarioActual = getUsuarioActual();
            await historialApi.create({
                entidad: 'ventas',
                id_entidad: venta.id,
                accion,
                descripcion: `${venta.numero} - ${descripcion}`,
                usuario: usuarioActual
            });

            if (venta.historial) {
                venta.historial.unshift({
                    fecha: new Date().toLocaleString(),
                    usuario: usuarioActual,
                    accion,
                    descripcion: `${venta.numero} - ${descripcion}`
                });
            }

            setVentas((prev) =>
                prev.map((v) =>
                    v.id === venta.id ? { ...v, historial: venta.historial } : v
                )
            );
        } catch (error) {
            console.error('[SalesContext] Error al agregar historial:', error);
        }
    };

    const getNextNumeroVenta = async (): Promise<string> => {
        try {
            return await ventaApi.getNextNumero();
        } catch (error) {
            console.error('[SalesContext] Error al obtener próximo número:', error);
            const nextNumber = ventas.length + 1;
            return `V-${String(nextNumber).padStart(6, '0')}`;
        }
    };

    const refreshData = async () => {
        await loadData();
    };

    return (
        <SalesContext.Provider value={{
            ventas,
            catalogoProductos,
            activityLogs,
            filters,
            setVentas,
            setCatalogoProductos,
            addActivity,
            addToHistory,
            setFilters,
            getNextNumeroVenta,
            refreshData,
            isLoading
        }}>
            {children}
        </SalesContext.Provider>
    );
};

export const useVentas = () => {
    const context = useContext(SalesContext);
    if (!context) throw new Error('useVentas must be used within SalesProvider');
    return context;
};