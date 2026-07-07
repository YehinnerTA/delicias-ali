import { HistorialEntry } from './hist_act';

export interface CateringItem {
    id: number;
    id_empresa: number;
    nombre: string;
    stock: number;
    tipo: 'materia prima' | 'utensilio';
    registradoPor: string;
    ultimaEdicion: string;
    historial: HistorialEntry[];
}

export interface Lote {
    id: number;
    id_empresa: number;
    postre_id: number;
    stock: number;
    fechaVencimiento: string;
    diasDuracion: number;
    fechaRegistro: string;
    registradoPor: string;
    ultimaEdicion: string;
    historial: HistorialEntry[];
}

export interface Postre {
    id: number;
    id_empresa: number;
    nombre: string;
    precio: number;
    lotes: Lote[];
    historial: HistorialEntry[];
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