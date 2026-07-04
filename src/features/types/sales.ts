export interface HistorialEntry {
    fecha: string;
    usuario: string;
    accion: string;
    descripcion: string;
}

export interface ProductoVenta {
    id: number;
    nombre: string;
    precio: number;
    cantidad: number;
    stock?: number;
}

export interface Devolucion {
    fecha: string;
    productos: ProductoVenta[];
    monto: number;
    motivo: string;
    notaCredito: string;
    usuario: string;
}

export interface Venta {
    id: number;
    numero: string;
    fecha: string;
    fechaObj: Date;
    cliente: string;
    clienteDoc: string;
    productos: ProductoVenta[];
    productosOriginales?: ProductoVenta[];
    subtotal: number;
    descuento: number;
    igv: number;
    total: number;
    metodoPago: string;
    estado: 'completada' | 'anulada' | 'devolucion-parcial' | 'devolucion-total';
    devoluciones: Devolucion[];
    historial: HistorialEntry[];
}

export interface CatalogoProducto {
    id: number;
    nombre: string;
    precio: number;
    stock: number;
}

export interface ComponentesVenta {
    descuento: {
        activo: boolean;
        tipo: 'porcentaje' | 'monto';
        valor: number;
    };
    cupon: {
        activo: boolean;
        codigo: string;
        valor: number;
    };
}

export interface MetodoPago {
    tipo: 'efectivo' | 'tarjeta' | 'yape' | 'plin';
    monto: number;
    vuelto: number;
}

export interface VentaTemporal {
    cliente: { nombre: string; documento: string };
    productos: ProductoVenta[];
    componentes: ComponentesVenta;
    metodoPago: MetodoPago;
    subtotal: number;
    igv: number;
    total: number;
}

export interface VentasFilters {
    search: string;
    estado: string;
    fecha: string;
}