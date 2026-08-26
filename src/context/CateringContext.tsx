import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { VentaCatering, CateringFilters } from '../features/types/catering';
import { ActivityLog } from '../features/types/hist_act';
import { useAuth } from '../features/auth/context/AuthContext';
import { useCompany } from '../features/company/context/CompanyContext';
import { cateringServiceApi } from '../services/api/cateringServiceApi';
import { actividadApi } from '../services/api/actividadApi';
import { historialApi } from '../services/api/historialApi';

interface CateringServiceContextType {
    ventas: VentaCatering[];
    serviciosDisponibles: any;
    catalogoMateriales: any[];
    activityLogs: ActivityLog[];
    filters: CateringFilters;
    setVentas: (ventas: VentaCatering[]) => void;
    setServiciosDisponibles: (servicios: any) => void;
    setCatalogoMateriales: (materiales: any) => void;
    addActivity: (accion: string, modulo: string, detalle: string) => Promise<void>;
    addToHistory: (venta: VentaCatering, accion: string, descripcion: string) => Promise<void>;
    setFilters: (filters: CateringFilters) => void;
    getNextNumeroVenta: () => Promise<string>;
    refreshData: () => Promise<void>;
    isLoading: boolean;
}

const CateringServiceContext = createContext<CateringServiceContextType | undefined>(undefined);

export const CateringServiceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const { getSelectedCompanyId, selectedCompany } = useCompany();
    const id_empresa = getSelectedCompanyId() ?? 0;

    const [ventas, setVentas] = useState<VentaCatering[]>([]);
    const [serviciosDisponibles, setServiciosDisponibles] = useState({});
    const [catalogoMateriales, setCatalogoMateriales] = useState([]);
    const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
    const [filters, setFilters] = useState<CateringFilters>({ search: '', estado: '', fecha: '' });
    const [isLoading, setIsLoading] = useState(true);

    const getUsuarioActual = () => {
        if (user) {
            return user.nombre_completo || user.usuario || 'Usuario';
        }
        return 'Sistema';
    };

    const loadData = async () => {
        if (!id_empresa) {
            setVentas([]);
            setServiciosDisponibles({});
            setCatalogoMateriales([]);
            setActivityLogs([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        try {
            const [ventasData, catalogosData, activityData] = await Promise.all([
                cateringServiceApi.getAll(id_empresa),
                cateringServiceApi.getCatalogos(),
                actividadApi.getAll()
            ]);

            setVentas(ventasData);

            if (catalogosData && catalogosData.serviciosDisponibles) {
                setServiciosDisponibles(catalogosData.serviciosDisponibles);
            } else {
                setServiciosDisponibles({});
            }

            if (catalogosData && catalogosData.catalogoMateriales) {
                setCatalogoMateriales(catalogosData.catalogoMateriales);
            } else {
                setCatalogoMateriales([]);
            }

            setActivityLogs(activityData.filter((log: any) => log.modulo === 'catering' || log.modulo === 'ventas'));
        } catch (error) {
            console.error('[CateringServiceContext] Error cargando datos:', error);
            setServiciosDisponibles({});
            setCatalogoMateriales([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [selectedCompany]);

    const addActivity = async (accion: string, modulo: string, detalle: string) => {
        try {
            const usuarioActual = getUsuarioActual();
            await actividadApi.create({ modulo, accion, detalle, usuario: usuarioActual });
            const updated = await actividadApi.getAll();
            setActivityLogs(updated.filter((log: any) => log.modulo === 'catering' || log.modulo === 'ventas'));
        } catch (error) {
            console.error('[CateringServiceContext] Error al agregar actividad:', error);
        }
    };

    const addToHistory = async (venta: VentaCatering, accion: string, descripcion: string) => {
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
            console.error('[CateringServiceContext] Error al agregar historial:', error);
        }
    };

    const getNextNumeroVenta = async (): Promise<string> => {
        if (!id_empresa) {
            const nextNumber = ventas.length + 1;
            return `V-${String(nextNumber).padStart(6, '0')}`;
        }
        try {
            return await cateringServiceApi.getNextNumero(id_empresa);
        } catch (error) {
            console.error('[CateringServiceContext] Error al obtener próximo número:', error);
            const nextNumber = ventas.length + 1;
            return `V-${String(nextNumber).padStart(6, '0')}`;
        }
    };

    const refreshData = async () => {
        await loadData();
    };

    return (
        <CateringServiceContext.Provider value={{
            ventas,
            serviciosDisponibles,
            catalogoMateriales,
            activityLogs,
            filters,
            setVentas,
            setServiciosDisponibles,
            setCatalogoMateriales,
            addActivity,
            addToHistory,
            setFilters,
            getNextNumeroVenta,
            refreshData,
            isLoading
        }}>
            {children}
        </CateringServiceContext.Provider>
    );
};

export const useCateringService = () => {
    const context = useContext(CateringServiceContext);
    if (!context) throw new Error('useCateringService must be used within CateringServiceProvider');
    return context;
};