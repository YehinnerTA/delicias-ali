export interface HistorialEntry {
    fecha: string;
    usuario: string;
    accion: string;
    descripcion: string;
}

export interface ProductoCarta {
    id: number;
    nombre: string;
    precio: number;
}

export interface ServicioCatering {
    id: number;
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
    fecha: string;
    horario: string;
    personas: number;
    tipoDesayuno: string;
}

export interface VentaCatering {
    id: number;
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

export interface ActivityLog {
    timestamp: string;
    accion: string;
    modulo: string;
    detalle: string;
    usuario: string;
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
    ingredientes: IngredienteReceta[];
}