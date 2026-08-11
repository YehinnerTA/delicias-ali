import { HistorialEntry } from './hist_act';

export interface CateringLote {
    id: number;
    id_empresa: number;
    id_item: number;
    stock: number;
    fechaVencimiento: string | null;
    diasVidaUtil: number | null;
    fechaRegistro: string;
    registradoPor: string;
    descartado: boolean | number;
    created_at: string;
    updated_at: string;
    historial: HistorialEntry[];
}

export interface CateringItem {
    id: number;
    id_empresa: number;
    nombre: string;
    stock: number;
    tipo: 'materia prima' | 'utensilio';
    unidad_medida: string;
    tiene_vencimiento: boolean;
    fecha_vencimiento: string | null;
    dias_vida_util: number | null;
    precio_compra: number | null;
    id_proveedor: number | null;
    registradoPor: string;
    ultimaEdicion: string;
    createdAt: string;
    lotes: CateringLote[];
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