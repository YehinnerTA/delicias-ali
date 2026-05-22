import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CateringItem, Postre, ActivityLog, ModuloInventario, CateringFilters, PostreFilters } from '../features/types/inventory';

interface InventoryContextType {
    cateringItems: CateringItem[];
    postresItems: Postre[];
    activityLogs: ActivityLog[];
    cateringFilters: CateringFilters;
    postreFilters: PostreFilters;
    setCateringItems: (items: CateringItem[]) => void;
    setPostresItems: (items: Postre[]) => void;
    addActivity: (accion: string, modulo: ModuloInventario, detalle: string) => void;
    addToHistory: <T extends { historial: any[] }>(item: T, nombreItem: string, accion: string, descripcion: string) => void;
    setCateringFilters: (filters: CateringFilters) => void;
    setPostreFilters: (filters: PostreFilters) => void;
    calcularFechaVencimiento: (dias: number) => string;
    getDiasRestantes: (fechaVencimiento: string) => number;
    saveToLocal: () => void;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

const USUARIO_ACTUAL = "Chef Ana (ana@delicias.com)";

export const InventoryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [cateringItems, setCateringItems] = useState<CateringItem[]>([]);
    const [postresItems, setPostresItems] = useState<Postre[]>([]);
    const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
    const [cateringFilters, setCateringFilters] = useState<CateringFilters>({ nombre: '', tipo: '', stockMin: '' });
    const [postreFilters, setPostreFilters] = useState<PostreFilters>({ nombre: '', estado: '' });

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

    const addActivity = (accion: string, modulo: ModuloInventario, detalle: string) => {
        const newLog: ActivityLog = {
            timestamp: new Date().toLocaleString(),
            accion,
            modulo,
            detalle,
            usuario: USUARIO_ACTUAL
        };
        setActivityLogs(prev => [newLog, ...prev].slice(0, 30));
    };

    const addToHistory = <T extends { historial: any[] }>(
        item: T,
        nombreItem: string,
        accion: string,
        descripcion: string
    ) => {
        if (item.historial) {
            item.historial.unshift({
                fecha: new Date().toLocaleString(),
                usuario: USUARIO_ACTUAL,
                accion,
                descripcion: `${nombreItem} - ${descripcion}`
            });
            if (item.historial.length > 40) item.historial.pop();
        }
        saveToLocal();
    };

    const saveToLocal = () => {
        localStorage.setItem("cateringInv", JSON.stringify(cateringItems));
        localStorage.setItem("postresLotes", JSON.stringify(postresItems));
        localStorage.setItem("inventoryAct", JSON.stringify(activityLogs));
    };

    const loadFromLocal = () => {
        const storedCat = localStorage.getItem("cateringInv");
        const storedPos = localStorage.getItem("postresLotes");
        const storedAct = localStorage.getItem("inventoryAct");

        let loadedCatering = storedCat ? JSON.parse(storedCat) : [];
        let loadedPostres = storedPos ? JSON.parse(storedPos) : [];
        let loadedActivity = storedAct ? JSON.parse(storedAct) : [];

        if (loadedCatering.length === 0) {
            const now = new Date().toLocaleString();
            loadedCatering = [
                { id: Date.now() + 1, nombre: "Harina de trigo", stock: 28, tipo: "materia prima", registradoPor: USUARIO_ACTUAL, ultimaEdicion: now, historial: [{ fecha: now, usuario: USUARIO_ACTUAL, accion: "CREACIÓN", descripcion: "Harina - creado con stock 28" }] },
                { id: Date.now() + 2, nombre: "Batidora planetaria", stock: 2, tipo: "utensilio", registradoPor: USUARIO_ACTUAL, ultimaEdicion: now, historial: [{ fecha: now, usuario: USUARIO_ACTUAL, accion: "CREACIÓN", descripcion: "Utensilio registrado" }] },
                { id: Date.now() + 3, nombre: "Azúcar morena", stock: 45, tipo: "materia prima", registradoPor: USUARIO_ACTUAL, ultimaEdicion: now, historial: [{ fecha: now, usuario: USUARIO_ACTUAL, accion: "CREACIÓN", descripcion: "Azúcar - creado con stock 45" }] }
            ];
            addActivity("INICIALIZAR", "catering", "Datos de ejemplo cargados");
        }

        if (loadedPostres.length === 0) {
            const fechaRegistro = new Date().toLocaleDateString("es-ES");
            loadedPostres = [
                {
                    id: Date.now() + 200, nombre: "Cheesecake", lotes: [
                        { id: Date.now() + 100, stock: 12, precio: 6.2, fechaVencimiento: calcularFechaVencimiento(5), diasDuracion: 5, fechaRegistro, registradoPor: USUARIO_ACTUAL, ultimaEdicion: new Date().toLocaleString(), historial: [{ fecha: new Date().toLocaleString(), usuario: USUARIO_ACTUAL, accion: "CREACIÓN", descripcion: "Lote inicial cheesecake - 5 días de duración" }] },
                        { id: Date.now() + 101, stock: 6, precio: 6.5, fechaVencimiento: calcularFechaVencimiento(12), diasDuracion: 12, fechaRegistro, registradoPor: USUARIO_ACTUAL, ultimaEdicion: new Date().toLocaleString(), historial: [{ fecha: new Date().toLocaleString(), usuario: USUARIO_ACTUAL, accion: "CREACIÓN", descripcion: "Segundo lote cheesecake - 12 días de duración" }] }
                    ]
                },
                {
                    id: Date.now() + 201, nombre: "Brownies", lotes: [
                        { id: Date.now() + 102, stock: 8, precio: 4.5, fechaVencimiento: calcularFechaVencimiento(-2), diasDuracion: -2, fechaRegistro, registradoPor: USUARIO_ACTUAL, ultimaEdicion: new Date().toLocaleString(), historial: [{ fecha: new Date().toLocaleString(), usuario: USUARIO_ACTUAL, accion: "CREACIÓN", descripcion: "Lote brownies - ya vencido" }] }
                    ]
                }
            ];
            addActivity("INICIALIZAR", "tienda", "Datos de ejemplo cargados");
        }

        setCateringItems(loadedCatering);
        setPostresItems(loadedPostres);
        setActivityLogs(loadedActivity);
    };

    useEffect(() => {
        loadFromLocal();
    }, []);

    useEffect(() => {
        if (cateringItems.length || postresItems.length) {
            saveToLocal();
        }
    }, [cateringItems, postresItems, activityLogs]);

    return (
        <InventoryContext.Provider value={{
            cateringItems, setCateringItems,
            postresItems, setPostresItems,
            activityLogs,
            cateringFilters, setCateringFilters,
            postreFilters, setPostreFilters,
            addActivity, addToHistory,
            calcularFechaVencimiento, getDiasRestantes,
            saveToLocal
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