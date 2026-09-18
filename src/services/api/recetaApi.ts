import { Receta } from '../../features/types/recipe';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const mapToFrontend = (data: any): Receta => ({
    id: data.id,
    id_empresa: data.id_empresa,
    nombre: data.nombre,
    descripcion: data.descripcion,
    categoria_receta: data.categoria_receta || 'plato_principal',
    tipo_preparacion: data.tipo_preparacion || 'por_unidad',
    cantidad_base: parseFloat(data.cantidad_base) || 1,
    porciones_por_unidad: parseInt(data.porciones_por_unidad) || 1,
    porciones_total: parseInt(data.porciones_total) || 1,
    tiempo_preparacion: data.tiempo_preparacion ? parseInt(data.tiempo_preparacion) : null,
    tiempo_coccion: data.tiempo_coccion ? parseInt(data.tiempo_coccion) : null,
    dificultad: data.dificultad || 'media',
    rendimiento: parseFloat(data.rendimiento) || 100,
    costo_estimado: data.costo_estimado ? parseFloat(data.costo_estimado) : null,
    estado: data.estado === 1 || data.estado === true,
    created_by: data.created_by,
    ingredientes: (data.ingredientes || []).map((i: any) => ({
        id_ingrediente: i.id_ingrediente || null,
        nombre: i.nombre,
        cantidad: parseFloat(i.cantidad) || 0,
        unidad: i.unidad || 'unidades',
        notas: i.notas || null,
        es_opcional: i.es_opcional === true || i.es_opcional === 1,
        id_categoria: i.id_categoria || null,
        categoria: i.categoria || null,
        esNuevo: false
    })),
    pasos: (data.pasos || []).map((p: any) => ({
        orden: p.orden,
        descripcion: p.descripcion
    })),
    servicios: (data.servicios || []).map((s: any) => ({
        id_producto_carta: s.id_producto_carta,
        id_tipo_servicio: s.id_tipo_servicio,
        nombre_producto: s.nombre_producto,
        precio: parseFloat(s.precio),
        tipo_servicio: s.tipo_servicio
    })),
    created_at: data.created_at,
    updated_at: data.updated_at
});

export const recetaApi = {
    getAll: async (id_empresa: number): Promise<Receta[]> => {
        const res = await fetch(`${API_URL}/recetas?id_empresa=${id_empresa}`);
        if (!res.ok) throw new Error('Error al obtener recetas');
        const data = await res.json();
        return data.map(mapToFrontend);
    },

    getById: async (id: number, id_empresa: number): Promise<Receta> => {
        const res = await fetch(`${API_URL}/recetas/${id}?id_empresa=${id_empresa}`);
        if (!res.ok) throw new Error('Error al obtener receta');
        const data = await res.json();
        return mapToFrontend(data);
    },

    create: async (receta: any): Promise<Receta> => {
        const res = await fetch(`${API_URL}/recetas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(receta)
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.message || 'Error al crear receta');
        }
        const data = await res.json();
        return mapToFrontend(data);
    },

    update: async (id: number, receta: any): Promise<Receta> => {
        const res = await fetch(`${API_URL}/recetas/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(receta)
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.message || 'Error al actualizar receta');
        }
        const data = await res.json();
        return mapToFrontend(data);
    },

    delete: async (id: number, id_empresa: number): Promise<void> => {
        const res = await fetch(`${API_URL}/recetas/${id}?id_empresa=${id_empresa}`, {
            method: 'DELETE'
        });
        if (!res.ok) throw new Error('Error al eliminar receta');
    },

    getByProductoNombre: async (nombreProducto: string, idEmpresa: number): Promise<{
        receta_nombre: string;
        tipo_preparacion: 'por_unidad' | 'por_molde' | 'por_lote';
        cantidad_base: number;
        porciones_por_unidad: number;
        porciones_total: number;
        rendimiento: number;
        ingredientes: any[];
    }> => {
        // ✅ Valores por defecto (fallback)
        const defaultResponse = {
            receta_nombre: nombreProducto,
            tipo_preparacion: 'por_unidad' as const,
            cantidad_base: 1,
            porciones_por_unidad: 1,
            porciones_total: 1,
            rendimiento: 100,
            ingredientes: [{
                nombre: 'Producto genérico',
                cantidadPorUnidad: 1,
                unidad: 'unidad',
                proveedores: ['Proveedor General - 900123456']
            }]
        };

        const res = await fetch(
            `${API_URL}/recetas/producto?nombre=${encodeURIComponent(nombreProducto)}&id_empresa=${idEmpresa}`
        );

        if (!res.ok) return defaultResponse;

        const data = await res.json();
        if (!data || data.length === 0) return defaultResponse;

        // ✅ Tomar los datos de receta del primer elemento (vienen en todas las filas)
        const primerItem = data[0];

        return {
            receta_nombre: primerItem.receta_nombre || nombreProducto,
            tipo_preparacion: primerItem.tipo_preparacion || 'por_unidad',
            cantidad_base: parseFloat(primerItem.cantidad_base) || 1,
            porciones_por_unidad: parseInt(primerItem.porciones_por_unidad) || 1,
            porciones_total: parseInt(primerItem.porciones_total) || 1,
            rendimiento: parseFloat(primerItem.rendimiento) || 100,
            ingredientes: data.map((item: any) => ({
                nombre: item.ingrediente_nombre,
                cantidadPorUnidad: parseFloat(item.cantidad_por_unidad),
                unidad: item.unidad,
                proveedores: item.proveedor_nombre
                    ? [`${item.proveedor_nombre} - ${item.proveedor_telefono}`]
                    : undefined
            }))
        };
    }
};