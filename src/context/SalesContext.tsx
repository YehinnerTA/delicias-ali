import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Venta, CatalogoProducto, VentasFilters } from '../features/types/sales';
import { ActivityLog } from '../features/types/hist_act';

interface VentasContextType {
    ventas: Venta[];
    catalogoProductos: CatalogoProducto[];
    activityLogs: ActivityLog[];
    filters: VentasFilters;
    setVentas: (ventas: Venta[]) => void;
    addActivity: (accion: string, modulo: string, detalle: string) => void;
    addToHistory: (venta: Venta, accion: string, descripcion: string) => void;
    setFilters: (filters: VentasFilters) => void;
    saveToLocal: () => void;
    getNextNumeroVenta: () => string;
}

const VentasContext = createContext<VentasContextType | undefined>(undefined);

const USUARIO_ACTUAL = "Ana Martínez";

export const VentasProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [ventas, setVentas] = useState<Venta[]>([]);
    const [catalogoProductos] = useState<CatalogoProducto[]>([
        { id: 1, nombre: "Causa Rellena", precio: 25.00, stock: 50 },
        { id: 2, nombre: "Lomo Saltado", precio: 35.00, stock: 40 },
        { id: 3, nombre: "Ceviche Mixto", precio: 45.00, stock: 30 },
        { id: 4, nombre: "Suspiro a la Limeña", precio: 15.00, stock: 60 },
        { id: 5, nombre: "Chicha Morada (1L)", precio: 12.00, stock: 100 }
    ]);
    const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
    const [filters, setFilters] = useState<VentasFilters>({ search: '', estado: '', fecha: '' });

    const addActivity = (accion: string, modulo: string, detalle: string) => {
        const newLog: ActivityLog = {
            timestamp: new Date().toLocaleString(),
            accion,
            modulo,
            detalle,
            usuario: USUARIO_ACTUAL
        };
        setActivityLogs(prev => [newLog, ...prev].slice(0, 30));
    };

    const addToHistory = (venta: Venta, accion: string, descripcion: string) => {
        if (!venta.historial) venta.historial = [];
        venta.historial.unshift({
            fecha: new Date().toLocaleString(),
            usuario: USUARIO_ACTUAL,
            accion,
            descripcion
        });
        if (venta.historial.length > 40) venta.historial.pop();
        saveToLocal();
    };

    const getNextNumeroVenta = (): string => {
        const nextNumber = ventas.length + 1;
        return `V-${String(nextNumber).padStart(6, '0')}`;
    };

    const saveToLocal = () => {
        localStorage.setItem("ventas_catering", JSON.stringify(ventas));
        localStorage.setItem("actividad_ventas", JSON.stringify(activityLogs));
    };

    const loadFromLocal = () => {
        const storedVentas = localStorage.getItem("ventas_catering");
        const storedActivity = localStorage.getItem("actividad_ventas");

        let loadedVentas = storedVentas ? JSON.parse(storedVentas) : [];
        let loadedActivity = storedActivity ? JSON.parse(storedActivity) : [];

        if (loadedVentas.length === 0) {
            loadedVentas = [{
                id: Date.now(),
                numero: "V-000001",
                fecha: new Date().toLocaleString(),
                fechaObj: new Date(),
                cliente: "Juan Pérez",
                clienteDoc: "12345678",
                productos: [{ id: 1, nombre: "Causa Rellena", precio: 25, cantidad: 2 }],
                subtotal: 50,
                descuento: 0,
                igv: 9,
                total: 59,
                metodoPago: "EFECTIVO",
                estado: "completada",
                devoluciones: [],
                historial: []
            }];
            addActivity("INICIALIZAR", "ventas", "Datos de ejemplo cargados");
        } else {
            loadedVentas = loadedVentas.map((v: any) => ({
                ...v,
                fechaObj: new Date(v.fecha)
            }));
        }

        setVentas(loadedVentas);
        setActivityLogs(loadedActivity);
    };

    useEffect(() => {
        loadFromLocal();
    }, []);

    useEffect(() => {
        saveToLocal();
    }, [ventas, activityLogs]);

    useEffect(() => {
        if (ventas.length) {
            saveToLocal();
        }
    }, [ventas, activityLogs]);

    return (
        <VentasContext.Provider value={{
            ventas, setVentas,
            catalogoProductos,
            activityLogs,
            filters, setFilters,
            addActivity, addToHistory,
            saveToLocal,
            getNextNumeroVenta
        }}>
            {children}
        </VentasContext.Provider>
    );
};

export const useVentas = () => {
    const context = useContext(VentasContext);
    if (!context) throw new Error('useVentas must be used within VentasProvider');
    return context;
};