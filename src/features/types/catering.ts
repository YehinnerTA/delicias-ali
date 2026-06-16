// ============================================
// TIPOS PARA MÓDULO DE CATERING
// ============================================
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

// Catálogos estáticos
export const CANTIDAD_MINIMA_PRODUCTOS = 50;

export const SERVICIOS_DISPONIBLES: Record<string, { nombre: string; carta: ProductoCarta[] }> = {
    "corporativo": {
        nombre: "🏢 Corporativo Ejecutivo",
        carta: [
            { id: 101, nombre: "Sándwich Premium", precio: 18 },
            { id: 102, nombre: "Ensalada de Quinoa", precio: 22 },
            { id: 103, nombre: "Jugo Natural", precio: 9 },
            { id: 104, nombre: "Café Americano", precio: 7 }
        ]
    },
    "social": {
        nombre: "🎉 Social / Fiestas",
        carta: [
            { id: 201, nombre: "Mini Hamburguesas", precio: 15 },
            { id: 202, nombre: "Brochetas de Pollo", precio: 20 },
            { id: 203, nombre: "Postre Variado", precio: 12 }
        ]
    },
    "desayuno": {
        nombre: "☕ Desayuno Corporativo",
        carta: [
            { id: 301, nombre: "Café Americano", precio: 8 },
            { id: 302, nombre: "Tostada Francesa", precio: 12 },
            { id: 303, nombre: "Yogurt con Granola", precio: 10 }
        ]
    }
};

export const CATALOGO_MATERIALES: MaterialVenta[] = [
    { id: 1001, nombre: "Plato Cerámico (x10)", precio: 45, cantidad: 0 },
    { id: 1002, nombre: "Vaso Vidrio (x12)", precio: 28, cantidad: 0 },
    { id: 1003, nombre: "Cubiertos Acero (set x20)", precio: 35, cantidad: 0 },
    { id: 1004, nombre: "Mantelería Elegante", precio: 60, cantidad: 0 },
    { id: 1005, nombre: "Mesa Plegable (unidad)", precio: 85, cantidad: 0 },
    { id: 1006, nombre: "Silla Estándar (unidad)", precio: 12, cantidad: 0 }
];

// Recetas para Cocina/Logística
export interface IngredienteReceta {
    nombre: string;
    cantidadPorUnidad: number;
    unidad: string;
    proveedores?: string[];
}

export interface Receta {
    ingredientes: IngredienteReceta[];
}

export const RECETAS_BASE: Record<string, Receta> = {
    "Sándwich Premium": {
        ingredientes: [
            { nombre: "Pan", cantidadPorUnidad: 2, unidad: "unidades", proveedores: ["Panadería Central - 995123456", "Bimbo Perú - 995234567"] },
            { nombre: "Jamón", cantidadPorUnidad: 0.05, unidad: "kg", proveedores: ["Carnes Premium - 995345678"] },
            { nombre: "Queso", cantidadPorUnidad: 0.04, unidad: "kg", proveedores: ["Lácteos Andinos - 995456789"] }
        ]
    },
    "Mini Hamburguesas": {
        ingredientes: [
            { nombre: "Pan de hamburguesa", cantidadPorUnidad: 1, unidad: "unidad", proveedores: ["Panadería Central - 995123456"] },
            { nombre: "Carne molida", cantidadPorUnidad: 0.1, unidad: "kg", proveedores: ["Carnes Premium - 995345678"] }
        ]
    },
    "Brochetas de Pollo": {
        ingredientes: [
            { nombre: "Pechuga de pollo", cantidadPorUnidad: 0.1, unidad: "kg", proveedores: ["Avícola San Fernando - 994123456", "Pollo Real - 994234567"] },
            { nombre: "Pimiento", cantidadPorUnidad: 0.02, unidad: "kg", proveedores: ["Frutas del Valle - 999123456"] }
        ]
    },
    "Jugo Natural": {
        ingredientes: [
            { nombre: "Naranja", cantidadPorUnidad: 0.3, unidad: "kg", proveedores: ["Frutas del Valle - 999123456", "Agroexport SAC - 999234567", "Mercado Central - 999345678"] }
        ]
    },
    "Café Americano": {
        ingredientes: [
            { nombre: "Café en grano", cantidadPorUnidad: 0.02, unidad: "kg", proveedores: ["Café Altura - 998765432", "Granos del Perú - 998876543"] }
        ]
    },
    "Ensalada de Quinoa": {
        ingredientes: [
            { nombre: "Quinoa", cantidadPorUnidad: 0.15, unidad: "kg", proveedores: ["Granos Andinos - 997123456"] },
            { nombre: "Lechuga", cantidadPorUnidad: 0.05, unidad: "kg" },
            { nombre: "Tomate", cantidadPorUnidad: 0.05, unidad: "kg" }
        ]
    }
};

export function obtenerRecetaProducto(nombre: string): Receta {
    for (const [key, receta] of Object.entries(RECETAS_BASE)) {
        if (nombre.toLowerCase().includes(key.toLowerCase())) {
            return receta;
        }
    }
    return {
        ingredientes: [{ nombre: "Producto genérico", cantidadPorUnidad: 1, unidad: "unidad", proveedores: ["Proveedor General - 900123456"] }]
    };
}

export function enviarWhatsApp(telefono: string, producto: string, cantidad: number): void {
    if (!telefono) return;
    const mensaje = `Hola, necesito cotizar ${cantidad} unidades de ${producto} para Delicias Catering. ¿Podría enviarme precios y disponibilidad? Gracias.`;
    window.open(`https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`, '_blank');
}