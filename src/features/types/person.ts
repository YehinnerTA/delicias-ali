export interface HistorialEntry {
    fecha: string;
    usuario: string;
    accion: string;
    descripcion: string;
}

export interface Empresa {
    id_empresa: number;
    ruc: string;
    empresa: string;
    estado: boolean;
    historial: HistorialEntry[];
}

export interface Persona {
    id_persona: number;
    id_empresa: number;
    tipo_persona: 'proveedor' | 'cliente_natural' | 'cliente_juridico' | 'empleado';
    tipo_documento: 'DNI' | 'RUC';
    numero_documento: string;
    razon_social: string | null;
    nombre: string | null;
    apellido: string | null;
    email: string | null;
    celular: string;
    estado: boolean;
    historial: HistorialEntry[];
}

export interface Usuario {
    id_usuario: number;
    id_persona: number;
    id_rol: 1 | 2 | 3 | 4;
    username: string;
    password_hash: string;
    estado: boolean;
    historial: HistorialEntry[];
}

export interface ActivityLog {
    timestamp: string;
    accion: string;
    modulo: string;
    detalle: string;
    usuario: string;
}

export type TipoModulo = 'empresas' | 'personas' | 'usuarios' | 'catering' | 'tienda';

export interface TabConfig {
    id: TipoModulo;
    label: string;
    icon: string;
}

export const ROLES: Record<number, string> = {
    1: 'Administrador',
    2: 'Chef',
    3: 'Cajero',
    4: 'Logística'
};

export const TIPOS_PERSONA = [
    { value: 'proveedor', label: 'Proveedor' },
    { value: 'cliente_natural', label: 'Cliente Natural' },
    { value: 'cliente_juridico', label: 'Cliente Jurídico' },
    { value: 'empleado', label: 'Empleado' }
];

export interface FilterConfig {
    search?: string;
    estado?: string;
    tipo?: string;
    empresa?: string;
    rol?: string;
}