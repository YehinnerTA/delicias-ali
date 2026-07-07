import React, { useState, useEffect } from 'react';
import { Modal } from '../Modal';
import { VentaCatering } from '../../../../features/types/catering';
import { useCompany } from '../../../../features/company/context/CompanyContext';
import { recetaApi } from '../../../../services/api/recetaApi';
import { useToast } from '../../../../hooks/base/useToast';

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

export const CocinaLogisticaModal: React.FC<CocinaLogisticaModalProps> = ({ isOpen, onClose, venta }) => {
    const { showToast } = useToast();
    const { getSelectedCompanyId } = useCompany();
    const id_empresa = getSelectedCompanyId() ?? 0;
    const [recetasCargadas, setRecetasCargadas] = useState<Map<string, IngredienteRecetaBD[]>>(new Map());
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
        const map = new Map<string, IngredienteRecetaBD[]>();
        try {
            const productos = new Set<string>();
            venta.servicios?.forEach(serv => {
                serv.productos.forEach(p => productos.add(p.nombre));
            });

            for (const nombre of productos) {
                const receta = await recetaApi.getByProductoNombre(nombre, id_empresa);
                if (receta && receta.ingredientes.length > 0) {
                    map.set(nombre, receta.ingredientes.map(ing => ({
                        nombre: ing.nombre,
                        cantidadPorUnidad: ing.cantidadPorUnidad,
                        unidad: ing.unidad,
                        proveedores: ing.proveedores
                    })));
                } else {
                    map.set(nombre, [{ nombre: 'Producto genérico', cantidadPorUnidad: 1, unidad: 'unidad', proveedores: ['Proveedor General - 900123456'] }]);
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

    const handleEnviarWhatsApp = (telefono: string, producto: string, cantidad: number) => {
        if (!telefono) return;
        const mensaje = `Hola, necesito cotizar ${cantidad} unidades de ${producto} para Delicias Catering. ¿Podría enviarme precios y disponibilidad? Gracias.`;
        window.open(`https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`, '_blank');
    };

    if (!venta) return null;

    const modalFooter = (
        <button className="dc-btn secondary" onClick={onClose}>Cerrar</button>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Requerimientos Cocina & Logística" icon="fa-clipboard-list" footer={modalFooter}>
            {/* Información principal de la venta */}
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
                        <div className="dc-info-value">{venta.eventoData?.fecha || 'No especificada'}</div>
                    </div>
                    <div className="dc-info-item">
                        <div className="dc-info-label">Personas</div>
                        <div className="dc-info-value">{venta.eventoData?.personas || '-'}</div>
                    </div>
                </div>
            </div>

            {/* Servicios y sus insumos */}
            {/* Servicios e insumos agrupados por servicio */}
            {venta.servicios && venta.servicios.length > 0 && (
                <>
                    {isLoading ? (
                        <div style={{ textAlign: 'center', padding: '1rem' }}>
                            <i className="fas fa-spinner fa-spin"></i> Cargando recetas...
                        </div>
                    ) : (
                        venta.servicios.map((serv, servIdx) => (
                            <div key={servIdx} className="dc-container">
                                <div className="service-divider">
                                    <div className="service-label-header">
                                        <span className="service-name">{serv.tipoNombre}</span>
                                    </div>
                                </div>
                                <br />
                                {serv.productos.map((p, prodIdx) => {
                                    const ingredientes = recetasCargadas.get(p.nombre) || [];
                                    return (
                                        <div key={prodIdx} className="service-body">
                                            <div className="insumo-header">
                                                <strong>▸ Producto: {p.nombre} (Cantidad: {p.cantidad})</strong>
                                            </div>
                                            <div className="insumo-ingredientes">
                                                {ingredientes.map((ing, ingIdx) => {
                                                    const total = ing.cantidadPorUnidad * p.cantidad;
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
                        ))
                    )}
                </>
            )}

            {/* Materiales y Equipamiento */}
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

            {/* Recomendaciones */}
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