import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Empresa, Persona, Usuario } from '../features/types/person';
import { ActivityLog, HistorialEntry } from '../features/types/hist_act';
import { TipoModulo } from '../features/types/config';
import { empresaApi } from '../services/api/empresaApi';
import { personaApi } from '../services/api/personaApi';
import { usuarioApi } from '../services/api/usuarioApi';
import { actividadApi } from '../services/api/actividadApi';
import { historialApi } from '../services/api/historialApi';
import { useAuth } from '../features/auth/context/AuthContext';

interface GlobalContextType {
    empresas: Empresa[];
    personas: Persona[];
    usuarios: Usuario[];
    activityLogs: ActivityLog[];
    isLoading: boolean;
    setEmpresas: React.Dispatch<React.SetStateAction<Empresa[]>>;
    setPersonas: React.Dispatch<React.SetStateAction<Persona[]>>;
    setUsuarios: React.Dispatch<React.SetStateAction<Usuario[]>>;
    addActivity: (accion: string, modulo: TipoModulo, detalle: string) => Promise<void>;
    addToHistory: <T extends { historial: HistorialEntry[] }>(
        item: T,
        nombreItem: string,
        accion: string,
        descripcion: string
    ) => Promise<void>;
    refreshData: () => Promise<void>;
    getNombrePersona: (persona: Persona) => string;
    getNombreEmpresa: (id: number) => string;
}

const GlobalContext = createContext<GlobalContextType | undefined>(undefined);

const loadFromLocalStorage = () => {
    try {
        const storedEmpresas = localStorage.getItem("dc_gestion_empresas");
        const storedPersonas = localStorage.getItem("dc_gestion_personas");
        const storedUsuarios = localStorage.getItem("dc_gestion_usuarios");
        const storedActivity = localStorage.getItem("dc_gestion_actividad");

        return {
            empresas: storedEmpresas ? JSON.parse(storedEmpresas) : [],
            personas: storedPersonas ? JSON.parse(storedPersonas) : [],
            usuarios: storedUsuarios ? JSON.parse(storedUsuarios) : [],
            activityLogs: storedActivity ? JSON.parse(storedActivity) : []
        };
    } catch (e) {
        console.warn('[GlobalContext] Error al leer localStorage:', e);
        return { empresas: [], personas: [], usuarios: [], activityLogs: [] };
    }
};

export const GlobalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [empresas, setEmpresas] = useState<Empresa[]>([]);
    const [personas, setPersonas] = useState<Persona[]>([]);
    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [empData, perData, usrData, actData] = await Promise.all([
                empresaApi.getAll(),
                personaApi.getAll(),
                usuarioApi.getAll(),
                actividadApi.getAll()
            ]);

            if (empData.length > 0 || perData.length > 0 || usrData.length > 0) {
                setEmpresas(empData);
                setPersonas(perData);
                setUsuarios(usrData);
                setActivityLogs(actData);
                localStorage.setItem("dc_gestion_empresas", JSON.stringify(empData));
                localStorage.setItem("dc_gestion_personas", JSON.stringify(perData));
                localStorage.setItem("dc_gestion_usuarios", JSON.stringify(usrData));
                localStorage.setItem("dc_gestion_actividad", JSON.stringify(actData));
            } else {
                console.warn('[GlobalContext] API devolvió datos vacíos. Usando localStorage.');
                const localData = loadFromLocalStorage();
                setEmpresas(localData.empresas);
                setPersonas(localData.personas);
                setUsuarios(localData.usuarios);
                setActivityLogs(localData.activityLogs);
            }
        } catch (error) {
            console.error('[GlobalContext] Error cargando desde API, usando localStorage:', error);
            const localData = loadFromLocalStorage();
            setEmpresas(localData.empresas);
            setPersonas(localData.personas);
            setUsuarios(localData.usuarios);
            setActivityLogs(localData.activityLogs);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const getUsuarioActual = () => {
        if (user) {
            return user.nombre_completo || user.usuario || 'Usuario';
        }
        return 'Sistema';
    };

    const getNombrePersona = (persona: Persona) => {
        if (persona.nombre) return `${persona.nombre} ${persona.apellido || ''}`;
        return persona.razon_social || "Sin nombre";
    };

    const getNombreEmpresa = (id: number) => {
        const e = empresas.find(emp => emp.id_empresa === id);
        return e ? e.empresa : "N/A";
    };

    const addActivity = async (accion: string, modulo: TipoModulo, detalle: string) => {
        try {
            const usuarioActual = getUsuarioActual();
            await actividadApi.create({ modulo, accion, detalle, usuario: usuarioActual });
            const updated = await actividadApi.getAll();
            setActivityLogs(updated);
        } catch (error) {
            console.error('[GlobalContext] Error al agregar actividad:', error);
        }
    };

    const addToHistory = async <T extends { historial: HistorialEntry[] }>(
        item: T,
        nombreItem: string,
        accion: string,
        descripcion: string
    ) => {
        try {
            let entidad = '';
            let idEntidad = 0;

            if ('id_usuario' in item) {
                entidad = 'usuarios';
                idEntidad = (item as any).id_usuario;
            } else if ('id_persona' in item) {
                entidad = 'personas';
                idEntidad = (item as any).id_persona;
            } else if ('id_empresa' in item) {
                entidad = 'empresas';
                idEntidad = (item as any).id_empresa;
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
            }
        } catch (error) {
            console.error('[GlobalContext] Error al agregar historial:', error);
        }
    };

    const refreshData = async () => {
        await loadData();
    };

    return (
        <GlobalContext.Provider value={{
            empresas,
            personas,
            usuarios,
            activityLogs,
            isLoading,
            setEmpresas,
            setPersonas,
            setUsuarios,
            addActivity,
            addToHistory,
            refreshData,
            getNombrePersona,
            getNombreEmpresa
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