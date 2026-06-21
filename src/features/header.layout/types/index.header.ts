export interface Notificacion {
    id: number;
    area: 'Cocina' | 'Almacén' | 'Recepción' | 'Logística' | 'Ventas';
    mensaje: string;
    fecha: string;
    leido: boolean;
}

export interface NotificacionesPorArea {
    [area: string]: Notificacion[];
}

export interface NavLink {
    name: string;
    path: string;
}