import React, { useState, useEffect } from 'react';
import { Modal } from '../Modal';
import { useCateringService } from '../../../../context/CateringContext';
import { useAuth } from '../../../../features/auth/context/AuthContext';
import { useCompany } from '../../../../features/company/context/CompanyContext'; // ← AGREGADO
import { useToast } from '../../../../hooks/base/useToast';
import { VentaCatering } from '../../../../features/types/catering';
import { generarPDFNotaCredito } from '../../../../services/pdf/pdfService';

interface CateringReturnModalProps {
    isOpen: boolean;
    onClose: () => void;
    venta: VentaCatering | null;
    onSuccess: () => void;
}

interface ProductoDevolucion {
    detalleId: number;
    id: number;
    nombre: string;
    precio: number;
    cantidad: number;
    cantidadDevuelta: number;
    maxDevolver: number;
    servicioId?: number;
    servicioNombre?: string;
}

interface MaterialDevolucion {
    id: number;
    nombre: string;
    precio: number;
    cantidad: number;
    cantidadDevuelta: number;
    maxDevolver: number;
}

export const CateringReturnModal: React.FC<CateringReturnModalProps> = ({ isOpen, onClose, venta, onSuccess }) => {
    const { addActivity, addToHistory, refreshData } = useCateringService();
    const { user } = useAuth();
    const { getSelectedCompanyId } = useCompany(); // ← AGREGADO
    const id_empresa = getSelectedCompanyId() ?? 0; // ← AGREGADO
    const { showToast } = useToast();

    const [productosDevolucion, setProductosDevolucion] = useState<ProductoDevolucion[]>([]);
    const [materialesDevolucion, setMaterialesDevolucion] = useState<MaterialDevolucion[]>([]);
    const [motivo, setMotivo] = useState('Producto defectuoso');
    const [notaCreditoNumero, setNotaCreditoNumero] = useState('');
    const [faseAbierta, setFaseAbierta] = useState(true);
    const [tipoDevolucion, setTipoDevolucion] = useState<'servicios' | 'materiales'>('servicios');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (venta && isOpen) {
            const nuevosProductosDev: ProductoDevolucion[] = [];
            venta.servicios?.forEach(serv => {
                serv.productos.forEach(p => {
                    const detalleId = p.detalleId;
                    if (!detalleId) {
                        console.warn(`Producto ${p.nombre} no tiene detalleId`);
                    }
                    nuevosProductosDev.push({
                        detalleId: detalleId || 0,
                        id: p.id,
                        nombre: p.nombre,
                        precio: p.precio,
                        cantidad: p.cantidad,
                        cantidadDevuelta: 0,
                        maxDevolver: p.cantidad,
                        servicioId: serv.id,
                        servicioNombre: serv.tipoNombre
                    });
                });
            });
            setProductosDevolucion(nuevosProductosDev);

            const nuevosMaterialesDev: MaterialDevolucion[] = [];
            venta.materiales?.forEach(m => {
                nuevosMaterialesDev.push({
                    id: m.id,
                    nombre: m.nombre,
                    precio: m.precio,
                    cantidad: m.cantidad,
                    cantidadDevuelta: 0,
                    maxDevolver: m.cantidad
                });
            });
            setMaterialesDevolucion(nuevosMaterialesDev);

            const devCount = (venta.devoluciones?.length || 0) + 1;
            setNotaCreditoNumero(`NC-${venta.numero}-${devCount}`);
            setMotivo('Producto defectuoso');
            setTipoDevolucion('servicios');
        }
    }, [venta, isOpen]);

    const toggleFase = () => {
        setFaseAbierta(!faseAbierta);
    };

    const actualizarCantidadDevuelta = (detalleId: number, cantidad: number, tipo: 'servicio' | 'material') => {
        if (tipo === 'servicio') {
            setProductosDevolucion(prev =>
                prev.map(p =>
                    p.detalleId === detalleId ? { ...p, cantidadDevuelta: Math.min(Math.max(0, cantidad), p.maxDevolver) } : p
                )
            );
        } else {
            setMaterialesDevolucion(prev =>
                prev.map(m =>
                    m.id === detalleId ? { ...m, cantidadDevuelta: Math.min(Math.max(0, cantidad), m.maxDevolver) } : m
                )
            );
        }
    };

    const calcularTotalDevolucion = (): number => {
        const totalProductos = productosDevolucion.reduce((total, p) => total + (p.cantidadDevuelta * p.precio), 0);
        const totalMateriales = materialesDevolucion.reduce((total, m) => total + (m.cantidadDevuelta * m.precio), 0);
        return totalProductos + totalMateriales;
    };

    const procesarDevolucion = async () => {
        if (!venta) return;
        if (!id_empresa) {
            showToast('No se ha seleccionado una empresa', 'warning', 'Advertencia');
            return;
        }

        const productosDevueltos = productosDevolucion.filter(p => p.cantidadDevuelta > 0);
        const materialesDevueltos = materialesDevolucion.filter(m => m.cantidadDevuelta > 0);

        if (productosDevueltos.length === 0 && materialesDevueltos.length === 0) {
            showToast("Seleccione al menos un producto o material", "warning", "Campos incompletos");
            return;
        }

        const userId = user?.id;
        if (!userId) {
            showToast('No se pudo identificar al usuario', 'error', 'Error de autenticación');
            return;
        }

        const montoTotal = calcularTotalDevolucion();

        setIsSubmitting(true);
        try {
            const payload = {
                id_empresa, // ← AGREGADO (el controlador lo espera en el body)
                productos_devueltos: productosDevueltos.map(p => ({
                    id_item: p.detalleId,
                    cantidad: p.cantidadDevuelta
                })),
                materiales_devueltos: materialesDevueltos.map(m => ({
                    id_item: m.id,
                    cantidad: m.cantidadDevuelta
                })),
                motivo,
                nota_credito: notaCreditoNumero,
                usuario_id: userId
            };

            const { cateringServiceApi } = await import('../../../../services/api/cateringServiceApi');
            const resultado = await cateringServiceApi.devolver(venta.id, id_empresa, payload); // ← PASAMOS id_empresa

            await refreshData();

            await addActivity("DEVOLUCIÓN", "ventas", `${venta.numero} - S/ ${montoTotal} - NC: ${notaCreditoNumero}`);
            await addToHistory(venta, "DEVOLUCIÓN", `Monto: S/ ${montoTotal} - Motivo: ${motivo} - NC: ${notaCreditoNumero}`);

            generarPDFNotaCredito(venta as any, {
                fecha: new Date().toLocaleString(),
                productos: productosDevueltos.map(p => ({
                    id: p.id,
                    nombre: p.nombre,
                    precio: p.precio,
                    cantidad: p.cantidadDevuelta
                })),
                monto: montoTotal,
                motivo,
                notaCredito: notaCreditoNumero,
                usuario: user?.nombre_completo || 'Usuario'
            }, montoTotal, notaCreditoNumero);

            showToast(`Devolución procesada. Nota Crédito: ${notaCreditoNumero}`, "success", "Devolución");
            onSuccess();
            onClose();
        } catch (error) {
            console.error('[CateringReturnModal] Error al procesar devolución:', error);
            showToast('Error al procesar la devolución', 'error', 'Error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const totalDevolucion = calcularTotalDevolucion();
    const devolucionesPrevias = venta?.devoluciones || [];

    const modalFooter = (
        <>
            <button className="dc-btn success" onClick={procesarDevolucion} disabled={isSubmitting}>
                {isSubmitting ? 'Procesando...' : 'Procesar Devolución'}
            </button>
        </>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Devolución / Nota de Crédito - Catering" icon="fa-exchange-alt" footer={modalFooter}>
            <div className="dc-info-card">
                <h4><i className="fa fa-info-circle"></i> Información de la Venta</h4>
                <div className="dc-info-grid">
                    <div className="dc-info-item">
                        <div className="dc-info-label">Venta</div>
                        <div className="dc-info-value">{venta?.numero}</div>
                    </div>
                    <div className="dc-info-item">
                        <div className="dc-info-label">Cliente</div>
                        <div className="dc-info-value">{venta?.cliente}</div>
                    </div>
                    <div className="dc-info-item">
                        <div className="dc-info-label">Total actual</div>
                        <div className="dc-info-value">S/ {venta?.total.toFixed(2)}</div>
                    </div>
                </div>
            </div>

            {devolucionesPrevias.length > 0 && (
                <div className="notas-credito">
                    <h4>Devoluciones previas</h4>
                    {devolucionesPrevias.map((d, idx) => (
                        <div key={idx} className="devolucion-card">
                            <small>{d.fecha}</small><br />
                            <strong>NC: {d.notaCredito}</strong><br />
                            Monto: S/ {d.monto.toFixed(2)}<br />
                            Motivo: {d.motivo}<br />
                            Productos: {d.productos?.map((p: any) => `${p.nombre} x${p.cantidad}`).join(', ')}
                            {d.materiales?.map((m: any) => `${m.nombre} x${m.cantidad}`).join(', ')}
                        </div>
                    ))}
                </div>
            )}

            <div className="dc-tabs">
                <button
                    className={`dc-tab-btn ${tipoDevolucion === 'servicios' ? 'active' : ''}`}
                    onClick={() => setTipoDevolucion('servicios')}
                >
                    <i className="fas fa-utensils"></i> Servicios
                </button>
                <button
                    className={`dc-tab-btn ${tipoDevolucion === 'materiales' ? 'active' : ''}`}
                    onClick={() => setTipoDevolucion('materiales')}
                >
                    <i className="fas fa-chair"></i> Materiales
                </button>
            </div>

            {tipoDevolucion === 'servicios' && (
                <div className="fase">
                    <div className="fase-header" onClick={toggleFase}>
                        <span><i className="fas fa-boxes"></i> Seleccione productos a devolver</span>
                        <i className={`fas fa-chevron-${faseAbierta ? 'down' : 'right'}`}></i>
                    </div>
                    {faseAbierta && (
                        <div className="fase-body">
                            {productosDevolucion.length === 0 ? (
                                <div className="empty-servicios">No hay productos en los servicios</div>
                            ) : (
                                productosDevolucion.map(p => (
                                    <div key={p.detalleId} className="detalle-producto-item">
                                        <div><strong className="dc-info-label">{p.nombre}: </strong>S/ {p.precio.toFixed(2)}</div>
                                        <div><strong className="dc-info-label">Stock: </strong>{p.maxDevolver} unidades</div>
                                        <div><strong className="dc-info-label">Valor: </strong>S/ {(p.maxDevolver * p.precio).toFixed(2)}</div>
                                        <div><strong className="dc-info-label">Devolver:</strong>
                                            <input
                                                type="number"
                                                min="0"
                                                max={p.maxDevolver}
                                                value={p.cantidadDevuelta}
                                                onChange={(e) => actualizarCantidadDevuelta(p.detalleId, parseInt(e.target.value) || 0, 'servicio')}
                                                className="cantidad-input"
                                            /> de {p.maxDevolver}
                                        </div>
                                        <div className="producto-devolucion-monto">Monto a devolver: <strong className='dc-eliminar'>S/ {(p.cantidadDevuelta * p.precio).toFixed(2)}</strong></div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            )}

            {tipoDevolucion === 'materiales' && (
                <div className="fase">
                    <div className="fase-header" onClick={toggleFase}>
                        <span><i className="fas fa-chair"></i> Seleccione materiales a devolver</span>
                        <i className={`fas fa-chevron-${faseAbierta ? 'down' : 'right'}`}></i>
                    </div>
                    {faseAbierta && (
                        <div className="fase-body">
                            {materialesDevolucion.length === 0 ? (
                                <div className="empty-servicios">No hay materiales registrados</div>
                            ) : (
                                materialesDevolucion.map(m => (
                                    <div key={m.id} className="detalle-producto-item">
                                        <div><strong className="dc-info-label">{m.nombre}: </strong>S/ {m.precio.toFixed(2)}</div>
                                        <div><strong className="dc-info-label">Stock: {m.maxDevolver} unidades</strong></div>
                                        <div><strong className="dc-info-label">Valor: </strong>S/{(m.maxDevolver * m.precio).toFixed(2)}</div>
                                        <div><strong className="dc-info-label">Devolver: </strong>
                                            <input
                                                type="number"
                                                min="0"
                                                max={m.maxDevolver}
                                                value={m.cantidadDevuelta}
                                                onChange={(e) => actualizarCantidadDevuelta(m.id, parseInt(e.target.value) || 0, 'material')}
                                                className="cantidad-input"
                                            />de {m.maxDevolver}
                                        </div>
                                        <div className="producto-devolucion-monto">Monto a devolver: <strong className='dc-eliminar'>S/{(m.cantidadDevuelta * m.precio).toFixed(2)}</strong></div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            )}

            <div className="resumen-devolucion">
                <div><strong>TOTAL A DEVOLVER:</strong> <strong className="dc-eliminar">S/ {totalDevolucion.toFixed(2)}</strong></div>
                <div className="dc-form-grid notas-credito">
                    <div className="dc-input-group">
                        <label>📝 Motivo:</label>
                        <select value={motivo} onChange={(e) => setMotivo(e.target.value)}>
                            <option value="Producto defectuoso">Producto defectuoso</option>
                            <option value="Producto equivocado">Producto equivocado</option>
                            <option value="Cliente no conforme">Cliente no conforme</option>
                            <option value="Cancelación del evento">Cancelación del evento</option>
                            <option value="Cambio de fechas">Cambio de fechas</option>
                            <option value="Otro">Otro</option>
                        </select>
                    </div>
                    <div className="dc-input-group">
                        <label>📄 Nota de Crédito N°:</label>
                        <input type="text" value={notaCreditoNumero} onChange={(e) => setNotaCreditoNumero(e.target.value)} />
                    </div>
                </div>
            </div>

            <div style={{ marginTop: '1rem', padding: '0.8rem', background: '#d1ecf1', borderRadius: '0.5rem' }}>
                <i className="fas fa-info-circle"></i> Se generará una Nota de Crédito por el monto devuelto.
            </div>
        </Modal>
    );
};