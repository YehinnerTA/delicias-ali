import { Venta, ProductoVenta, CatalogoProducto } from '../../features/types/sales';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const mapCatalogoProducto = (data: any): CatalogoProducto => ({
    id: data.id,
    nombre: data.nombre,
    precio: parseFloat(data.precio),
    stock: data.stock,
    fechaVencimiento: data.fechaVencimiento,
    diasDuracion: data.dias_duracion
});

const mapProductoVenta = (data: any): ProductoVenta => ({
    id: data.id,
    detalleId: data.detalleId,
    nombre: data.nombre,
    precio: parseFloat(data.precio) || 0,
    cantidad: parseInt(data.cantidad) || 0
});

const mapVenta = (data: any): Venta => ({
    id: data.id,
    numero: data.numero,
    fecha: data.fecha,
    fechaObj: new Date(data.fecha),
    cliente: data.cliente || '',
    clienteDoc: data.clienteDoc || '',
    productos: (data.productos || []).map(mapProductoVenta),
    subtotal: parseFloat(data.subtotal) || 0,
    descuento: parseFloat(data.descuento) || 0,
    igv: parseFloat(data.igv) || 0,
    total: parseFloat(data.total) || 0,
    metodoPago: data.metodoPago || data.metodo_pago || 'EFECTIVO',
    estado: data.estado || 'completada',
    devoluciones: (data.devoluciones || []).map((d: any) => ({
        id: d.id,
        fecha: d.fecha,
        motivo: d.motivo,
        notaCredito: d.notaCredito || d.nota_credito,
        monto: parseFloat(d.monto) || 0,
        usuario: d.usuario || '',
        productos: (d.productos || []).map((p: any) => ({
            id: p.id,
            nombre: p.nombre,
            precio: parseFloat(p.precio) || 0,
            cantidad: parseInt(p.cantidad) || 0
        }))
    })),
    historial: []
});

export const ventaApi = {
    getAll: async (): Promise<Venta[]> => {
        const res = await fetch(`${API_URL}/ventas`);
        if (!res.ok) throw new Error('Error al obtener ventas');
        const data = await res.json();
        return data.map(mapVenta);
    },

    getById: async (id: number): Promise<Venta> => {
        const res = await fetch(`${API_URL}/ventas/${id}`);
        if (!res.ok) throw new Error('Error al obtener venta');
        const data = await res.json();
        return mapVenta(data);
    },

    getNextNumero: async (): Promise<string> => {
        const res = await fetch(`${API_URL}/ventas/next-numero`);
        if (!res.ok) throw new Error('Error al generar número de venta');
        const data = await res.json();
        return data.numero;
    },

    getCatalogo: async (): Promise<CatalogoProducto[]> => {
        const res = await fetch(`${API_URL}/ventas/catalogo/productos`);
        if (!res.ok) throw new Error('Error al obtener catálogo');
        const data = await res.json();
        return data.map(mapCatalogoProducto);
    },

    getClientes: async (): Promise<any[]> => {
        const res = await fetch(`${API_URL}/ventas/clientes/lista`);
        if (!res.ok) throw new Error('Error al obtener clientes');
        return await res.json();
    },

    create: async (ventaData: any): Promise<Venta> => {
        const res = await fetch(`${API_URL}/ventas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(ventaData)
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.message || 'Error al crear venta');
        }
        const data = await res.json();
        return mapVenta(data);
    },

    update: async (id: number, ventaData: any): Promise<Venta> => {
        const res = await fetch(`${API_URL}/ventas/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(ventaData)
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.message || 'Error al actualizar venta');
        }
        const data = await res.json();
        return mapVenta(data);
    },

    anular: async (id: number): Promise<void> => {
        const res = await fetch(`${API_URL}/ventas/${id}/anular`, {
            method: 'PUT'
        });
        if (!res.ok) throw new Error('Error al anular venta');
    },

    devolver: async (id: number, data: any): Promise<any> => {
        const res = await fetch(`${API_URL}/ventas/${id}/devolver`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.message || 'Error al registrar devolución');
        }
        return await res.json();
    }
};