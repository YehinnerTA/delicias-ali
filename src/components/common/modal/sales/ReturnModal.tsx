import React, { useState, useEffect } from 'react';
import { Modal } from '../Modal';
import { useVentas } from '../../../../context/SalesContext';
import { useAuth } from '../../../../features/auth/context/AuthContext';
import { useCompany } from '../../../../features/company/context/CompanyContext';
import { useToast } from '../../../../hooks/base/useToast';
import { Venta } from '../../../../features/types/sales';
import { generarPDFNotaCredito } from '../../../../services/pdf/pdfService';

const formatLocalDateTime = (isoString: string): string => {
    if (!isoString) return '-';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    const dia = String(date.getDate()).padStart(2, '0');
    const mes = String(date.getMonth() + 1).padStart(2, '0');
    const año = date.getFullYear();
    const horas = String(date.getHours()).padStart(2, '0');
    const minutos = String(date.getMinutes()).padStart(2, '0');
    return `${dia}/${mes}/${año} || ${horas}:${minutos}`;
};

interface DevolucionModalProps {
    isOpen: boolean;
    onClose: () => void;
    venta: Venta | null;
    onSuccess: () => void;
}

interface ProductoAgrupado {
    nombre: string;
    detalles: { detalleId: number; cantidad: number; precio: number }[];
    precioPromedio: number;
    cantidadTotal: number;
    cantidadDevuelta: number;
    maxDevolver: number;
}

export const DevolucionModal: React.FC<DevolucionModalProps> = ({ isOpen, onClose, venta, onSuccess }) => {
    const { addActivity, addToHistory, refreshData } = useVentas();
    const { user } = useAuth();
    const { getSelectedCompanyId } = useCompany();
    const id_empresa = getSelectedCompanyId() ?? 0;
    const { showToast } = useToast();

    const [productosAgrupados, setProductosAgrupados] = useState<ProductoAgrupado[]>([]);
    const [motivo, setMotivo] = useState('Producto defectuoso');
    const [notaCreditoNumero, setNotaCreditoNumero] = useState('');
    const [faseAbierta, setFaseAbierta] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (venta && isOpen) {
            const map = new Map<string, {
                detalles: { detalleId: number; cantidad: number; precio: number }[];
                precios: number[];
                cantidades: number[];
            }>();

            venta.productos.forEach(p => {
                if (!p.detalleId) return;
                const key = p.nombre;
                if (!map.has(key)) {
                    map.set(key, { detalles: [], precios: [], cantidades: [] });
                }
                const grupo = map.get(key)!;
                grupo.detalles.push({ detalleId: p.detalleId, cantidad: p.cantidad, precio: p.precio });
                grupo.precios.push(p.precio);
                grupo.cantidades.push(p.cantidad);
            });

            const agrupados: ProductoAgrupado[] = [];
            map.forEach((value, nombre) => {
                const totalCantidad = value.cantidades.reduce((a, b) => a + b, 0);
                const precioPromedio = value.precios.reduce((a, b) => a + b, 0) / value.precios.length;
                agrupados.push({
                    nombre,
                    detalles: value.detalles,
                    precioPromedio: Math.round(precioPromedio * 100) / 100,
                    cantidadTotal: totalCantidad,
                    cantidadDevuelta: 0,
                    maxDevolver: totalCantidad
                });
            });

            setProductosAgrupados(agrupados);
            const devCount = (venta.devoluciones?.length || 0) + 1;
            setNotaCreditoNumero(`NC-${venta.numero}-${devCount}`);
            setMotivo('Producto defectuoso');
        }
    }, [venta, isOpen]);

    const toggleFase = () => {
        setFaseAbierta(!faseAbierta);
    };

    const actualizarCantidadDevuelta = (index: number, cantidad: number) => {
        setProductosAgrupados(prev =>
            prev.map((p, i) =>
                i === index ? { ...p, cantidadDevuelta: Math.min(cantidad, p.maxDevolver) } : p
            )
        );
    };

    const calcularTotalDevolucion = (): number => {
        return productosAgrupados.reduce((total, p) => total + (p.cantidadDevuelta * p.precioPromedio), 0);
    };

    const procesarDevolucion = async () => {
        if (!venta) return;
        if (!id_empresa) {
            showToast('No se ha seleccionado una empresa', 'warning', 'Advertencia');
            return;
        }

        const productosDevueltos = productosAgrupados.filter(p => p.cantidadDevuelta > 0);
        if (productosDevueltos.length === 0) {
            showToast("Seleccione al menos un producto", "warning", "Campos incompletos");
            return;
        }

        const userId = user?.id;
        if (!userId) {
            showToast('No se pudo identificar al usuario', 'error', 'Error de autenticación');
            return;
        }

        const montoTotal = calcularTotalDevolucion();

        const productosParaAPI: { id_detalle_venta: number; cantidad: number }[] = [];
        productosDevueltos.forEach(grupo => {
            let cantidadRestante = grupo.cantidadDevuelta;
            const detallesOrdenados = [...grupo.detalles].sort((a, b) => b.cantidad - a.cantidad);
            for (const det of detallesOrdenados) {
                if (cantidadRestante <= 0) break;
                const tomar = Math.min(cantidadRestante, det.cantidad);
                productosParaAPI.push({
                    id_detalle_venta: det.detalleId,
                    cantidad: tomar
                });
                cantidadRestante -= tomar;
            }
            if (cantidadRestante > 0) {
                throw new Error(`No hay suficiente stock en los detalles para devolver ${grupo.cantidadDevuelta} de ${grupo.nombre}`);
            }
        });

        setIsSubmitting(true);
        try {
            const payload = {
                productos_devueltos: productosParaAPI,
                motivo,
                nota_credito: notaCreditoNumero,
                usuario_id: userId
            };

            const { ventaApi } = await import('../../../../services/api/ventaApi');
            await ventaApi.devolver(venta.id, id_empresa, payload);

            await refreshData();

            await addActivity("DEVOLUCIÓN", "ventas", `${venta.numero} - S/ ${montoTotal} - NC: ${notaCreditoNumero}`);
            await addToHistory(venta, "DEVOLUCIÓN", `Monto: S/ ${montoTotal} - Motivo: ${motivo} - NC: ${notaCreditoNumero}`);

            generarPDFNotaCredito(venta, {
                fecha: new Date().toLocaleString(),
                productos: productosDevueltos.map(p => ({
                    id: 0,
                    nombre: p.nombre,
                    precio: p.precioPromedio,
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
            console.error('[DevolucionModal] Error al procesar devolución:', error);
            showToast(error instanceof Error ? error.message : 'Error al procesar la devolución', 'error', 'Error');
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
                            <small>{formatLocalDateTime(d.fecha)}</small><br />
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
                    <span><i className="fas fa-user"></i> Seleccione productos a devolver ahora</span>
                    <i className="fas fa-chevron-down"></i>
                </div>

                {faseAbierta && (
                    <div className="fase-body">
                        {productosAgrupados.map((p, idx) => (
                            <div key={idx} className="detalle-producto-item">
                                <div><strong className="dc-info-label">{p.nombre}:</strong> S/ {p.precioPromedio.toFixed(2)}</div>
                                <div><strong className="dc-info-label">{p.maxDevolver} unidades:</strong> S/ {(p.maxDevolver * p.precioPromedio).toFixed(2)}</div>
                                <div><strong className="dc-info-label">Devolver: </strong>
                                    <input
                                        type="number"
                                        min="0"
                                        max={p.maxDevolver}
                                        value={p.cantidadDevuelta}
                                        onChange={(e) => actualizarCantidadDevuelta(idx, parseInt(e.target.value) || 0)}
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