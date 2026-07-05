import React, { useState, useEffect } from 'react';
import { Modal } from '../Modal';
import { useVentas } from '../../../../context/SalesContext';
import { useAuth } from '../../../../features/auth/context/AuthContext';
import { useToast } from '../../../../hooks/base/useToast';
import { Venta, ProductoVenta, CatalogoProducto } from '../../../../features/types/sales';

interface ModifySalesModalProps {
    isOpen: boolean;
    onClose: () => void;
    venta: Venta | null;
    onSuccess: () => void;
}

export const ModifySalesModal: React.FC<ModifySalesModalProps> = ({ isOpen, onClose, venta, onSuccess }) => {
    const { ventas, setVentas, catalogoProductos, addActivity, addToHistory, refreshData } = useVentas();
    const { user } = useAuth();
    const { showToast } = useToast();

    const [productos, setProductos] = useState<ProductoVenta[]>([]);
    const [clienteNombre, setClienteNombre] = useState('');
    const [clienteDoc, setClienteDoc] = useState('');
    const [fasesAbiertas, setFasesAbiertas] = useState<{ [key: number]: boolean }>({ 1: true, 2: false });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
    const [productosDisponibles, setProductosDisponibles] = useState<CatalogoProducto[]>([]);
    const [cantidad, setCantidad] = useState<number>(1);

    const productoVigente = (producto: CatalogoProducto): boolean => {
        if (!producto.fechaVencimiento) return true;
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const fechaVenc = new Date(producto.fechaVencimiento);
        fechaVenc.setHours(0, 0, 0, 0);
        return fechaVenc >= hoy;
    };

    useEffect(() => {
        if (isOpen) {
            const disponibles = catalogoProductos.filter(p => p.stock > 0 && productoVigente(p));
            setProductosDisponibles(disponibles);
            setSelectedProductId(null);
            setCantidad(1);
        }
    }, [isOpen, catalogoProductos]);

    useEffect(() => {
        if (venta) {
            // Agrupar productos por id
            const map = new Map<number, ProductoVenta>();
            venta.productos.forEach(p => {
                if (map.has(p.id)) {
                    const existente = map.get(p.id)!;
                    existente.cantidad += p.cantidad;
                } else {
                    map.set(p.id, { ...p });
                }
            });
            setProductos(Array.from(map.values()));
            setClienteNombre(venta.cliente);
            setClienteDoc(venta.clienteDoc || '');
        }
    }, [venta]);

    const toggleFase = (fase: number) => {
        setFasesAbiertas(prev => ({ ...prev, [fase]: !prev[fase] }));
    };

    const agregarProducto = () => {
        if (selectedProductId === null) {
            showToast("Seleccione un producto", "warning", "Campos incompletos");
            return;
        }

        const cant = cantidad || 1;
        const producto = productosDisponibles.find(p => p.id === selectedProductId);
        if (!producto) {
            showToast("Producto no disponible", "error", "Error");
            return;
        }

        if (cant > producto.stock) {
            showToast(`Stock insuficiente. Solo ${producto.stock} unidades`, "error", "Error");
            return;
        }

        const existente = productos.find(p => p.id === selectedProductId);
        let nuevosProductos: ProductoVenta[];

        if (existente) {
            nuevosProductos = productos.map(p =>
                p.id === selectedProductId
                    ? { ...p, cantidad: p.cantidad + cant }
                    : p
            );
        } else {
            nuevosProductos = [
                ...productos,
                {
                    id: producto.id,
                    nombre: producto.nombre,
                    precio: producto.precio,
                    cantidad: cant,
                    stock: producto.stock
                }
            ];
        }

        setProductos(nuevosProductos);

        const updatedDisponibles = productosDisponibles.map(p =>
            p.id === selectedProductId ? { ...p, stock: p.stock - cant } : p
        ).filter(p => p.stock > 0 && productoVigente(p));
        setProductosDisponibles(updatedDisponibles);

        setSelectedProductId(null);
        setCantidad(1);
        showToast(`Producto agregado`, 'success', 'Agregado');
    };

    const eliminarProducto = (idx: number) => {
        productos.splice(idx, 1);
        setProductos([...productos]);
    };

    const actualizarCantidad = (idx: number, val: string) => {
        let cant = parseInt(val) || 1;
        const prod = productos[idx];
        const prodOriginal = catalogoProductos.find(p => p.id === prod.id);
        if (prodOriginal && cant > prodOriginal.stock) {
            showToast(`Stock máximo: ${prodOriginal.stock}`, "error", "Error");
            cant = prodOriginal.stock;
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

    const guardarCambios = async () => {
        if (!venta) return;
        if (productos.length === 0) {
            showToast("Agregue al menos un producto", "warning", "Campos incompletos");
            return;
        }

        const userId = user?.id;
        if (!userId) {
            showToast('No se pudo identificar al usuario', 'error', 'Error de autenticación');
            return;
        }

        const { subtotal, igv, total } = calcularTotales();
        const productosStr = productos.map(p => `${p.nombre} x${p.cantidad}`).join(', ');

        setIsSubmitting(true);
        try {
            const payload = {
                cliente: clienteNombre,
                clienteDoc: clienteDoc,
                productos: productos.map(p => ({
                    id_lote: p.id,
                    nombre: p.nombre,
                    precio: p.precio,
                    cantidad: p.cantidad
                })),
                subtotal,
                igv,
                total,
                usuario_id: userId
            };

            const { ventaApi } = await import('../../../../services/api/ventaApi');
            const ventaActualizada = await ventaApi.update(venta.id, payload);

            await refreshData();
            await addActivity("EDITAR", "ventas", `${venta.numero} modificada - ${productosStr}`);
            await addToHistory(ventaActualizada, "MODIFICACIÓN", `Productos actualizados: ${productosStr}. Nuevo total: S/ ${total}`);

            showToast("Venta actualizada correctamente", "success", "Actualizado");
            onSuccess();
            onClose();
        } catch (error) {
            console.error('[ModifySalesModal] Error al actualizar venta:', error);
            showToast('Error al actualizar la venta', 'error', 'Error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const { subtotal, igv, total } = calcularTotales();

    const modalFooter = (
        <>
            <button className="dc-btn secondary" onClick={onClose}>Cancelar</button>
            <button className="dc-btn success" onClick={guardarCambios} disabled={isSubmitting}>
                {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
            </button>
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
                                <label>Producto (Lote):</label>
                                <select
                                    id="productoSelectEditar"
                                    value={selectedProductId ?? ''}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        setSelectedProductId(val || null);
                                    }}
                                >
                                    <option value="">Seleccionar producto...</option>
                                    {productosDisponibles.map(p => (
                                        <option key={p.id} value={p.id}>
                                            {p.nombre} - S/ {p.precio.toFixed(2)} (Stock: {p.stock})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="dc-input-group">
                                <label>Cantidad</label>
                                <input
                                    type="number"
                                    id="cantidadProdEditar"
                                    value={cantidad}
                                    min="1"
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value) || 1;
                                        setCantidad(val);
                                    }}
                                />
                            </div>
                            <button className="dc-btn info" onClick={agregarProducto}>
                                <i className="fas fa-plus"></i> Agregar
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
                                    {productos.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="text-center">No hay productos agregados</td>
                                        </tr>
                                    ) : (
                                        productos.map((p, idx) => (
                                            <tr key={p.id || idx}>
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