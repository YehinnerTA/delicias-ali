import React, { useState, useEffect } from 'react';
import { Modal } from '../Modal';
import { useVentas } from '../../../../context/SalesContext';
import { useToast } from '../../../../hooks/base/useToast';
import { Venta, ProductoVenta } from '../../../../features/types/sales';

interface AgregarProductosModalProps {
    isOpen: boolean;
    onClose: () => void;
    venta: Venta | null;
    onSuccess: () => void;
}

export const AgregarProductosModal: React.FC<AgregarProductosModalProps> = ({ isOpen, onClose, venta, onSuccess }) => {
    const { ventas, setVentas, catalogoProductos, addActivity, addToHistory } = useVentas();
    const { showToast } = useToast();

    const [nuevosProductos, setNuevosProductos] = useState<ProductoVenta[]>([]);

    useEffect(() => {
        if (isOpen) {
            setNuevosProductos([]);
        }
    }, [isOpen]);

    const agregarProducto = () => {
        const select = document.getElementById('productoSelectAgregar') as HTMLSelectElement;
        const cantidadInput = document.getElementById('cantidadAgregar') as HTMLInputElement;
        if (!select || !cantidadInput) return;

        const prodId = parseInt(select.value);
        const cant = parseInt(cantidadInput.value) || 1;
        const prod = catalogoProductos.find(p => p.id === prodId);
        if (!prod) return;

        if (cant > prod.stock) {
            showToast(`Stock insuficiente. Solo ${prod.stock} unidades`, "error", "Error");
            return;
        }

        const existente = nuevosProductos.find(p => p.id === prodId);
        if (existente) {
            if (existente.cantidad + cant > prod.stock) {
                showToast(`Máximo ${prod.stock - existente.cantidad} más`, "error", "Error");
                return;
            }
            existente.cantidad += cant;
        } else {
            nuevosProductos.push({ id: prod.id, nombre: prod.nombre, precio: prod.precio, cantidad: cant, stock: prod.stock });
        }
        setNuevosProductos([...nuevosProductos]);
        select.value = "";
        cantidadInput.value = "1";
    };

    const eliminarProducto = (idx: number) => {
        nuevosProductos.splice(idx, 1);
        setNuevosProductos([...nuevosProductos]);
    };

    const calcularTotales = () => {
        const subtotal = nuevosProductos.reduce((s, p) => s + p.cantidad * p.precio, 0);
        const igv = subtotal * 0.18;
        const total = subtotal + igv;
        return { subtotal, igv, total };
    };

    const confirmarAgregar = () => {
        if (!venta) return;
        if (nuevosProductos.length === 0) {
            showToast("No hay productos para agregar", "warning", "Campos incompletos");
            return;
        }

        const productosStr = nuevosProductos.map(p => `${p.nombre} x${p.cantidad}`).join(', ');
        const { subtotal, igv, total } = calcularTotales();

        nuevosProductos.forEach(nuevo => {
            const existente = venta.productos.find(p => p.id === nuevo.id);
            if (existente) {
                existente.cantidad += nuevo.cantidad;
            } else {
                venta.productos.push({ ...nuevo });
            }
        });

        venta.subtotal = venta.productos.reduce((s, p) => s + p.cantidad * p.precio, 0);
        venta.igv = venta.subtotal * 0.18;
        venta.total = venta.subtotal + venta.igv;
        venta.estado = "completada";

        addToHistory(venta, "AGREGAR PRODUCTOS", `Se agregaron: ${productosStr}. Nuevo total: S/ ${venta.total}`);
        addActivity("AGREGAR", "ventas", `${venta.numero} - Productos agregados: ${productosStr}`);
        setVentas([...ventas]);
        showToast(`Productos agregados a ${venta.numero}`, "success", "Productos agregados");
        onSuccess();
        onClose();
    };

    const { subtotal, igv, total } = calcularTotales();
    const nuevoTotal = venta ? venta.total + total : 0;

    const modalFooter = (
        <>
            <button className="dc-btn secondary" onClick={onClose}>Cancelar</button>
            <button className="dc-btn success" onClick={confirmarAgregar}>Agregar Productos</button>
        </>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Agregar Productos a Venta" icon="fa-plus-circle" footer={modalFooter}>
            <div className="fase">
                <div className="fase-body">
                    <div className="dc-form-grid">
                        <div className="dc-input-group">
                            <label>Producto</label>
                            <select id="productoSelectAgregar">
                                {catalogoProductos.map(p => (
                                    <option key={p.id} value={p.id}>{p.nombre} - S/ {p.precio} (Stock: {p.stock})</option>
                                ))}
                            </select>
                        </div>
                        <div className="dc-input-group">
                            <label>Cantidad</label>
                            <input type="number" id="cantidadAgregar" defaultValue="1" min="1" />
                        </div>
                        <button className="dc-btn info" onClick={agregarProducto}>
                            <i className="fas fa-plus"></i> Agregar
                        </button>
                    </div>

                    <div className="dc-table-wrapper">
                        <table className="dc-table" >
                            <thead>
                                <tr>
                                    <th>Producto</th>
                                    <th>Cantidad</th>
                                    <th>Precio</th>
                                    <th>Subtotal</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {nuevosProductos.length === 0 ? (
                                    <tr><td colSpan={5} className="text-center">No hay productos para agregar</td></tr>
                                ) : (
                                    nuevosProductos.map((p, idx) => (
                                        <tr key={idx}>
                                            <td>{p.nombre}</td>
                                            <td>{p.cantidad}</td>
                                            <td>S/ {p.precio.toFixed(2)}</td>
                                            <td>S/ {(p.cantidad * p.precio).toFixed(2)}</td>
                                            <td><i className="fas fa-trash dc-eliminar" onClick={() => eliminarProducto(idx)}></i></td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

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

            <div className="dc-info-card">
                <p><strong>Venta actual:</strong> {venta?.numero} - {venta?.cliente}</p>
                <p><strong>Total actual:</strong> S/ {venta?.total.toFixed(2)}</p>
                <p className='total-line total-grande'><strong>Nuevo total:</strong><span>S/ {nuevoTotal.toFixed(2)}</span></p>
            </div>
        </Modal>
    );
};