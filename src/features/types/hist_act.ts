export interface HistorialEntry {
    fecha: string;
    usuario: string;
    accion: string;
    descripcion: string;
}

export interface ActivityLog {
    timestamp: string;
    accion: string;
    modulo: string;
    detalle: string;
    usuario: string;
}