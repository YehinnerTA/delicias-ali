export interface HistorialEntry {
    fecha: string;
    usuario: string;
    accion: string;
    descripcion: string;
}

export interface CateringItem {
    id: number;
    nombre: string;
    stock: number;
    tipo: 'materia prima' | 'utensilio';
    registradoPor: string;
    ultimaEdicion: string;
    historial: HistorialEntry[];
}

export interface Lote {
    id: number;
    stock: number;
    precio: number;
    fechaVencimiento: string;
    diasDuracion: number;
    fechaRegistro: string;
    registradoPor: string;
    ultimaEdicion: string;
    historial: HistorialEntry[];
}

export interface Postre {
    id: number;
    nombre: string;
    lotes: Lote[];
}

export interface ActivityLog {
    timestamp: string;
    accion: string;
    modulo: string;
    detalle: string;
    usuario: string;
}

export type ModuloInventario = 'catering' | 'tienda';

export interface CateringFilters {
    nombre: string;
    tipo: string;
    stockMin: string;
}

export interface PostreFilters {
    nombre: string;
    estado: string;
}