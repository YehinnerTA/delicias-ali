import { CategoriaAlimento } from '../types/person';

export type CategoriaReceta = 'entrada' | 'plato_principal' | 'postre' | 'bebida' | 'salsa' | 'panificado';
export type TipoPreparacion = 'por_unidad' | 'por_molde' | 'por_lote';
export type Dificultad = 'fácil' | 'media' | 'difícil';

export interface IngredienteReceta {
    id_ingrediente: number | null;
    nombre: string;
    cantidad: number;
    unidad: string;
    notas: string | null;
    es_opcional: boolean;
    id_categoria: number | null;
    categoria?: CategoriaAlimento | null;
    esNuevo?: boolean;
}

export interface PasoReceta {
    orden: number;
    descripcion: string;
}

export interface ServicioDeReceta {
    id_producto_carta: number;
    id_tipo_servicio: number;
    nombre_producto: string;
    precio: number;
    tipo_servicio: {
        clave: string;
        nombre: string;
    };
}

export interface Receta {
    id: number;
    id_empresa: number;
    nombre: string;
    descripcion: string | null;
    categoria_receta: CategoriaReceta;
    tipo_preparacion: TipoPreparacion;
    cantidad_base: number;
    porciones_por_unidad: number;
    porciones_total: number;
    tiempo_preparacion: number | null;
    tiempo_coccion: number | null;
    dificultad: Dificultad;
    rendimiento: number;
    costo_estimado: number | null;
    estado: boolean;
    created_by: string | null;
    ingredientes: IngredienteReceta[];
    pasos: PasoReceta[];
    servicios: ServicioDeReceta[];
    created_at?: string;
    updated_at?: string;
}