import React, { useState, useEffect } from 'react';
import { Modal } from '../Modal';
import { VentaCatering } from '../../../../features/types/catering';
import { useCompany } from '../../../../features/company/context/CompanyContext';
import { recetaApi } from '../../../../services/api/recetaApi';
import { useToast } from '../../../../hooks/base/useToast';

const formatFechaHoraEvento = (fecha: string, horario: string): string => {
    if (!fecha) return 'No especificada';

    let fechaLimpia = fecha;
    if (fechaLimpia.includes('T')) {
        fechaLimpia = fechaLimpia.split('T')[0];
    }
    if (fechaLimpia.includes('Z')) {
        fechaLimpia = fechaLimpia.split('Z')[0];
    }

    const partesFecha = fechaLimpia.split('-');
    const dia = partesFecha[2] || '';
    const mes = partesFecha[1] || '';
    const año = partesFecha[0] || '';
    const fechaFormateada = `${dia}/${mes}/${año}`;

    let horaFormateada = '00:00';
    if (horario) {
        const partesHora = horario.split(':');
        horaFormateada = `${partesHora[0]}:${partesHora[1]}`;
    }

    return `${fechaFormateada} || ${horaFormateada}`;
};

interface CocinaLogisticaModalProps {
    isOpen: boolean;
    onClose: () => void;
    venta: VentaCatering | null;
}

interface IngredienteRecetaBD {
    nombre: string;
    cantidadPorUnidad: number;
    unidad: string;
    proveedores?: string[];
}

// ✅ NUEVA: Info de la receta con datos de cálculo
interface RecetaInfo {
    nombre: string;
    tipo_preparacion: 'por_unidad' | 'por_molde' | 'por_lote';
    cantidad_base: number;
    porciones_por_unidad: number;
    porciones_total: number;
    rendimiento: number;
    ingredientes: IngredienteRecetaBD[];
}

export const CocinaLogisticaModal: React.FC<CocinaLogisticaModalProps> = ({ isOpen, onClose, venta }) => {
    const { showToast } = useToast();
    const { getSelectedCompanyId } = useCompany();
    const id_empresa = getSelectedCompanyId() ?? 0;
    const [recetasCargadas, setRecetasCargadas] = useState<Map<string, RecetaInfo>>(new Map());
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen && venta) {
            cargarRecetas();
        }
    }, [isOpen, venta]);

    const cargarRecetas = async () => {
        if (!venta) return;
        if (!id_empresa) {
            showToast('No se ha seleccionado una empresa', 'warning', 'Advertencia');
            return;
        }
        setIsLoading(true);
        const map = new Map<string, RecetaInfo>();
        try {
            const productos = new Set<string>();
            venta.servicios?.forEach(serv => {
                serv.productos.forEach(p => {
                    if (p.cantidad > 0) {
                        productos.add(p.nombre);
                    }
                });
            });

            for (const nombre of productos) {
                const receta = await recetaApi.getByProductoNombre(nombre, id_empresa);
                if (receta && receta.ingredientes.length > 0) {
                    const agrupados = new Map<string, IngredienteRecetaBD>();

                    receta.ingredientes.forEach(ing => {
                        const key = ing.nombre.toLowerCase();

                        if (agrupados.has(key)) {
                            const existente = agrupados.get(key)!;
                            if (ing.proveedores && ing.proveedores.length > 0) {
                                ing.proveedores.forEach((prov: string) => {
                                    if (!existente.proveedores?.includes(prov)) {
                                        existente.proveedores = [...(existente.proveedores || []), prov];
                                    }
                                });
                            }
                        } else {
                            agrupados.set(key, {
                                nombre: ing.nombre,
                                cantidadPorUnidad: ing.cantidadPorUnidad,
                                unidad: ing.unidad,
                                proveedores: ing.proveedores ? [...ing.proveedores] : []
                            });
                        }
                    });

                    map.set(nombre, {
                        nombre: receta.receta_nombre || nombre,
                        tipo_preparacion: receta.tipo_preparacion || 'por_unidad',
                        cantidad_base: receta.cantidad_base || 1,
                        porciones_por_unidad: receta.porciones_por_unidad || 1,
                        porciones_total: receta.porciones_total || 1,
                        rendimiento: receta.rendimiento || 100,
                        ingredientes: Array.from(agrupados.values())
                    });
                } else {
                    map.set(nombre, {
                        nombre,
                        tipo_preparacion: 'por_unidad',
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
                    });
                }
            }
            setRecetasCargadas(map);
        } catch (error) {
            console.error('[CocinaLogisticaModal] Error cargando recetas:', error);
            showToast('Error al cargar recetas', 'error', 'Error');
        } finally {
            setIsLoading(false);
        }
    };

    const calcularUnidadesBase = (receta: RecetaInfo, cantidadPedida: number): number => {
        if (receta.tipo_preparacion === 'por_unidad') {
            return cantidadPedida;
        }
        return Math.ceil(cantidadPedida / receta.porciones_por_unidad);
    };

    const calcularPorcionesReales = (receta: RecetaInfo, cantidadPedida: number): number => {
        if (receta.tipo_preparacion === 'por_unidad') {
            return cantidadPedida;
        }
        const unidadesBase = Math.ceil(cantidadPedida / receta.porciones_por_unidad);
        return unidadesBase * receta.porciones_por_unidad;
    };

    const calcularIngrediente = (receta: RecetaInfo, cantidadPorUnidad: number, cantidadPedida: number): number => {
        if (receta.tipo_preparacion === 'por_unidad') {
            return cantidadPorUnidad * cantidadPedida;
        }
        const unidadesBase = calcularUnidadesBase(receta, cantidadPedida);
        return cantidadPorUnidad * unidadesBase;
    };

    const getDescripcionCalculo = (receta: RecetaInfo, cantidadPedida: number): string => {
        if (receta.tipo_preparacion === 'por_unidad') {
            return `${cantidadPedida} unidades`;
        }

        const unidadesBase = calcularUnidadesBase(receta, cantidadPedida);
        const porcionesReales = calcularPorcionesReales(receta, cantidadPedida);
        const sobrante = porcionesReales - cantidadPedida;

        const label = receta.tipo_preparacion === 'por_molde' ? 'molde(s)' : 'lote(s)';
        const labelPorcion = receta.tipo_preparacion === 'por_molde' ? 'porciones' : 'porciones';

        return `${unidadesBase} ${label} × ${receta.porciones_por_unidad} ${labelPorcion} = ${porcionesReales} (${sobrante > 0 ? `+${sobrante} adicionales` : 'exacto'})`;
    };

    const handleEnviarWhatsApp = (telefono: string, producto: string, cantidad: number) => {
        if (!telefono) return;
        const mensaje = `Hola, necesito cotizar ${cantidad} unidades de ${producto} para Delicias Catering. ¿Podría enviarme precios y disponibilidad? Gracias.`;
        window.open(`https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`, '_blank');
    };

    if (!venta) return null;

    const fechaHoraEvento = venta.eventoData?.fecha
        ? formatFechaHoraEvento(venta.eventoData.fecha, venta.eventoData.horario || '00:00')
        : 'No especificada';

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Requerimientos Cocina & Logística" icon="fa-clipboard-list">
            <div className="dc-info-card">
                <h4><i className="fas fa-clipboard-list"></i> ORDEN PARA COCINA Y LOGÍSTICA</h4>
                <div className="dc-info-grid">
                    <div className="dc-info-item">
                        <div className="dc-info-label">Venta</div>
                        <div className="dc-info-value">{venta.numero}</div>
                    </div>
                    <div className="dc-info-item">
                        <div className="dc-info-label">Cliente</div>
                        <div className="dc-info-value">{venta.cliente}</div>
                    </div>
                    <div className="dc-info-item">
                        <div className="dc-info-label">Fecha evento</div>
                        <div className="dc-info-value">{fechaHoraEvento}</div>
                    </div>
                    <div className="dc-info-item">
                        <div className="dc-info-label">Personas</div>
                        <div className="dc-info-value">{venta.eventoData?.personas || '-'}</div>
                    </div>
                </div>
            </div>

            {venta.servicios && venta.servicios.length > 0 && (
                <>
                    {isLoading ? (
                        <div style={{ textAlign: 'center', padding: '1rem' }}>
                            <i className="fas fa-spinner fa-spin"></i> Cargando recetas...
                        </div>
                    ) : (
                        venta.servicios.map((serv, servIdx) => {
                            const productosFiltrados = serv.productos.filter(p => p.cantidad > 0);

                            if (productosFiltrados.length === 0) return null;

                            return (
                                <div key={servIdx} className="dc-container">
                                    <div className="service-divider">
                                        <div className="service-label-header">
                                            <span className="service-name">{serv.tipoNombre}</span>
                                        </div>
                                    </div>
                                    {productosFiltrados.map((p, prodIdx) => {
                                        const receta = recetasCargadas.get(p.nombre);
                                        if (!receta) return null;

                                        return (
                                            <div key={prodIdx} className="service-body">
                                                <div className="insumo-header">
                                                    <strong>▸ Producto: {p.nombre} (Cantidad: {p.cantidad})</strong>
                                                </div>

                                                {/* ✅ Bloque de cálculo de producción en una sola línea */}
                                                <div style={{
                                                    marginTop: '0.5rem',
                                                    marginBottom: '0.75rem',
                                                    padding: '0.5rem 0.75rem',
                                                    background: '#e7f3ff',
                                                    borderRadius: '6px',
                                                    borderLeft: '4px solid #007bff',
                                                    fontSize: '0.85rem',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.5rem',
                                                    flexWrap: 'wrap'
                                                }}>
                                                    <span style={{ fontWeight: '600' }}>
                                                        <i className="fas fa-calculator"></i> Cálculo de producción:
                                                    </span>
                                                    <span style={{ color: '#333' }}>
                                                        {receta.tipo_preparacion === 'por_unidad' && (
                                                            <>1 unidad = 1 porción / Unidades: {p.cantidad}</>
                                                        )}
                                                        {receta.tipo_preparacion === 'por_molde' && (
                                                            <>
                                                                1 molde = {receta.porciones_por_unidad} porciones / Moldes: {calcularUnidadesBase(receta, p.cantidad)}
                                                            </>
                                                        )}
                                                        {receta.tipo_preparacion === 'por_lote' && (
                                                            <>
                                                                1 lote = {receta.porciones_por_unidad} porciones / Lotes: {calcularUnidadesBase(receta, p.cantidad)}
                                                            </>
                                                        )}
                                                        {receta.tipo_preparacion !== 'por_unidad' && calcularPorcionesReales(receta, p.cantidad) > p.cantidad && (
                                                            <span style={{ color: 'var(--color-secundario)', fontWeight: '600', marginLeft: '0.25rem' }}>
                                                                (+{calcularPorcionesReales(receta, p.cantidad) - p.cantidad} adicionales)
                                                            </span>
                                                        )}
                                                    </span>
                                                </div>

                                                <div className="insumo-ingredientes">
                                                    {receta.ingredientes.map((ing, ingIdx) => {
                                                        const total = calcularIngrediente(receta, ing.cantidadPorUnidad, p.cantidad);
                                                        return (
                                                            <div key={ingIdx} className="insumo-ingrediente">
                                                                <span>
                                                                    <strong>• {ing.nombre}</strong> — {total.toFixed(2)} {ing.unidad}
                                                                </span>
                                                                <div className="insumo-proveedores">
                                                                    {ing.proveedores && ing.proveedores.length > 0 ? (
                                                                        ing.proveedores.map((prov, provIdx) => {
                                                                            const telefono = prov.match(/\d{9}/)?.[0] || '';
                                                                            return (
                                                                                <button
                                                                                    key={provIdx}
                                                                                    className="dc-btn dc-btn-whatsapp info"
                                                                                    onClick={() => handleEnviarWhatsApp(telefono, ing.nombre, total)}
                                                                                >
                                                                                    <i className="fab fa-whatsapp"></i> {prov.substring(0, 15)}
                                                                                </button>
                                                                            );
                                                                        })
                                                                    ) : (
                                                                        <span>Sin proveedor</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })
                    )}
                </>
            )}

            <div className="dc-info-card">
                <h4><i className="fas fa-chair"></i> MATERIALES Y EQUIPAMIENTO</h4>
                {venta.materiales && venta.materiales.length > 0 ? (
                    venta.materiales.map((m, idx) => (
                        <div key={idx} className="material-item">
                            <span><strong>▸ {m.nombre}</strong></span>
                            <span>Cantidad: {m.cantidad}</span>
                        </div>
                    ))
                ) : (
                    <div className="material-item">No hay materiales adicionales registrados.</div>
                )}
            </div>

            <div className="dc-info-card">
                <h4><i className="fas fa-clipboard-check"></i> RECOMENDACIONES</h4>
                <ul className="recomendaciones-lista">
                    <li>✅ Coordinar compra de insumos con 3 días de anticipación.</li>
                    <li>✅ Verificar stock en almacén.</li>
                    <li>✅ Considerar merma del 10%.</li>
                </ul>
            </div>
        </Modal>
    );
};