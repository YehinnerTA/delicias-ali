import React, { useState, useEffect } from 'react';
import { Modal } from '../Modal';
import { useVentas } from '../../../../context/SalesContext';
import { useToast } from '../../../../hooks/base/useToast';
import { Venta, ProductoVenta } from '../../../../features/types/sales';

interface ModifySalesModalProps {
    isOpen: boolean;
    onClose: () => void;
    venta: Venta | null;
    onSuccess: () => void;
}

export const ModifySalesModal: React.FC<ModifySalesModalProps> = ({ isOpen, onClose, venta, onSuccess }) => {
    const { ventas, setVentas, catalogoProductos, addActivity, addToHistory } = useVentas();
    const { showToast } = useToast();

    const [productos, setProductos] = useState<ProductoVenta[]>([]);
    const [clienteNombre, setClienteNombre] = useState('');
    const [clienteDoc, setClienteDoc] = useState('');
    const [fasesAbiertas, setFasesAbiertas] = useState<{ [key: number]: boolean }>({ 1: true, 2: false });

    useEffect(() => {
        if (venta) {
            setProductos(JSON.parse(JSON.stringify(venta.productos)));
            setClienteNombre(venta.cliente);
            setClienteDoc(venta.clienteDoc || '');
        }
    }, [venta]);

    const toggleFase = (fase: number) => {
        setFasesAbiertas(prev => ({ ...prev, [fase]: !prev[fase] }));
    };

    const agregarProducto = () => {
        const select = document.getElementById('productoSelectEditar') as HTMLSelectElement;
        const cantidadInput = document.getElementById('cantidadProdEditar') as HTMLInputElement;
        if (!select || !cantidadInput) return;

        const prodId = parseInt(select.value);
        const cant = parseInt(cantidadInput.value) || 1;
        const prod = catalogoProductos.find(p => p.id === prodId);
        if (!prod) return;

        if (cant > prod.stock) {
            showToast(`Stock insuficiente. Solo ${prod.stock} unidades`, "error", "Error");
            return;
        }

        const existente = productos.find(p => p.id === prodId);
        if (existente) {
            if (existente.cantidad + cant > prod.stock) {
                showToast(`Máximo ${prod.stock - existente.cantidad} más`, "error", "Error");
                return;
            }
            existente.cantidad += cant;
        } else {
            productos.push({ id: prod.id, nombre: prod.nombre, precio: prod.precio, cantidad: cant, stock: prod.stock });
        }
        setProductos([...productos]);
        select.value = "";
        cantidadInput.value = "1";
    };

    const eliminarProducto = (idx: number) => {
        productos.splice(idx, 1);
        setProductos([...productos]);
    };

    const actualizarCantidad = (idx: number, val: string) => {
        let cant = parseInt(val) || 1;
        const prod = catalogoProductos.find(p => p.id === productos[idx].id);
        if (prod && cant > prod.stock) {
            showToast(`Stock: ${prod.stock}`, "error", "Error");
            cant = prod.stock;
        }
        productos[idx].cantidad = cant;
        setProductos([...productos]);
    };

    const calcularTotales = () => {
        const subtotal = productos.reduce((s, p) => s + p.cantidad * p.precio, 0);
        const igv = subtotal * 0.18;
        const total = subtotal + igv;
        return { subtotal, igv, total };
    };

    const guardarCambios = () => {
        if (!venta) return;
        if (productos.length === 0) {
            showToast("Agregue al menos un producto", "warning", "Campos incompletos");
            return;
        }

        const { subtotal, igv, total } = calcularTotales();
        const productosStr = productos.map(p => `${p.nombre} x${p.cantidad}`).join(', ');

        venta.cliente = clienteNombre;
        venta.clienteDoc = clienteDoc;
        venta.productos = productos;
        venta.subtotal = subtotal;
        venta.igv = igv;
        venta.total = total;

        addToHistory(venta, "MODIFICACIÓN", `Productos actualizados: ${productosStr}. Nuevo total: S/ ${total}`);
        addActivity("EDITAR", "ventas", `${venta.numero} modificada`);
        setVentas([...ventas]);
        showToast("Venta actualizada", "success", "Actualizado");
        onSuccess();
        onClose();
    };

    const { subtotal, igv, total } = calcularTotales();

    const modalFooter = (
        <>
            <button className="dc-btn secondary" onClick={onClose}>Cancelar</button>
            <button className="dc-btn success" onClick={guardarCambios}>Guardar Cambios</button>
        </>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Editar Venta - ${venta?.numero}`} icon="fa-edit" footer={modalFooter}>
            {/* Fase 1: Cliente */}
            <div className="fase">
                <div className="fase-header" onClick={() => toggleFase(1)}>
                    <span><i className="fas fa-user"></i> Fase 1: Datos del Cliente</span>
                    <i className="fas fa-chevron-down"></i>
                </div>
                {fasesAbiertas[1] && (
                    <div className="fase-body">
                        <div className="dc-form-grid">
                            <div className="dc-input-group">
                                <label>Nombre del Cliente:</label>
                                <input
                                    type="text"
                                    value={clienteNombre}
                                    onChange={(e) => setClienteNombre(e.target.value)}
                                />
                            </div>
                            <div className="dc-input-group">
                                <label>Documento:</label>
                                <input
                                    type="text"
                                    value={clienteDoc}
                                    onChange={(e) => setClienteDoc(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Fase 2: Productos */}
            <div className="fase">
                <div className="fase-header" onClick={() => toggleFase(2)}>
                    <span><i className="fas fa-boxes"></i> Fase 2: Productos</span>
                    <i className="fas fa-chevron-down"></i>
                </div>
                {fasesAbiertas[2] && (
                    <div className="fase-body">
                        <div className="dc-form-grid">
                            <div className="dc-input-group">
                                <label>Producto</label>
                                <select id="productoSelectEditar">
                                    {catalogoProductos.map(p => (
                                        <option key={p.id} value={p.id}>{p.nombre} - S/ {p.precio} (Stock: {p.stock})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="dc-input-group">
                                <label>Cantidad</label>
                                <input type="number" id="cantidadProdEditar" defaultValue="1" min="1" />
                            </div>
                            <button className="dc-btn info" onClick={agregarProducto}>
                                <i className="fas fa-plus"></i> Agregar
                            </button>
                        </div>
                        <div className='dc-table-wrapper'>
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
                                    {productos.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="text-center">No hay productos agregados</td>
                                        </tr>
                                    ) : (
                                        productos.map((p, idx) => (
                                            <tr key={idx}>
                                                <td>{p.nombre}</td>
                                                <td>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={p.cantidad}
                                                        className="cantidad-input"
                                                        onChange={(e) => actualizarCantidad(idx, e.target.value)}
                                                    />
                                                </td>
                                                <td>S/ {p.precio.toFixed(2)}</td>
                                                <td>S/ {(p.cantidad * p.precio).toFixed(2)}</td>
                                                <td>
                                                    <i
                                                        className="fas fa-trash dc-eliminar"
                                                        onClick={() => eliminarProducto(idx)}
                                                    ></i>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Totales */}
            <div className="totales">
                <div className="total-line">
                    Subtotal: <span>S/ {subtotal.toFixed(2)}</span>
                </div>
                <div className="total-line">
                    IGV (18%): <span>S/ {igv.toFixed(2)}</span>
                </div>
                <div className="total-line total-grande">
                    TOTAL: <span>S/ {total.toFixed(2)}</span>
                </div>
            </div>
        </Modal>
    );
};