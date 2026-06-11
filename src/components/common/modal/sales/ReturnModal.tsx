import React, { useState, useEffect } from 'react';
import { Modal } from '../Modal';
import { useVentas } from '../../../../context/SalesContext';
import { useToast } from '../../../../hooks/base/useToast';
import { Venta, ProductoVenta, Devolucion } from '../../../../features/types/sales';
import { generarPDFNotaCredito } from '../../../../services/pdf/pdfService';

interface DevolucionModalProps {
    isOpen: boolean;
    onClose: () => void;
    venta: Venta | null;
    onSuccess: () => void;
}

interface ProductoDevolucion {
    id: number;
    nombre: string;
    precio: number;
    cantidad: number;
    cantidadDevuelta: number;
    maxDevolver: number;
}

export const DevolucionModal: React.FC<DevolucionModalProps> = ({ isOpen, onClose, venta, onSuccess }) => {
    const { ventas, setVentas, addActivity, addToHistory } = useVentas();
    const { showToast } = useToast();

    const [productosDevolucion, setProductosDevolucion] = useState<ProductoDevolucion[]>([]);
    const [motivo, setMotivo] = useState('Producto defectuoso');
    const [notaCreditoNumero, setNotaCreditoNumero] = useState('');
    const [faseAbierta, setFaseAbierta] = useState(true);

    useEffect(() => {
        if (venta && isOpen) {
            setProductosDevolucion(
                venta.productos.map(p => ({
                    ...p,
                    cantidadDevuelta: 0,
                    maxDevolver: p.cantidad
                }))
            );
            setNotaCreditoNumero(`NC-${venta.numero}-${(venta.devoluciones?.length || 0) + 1}`);
            setMotivo('Producto defectuoso');
        }
    }, [venta, isOpen]);

    const toggleFase = () => {
        setFaseAbierta(!faseAbierta);
    };

    const actualizarCantidadDevuelta = (id: number, cantidad: number) => {
        setProductosDevolucion(prev =>
            prev.map(p =>
                p.id === id ? { ...p, cantidadDevuelta: Math.min(cantidad, p.maxDevolver) } : p
            )
        );
    };

    const calcularTotalDevolucion = (): number => {
        return productosDevolucion.reduce((total, p) => total + (p.cantidadDevuelta * p.precio), 0);
    };

    const procesarDevolucion = () => {
        if (!venta) return;

        const productosDevueltos = productosDevolucion.filter(p => p.cantidadDevuelta > 0);
        if (productosDevueltos.length === 0) {
            showToast("Seleccione al menos un producto", "warning", "Campos incompletos");
            return;
        }

        const montoTotal = calcularTotalDevolucion();
        const nuevaDevolucion: Devolucion = {
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
            usuario: "Ana Martínez"
        };

        if (!venta.devoluciones) venta.devoluciones = [];
        venta.devoluciones.push(nuevaDevolucion);

        // Actualizar stock de productos
        venta.productos = venta.productos.map(p => {
            const devuelto = productosDevueltos.find(d => d.id === p.id);
            if (devuelto) {
                return { ...p, cantidad: p.cantidad - devuelto.cantidadDevuelta };
            }
            return p;
        }).filter(p => p.cantidad > 0);

        // Actualizar estado de la venta
        if (venta.productos.length === 0) {
            venta.estado = "devolucion-total";
        } else {
            venta.estado = "devolucion-parcial";
        }

        // Recalcular totales
        venta.subtotal = venta.productos.reduce((s, p) => s + p.cantidad * p.precio, 0);
        venta.igv = venta.subtotal * 0.18;
        venta.total = venta.subtotal + venta.igv;

        addToHistory(venta, "DEVOLUCIÓN", `Monto: S/ ${montoTotal} - Motivo: ${motivo} - NC: ${notaCreditoNumero}`);
        addActivity("DEVOLUCIÓN", "ventas", `${venta.numero} - S/ ${montoTotal} - NC: ${notaCreditoNumero}`);
        generarPDFNotaCredito(venta, nuevaDevolucion, montoTotal, notaCreditoNumero);
        setVentas([...ventas]);
        showToast(`Devolución procesada. Nota Crédito: ${notaCreditoNumero}`, "success", "Devolución");
        onSuccess();
        onClose();
    };

    const totalDevolucion = calcularTotalDevolucion();
    const devolucionesPrevias = venta?.devoluciones || [];

    const modalFooter = (
        <>
            <button className="dc-btn secondary" onClick={onClose}>Cancelar</button>
            <button className="dc-btn success" onClick={procesarDevolucion}>Procesar Devolución</button>
        </>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Devolución / Nota de Crédito" icon="fa-exchange-alt" footer={modalFooter}>
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
                            Productos: {d.productos.map(p => `${p.nombre} x${p.cantidad}`).join(', ')}
                        </div>
                    ))}
                </div>
            )}

            <div className="fase">
                <div className="fase-header" onClick={toggleFase}>
                    <span><i className="fas fa-user"></i>Seleccione productos a devolver ahora</span>
                    <i className="fas fa-chevron-down"></i>
                </div>

                {faseAbierta && (
                    <div className="fase-body">
                        {productosDevolucion.map(p => (
                            <div key={p.id} className="detalle-producto-item">
                                <div><strong className="dc-info-label">{p.nombre}:</strong> S/ {p.precio.toFixed(2)}</div>
                                <div><strong className="dc-info-label">{p.maxDevolver} unidades:</strong> S/ {(p.maxDevolver * p.precio).toFixed(2)}</div>
                                <div><strong className="dc-info-label">Devolver: </strong>
                                    <input
                                        type="number"
                                        min="0"
                                        max={p.maxDevolver}
                                        value={p.cantidadDevuelta}
                                        onChange={(e) => actualizarCantidadDevuelta(p.id, parseInt(e.target.value) || 0)}
                                        className="cantidad-input"
                                    /> de {p.maxDevolver}
                                </div>
                            </div>
                        ))}

                        <div className="resumen-devolucion">
                            <div><strong>TOTAL A DEVOLVER:</strong> <strong className="dc-eliminar">S/ {totalDevolucion.toFixed(2)}</strong></div>
                            <div className="dc-form-grid notas-credito">
                                <div className="dc-input-group">
                                    <label>📝 Motivo:</label>
                                    <select value={motivo} onChange={(e) => setMotivo(e.target.value)}>
                                        <option value="Producto defectuoso">Producto defectuoso</option>
                                        <option value="Producto equivocado">Producto equivocado</option>
                                        <option value="Cliente no conforme">Cliente no conforme</option>
                                        <option value="Otro">Otro</option>
                                    </select>
                                </div>
                                <div className="dc-input-group">
                                    <label>📄 Nota de Crédito N°:</label>
                                    <input type="text" value={notaCreditoNumero} onChange={(e) => setNotaCreditoNumero(e.target.value)} />
                                </div>
                            </div>
                        </div>
                    </div>
                )}


                <div style={{ marginTop: '1rem', padding: '0.8rem', background: '#d1ecf1', borderRadius: '0.5rem' }}>
                    <i className="fas fa-info-circle"></i> Se generará una Nota de Crédito por el monto devuelto.
                </div>
            </div>
        </Modal>
    );
};