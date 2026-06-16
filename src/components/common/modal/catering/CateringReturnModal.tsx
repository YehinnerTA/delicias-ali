import React, { useState, useEffect } from 'react';
import { Modal } from '../Modal';
import { useCateringSales } from '../../../../context/CateringContext';
import { useToast } from '../../../../hooks/base/useToast';
import { VentaCatering, ServicioCatering, MaterialVenta } from '../../../../features/types/catering';
import { generarPDFNotaCredito } from '../../../../services/pdf/pdfService';

interface CateringReturnModalProps {
    isOpen: boolean;
    onClose: () => void;
    venta: VentaCatering | null;
    onSuccess: () => void;
}

interface ProductoDevolucion {
    id: number;
    nombre: string;
    precio: number;
    cantidad: number;
    cantidadDevuelta: number;
    maxDevolver: number;
    tipo: 'servicio' | 'material';
    servicioId?: number;
    servicioNombre?: string;
}

interface ServicioDevolucion {
    servicioId: number;
    servicioNombre: string;
    productos: ProductoDevolucion[];
}

export const CateringReturnModal: React.FC<CateringReturnModalProps> = ({ isOpen, onClose, venta, onSuccess }) => {
    const { ventas, setVentas, addActivity, addToHistory } = useCateringSales();
    const { showToast } = useToast();

    const [productosDevolucion, setProductosDevolucion] = useState<ProductoDevolucion[]>([]);
    const [materialesDevolucion, setMaterialesDevolucion] = useState<ProductoDevolucion[]>([]);
    const [motivo, setMotivo] = useState('Producto defectuoso');
    const [notaCreditoNumero, setNotaCreditoNumero] = useState('');
    const [faseAbierta, setFaseAbierta] = useState(true);
    const [tipoDevolucion, setTipoDevolucion] = useState<'servicios' | 'materiales'>('servicios');

    useEffect(() => {
        if (venta && isOpen) {
            // Inicializar productos de servicios
            const nuevosProductosDev: ProductoDevolucion[] = [];
            venta.servicios?.forEach(serv => {
                serv.productos.forEach(p => {
                    nuevosProductosDev.push({
                        id: p.id,
                        nombre: p.nombre,
                        precio: p.precio,
                        cantidad: p.cantidad,
                        cantidadDevuelta: 0,
                        maxDevolver: p.cantidad,
                        tipo: 'servicio',
                        servicioId: serv.id,
                        servicioNombre: serv.tipoNombre
                    });
                });
            });
            setProductosDevolucion(nuevosProductosDev);

            // Inicializar materiales
            const nuevosMaterialesDev: ProductoDevolucion[] = [];
            venta.materiales?.forEach(m => {
                nuevosMaterialesDev.push({
                    id: m.id,
                    nombre: m.nombre,
                    precio: m.precio,
                    cantidad: m.cantidad,
                    cantidadDevuelta: 0,
                    maxDevolver: m.cantidad,
                    tipo: 'material'
                });
            });
            setMaterialesDevolucion(nuevosMaterialesDev);

            setNotaCreditoNumero(`NC-${venta.numero}-${(venta.devoluciones?.length || 0) + 1}`);
            setMotivo('Producto defectuoso');
            setTipoDevolucion('servicios');
        }
    }, [venta, isOpen]);

    const toggleFase = () => {
        setFaseAbierta(!faseAbierta);
    };

    const actualizarCantidadDevuelta = (id: number, cantidad: number, tipo: 'servicio' | 'material') => {
        if (tipo === 'servicio') {
            setProductosDevolucion(prev =>
                prev.map(p =>
                    p.id === id ? { ...p, cantidadDevuelta: Math.min(cantidad, p.maxDevolver) } : p
                )
            );
        } else {
            setMaterialesDevolucion(prev =>
                prev.map(m =>
                    m.id === id ? { ...m, cantidadDevuelta: Math.min(cantidad, m.maxDevolver) } : m
                )
            );
        }
    };

    const calcularTotalDevolucion = (): number => {
        const totalProductos = productosDevolucion.reduce((total, p) => total + (p.cantidadDevuelta * p.precio), 0);
        const totalMateriales = materialesDevolucion.reduce((total, m) => total + (m.cantidadDevuelta * m.precio), 0);
        return totalProductos + totalMateriales;
    };

    const procesarDevolucion = () => {
        if (!venta) return;

        const productosDevueltos = productosDevolucion.filter(p => p.cantidadDevuelta > 0);
        const materialesDevueltos = materialesDevolucion.filter(m => m.cantidadDevuelta > 0);

        if (productosDevueltos.length === 0 && materialesDevueltos.length === 0) {
            showToast("Seleccione al menos un producto o material", "warning", "Campos incompletos");
            return;
        }

        const montoTotal = calcularTotalDevolucion();

        // Crear la devolución
        const nuevaDevolucion = {
            fecha: new Date().toLocaleString(),
            productos: productosDevueltos.map(p => ({
                id: p.id,
                nombre: p.nombre,
                precio: p.precio,
                cantidad: p.cantidadDevuelta,
                servicioId: p.servicioId,
                servicioNombre: p.servicioNombre
            })),
            materiales: materialesDevueltos.map(m => ({
                id: m.id,
                nombre: m.nombre,
                precio: m.precio,
                cantidad: m.cantidadDevuelta
            })),
            monto: montoTotal,
            motivo,
            notaCredito: notaCreditoNumero,
            usuario: "Ana Martínez"
        };

        if (!venta.devoluciones) venta.devoluciones = [];
        venta.devoluciones.push(nuevaDevolucion);

        // Actualizar stock de productos en servicios
        venta.servicios = venta.servicios.map(serv => {
            const nuevosProductos = serv.productos.map(p => {
                const devuelto = productosDevueltos.find(d => d.id === p.id && d.servicioId === serv.id);
                if (devuelto) {
                    return { ...p, cantidad: p.cantidad - devuelto.cantidadDevuelta };
                }
                return p;
            }).filter(p => p.cantidad > 0);
            return { ...serv, productos: nuevosProductos };
        }).filter(serv => serv.productos.length > 0);

        // Actualizar materiales
        venta.materiales = venta.materiales.map(m => {
            const devuelto = materialesDevueltos.find(d => d.id === m.id);
            if (devuelto) {
                return { ...m, cantidad: m.cantidad - devuelto.cantidadDevuelta };
            }
            return m;
        }).filter(m => m.cantidad > 0);

        // Actualizar estado de la venta
        if (venta.servicios.length === 0 && venta.materiales.length === 0) {
            venta.estado = "devolucion-total";
        } else {
            venta.estado = "devolucion-parcial";
        }

        // Recalcular totales
        venta.subtotal = venta.servicios.reduce((s, serv) =>
            s + serv.productos.reduce((sum, p) => sum + p.cantidad * p.precio, 0), 0)
            + venta.materiales.reduce((s, m) => s + m.cantidad * m.precio, 0);
        venta.igv = venta.subtotal * 0.18;
        venta.total = venta.subtotal + venta.igv;

        addToHistory(venta, "DEVOLUCIÓN", `Monto: S/ ${montoTotal} - Motivo: ${motivo} - NC: ${notaCreditoNumero}`);
        addActivity("DEVOLUCIÓN", "ventas", `${venta.numero} - S/ ${montoTotal} - NC: ${notaCreditoNumero}`);
        generarPDFNotaCredito(venta as any, nuevaDevolucion as any, montoTotal, notaCreditoNumero);
        setVentas([...ventas]);
        showToast(`Devolución procesada. Nota Crédito: ${notaCreditoNumero}`, "success", "Devolución");
        onSuccess();
        onClose();
    };

    const totalDevolucion = calcularTotalDevolucion();
    const devolucionesPrevias = venta?.devoluciones || [];

    // Agrupar productos por servicio para mejor visualización
    const productosPorServicio: ServicioDevolucion[] = [];
    productosDevolucion.forEach(p => {
        if (p.servicioId) {
            let grupo = productosPorServicio.find(g => g.servicioId === p.servicioId);
            if (!grupo) {
                grupo = {
                    servicioId: p.servicioId,
                    servicioNombre: p.servicioNombre || 'Servicio',
                    productos: []
                };
                productosPorServicio.push(grupo);
            }
            grupo.productos.push(p);
        }
    });

    const modalFooter = (
        <>
            <button className="dc-btn secondary" onClick={onClose}>Cancelar</button>
            <button className="dc-btn success" onClick={procesarDevolucion}>Procesar Devolución</button>
        </>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Devolución / Nota de Crédito - Catering" icon="fa-exchange-alt" footer={modalFooter}>
            {/* Información de la Venta */}
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
                        <div className="dc-info-value">
                            S/ {venta?.total.toFixed(2)}
                        </div>
                    </div>
                </div>
            </div>

            {/* Devoluciones previas */}
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

            {/* Tabs para seleccionar tipo de devolución */}
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

            {/* Panel de Servicios */}
            {tipoDevolucion === 'servicios' && (
                <div className="fase">
                    <div className="fase-header" onClick={toggleFase}>
                        <span><i className="fas fa-boxes"></i> Seleccione productos a devolver</span>
                        <i className={`fas fa-chevron-${faseAbierta ? 'down' : 'right'}`}></i>
                    </div>

                    {faseAbierta && (
                        <div className="fase-body">
                            {productosPorServicio.length === 0 ? (
                                <div className="empty-servicios">No hay productos en los servicios</div>
                            ) : (
                                productosPorServicio.map(grupo => (
                                    <div key={grupo.servicioId} className="servicio-card">
                                        <div className="service-divider">
                                            <strong className="service-name">{grupo.servicioNombre}</strong>
                                        </div>
                                        {grupo.productos.map(p => (
                                            <div key={p.id} className="detalle-producto-item">
                                                <div><strong className="dc-info-label">{p.nombre}: </strong>S/ {p.precio.toFixed(2)}</div>
                                                <div><strong className="dc-info-label">Stock: </strong>{p.maxDevolver} unidades</div>
                                                <div><strong className="dc-info-label">Valor: </strong>S/ {(p.maxDevolver * p.precio).toFixed(2)}</div>
                                                <div><strong className="dc-info-label">Devolver:</strong>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max={p.maxDevolver}
                                                        value={p.cantidadDevuelta}
                                                        onChange={(e) => actualizarCantidadDevuelta(p.id, parseInt(e.target.value) || 0, 'servicio')}
                                                        className="cantidad-input"
                                                    /> de {p.maxDevolver}
                                                </div>
                                                <div className="producto-devolucion-monto">Monto a devolver: <strong className='dc-eliminar'>S/ {(p.cantidadDevuelta * p.precio).toFixed(2)}</strong></div>
                                            </div>
                                        ))}
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Panel de Materiales */}
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

            {/* Resumen de devolución */}
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