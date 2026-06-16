import React from 'react';
import { Modal } from '../Modal';
import { VentaCatering, obtenerRecetaProducto, enviarWhatsApp } from '../../../../features/types/catering';

interface CocinaLogisticaModalProps {
    isOpen: boolean;
    onClose: () => void;
    venta: VentaCatering | null;
}

export const CocinaLogisticaModal: React.FC<CocinaLogisticaModalProps> = ({ isOpen, onClose, venta }) => {
    if (!venta) return null;

    const handleEnviarWhatsApp = (telefono: string, producto: string, cantidad: number) => {
        enviarWhatsApp(telefono, producto, cantidad);
    };

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
            {venta.servicios && venta.servicios.length > 0 && (
                <>
                    {venta.servicios.map((serv, servIdx) => (
                        <div key={servIdx} className="service-divider">
                            <div className="service-label-header">
                                <span className='service-name'>{serv.tipoNombre}</span>
                            </div>
                        </div>
                    ))}

                    <div className="dc-info-card">
                        <h4><i className="fas fa-utensils"></i>INSUMOS</h4>
                        {venta.servicios.map((serv, servIdx) => (
                            <div key={servIdx}>
                                {serv.productos.map((p, prodIdx) => {
                                    const receta = obtenerRecetaProducto(p.nombre);
                                    return (
                                        <div key={prodIdx} className="insumo-item">
                                            <div className="insumo-header">
                                                <strong>▸ Producto: {p.nombre} (Cantidad: {p.cantidad})</strong>
                                            </div>
                                            <div className="insumo-ingredientes">
                                                {receta.ingredientes.map((ing, ingIdx) => {
                                                    const total = ing.cantidadPorUnidad * p.cantidad;
                                                    return (
                                                        <div key={ingIdx} className="insumo-ingrediente">
                                                            <span><strong>• {ing.nombre}</strong> — {total.toFixed(2)} {ing.unidad}</span>
                                                            <div className="insumo-proveedores">
                                                                {ing.proveedores && ing.proveedores.length > 0 ? (
                                                                    ing.proveedores.map((prov, provIdx) => {
                                                                        const telefono = prov.match(/\d{9}/)?.[0] || '';
                                                                        return (
                                                                            <button key={provIdx} className="dc-btn dc-btn-whatsapp info" onClick={() => handleEnviarWhatsApp(telefono, ing.nombre, total)}>
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
                        ))}
                    </div>
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