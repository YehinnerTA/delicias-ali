import { VentaCatering } from '../../features/types/catering';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const mapVentaCatering = (data: any): VentaCatering => ({
    id: data.id,
    id_empresa: data.id_empresa,
    numero: data.numero,
    fecha: data.fecha,
    fechaObj: new Date(data.fecha),
    cliente: data.cliente || '',
    clienteDoc: data.clienteDoc || '',
    servicios: (data.servicios || []).map((s: any) => ({
        id: s.id,
        id_empresa: s.id_empresa,
        tipoKey: s.tipoKey,
        tipoNombre: s.tipoNombre,
        productos: (s.productos || []).map((p: any) => ({
            id: p.id,
            detalleId: p.detalleId,
            nombre: p.nombre,
            precio: parseFloat(p.precio),
            cantidad: parseInt(p.cantidad)
        }))
    })),
    materiales: (data.materiales || []).map((m: any) => ({
        id: m.id,
        detalleId: m.detalleId,
        nombre: m.nombre,
        precio: parseFloat(m.precio),
        cantidad: parseInt(m.cantidad)
    })),
    eventoData: data.eventoData || { fecha: '', horario: '', personas: 1, tipoDesayuno: 'Clásico' },
    subtotal: parseFloat(data.subtotal) || 0,
    descuento: parseFloat(data.descuento) || 0,
    igv: parseFloat(data.igv) || 0,
    total: parseFloat(data.total) || 0,
    metodoPago: data.metodoPago || 'EFECTIVO',
    estado: data.estado || 'completada',
    devoluciones: data.devoluciones || [],
    historial: []
});

export const cateringServiceApi = {
    getAll: async (idEmpresa: number): Promise<VentaCatering[]> => {
        const res = await fetch(`${API_URL}/catering-service?id_empresa=${idEmpresa}`);
        if (!res.ok) throw new Error('Error al obtener ventas de catering');
        const data = await res.json();
        return data.map(mapVentaCatering);
    },

    getById: async (id: number, idEmpresa: number): Promise<VentaCatering> => {
        const res = await fetch(`${API_URL}/catering-service/${id}?id_empresa=${idEmpresa}`);
        if (!res.ok) throw new Error('Error al obtener venta de catering');
        const data = await res.json();
        return mapVentaCatering(data);
    },

    getNextNumero: async (idEmpresa: number): Promise<string> => {
        const res = await fetch(`${API_URL}/catering-service/next-numero?id_empresa=${idEmpresa}`);
        if (!res.ok) throw new Error('Error al generar número de venta');
        const data = await res.json();
        return data.numero;
    },

    getCatalogos: async (): Promise<any> => {
        const res = await fetch(`${API_URL}/catering-service/catalogos`);
        if (!res.ok) throw new Error('Error al obtener catálogos de catering');
        return await res.json();
    },

    create: async (idEmpresa: number, ventaData: any): Promise<VentaCatering> => {
        const payload = { ...ventaData, id_empresa: idEmpresa };
        const res = await fetch(`${API_URL}/catering-service`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.message || 'Error al crear venta de catering');
        }
        const data = await res.json();
        return mapVentaCatering(data);
    },

    update: async (id: number, idEmpresa: number, ventaData: any): Promise<VentaCatering> => {
        const payload = { ...ventaData, id_empresa: idEmpresa };
        const res = await fetch(`${API_URL}/catering-service/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.message || 'Error al actualizar venta de catering');
        }
        const data = await res.json();
        return mapVentaCatering(data);
    },

    anular: async (id: number, idEmpresa: number): Promise<void> => {
        const res = await fetch(`${API_URL}/catering-service/${id}/anular`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_empresa: idEmpresa })
        });
        if (!res.ok) throw new Error('Error al anular venta de catering');
    },

    devolver: async (id: number, idEmpresa: number, data: any): Promise<any> => {
        const payload = { ...data, id_empresa: idEmpresa };
        const res = await fetch(`${API_URL}/catering-service/${id}/devolver`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.message || 'Error al registrar devolución de catering');
        }
        return await res.json();
    }
};