import React, { useState, useEffect } from 'react';
import { Modal } from '../Modal';
import { useVentas } from '../../../../context/SalesContext';
import { useToast } from '../../../../hooks/base/useToast';
import { Venta, VentaTemporal, ProductoVenta } from '../../../../features/types/sales';
import { generarVistaPreviaHTML, generarPDF } from '../../../../services/pdf/pdfService';

interface NewSaleModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (venta: Venta) => void;
}

export const NewSaleModal: React.FC<NewSaleModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const { ventas, catalogoProductos, addActivity, addToHistory, getNextNumeroVenta } = useVentas();
    const { showToast } = useToast();

    const [currentVenta, setCurrentVenta] = useState<VentaTemporal>({
        cliente: { nombre: "Juan Pérez", documento: "12345678" },
        productos: [],
        componentes: {
            descuento: { activo: false, tipo: 'porcentaje', valor: 0 },
            cupon: { activo: false, codigo: "", valor: 0 }
        },
        metodoPago: { tipo: 'efectivo', monto: 0, vuelto: 0 },
        subtotal: 0, igv: 0, total: 0
    });

    const [tipoComprobante, setTipoComprobante] = useState<'ticket' | 'factura'>('ticket');
    const [fasesAbiertas, setFasesAbiertas] = useState<{ [key: number]: boolean }>({ 1: true, 2: false, 3: false, 4: false });

    const toggleFase = (fase: number) => {
        setFasesAbiertas(prev => ({ ...prev, [fase]: !prev[fase] }));
    };

    const calcularTotales = () => {
        let sub = currentVenta.productos.reduce((s, p) => s + p.cantidad * p.precio, 0);
        let desc = 0;
        if (currentVenta.componentes.descuento.activo) {
            if (currentVenta.componentes.descuento.tipo === "porcentaje") {
                desc = sub * (currentVenta.componentes.descuento.valor / 100);
            } else {
                desc = currentVenta.componentes.descuento.valor;
            }
        }
        if (currentVenta.componentes.cupon.activo && currentVenta.componentes.cupon.valor > 0) {
            desc += currentVenta.componentes.cupon.valor;
        }
        const after = sub - desc;
        const igv = after * 0.18;
        const total = after + igv;
        setCurrentVenta(prev => ({ ...prev, subtotal: sub, igv, total }));
    };

    useEffect(() => {
        calcularTotales();
    }, [currentVenta.productos, currentVenta.componentes]);

    const agregarProducto = () => {
        const select = document.getElementById('productoSelect') as HTMLSelectElement;
        const cantidadInput = document.getElementById('cantidadProd') as HTMLInputElement;
        if (!select || !cantidadInput) return;

        const prodId = parseInt(select.value);
        const cant = parseInt(cantidadInput.value) || 1;
        const prod = catalogoProductos.find(p => p.id === prodId);
        if (!prod) return;

        if (cant > prod.stock) {
            showToast(`Stock insuficiente. Solo ${prod.stock} unidades`, "error", "Error");
            return;
        }

        const existente = currentVenta.productos.find(p => p.id === prodId);
        if (existente) {
            if (existente.cantidad + cant > prod.stock) {
                showToast(`Máximo ${prod.stock - existente.cantidad} más`, "error", "Error");
                return;
            }
            existente.cantidad += cant;
        } else {
            currentVenta.productos.push({ id: prod.id, nombre: prod.nombre, precio: prod.precio, cantidad: cant, stock: prod.stock });
        }
        setCurrentVenta({ ...currentVenta });
        select.value = "";
        cantidadInput.value = "1";
    };

    const eliminarProducto = (idx: number) => {
        currentVenta.productos.splice(idx, 1);
        setCurrentVenta({ ...currentVenta });
    };

    const actualizarCantidad = (idx: number, val: string) => {
        let cant = parseInt(val) || 1;
        const prod = catalogoProductos.find(p => p.id === currentVenta.productos[idx].id);
        if (prod && cant > prod.stock) {
            showToast(`Stock: ${prod.stock}`, "error", "Error");
            cant = prod.stock;
        }
        currentVenta.productos[idx].cantidad = cant;
        setCurrentVenta({ ...currentVenta });
    };

    const toggleComponente = (componente: 'descuento' | 'cupon') => {
        setCurrentVenta(prev => ({
            ...prev,
            componentes: {
                ...prev.componentes,
                [componente]: { ...prev.componentes[componente], activo: !prev.componentes[componente].activo }
            }
        }));
    };

    const actualizarDescuento = () => {
        const tipo = (document.getElementById('descTipo') as HTMLSelectElement)?.value as 'porcentaje' | 'monto';
        const valor = parseFloat((document.getElementById('descValor') as HTMLInputElement)?.value) || 0;
        setCurrentVenta(prev => ({
            ...prev,
            componentes: {
                ...prev.componentes,
                descuento: { ...prev.componentes.descuento, tipo, valor }
            }
        }));
    };

    const aplicarCupon = () => {
        const codigo = (document.getElementById('cuponCodigo') as HTMLInputElement)?.value;
        if (codigo === "DESCUENTO10") {
            setCurrentVenta(prev => ({
                ...prev,
                componentes: {
                    ...prev.componentes,
                    cupon: { activo: true, codigo, valor: 10 }
                }
            }));
            showToast("Cupón S/10 aplicado", "success", "Cupón");
        } else if (codigo === "BIENVENIDO") {
            setCurrentVenta(prev => ({
                ...prev,
                componentes: {
                    ...prev.componentes,
                    cupon: { activo: true, codigo, valor: 20 }
                }
            }));
            showToast("Cupón S/20 aplicado", "success", "Cupón");
        } else if (codigo && codigo !== "") {
            showToast("Cupón inválido", "error", "Error");
        }
    };

    const seleccionarMetodo = (tipo: 'efectivo' | 'tarjeta' | 'yape' | 'plin') => {
        setCurrentVenta(prev => ({
            ...prev,
            metodoPago: { ...prev.metodoPago, tipo }
        }));
    };

    const registrarVenta = () => {
        if (currentVenta.productos.length === 0) {
            showToast("Agregue al menos un producto", "warning", "Campos incompletos");
            return;
        }

        const clienteNombre = (document.getElementById('clienteNombre') as HTMLInputElement)?.value || "Cliente";
        const clienteDoc = (document.getElementById('clienteDoc') as HTMLInputElement)?.value || "";

        const nuevaVenta: Venta = {
            id: Date.now(),
            numero: getNextNumeroVenta(),
            fecha: new Date().toLocaleString(),
            fechaObj: new Date(),
            cliente: clienteNombre,
            clienteDoc,
            productos: JSON.parse(JSON.stringify(currentVenta.productos)),
            subtotal: currentVenta.subtotal,
            descuento: currentVenta.componentes.descuento.activo ? currentVenta.componentes.descuento.valor : 0,
            igv: currentVenta.igv,
            total: currentVenta.total,
            metodoPago: currentVenta.metodoPago.tipo.toUpperCase(),
            estado: 'completada',
            devoluciones: [],
            historial: []
        };

        addToHistory(nuevaVenta, "CREACIÓN", `Venta creada - Total: S/ ${nuevaVenta.total}`);
        addActivity("VENTA", "ventas", `${nuevaVenta.numero} - S/ ${nuevaVenta.total}`);
        generarPDF(nuevaVenta, tipoComprobante);
        showToast(`Venta ${nuevaVenta.numero} registrada y comprobante generado`, "success", "Venta registrada");

        onSuccess(nuevaVenta);
        onClose();
    };

    const ventaPreview: Venta = {
        ...currentVenta as any,
        id: 0,
        numero: getNextNumeroVenta(),
        fecha: new Date().toLocaleString(),
        fechaObj: new Date(),
        cliente: currentVenta.cliente.nombre,
        clienteDoc: currentVenta.cliente.documento,
        productos: currentVenta.productos,
        descuento: currentVenta.componentes.descuento.activo ? currentVenta.componentes.descuento.valor : 0,
        metodoPago: currentVenta.metodoPago.tipo.toUpperCase(),
        estado: 'completada',
        devoluciones: []
    };

    const modalFooter = (
        <>
            <button className="dc-btn secondary" onClick={onClose}>Cancelar</button>
            <button className="dc-btn success" onClick={registrarVenta}>
                <i className="fas fa-check-circle"></i> Registrar e Imprimir
            </button>
        </>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Nueva Venta" icon="fa-shopping-cart" footer={modalFooter}>
            <div className="split-layout">
                <div className="split-left">

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
                                        <input type="text" id="clienteNombre" defaultValue={currentVenta.cliente.nombre} />
                                    </div>
                                    <div className="dc-input-group">
                                        <label>Documento:</label>
                                        <input type="text" id="clienteDoc" defaultValue={currentVenta.cliente.documento} />
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
                            <div className="fase-body" >
                                <div className="dc-form-grid">
                                    <div className="dc-input-group">
                                        <label>Producto</label>
                                        <select id="productoSelect">
                                            {catalogoProductos.map(p => (
                                                <option key={p.id} value={p.id}>{p.nombre} - S/ {p.precio} (Stock: {p.stock})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="dc-input-group">
                                        <label>Cantidad</label>
                                        <input type="number" id="cantidadProd" defaultValue="1" min="1" />
                                    </div>
                                    <button className="dc-btn info" onClick={agregarProducto} >
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
                                            {currentVenta.productos.length === 0 ? (
                                                <tr>
                                                    <td colSpan={5} className="text-center">No hay productos agregados</td>
                                                </tr>
                                            ) : (
                                                currentVenta.productos.map((p, idx) => (
                                                    <tr key={idx}>
                                                        <td>{p.nombre}</td>
                                                        <td>
                                                            <input type="number" className="cantidad-input" min="1" value={p.cantidad} onChange={(e) => actualizarCantidad(idx, e.target.value)} />
                                                        </td>
                                                        <td>S/ {p.precio.toFixed(2)}</td>
                                                        <td>S/ {(p.cantidad * p.precio).toFixed(2)}</td>
                                                        <td>
                                                            <i className="fas fa-trash dc-eliminar" onClick={() => eliminarProducto(idx)}></i>
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

                    {/* Fase 3: Descuentos */}
                    <div className="fase">
                        <div className="fase-header" onClick={() => toggleFase(3)}>
                            <span><i className="fas fa-tags"></i> Fase 3: Descuentos y Promociones</span>
                            <i className="fas fa-chevron-down"></i>
                        </div>
                        {fasesAbiertas[3] && (
                            <div className="fase-body" >
                                <div className="componentes-grid" >
                                    {/* Descuento */}
                                    <div className="componente-card" >
                                        <div className="componente-header" >
                                            <strong>💰 Descuento</strong>
                                            <div
                                                className={`toggle-componente ${currentVenta.componentes.descuento.activo ? 'active' : ''}`}
                                                onClick={() => toggleComponente('descuento')}
                                            >
                                                <div className='toggle-slider'></div>
                                            </div>
                                        </div>
                                        {currentVenta.componentes.descuento.activo && (
                                            <div className="dc-input-group dc-form-grid" >
                                                <select id="descTipo" onChange={actualizarDescuento}>
                                                    <option value="porcentaje">% Porcentaje</option>
                                                    <option value="monto">S/ Monto fijo</option>
                                                </select>
                                                <input type="number" id="descValor" placeholder="Valor" defaultValue={currentVenta.componentes.descuento.valor} onChange={actualizarDescuento} />
                                            </div>
                                        )}
                                    </div>
                                    {/* Cupón */}
                                    <div className="componente-card" >
                                        <div className="componente-header" >
                                            <strong>🎫 Cupón</strong>
                                            <div
                                                className={`toggle-componente ${currentVenta.componentes.cupon.activo ? 'active' : ''}`}
                                                onClick={() => toggleComponente('cupon')}
                                            >
                                                <div className='toggle-slider'></div>
                                            </div>
                                        </div>
                                        {currentVenta.componentes.cupon.activo && (
                                            <div className="dc-input-group">
                                                <input type="text" id="cuponCodigo" placeholder="DESCUENTO10 o BIENVENIDO" onBlur={aplicarCupon} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Fase 4: Método de Pago */}
                    <div className="fase">
                        <div className="fase-header" onClick={() => toggleFase(4)}>
                            <span><i className="fas fa-credit-card"></i> Fase 4: Método de Pago</span>
                            <i className="fas fa-chevron-down"></i>
                        </div>
                        {fasesAbiertas[4] && (
                            <div className="fase-body" >
                                <div className="dc-form-grid">
                                    <div className="metodos-pago" >
                                        {['efectivo', 'tarjeta', 'yape', 'plin'].map(m => (
                                            <div
                                                key={m}
                                                className={`metodo-btn ${currentVenta.metodoPago.tipo === m ? 'selected' : ''}`}
                                                onClick={() => seleccionarMetodo(m as any)}
                                            >
                                                <i className={`fas ${m === 'efectivo' ? 'fa-money-bill' : m === 'tarjeta' ? 'fa-credit-card' : 'fa-mobile-alt'}`}></i> {m.toUpperCase()}
                                            </div>
                                        ))}
                                    </div>
                                    <div id="pagoDetalle" className="dc-input-group">
                                        {currentVenta.metodoPago.tipo === 'efectivo' && (
                                            <div>
                                                <label>Monto con el que paga:</label>
                                                <input type="number" id="montoPago" placeholder="S/ " />
                                            </div>
                                        )}
                                        {currentVenta.metodoPago.tipo === 'yape' && (
                                            <div className="qr-container" >
                                                <i className="fab fa-yape" ></i>
                                                <p><strong>Yape</strong> - Número: 999 888 777</p>
                                            </div>
                                        )}
                                        {currentVenta.metodoPago.tipo === 'plin' && (
                                            <div className="qr-container">
                                                <i className="fas fa-mobile-alt"></i>
                                                <p><strong>Plin</strong> - Número: 999 888 777</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Totales */}
                    <div className="totales">
                        <div className="total-line">
                            Subtotal: <span>S/ {currentVenta.subtotal.toFixed(2)}</span>
                        </div>
                        <div className="total-line">
                            Descuento: <span>S/ {(currentVenta.componentes.descuento.activo ? currentVenta.componentes.descuento.valor : 0).toFixed(2)}</span>
                        </div>
                        <div className="total-line">
                            IGV (18%): <span>S/ {currentVenta.igv.toFixed(2)}</span>
                        </div>
                        <div className="total-line total-grande">
                            TOTAL: <span>S/ {currentVenta.total.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                <div className="split-right">
                    <div className="dc-input-group" style={{ marginBottom: "15px" }}>
                        <label><strong>Tipo de comprobante:</strong></label>
                        <select id="tipoComprobantePreview" value={tipoComprobante} onChange={(e) => setTipoComprobante(e.target.value as any)}>
                            <option value="ticket">Ticket</option>
                            <option value="factura">Factura Electrónica</option>
                        </select>
                    </div>
                    <div id="vistaPreviaContenido" dangerouslySetInnerHTML={{ __html: generarVistaPreviaHTML(ventaPreview, tipoComprobante) }} />
                </div>
            </div>
        </Modal >
    );
};