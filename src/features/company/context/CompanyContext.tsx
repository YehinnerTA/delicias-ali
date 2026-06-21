import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '../../auth/context/AuthContext';
import { Empresa } from '../types/index.company';

interface CompanyContextType {
    selectedCompany: string | null;
    setSelectedCompany: (ruc: string) => void;
    empresas: Empresa[];
    isLoading: boolean;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export const CompanyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user, isAuthenticated } = useAuth();
    const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const empresas: Empresa[] = user?.empresas || [];

    // Cargar empresa desde localStorage al iniciar
    useEffect(() => {
        const saved = localStorage.getItem('selectedCompany');
        if (saved && empresas.some(e => e.ruc === saved)) {
            setSelectedCompany(saved);
        } else if (empresas.length > 0) {
            const defaultEmpresa = empresas.find(e => e.es_predeterminada);
            setSelectedCompany(defaultEmpresa?.ruc || empresas[0]?.ruc || null);
        }
        setIsLoading(false);
    }, [empresas]);

    // Guardar en localStorage cuando cambie
    useEffect(() => {
        if (selectedCompany) {
            localStorage.setItem('selectedCompany', selectedCompany);
        }
    }, [selectedCompany]);

    const handleSetSelectedCompany = (ruc: string) => {
        if (empresas.some(e => e.ruc === ruc)) {
            setSelectedCompany(ruc);
        }
    };

    return (
        <CompanyContext.Provider
            value={{
                selectedCompany,
                setSelectedCompany: handleSetSelectedCompany,
                empresas,
                isLoading,
            }}
        >
            {children}
        </CompanyContext.Provider>
    );
};

export const useCompany = () => {
    const context = useContext(CompanyContext);
    if (!context) {
        throw new Error('useCompany must be used within CompanyProvider');
    }
    return context;
};