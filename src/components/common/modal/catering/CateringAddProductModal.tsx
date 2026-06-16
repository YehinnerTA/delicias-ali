import React, { useState, useEffect } from 'react';
import { Modal } from '../Modal';
import { useCateringSales } from '../../../../context/CateringContext';
import { useToast } from '../../../../hooks/base/useToast';
import { VentaCatering, ServicioCatering, MaterialVenta, CANTIDAD_MINIMA_PRODUCTOS, SERVICIOS_DISPONIBLES, CATALOGO_MATERIALES } from '../../../../features/types/catering';

interface CateringAddProductsModalProps {
    isOpen: boolean;
    onClose: () => void;
    venta: VentaCatering | null;
    onSuccess: () => void;
}

// Tipo para productos temporales a agregar
interface ProductoTemporal {
    id: number;
    nombre: string;
    precio: number;
    cantidad: number;
    tipo: 'servicio' | 'material';
    servicioId?: number;
    servicioTipoKey?: string;
}

export const CateringAddProductsModal: React.FC<CateringAddProductsModalProps> = ({ isOpen, onClose, venta, onSuccess }) => {
    const { ventas, setVentas, serviciosDisponibles, catalogoMateriales, addActivity, addToHistory } = useCateringSales();
    const { showToast } = useToast();

    const [nuevosServicios, setNuevosServicios] = useState<ServicioCatering[]>([]);
    const [nuevosMateriales, setNuevosMateriales] = useState<MaterialVenta[]>([]);
    const [tipoAgregar, setTipoAgregar] = useState<'servicio' | 'material'>('servicio');

    useEffect(() => {
        if (isOpen) {
            setNuevosServicios([]);
            setNuevosMateriales([]);
            setTipoAgregar('servicio');
        }
    }, [isOpen]);

    // ============ AGREGAR SERVICIO COMPLETO ============
    const agregarNuevoServicio = () => {
        const select = document.getElementById('nuevoServicioSelectAgregar') as HTMLSelectElement;
        const tipoKey = select.value;
        const servicioInfo = serviciosDisponibles[tipoKey];
        if (!servicioInfo) return;

        const nuevoServicio: ServicioCatering = {
            id: Date.now(),
            tipoKey: tipoKey,
            tipoNombre: servicioInfo.nombre,
            productos: []
        };
        setNuevosServicios([...nuevosServicios, nuevoServicio]);
        showToast(`Servicio "${servicioInfo.nombre}" agregado`, "success");
        select.value = "";
    };

    const eliminarServicio = (servicioId: number) => {
        setNuevosServicios(nuevosServicios.filter(s => s.id !== servicioId));
        showToast("Servicio eliminado", "info");
    };

    // ============ AGREGAR PRODUCTO A SERVICIO ============
    const agregarProductoAServicio = (servicioId: number) => {
        const servicio = nuevosServicios.find(s => s.id === servicioId);
        if (!servicio) return;

        const select = document.getElementById(`select-prod-agregar-${servicioId}`) as HTMLSelectElement;
        const cantidadInput = document.getElementById(`cant-prod-agregar-${servicioId}`) as HTMLInputElement;
        if (!select || !cantidadInput) return;

        const prodId = parseInt(select.value);
        let cantidad = parseInt(cantidadInput.value) || 1;

        if (cantidad < CANTIDAD_MINIMA_PRODUCTOS) {
            showToast(`⚠️ Cantidad mínima ${CANTIDAD_MINIMA_PRODUCTOS}`, "warning");
            return;
        }

        const catalogoServ = serviciosDisponibles[servicio.tipoKey];
        const producto = catalogoServ.carta.find(p => p.id === prodId);
        if (!producto) return;

        const existente = servicio.productos.find(p => p.id === producto.id);
        if (existente) {
            existente.cantidad += cantidad;
        } else {
            servicio.productos.push({ ...producto, cantidad: cantidad });
        }
        setNuevosServicios([...nuevosServicios]);
        select.value = "";
        cantidadInput.value = CANTIDAD_MINIMA_PRODUCTOS.toString();
    };

    const eliminarProductoDeServicio = (servicioId: number, prodIndex: number) => {
        const servicio = nuevosServicios.find(s => s.id === servicioId);
        if (servicio) {
            servicio.productos.splice(prodIndex, 1);
            setNuevosServicios([...nuevosServicios]);
        }
    };

    const actualizarCantProdServicio = (servicioId: number, prodIndex: number, nuevaCant: string) => {
        let cantidad = parseInt(nuevaCant) || 1;
        if (cantidad < CANTIDAD_MINIMA_PRODUCTOS) {
            showToast(`⚠️ Cantidad mínima ${CANTIDAD_MINIMA_PRODUCTOS}`, "warning");
            cantidad = CANTIDAD_MINIMA_PRODUCTOS;
        }
        const servicio = nuevosServicios.find(s => s.id === servicioId);
        if (servicio && servicio.productos[prodIndex]) {
            servicio.productos[prodIndex].cantidad = cantidad;
            setNuevosServicios([...nuevosServicios]);
        }
    };

    const actualizarPrecioProducto = (servicioId: number, prodIndex: number, nuevoPrecio: string) => {
        const precio = parseFloat(nuevoPrecio) || 0;
        const servicio = nuevosServicios.find(s => s.id === servicioId);
        if (servicio && servicio.productos[prodIndex]) {
            servicio.productos[prodIndex].precio = precio;
            setNuevosServicios([...nuevosServicios]);
        }
    };

    // ============ AGREGAR MATERIALES ============
    const agregarMaterial = () => {
        const select = document.getElementById('materialSelectAgregar') as HTMLSelectElement;
        const cantidadInput = document.getElementById('cantidadMaterialAgregar') as HTMLInputElement;
        if (!select || !cantidadInput) return;

        const matId = parseInt(select.value);
        const cantidad = parseInt(cantidadInput.value) || 1;
        const material = catalogoMateriales.find(m => m.id === matId);
        if (!material) return;

        const existente = nuevosMateriales.find(m => m.id === material.id);
        if (existente) {
            existente.cantidad += cantidad;
        } else {
            nuevosMateriales.push({ ...material, cantidad });
        }
        setNuevosMateriales([...nuevosMateriales]);
        select.value = "";
        cantidadInput.value = "1";
    };

    const eliminarMaterial = (idx: number) => {
        nuevosMateriales.splice(idx, 1);
        setNuevosMateriales([...nuevosMateriales]);
    };

    const actualizarCantMaterial = (idx: number, val: string) => {
        const cantidad = parseInt(val) || 1;
        nuevosMateriales[idx].cantidad = cantidad;
        setNuevosMateriales([...nuevosMateriales]);
    };

    const actualizarPrecioMaterial = (idx: number, nuevoPrecio: string) => {
        const precio = parseFloat(nuevoPrecio) || 0;
        nuevosMateriales[idx].precio = precio;
        setNuevosMateriales([...nuevosMateriales]);
    };

    // ============ CÁLCULO DE TOTALES ============
    const calcularTotales = () => {
        let subtotalServicios = nuevosServicios.reduce((s, serv) =>
            s + serv.productos.reduce((sum, p) => sum + p.cantidad * p.precio, 0), 0);
        let subtotalMateriales = nuevosMateriales.reduce((s, m) => s + m.cantidad * m.precio, 0);
        let subtotal = subtotalServicios + subtotalMateriales;
        const igv = subtotal * 0.18;
        const total = subtotal + igv;
        return { subtotal, igv, total };
    };

    // ============ CONFIRMAR AGREGAR ============
    const confirmarAgregar = () => {
        if (!venta) return;
        if (nuevosServicios.length === 0 && nuevosMateriales.length === 0) {
            showToast("No hay servicios o materiales para agregar", "warning", "Campos incompletos");
            return;
        }

        // Contar productos para el historial
        const totalProductos = nuevosServicios.reduce((count, s) => count + s.productos.length, 0);
        const totalMateriales = nuevosMateriales.length;
        const resumen = `${nuevosServicios.length} servicio(s) (${totalProductos} producto(s)), ${totalMateriales} material(es)`;

        // Agregar nuevos servicios
        nuevosServicios.forEach(nuevoServicio => {
            venta.servicios.push(nuevoServicio);
        });

        // Agregar nuevos materiales
        nuevosMateriales.forEach(nuevoMaterial => {
            const existente = venta.materiales.find(m => m.id === nuevoMaterial.id);
            if (existente) {
                existente.cantidad += nuevoMaterial.cantidad;
            } else {
                venta.materiales.push({ ...nuevoMaterial });
            }
        });

        // Recalcular totales
        venta.subtotal = venta.servicios.reduce((s, serv) =>
            s + serv.productos.reduce((sum, p) => sum + p.cantidad * p.precio, 0), 0)
            + venta.materiales.reduce((s, m) => s + m.cantidad * m.precio, 0);
        venta.igv = venta.subtotal * 0.18;
        venta.total = venta.subtotal + venta.igv;
        venta.estado = "completada";

        addToHistory(venta, "AGREGAR PRODUCTOS", `Se agregaron: ${resumen}. Nuevo total: S/ ${venta.total}`);
        addActivity("AGREGAR", "ventas", `${venta.numero} - Productos agregados: ${resumen}`);
        setVentas([...ventas]);
        showToast(`Servicios y materiales agregados a ${venta.numero}`, "success", "Agregado exitoso");
        onSuccess();
        onClose();
    };

    const { subtotal, igv, total } = calcularTotales();
    const nuevoTotal = venta ? venta.total + total : 0;

    // ============ RENDERIZAR SERVICIOS TEMPORALES ============
    const renderServicios = () => {
        if (nuevosServicios.length === 0) {
            return <div className="empty-servicios">No hay servicios agregados.</div>;
        }

        return nuevosServicios.map(serv => {
            const catalogoServ = serviciosDisponibles[serv.tipoKey];

            const productosHtml = serv.productos.map((p, idx) => (
                <tr key={idx}>
                    <td>{p.nombre}</td>
                    <td>
                        <input
                            type="number"
                            value={p.cantidad}
                            className="cantidad-input"
                            min={CANTIDAD_MINIMA_PRODUCTOS}
                            onChange={(e) => actualizarCantProdServicio(serv.id, idx, e.target.value)}
                        />
                        <span className="cantidad-minima">(mín. {CANTIDAD_MINIMA_PRODUCTOS})</span>
                    </td>
                    <td>
                        <input
                            type="number"
                            className="cantidad-input"
                            value={p.precio}
                            step="0.01"
                            onChange={(e) => actualizarPrecioProducto(serv.id, idx, e.target.value)}
                        />
                    </td>
                    <td>S/ {(p.cantidad * p.precio).toFixed(2)}</td>
                    <td>
                        <i className="fas fa-trash dc-eliminar" onClick={() => eliminarProductoDeServicio(serv.id, idx)}></i>
                    </td>
                </tr>
            ));

            return (
                <div key={serv.id} className="dc-container">
                    <div className="service-divider">
                        <div className="service-label-header">
                            <span className="service-name">{serv.tipoNombre}</span>
                            <button className="dc-btn-default dc-eliminar" onClick={() => eliminarServicio(serv.id)}>
                                <i className="fas fa-trash-alt"></i>
                            </button>
                        </div>
                    </div>
                    <div className="service-body">
                        <div className="dc-form-grid">
                            <div className="dc-input-group">
                                <label>Producto</label>
                                <select id={`select-prod-agregar-${serv.id}`}>
                                    <option value="">Seleccionar producto</option>
                                    {catalogoServ.carta.map(p => (
                                        <option key={p.id} value={p.id}>{p.nombre} - S/ {p.precio}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="dc-input-group">
                                <label>Cantidad</label>
                                <input type="number" id={`cant-prod-agregar-${serv.id}`} defaultValue={CANTIDAD_MINIMA_PRODUCTOS} min={CANTIDAD_MINIMA_PRODUCTOS} />
                            </div>
                            <button className="dc-btn info" onClick={() => agregarProductoAServicio(serv.id)}>
                                <i className="fas fa-plus"></i> Agregar producto
                            </button>
                        </div>
                        <div className="dc-table-wrapper">
                            <table className="dc-table">
                                <thead>
                                    <tr>
                                        <th>Producto</th>
                                        <th>Cantidad</th>
                                        <th>Precio Unit.</th>
                                        <th>Subtotal</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {productosHtml.length > 0 ? productosHtml : (
                                        <tr><td colSpan={5} className="text-center">Sin productos aún</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            );
        });
    };

    // ============ RENDERIZAR MATERIALES TEMPORALES ============
    const renderMateriales = () => {
        if (nuevosMateriales.length === 0) {
            return <div className="empty-servicios">No hay materiales agregados.</div>;
        }

        return (
            <div className="dc-table-wrapper">
                <table className="dc-table">
                    <thead>
                        <tr>
                            <th>Material</th>
                            <th>Cantidad</th>
                            <th>Precio Unit.</th>
                            <th>Subtotal</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {nuevosMateriales.map((m, idx) => (
                            <tr key={idx}>
                                <td>{m.nombre}</td>
                                <td>
                                    <input
                                        type="number"
                                        value={m.cantidad}
                                        className="cantidad-input"
                                        onChange={(e) => actualizarCantMaterial(idx, e.target.value)}
                                    />
                                </td>
                                <td>
                                    <input
                                        type="number"
                                        className="cantidad-input"
                                        value={m.precio}
                                        step="0.01"
                                        onChange={(e) => actualizarPrecioMaterial(idx, e.target.value)}
                                    />
                                </td>
                                <td>S/ {(m.cantidad * m.precio).toFixed(2)}</td>
                                <td>
                                    <i className="fas fa-trash dc-eliminar" onClick={() => eliminarMaterial(idx)}></i>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    const modalFooter = (
        <>
            <button className="dc-btn secondary" onClick={onClose}>Cancelar</button>
            <button className="dc-btn success" onClick={confirmarAgregar}>Agregar Servicios/Materiales</button>
        </>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Agregar Servicios y Materiales a Venta" icon="fa-plus-circle" footer={modalFooter}>
            {/* Selector de tipo de agregado */}
            <div className="dc-tabs">
                <button
                    className={`dc-tab-btn ${tipoAgregar === 'servicio' ? 'active' : ''}`}
                    onClick={() => setTipoAgregar('servicio')}
                >
                    <i className="fas fa-utensils"></i> Servicios de Catering
                </button>
                <button
                    className={`dc-tab-btn ${tipoAgregar === 'material' ? 'active' : ''}`}
                    onClick={() => setTipoAgregar('material')}
                >
                    <i className="fas fa-chair"></i> Materiales
                </button>
            </div>

            {/* Panel de Servicios */}
            {tipoAgregar === 'servicio' && (
                <div className="fase">
                    <div className="fase-body">
                        <div className="dc-form-grid">
                            <div className="dc-input-group">
                                <label>Servicio</label>
                                <select id="nuevoServicioSelectAgregar">
                                    <option value="">Seleccionar servicio</option>
                                    {Object.keys(serviciosDisponibles).map(key => (
                                        <option key={key} value={key}>{serviciosDisponibles[key].nombre}</option>
                                    ))}
                                </select>
                            </div>
                            <button className="dc-btn info" onClick={agregarNuevoServicio}>
                                <i className="fas fa-plus"></i> Agregar Servicio
                            </button>
                        </div>
                        <div id="serviciosContainerAgregar">
                            {renderServicios()}
                        </div>
                    </div>
                </div>
            )}

            {/* Panel de Materiales */}
            {tipoAgregar === 'material' && (
                <div className="fase">
                    <div className="fase-body">
                        <div className="dc-form-grid">
                            <div className="dc-input-group">
                                <label>Material</label>
                                <select id="materialSelectAgregar">
                                    <option value="">Seleccionar material</option>
                                    {catalogoMateriales.map(m => (
                                        <option key={m.id} value={m.id}>{m.nombre} - S/ {m.precio}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="dc-input-group">
                                <label>Cantidad</label>
                                <input type="number" id="cantidadMaterialAgregar" defaultValue="1" min="1" />
                            </div>
                            <button className="dc-btn info" onClick={agregarMaterial}>
                                <i className="fas fa-plus"></i> Agregar Material
                            </button>
                        </div>
                        <div id="materialesContainerAgregar">
                            {renderMateriales()}
                        </div>
                    </div>
                </div>
            )}

            {/* Totales de lo que se va a agregar */}
            <div className="totales">
                <div className="total-line">
                    Subtotal a agregar: <span>S/ {subtotal.toFixed(2)}</span>
                </div>
                <div className="total-line">
                    IGV (18%): <span>S/ {igv.toFixed(2)}</span>
                </div>
                <div className="total-line total-grande">
                    Total adicional: <span>S/ {total.toFixed(2)}</span>
                </div>
            </div>

            {/* Información de la venta actual */}
            <div className="dc-info-card">
                <p><strong>Venta actual:</strong> {venta?.numero} - {venta?.cliente}</p>
                <p><strong>Total actual:</strong> S/ {venta?.total.toFixed(2)}</p>
                <p className="total-line total-grande">
                    <strong>Nuevo total:</strong>
                    <span>S/ {nuevoTotal.toFixed(2)}</span>
                </p>
            </div>
        </Modal>
    );
};