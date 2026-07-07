import { Receta } from '../../features/types/catering';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const recetaApi = {
    getByProductoNombre: async (nombreProducto: string, idEmpresa: number): Promise<Receta> => {
        const res = await fetch(`${API_URL}/recetas/producto?nombre=${encodeURIComponent(nombreProducto)}&id_empresa=${idEmpresa}`);
        if (!res.ok) {
            // Si no hay receta, devolver un ingrediente genérico
            return {
                ingredientes: [{ nombre: 'Producto genérico', cantidadPorUnidad: 1, unidad: 'unidad', proveedores: ['Proveedor General - 900123456'] }]
            };
        }
        const data = await res.json();
        // Si la respuesta es un array vacío, devolver el genérico
        if (!data || data.length === 0) {
            return {
                ingredientes: [{ nombre: 'Producto genérico', cantidadPorUnidad: 1, unidad: 'unidad', proveedores: ['Proveedor General - 900123456'] }]
            };
        }
        return {
            ingredientes: data.map((item: any) => ({
                nombre: item.ingrediente_nombre,
                cantidadPorUnidad: parseFloat(item.cantidad_por_unidad),
                unidad: item.unidad,
                proveedores: item.proveedor_nombre ? [`${item.proveedor_nombre} - ${item.proveedor_telefono}`] : undefined
            }))
        };
    }
};