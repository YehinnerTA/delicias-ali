import { recetaApi } from '../recetaApi';
import { VentaCatering } from '../../../features/types/catering';

// =====================================================
// TIPOS
// =====================================================
export interface IngredienteCalculado {
    nombre: string;
    cantidad: number;
    unidad: string;
    proveedores: Array<{ nombre: string; telefono: string }>;
}

export interface ProductoCalculado {
    id: number;
    nombre: string;
    cantidad: number;
    tipoPreparacion: 'por_unidad' | 'por_molde' | 'por_lote';
    porcionesPorUnidad: number;
    unidadesBase: number;
    porcionesReales: number;
    descripcionCalculo: string;
    ingredientes: IngredienteCalculado[];
}

export interface MaterialCalculado {
    id: number;
    nombre: string;
    cantidad: number;
    precio: number;
}

// =====================================================
// SERVICIO COMPARTIDO
// =====================================================
export const cateringCalculoService = {

    /**
     * Calcula los productos a preparar con sus ingredientes anidados
     * Se usa en: Cocina, Despacho, CocinaLogisticaModal
     */
    calcularProductos: async (venta: VentaCatering | null, idEmpresa: number): Promise<ProductoCalculado[]> => {
        if (!venta?.servicios || venta.servicios.length === 0) return [];

        const productosMap = new Map<string, ProductoCalculado>();

        for (const serv of venta.servicios) {
            for (const prod of serv.productos) {
                if (prod.cantidad <= 0) continue;

                const receta = await recetaApi.getByProductoNombre(prod.nombre, idEmpresa);
                if (!receta) continue;

                const key = prod.nombre.toLowerCase();
                const existente = productosMap.get(key);

                // Calcular unidades base según tipo de preparación
                let unidadesBase = prod.cantidad;
                if (receta.tipo_preparacion !== 'por_unidad') {
                    const porcionesPorUnidad = receta.porciones_por_unidad || 1;
                    unidadesBase = Math.ceil(prod.cantidad / porcionesPorUnidad);
                }
                const porcionesReales = receta.tipo_preparacion === 'por_unidad'
                    ? prod.cantidad
                    : unidadesBase * (receta.porciones_por_unidad || 1);

                // Calcular ingredientes
                const ingredientes: IngredienteCalculado[] = (receta.ingredientes || []).map((ing: any) => {
                    const cantidadTotal = ing.cantidadPorUnidad * unidadesBase;
                    const proveedores = (ing.proveedores || []).map((prov: string) => {
                        const telefono = prov.match(/\d{9}/)?.[0] || '';
                        const nombre = prov.replace(/\s*-\s*\d{9}.*/, '').trim();
                        return { nombre, telefono };
                    });
                    return {
                        nombre: ing.nombre,
                        cantidad: cantidadTotal,
                        unidad: ing.unidad,
                        proveedores
                    };
                });

                // Descripción del cálculo
                let descripcionCalculo = '';
                if (receta.tipo_preparacion === 'por_unidad') {
                    descripcionCalculo = `1 unidad = 1 porción / Unidades: ${prod.cantidad}`;
                } else if (receta.tipo_preparacion === 'por_molde') {
                    descripcionCalculo = `1 molde = ${receta.porciones_por_unidad} porciones / Moldes: ${unidadesBase}`;
                } else if (receta.tipo_preparacion === 'por_lote') {
                    descripcionCalculo = `1 lote = ${receta.porciones_por_unidad} porciones / Lotes: ${unidadesBase}`;
                }
                const sobrante = porcionesReales - prod.cantidad;
                if (sobrante > 0) {
                    descripcionCalculo += ` (+${sobrante} adicionales)`;
                }

                if (existente) {
                    existente.cantidad += prod.cantidad;
                    existente.unidadesBase += unidadesBase;
                    existente.porcionesReales += porcionesReales;
                    for (const ing of ingredientes) {
                        const ingExist = existente.ingredientes.find(i => i.nombre === ing.nombre);
                        if (ingExist) {
                            ingExist.cantidad += ing.cantidad;
                        } else {
                            existente.ingredientes.push(ing);
                        }
                    }
                } else {
                    productosMap.set(key, {
                        id: prod.id,
                        nombre: prod.nombre,
                        cantidad: prod.cantidad,
                        tipoPreparacion: receta.tipo_preparacion || 'por_unidad',
                        porcionesPorUnidad: receta.porciones_por_unidad || 1,
                        unidadesBase,
                        porcionesReales,
                        descripcionCalculo,
                        ingredientes
                    });
                }
            }
        }

        return Array.from(productosMap.values());
    },

    /**
     * Lista plana de ingredientes (para Almacén - lista de compras)
     */
    calcularIngredientesPlanos: async (venta: VentaCatering | null, idEmpresa: number): Promise<IngredienteCalculado[]> => {
        const productos = await cateringCalculoService.calcularProductos(venta, idEmpresa);
        const acumulado = new Map<string, IngredienteCalculado>();

        for (const prod of productos) {
            for (const ing of prod.ingredientes) {
                const key = ing.nombre.toLowerCase();
                if (acumulado.has(key)) {
                    const exist = acumulado.get(key)!;
                    exist.cantidad += ing.cantidad;
                    for (const prov of ing.proveedores) {
                        if (!exist.proveedores.some(p => p.telefono === prov.telefono)) {
                            exist.proveedores.push(prov);
                        }
                    }
                } else {
                    acumulado.set(key, { ...ing, proveedores: [...ing.proveedores] });
                }
            }
        }

        return Array.from(acumulado.values());
    },

    /**
     * Materiales de la venta
     */
    calcularMateriales: (venta: VentaCatering | null): MaterialCalculado[] => {
        if (!venta?.materiales) return [];
        return venta.materiales.map(m => ({
            id: m.id,
            nombre: m.nombre,
            cantidad: m.cantidad,
            precio: m.precio
        }));
    }
};