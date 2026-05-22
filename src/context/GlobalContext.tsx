import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Empresa, Persona, Usuario, ActivityLog, TipoModulo } from '../features/types/person';

interface GlobalContextType {
    empresas: Empresa[];
    personas: Persona[];
    usuarios: Usuario[];
    activityLogs: ActivityLog[];
    setEmpresas: (empresas: Empresa[]) => void;
    setPersonas: (personas: Persona[]) => void;
    setUsuarios: (usuarios: Usuario[]) => void;
    addActivity: (accion: string, modulo: TipoModulo, detalle: string) => void;
    addToHistory: <T extends { historial: any[] }>(item: T, nombreItem: string, accion: string, descripcion: string) => void;
    saveToLocal: () => void;
    loadFromLocal: () => void;
    getNombrePersona: (persona: Persona) => string;
    getNombreEmpresa: (id: number) => string;
}

const GlobalContext = createContext<GlobalContextType | undefined>(undefined);

const USUARIO_ACTUAL = "Admin (admin@delicias.com)";

export const GlobalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [empresas, setEmpresas] = useState<Empresa[]>([]);
    const [personas, setPersonas] = useState<Persona[]>([]);
    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);

    const addActivity = (accion: string, modulo: TipoModulo, detalle: string) => {
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
        localStorage.setItem("dc_gestion_empresas", JSON.stringify(empresas));
        localStorage.setItem("dc_gestion_personas", JSON.stringify(personas));
        localStorage.setItem("dc_gestion_usuarios", JSON.stringify(usuarios));
        localStorage.setItem("dc_gestion_actividad", JSON.stringify(activityLogs));
    };

    const loadFromLocal = () => {
        const storedEmpresas = localStorage.getItem("dc_gestion_empresas");
        const storedPersonas = localStorage.getItem("dc_gestion_personas");
        const storedUsuarios = localStorage.getItem("dc_gestion_usuarios");
        const storedActivity = localStorage.getItem("dc_gestion_actividad");

        let loadedEmpresas = storedEmpresas ? JSON.parse(storedEmpresas) : [];
        let loadedPersonas = storedPersonas ? JSON.parse(storedPersonas) : [];
        let loadedUsuarios = storedUsuarios ? JSON.parse(storedUsuarios) : [];
        let loadedActivity = storedActivity ? JSON.parse(storedActivity) : [];

        if (loadedEmpresas.length === 0) {
            loadedEmpresas = [
                { id_empresa: 1, ruc: "20123456789", empresa: "Delicias Catering S.A.C.", estado: true, historial: [] },
                { id_empresa: 2, ruc: "20567890123", empresa: "Distribuciones Gourmet EIRL", estado: true, historial: [] }
            ];
            addActivity("INICIALIZAR", "empresas", "Datos de ejemplo cargados");
        }

        if (loadedPersonas.length === 0) {
            loadedPersonas = [
                { id_persona: 1, id_empresa: 1, tipo_persona: "empleado", tipo_documento: "DNI", numero_documento: "12345678", razon_social: null, nombre: "Ana", apellido: "Martínez", email: "ana@delicias.com", celular: "+51911111111", estado: true, historial: [] },
                { id_persona: 2, id_empresa: 2, tipo_persona: "proveedor", tipo_documento: "RUC", numero_documento: "20612345678", razon_social: "Distribuciones del Valle", nombre: null, apellido: null, email: "ventas@distvalle.com", celular: "+51922222222", estado: true, historial: [] },
                { id_persona: 3, id_empresa: 1, tipo_persona: "cliente_natural", tipo_documento: "DNI", numero_documento: "87654321", razon_social: null, nombre: "Carlos", apellido: "López", email: "carlos@mail.com", celular: "+51933333333", estado: true, historial: [] }
            ];
            addActivity("INICIALIZAR", "personas", "Datos de ejemplo cargados");
        }

        if (loadedUsuarios.length === 0) {
            loadedUsuarios = [
                { id_usuario: 1, id_persona: 1, id_rol: 1, username: "admin", password_hash: "hashed123", estado: true, historial: [] }
            ];
            addActivity("INICIALIZAR", "usuarios", "Datos de ejemplo cargados");
        }

        setEmpresas(loadedEmpresas);
        setPersonas(loadedPersonas);
        setUsuarios(loadedUsuarios);
        setActivityLogs(loadedActivity);
    };

    const getNombrePersona = (persona: Persona): string => {
        if (persona.nombre) {
            return `${persona.nombre} ${persona.apellido || ''}`;
        }
        return persona.razon_social || "Sin nombre";
    };

    const getNombreEmpresa = (id: number): string => {
        const empresa = empresas.find(e => e.id_empresa === id);
        return empresa ? empresa.empresa : "N/A";
    };

    useEffect(() => {
        loadFromLocal();
    }, []);

    useEffect(() => {
        if (empresas.length || personas.length || usuarios.length) {
            saveToLocal();
        }
    }, [empresas, personas, usuarios, activityLogs]);

    return (
        <GlobalContext.Provider value={{
            empresas, setEmpresas,
            personas, setPersonas,
            usuarios, setUsuarios,
            activityLogs,
            addActivity, addToHistory, saveToLocal, loadFromLocal,
            getNombrePersona, getNombreEmpresa
        }}>
            {children}
        </GlobalContext.Provider>
    );
};

export const useGlobal = () => {
    const context = useContext(GlobalContext);
    if (!context) throw new Error('useGlobal must be used within GlobalProvider');
    return context;
};