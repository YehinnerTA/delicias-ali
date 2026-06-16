import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { VentaCatering, ActivityLog, CateringFilters, SERVICIOS_DISPONIBLES, CATALOGO_MATERIALES } from '../features/types/catering';

interface CateringSalesContextType {
    ventas: VentaCatering[];
    serviciosDisponibles: typeof SERVICIOS_DISPONIBLES;
    catalogoMateriales: typeof CATALOGO_MATERIALES;
    activityLogs: ActivityLog[];
    filters: CateringFilters;
    setVentas: (ventas: VentaCatering[]) => void;
    addActivity: (accion: string, modulo: string, detalle: string) => void;
    addToHistory: (venta: VentaCatering, accion: string, descripcion: string) => void;
    setFilters: (filters: CateringFilters) => void;
    saveToLocal: () => void;
    getNextNumeroVenta: () => string;
}

const CateringSalesContext = createContext<CateringSalesContextType | undefined>(undefined);

const USUARIO_ACTUAL = "Ana Martínez";

export const CateringSalesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [ventas, setVentas] = useState<VentaCatering[]>([]);
    const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
    const [filters, setFilters] = useState<CateringFilters>({ search: '', estado: '', fecha: '' });

    const serviciosDisponibles = SERVICIOS_DISPONIBLES;
    const catalogoMateriales = CATALOGO_MATERIALES;

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

    const addToHistory = (venta: VentaCatering, accion: string, descripcion: string) => {
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
        localStorage.setItem("ventas_catering_db", JSON.stringify(ventas));
        localStorage.setItem("actividad_catering_db", JSON.stringify(activityLogs));
    };

    const loadFromLocal = () => {
        const storedVentas = localStorage.getItem("ventas_catering_db");
        const storedActivity = localStorage.getItem("actividad_catering_db");

        let loadedVentas = storedVentas ? JSON.parse(storedVentas) : [];
        let loadedActivity = storedActivity ? JSON.parse(storedActivity) : [];

        if (loadedVentas.length === 0) {
            const fechaEjemplo = new Date().toLocaleString();
            loadedVentas = [{
                id: Date.now(),
                numero: "V-000001",
                fecha: fechaEjemplo,
                fechaObj: new Date(),
                cliente: "Juan Pérez",
                clienteDoc: "12345678",
                servicios: [],
                materiales: [],
                eventoData: { fecha: "", horario: "12:00", personas: 1, tipoDesayuno: "Clásico" },
                subtotal: 0,
                descuento: 0,
                igv: 0,
                total: 0,
                metodoPago: "EFECTIVO",
                estado: "completada",
                devoluciones: [],
                historial: []
            }];
            addActivity("INICIALIZAR", "ventas", "Datos de ejemplo cargados");
        }

        setVentas(loadedVentas);
        setActivityLogs(loadedActivity);
    };

    useEffect(() => {
        loadFromLocal();
    }, []);

    useEffect(() => {
        if (ventas.length) {
            saveToLocal();
        }
    }, [ventas, activityLogs]);

    return (
        <CateringSalesContext.Provider value={{
            ventas, setVentas,
            serviciosDisponibles,
            catalogoMateriales,
            activityLogs,
            filters, setFilters,
            addActivity, addToHistory,
            saveToLocal,
            getNextNumeroVenta
        }}>
            {children}
        </CateringSalesContext.Provider>
    );
};

export const useCateringSales = () => {
    const context = useContext(CateringSalesContext);
    if (!context) throw new Error('useCateringSales must be used within CateringSalesProvider');
    return context;
};