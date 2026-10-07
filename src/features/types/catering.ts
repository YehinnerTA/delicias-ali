import { HistorialEntry } from './hist_act';

export interface ProductoCarta {
    id: number;
    nombre: string;
    precio: number;
}

export interface ServicioCatering {
    id: number;
    id_empresa: number;
    tipoKey: string;
    tipoNombre: string;
    productos: ProductoVenta[];
}

export interface ProductoVenta {
    id: number;
    detalleId: number;
    nombre: string;
    precio: number;
    cantidad: number;
}

export interface MaterialVenta {
    id: number;
    nombre: string;
    precio: number;
    cantidad: number;
}

export interface EventoData {
    id_evento?: number | null;
    fecha: string;
    horario: string;
    personas: number;
    tipoDesayuno: string;
    incluir_mozo?: boolean;
    cantidad_mozos?: number;
    precio_mozo?: number;
    subtotal_mozo?: number;
    direccion?: string | null;
    referencia?: string | null;
    estado_flujo?: string;
    estado_actualizado_at?: string | null;
}

export interface VentaCatering {
    id: number;
    id_empresa: number;
    numero: string;
    fecha: string;
    fechaObj: Date;
    cliente: string;
    clienteDoc: string;
    servicios: ServicioCatering[];
    materiales: MaterialVenta[];
    eventoData: EventoData;
    subtotal: number;
    descuento: number;
    igv: number;
    total: number;
    metodoPago: string;
    estado: 'completada' | 'anulada' | 'devolucion-parcial' | 'devolucion-total';
    devoluciones: any[];
    historial: HistorialEntry[];
}

export interface VentaTemporal {
    id_empresa: number;
    cliente: { nombre: string; documento: string };
    servicios: ServicioCatering[];
    materiales: MaterialVenta[];
    eventoData: {
        fechaHora: string;
        personas: number;
        tipoDesayuno: string;
        incluir_mozo: boolean;
        cantidad_mozos: number;
        precio_mozo: number;
        subtotal_mozo: number;
        direccion: string;
        referencia: string;
    };
    descuentoActivo: boolean;
    descuentoTipo: 'porcentaje' | 'monto';
    descuentoValor: number;
    cuponActivo: boolean;
    cuponCodigo: string;
    cuponValor: number;
    metodoPago: string;
    subtotal: number;
    igv: number;
    total: number;
}

export interface CateringFilters {
    search: string;
    estado: string;
    fecha: string;
}

export const CANTIDAD_MINIMA_PRODUCTOS = 50;

export interface IngredienteReceta {
    nombre: string;
    cantidadPorUnidad: number;
    unidad: string;
    proveedores?: string[];
}

export interface Receta {
    tipo_preparacion: 'por_unidad' | 'por_molde' | 'por_lote';
    cantidad_base: number;
    porciones_por_unidad: number;
    porciones_total: number;
    ingredientes: IngredienteReceta[];
}

export interface ChecklistItemPayload {
    item: string;
    categoria: 'ingrediente' | 'material';
    id_referencia: number;
    tipo_referencia: 'ingrediente' | 'material';
    cantidad_requerida: number;
    unidad: string;
    proveedores: Array<{ nombre: string; telefono: string }>;
}

export type EstadoCompra = 'en_almacen' | 'comprar';

export type CategoriaGasto = 'ingrediente' | 'material' | 'mano_obra' | 'movilidad' | 'otro';

export interface GastoEvento {
    id: number;
    id_empresa: number;
    id_evento: number;
    id_checklist_item: number | null;
    checklist_item_nombre?: string | null;
    categoria: CategoriaGasto;
    etapa: string;
    descripcion: string;
    cantidad: number;
    unidad: string | null;
    precio_unitario: number;
    subtotal: number;
    id_proveedor: number | null;
    proveedor_nombre?: string | null;
    proveedor_documento?: string | null;
    tiene_factura: boolean;
    numero_factura: string | null;
    fecha_gasto: string;
    observaciones: string | null;
    registrado_por: number;
    registrado_por_usuario?: string | null;
    created_at: string;
    updated_at: string;
}

export interface ResumenGastos {
    total_general: number;
    total_items: number;
    por_categoria: Array<{
        categoria: CategoriaGasto;
        cantidad_items: number;
        subtotal: number;
    }>;
    por_etapa: Array<{
        etapa: string;
        cantidad_items: number;
        subtotal: number;
    }>;
    con_factura: number;
    sin_factura: number;
}

export interface CreateGastoPayload {
    id_empresa: number;
    id_evento: number;
    id_checklist_item?: number | null;
    categoria: CategoriaGasto;
    etapa: string;
    descripcion: string;
    cantidad: number;
    unidad?: string | null;
    precio_unitario: number;
    id_proveedor?: number | null;
    tiene_factura?: boolean;
    numero_factura?: string | null;
    fecha_gasto?: string;
    observaciones?: string | null;
    registrado_por: number;
}

export interface UpdateGastoPayload {
    id_empresa: number;
    cantidad?: number;
    precio_unitario?: number;
    id_proveedor?: number | null;
    tiene_factura?: boolean;
    numero_factura?: string | null;
    observaciones?: string | null;
    descripcion?: string;
    unidad?: string | null;
}

export interface GastoFilters {
    evento_id: number;
    id_empresa: number;
    categoria?: CategoriaGasto;
    etapa?: string;
}