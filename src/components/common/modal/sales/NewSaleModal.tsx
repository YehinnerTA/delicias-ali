import React, { useState, useEffect } from 'react';
import { Modal } from '../Modal';
import { useVentas } from '../../../../context/SalesContext';
import { useAuth } from '../../../../features/auth/context/AuthContext';
import { useCompany } from '../../../../features/company/context/CompanyContext';
import { useToast } from '../../../../hooks/base/useToast';
import { Venta, VentaTemporal, ProductoVenta, CatalogoProducto } from '../../../../features/types/sales';
import { generarVistaPreviaHTML, generarPDF } from '../../../../services/pdf/pdfService';

interface NewSaleModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (venta: Venta) => void;
}

export const NewSaleModal: React.FC<NewSaleModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const { catalogoProductos, addActivity, addToHistory, refreshData } = useVentas();
    const { user } = useAuth();
    const { getSelectedCompanyId } = useCompany();
    const id_empresa = getSelectedCompanyId() ?? 0;
    const { showToast } = useToast();

    const getInitialVenta = (): VentaTemporal => ({
        id_empresa,
        cliente: { nombre: "", documento: "" },
        productos: [],
        componentes: {
            descuento: { activo: false, tipo: 'porcentaje', valor: 0 },
            cupon: { activo: false, codigo: "", valor: 0 }
        },
        metodoPago: { tipo: 'efectivo', monto: 0, vuelto: 0 },
        subtotal: 0, igv: 0, total: 0
    });

    const [currentVenta, setCurrentVenta] = useState<VentaTemporal>(getInitialVenta());

    const [tipoComprobante, setTipoComprobante] = useState<'ticket' | 'factura'>('ticket');
    const [fasesAbiertas, setFasesAbiertas] = useState<{ [key: number]: boolean }>({ 1: true, 2: false, 3: false, 4: false });
    const [clientes, setClientes] = useState<any[]>([]);
    const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [montoPago, setMontoPago] = useState<number>(0);
    const [productosDisponibles, setProductosDisponibles] = useState<CatalogoProducto[]>([]);

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
            cargarClientes();
            setSelectedProductId(null);
            setMontoPago(0);
            const productSelect = document.getElementById('productoSelect') as HTMLSelectElement;
            if (productSelect) productSelect.value = '';
            const cantidadInput = document.getElementById('cantidadProd') as HTMLInputElement;
            if (cantidadInput) {
                cantidadInput.value = '1';
                cantidadInput.max = '999';
                cantidadInput.placeholder = 'Cantidad';
            }
            const docInput = document.getElementById('clienteDoc') as HTMLInputElement;
            const nombreInput = document.getElementById('clienteNombre') as HTMLInputElement;
            const montoInput = document.getElementById('montoPago') as HTMLInputElement;
            if (docInput) docInput.value = '';
            if (nombreInput) nombreInput.value = '';
            if (montoInput) montoInput.value = '';
            setCurrentVenta({
                id_empresa,
                cliente: { nombre: "", documento: "" },
                productos: [],
                componentes: {
                    descuento: { activo: false, tipo: 'porcentaje', valor: 0 },
                    cupon: { activo: false, codigo: "", valor: 0 }
                },
                metodoPago: { tipo: 'efectivo', monto: 0, vuelto: 0 },
                subtotal: 0, igv: 0, total: 0
            });
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen) {
            const disponibles = catalogoProductos.filter(p => p.stock > 0 && productoVigente(p));
            setProductosDisponibles(disponibles);
        }
    }, [isOpen, catalogoProductos]);

    const cargarClientes = async () => {
        if (!id_empresa) {
            showToast('No se ha seleccionado una empresa', 'warning', 'Advertencia');
            return;
        }
        try {
            const { ventaApi } = await import('../../../../services/api/ventaApi');
            const data = await ventaApi.getClientes(id_empresa);
            setClientes(data);
        } catch (error) {
            console.error('[NewSaleModal] Error al cargar clientes:', error);
            showToast('Error al cargar clientes', 'error', 'Error');
        }
    };

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

    const buscarClientePorDocumento = (documento: string) => {
        if (!documento) {
            const nombreInput = document.getElementById('clienteNombre') as HTMLInputElement;
            if (nombreInput) nombreInput.value = '';
            return;
        }
        const cliente = clientes.find(c => c.numeroDocumento === documento);
        const nombreInput = document.getElementById('clienteNombre') as HTMLInputElement;
        if (cliente) {
            if (nombreInput) nombreInput.value = cliente.nombreCompleto;
            setCurrentVenta(prev => ({
                ...prev,
                cliente: { nombre: cliente.nombreCompleto, documento: cliente.numeroDocumento }
            }));
        } else {
            if (nombreInput) nombreInput.value = '';
            setCurrentVenta(prev => ({
                ...prev,
                cliente: { nombre: '', documento }
            }));
        }
    };

    const handleProductChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const productId = parseInt(e.target.value);
        setSelectedProductId(productId);
        const producto = productosDisponibles.find(p => p.id === productId);
        if (producto) {
            const cantidadInput = document.getElementById('cantidadProd') as HTMLInputElement;
            if (cantidadInput) {
                cantidadInput.max = producto.stock.toString();
                cantidadInput.placeholder = `Máx ${producto.stock}`;
                cantidadInput.value = '1';
            }
        }
    };

    const agregarProducto = () => {
        if (selectedProductId === null) {
            showToast("Seleccione un producto", "warning", "Campos incompletos");
            return;
        }

        const cantidadInput = document.getElementById('cantidadProd') as HTMLInputElement;
        if (!cantidadInput) return;

        const cant = parseInt(cantidadInput.value) || 1;
        const producto = productosDisponibles.find(p => p.id === selectedProductId);
        if (!producto) {
            showToast("Producto no encontrado o vencido", "error", "Error");
            return;
        }

        if (cant > producto.stock) {
            showToast(`Stock insuficiente. Solo ${producto.stock} unidades`, "error", "Error");
            return;
        }

        const existente = currentVenta.productos.find(p => p.id === selectedProductId);
        if (existente) {
            const nuevaCantidad = existente.cantidad + cant;
            if (nuevaCantidad > producto.stock + existente.cantidad) {
                showToast(`No puede exceder el stock total (${producto.stock + existente.cantidad})`, "error", "Error");
                return;
            }
            const updatedProductos = currentVenta.productos.map(p =>
                p.id === selectedProductId ? { ...p, cantidad: nuevaCantidad } : p
            );
            setCurrentVenta(prev => ({ ...prev, productos: updatedProductos }));

            const updatedDisponibles = productosDisponibles.map(p =>
                p.id === selectedProductId ? { ...p, stock: p.stock - cant } : p
            ).filter(p => p.stock > 0 && productoVigente(p));
            setProductosDisponibles(updatedDisponibles);
        } else {
            const nuevoProducto: ProductoVenta = {
                id: selectedProductId,
                nombre: producto.nombre,
                precio: producto.precio,
                cantidad: cant,
                stock: producto.stock
            };
            setCurrentVenta(prev => ({
                ...prev,
                productos: [...prev.productos, nuevoProducto]
            }));

            const updatedDisponibles = productosDisponibles.map(p =>
                p.id === selectedProductId ? { ...p, stock: p.stock - cant } : p
            ).filter(p => p.stock > 0 && productoVigente(p));
            setProductosDisponibles(updatedDisponibles);
        }

        setSelectedProductId(null);
        const productSelect = document.getElementById('productoSelect') as HTMLSelectElement;
        if (productSelect) productSelect.value = '';
        cantidadInput.value = '1';
        cantidadInput.placeholder = 'Cantidad';
        cantidadInput.max = '999';
        showToast(`Producto agregado`, 'success', 'Agregado');
    };

    const eliminarProducto = (idx: number) => {
        const productoEliminado = currentVenta.productos[idx];
        const updatedProductos = productosDisponibles.map(p => {
            if (p.id === productoEliminado.id) {
                return { ...p, stock: p.stock + productoEliminado.cantidad };
            }
            return p;
        });
        if (!updatedProductos.find(p => p.id === productoEliminado.id)) {
            const productoOriginal = catalogoProductos.find(p => p.id === productoEliminado.id);
            if (productoOriginal) {
                updatedProductos.push({
                    ...productoOriginal,
                    stock: productoEliminado.cantidad
                });
            }
        }
        setProductosDisponibles(updatedProductos.filter(p => p.stock > 0 && productoVigente(p)));

        const updatedVentaProductos = currentVenta.productos.filter((_, i) => i !== idx);
        setCurrentVenta(prev => ({ ...prev, productos: updatedVentaProductos }));
        showToast('Producto eliminado', 'info', 'Eliminado');
    };

    const actualizarCantidad = (idx: number, val: string) => {
        const cant = parseInt(val) || 1;
        const prod = currentVenta.productos[idx];
        const productoOriginal = catalogoProductos.find(p => p.id === prod.id);
        if (!productoOriginal) return;

        const totalUsado = currentVenta.productos
            .filter(p => p.id === prod.id)
            .reduce((sum, p) => sum + p.cantidad, 0);
        const stockDisponible = productoOriginal.stock - (totalUsado - prod.cantidad);

        if (cant > stockDisponible + prod.cantidad) {
            showToast(`Stock máximo disponible: ${stockDisponible + prod.cantidad}`, "error", "Error");
            return;
        }

        const diff = cant - prod.cantidad;
        const updatedDisponibles = productosDisponibles.map(p => {
            if (p.id === prod.id) {
                return { ...p, stock: p.stock - diff };
            }
            return p;
        }).filter(p => p.stock > 0 && productoVigente(p));
        setProductosDisponibles(updatedDisponibles);

        const updatedProductos = currentVenta.productos.map((p, i) =>
            i === idx ? { ...p, cantidad: cant } : p
        );
        setCurrentVenta(prev => ({ ...prev, productos: updatedProductos }));
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
        if (tipo !== 'efectivo') {
            setMontoPago(currentVenta.total);
        }
    };

    const handleMontoPagoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const valor = parseFloat(e.target.value) || 0;
        setMontoPago(valor);
    };

    const registrarVenta = async () => {
        if (!id_empresa) {
            showToast('No se ha seleccionado una empresa', 'warning', 'Advertencia');
            return;
        }

        if (currentVenta.productos.length === 0) {
            showToast("Agregue al menos un producto", "warning", "Campos incompletos");
            return;
        }

        const clienteNombreInput = document.getElementById('clienteNombre') as HTMLInputElement;
        const clienteDocInput = document.getElementById('clienteDoc') as HTMLInputElement;
        const clienteDocumento = clienteDocInput?.value?.trim() || '';
        const clienteNombre = clienteNombreInput?.value?.trim() || '';

        if (!clienteDocumento || !clienteNombre) {
            showToast("Ingrese el documento y nombre del cliente", "warning", "Campos incompletos");
            return;
        }

        if (currentVenta.metodoPago.tipo === 'efectivo') {
            if (montoPago < currentVenta.total) {
                showToast(`El monto pagado (S/ ${montoPago.toFixed(2)}) no puede ser menor al total (S/ ${currentVenta.total.toFixed(2)})`, "error", "Error");
                return;
            }
        }

        const userId = user?.id;
        if (!userId) {
            showToast('No se pudo identificar al usuario', 'error', 'Error de autenticación');
            return;
        }

        setIsSubmitting(true);
        try {
            const productosParaAPI = currentVenta.productos.map(p => ({
                id_lote: p.id,
                nombre: p.nombre,
                precio: p.precio,
                cantidad: p.cantidad
            }));

            const payload = {
                cliente_documento: clienteDocumento,
                cliente_nombre: clienteNombre,
                cliente_apellido: '',
                cliente_email: '',
                cliente_celular: '',
                productos: productosParaAPI,
                subtotal: currentVenta.subtotal,
                descuento: currentVenta.componentes.descuento.activo ? currentVenta.componentes.descuento.valor : 0,
                igv: currentVenta.igv,
                total: currentVenta.total,
                metodo_pago: currentVenta.metodoPago.tipo.toUpperCase(),
                usuario_id: userId
            };

            const { ventaApi } = await import('../../../../services/api/ventaApi');
            const nuevaVenta = await ventaApi.create(id_empresa, payload);

            await refreshData();
            await addActivity("VENTA", "ventas", `${nuevaVenta.numero} - S/ ${nuevaVenta.total}`);
            await addToHistory(nuevaVenta, "CREACIÓN", `Venta creada - Total: S/ ${nuevaVenta.total}`);

            generarPDF(nuevaVenta, tipoComprobante);
            showToast(`Venta ${nuevaVenta.numero} registrada y comprobante generado`, "success", "Venta registrada");

            setCurrentVenta({
                id_empresa,
                cliente: { nombre: "", documento: "" },
                productos: [],
                componentes: {
                    descuento: { activo: false, tipo: 'porcentaje', valor: 0 },
                    cupon: { activo: false, codigo: "", valor: 0 }
                },
                metodoPago: { tipo: 'efectivo', monto: 0, vuelto: 0 },
                subtotal: 0, igv: 0, total: 0
            });
            setProductosDisponibles(catalogoProductos.filter(p => p.stock > 0 && productoVigente(p)));
            setSelectedProductId(null);
            setMontoPago(0);
            const productSelect = document.getElementById('productoSelect') as HTMLSelectElement;
            if (productSelect) productSelect.value = '';
            const cantidadInput = document.getElementById('cantidadProd') as HTMLInputElement;
            if (cantidadInput) {
                cantidadInput.value = '1';
                cantidadInput.max = '999';
                cantidadInput.placeholder = 'Cantidad';
            }
            const docInput = document.getElementById('clienteDoc') as HTMLInputElement;
            const nombreInput = document.getElementById('clienteNombre') as HTMLInputElement;
            const montoInput = document.getElementById('montoPago') as HTMLInputElement;
            if (docInput) docInput.value = '';
            if (nombreInput) nombreInput.value = '';
            if (montoInput) montoInput.value = '';

            onSuccess(nuevaVenta);
            onClose();
        } catch (error) {
            console.error('[NewSaleModal] Error al registrar venta:', error);
            showToast('Error al registrar la venta', 'error', 'Error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const ventaPreview: Venta = {
        ...currentVenta as any,
        id: 0,
        id_empresa: id_empresa,
        numero: 'V-XXXXXX',
        fecha: new Date().toLocaleString(),
        fechaObj: new Date(),
        cliente: currentVenta.cliente.nombre || 'Cliente',
        clienteDoc: currentVenta.cliente.documento || '',
        productos: currentVenta.productos,
        descuento: currentVenta.componentes.descuento.activo ? currentVenta.componentes.descuento.valor : 0,
        metodoPago: currentVenta.metodoPago.tipo.toUpperCase(),
        estado: 'completada',
        devoluciones: [],
        historial: []
    };

    const modalFooter = (
        <>
            <button
                className="dc-btn success"
                onClick={registrarVenta}
                disabled={isSubmitting}
            >
                {isSubmitting ? 'Registrando...' : <><i className="fas fa-check-circle"></i> Registrar e Imprimir</>}
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
                                        <label>Documento (DNI/RUC):</label>
                                        <input
                                            type="text"
                                            id="clienteDoc"
                                            placeholder="Ingrese DNI o RUC"
                                            onChange={(e) => buscarClientePorDocumento(e.target.value)}
                                        />
                                    </div>
                                    <div className="dc-input-group">
                                        <label>Nombre del Cliente:</label>
                                        <input
                                            type="text"
                                            id="clienteNombre"
                                            placeholder="Nombre completo"
                                            onChange={(e) => {
                                                setCurrentVenta(prev => ({
                                                    ...prev,
                                                    cliente: { ...prev.cliente, nombre: e.target.value }
                                                }));
                                            }}
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
                                        <select id="productoSelect" onChange={handleProductChange} value={selectedProductId ?? ''}>
                                            <option value="">Seleccionar producto...</option>
                                            {productosDisponibles.map(p => (
                                                <option key={p.id} value={p.id}>
                                                    {p.nombre} - S/ {p.precio.toFixed(2)} (Stock: {p.stock})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="dc-input-group">
                                        <label>Cantidad:</label>
                                        <input
                                            type="number"
                                            id="cantidadProd"
                                            defaultValue="1"
                                            min="1"
                                            max="999"
                                            placeholder="Cantidad"
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
                                            {currentVenta.productos.length === 0 ? (
                                                <tr>
                                                    <td colSpan={5} className="text-center">No hay productos agregados</td>
                                                </tr>
                                            ) : (
                                                currentVenta.productos.map((p) => (
                                                    <tr key={p.id}>
                                                        <td>{p.nombre}</td>
                                                        <td>
                                                            <input
                                                                type="number"
                                                                className="cantidad-input"
                                                                min="1"
                                                                value={p.cantidad}
                                                                onChange={(e) => actualizarCantidad(
                                                                    currentVenta.productos.findIndex(prod => prod.id === p.id),
                                                                    e.target.value
                                                                )}
                                                            />
                                                        </td>
                                                        <td>S/ {p.precio.toFixed(2)}</td>
                                                        <td>S/ {(p.cantidad * p.precio).toFixed(2)}</td>
                                                        <td>
                                                            <i className="fas fa-trash dc-eliminar" onClick={() => eliminarProducto(
                                                                currentVenta.productos.findIndex(prod => prod.id === p.id)
                                                            )}></i>
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
                            <div className="fase-body">
                                <div className="componentes-grid">
                                    <div className="componente-card">
                                        <div className="componente-header">
                                            <strong>💰 Descuento</strong>
                                            <div
                                                className={`toggle-componente ${currentVenta.componentes.descuento.activo ? 'active' : ''}`}
                                                onClick={() => toggleComponente('descuento')}
                                            >
                                                <div className='toggle-slider'></div>
                                            </div>
                                        </div>
                                        {currentVenta.componentes.descuento.activo && (
                                            <div className="dc-input-group dc-form-grid">
                                                <select id="descTipo" onChange={actualizarDescuento} defaultValue={currentVenta.componentes.descuento.tipo}>
                                                    <option value="porcentaje">% Porcentaje</option>
                                                    <option value="monto">S/ Monto fijo</option>
                                                </select>
                                                <input type="number" id="descValor" placeholder="Valor" defaultValue={currentVenta.componentes.descuento.valor} onChange={actualizarDescuento} />
                                            </div>
                                        )}
                                    </div>
                                    <div className="componente-card">
                                        <div className="componente-header">
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
                            <div className="fase-body">
                                <div className="dc-form-grid">
                                    <div className="metodos-pago">
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
                                                <input
                                                    type="number"
                                                    id="montoPago"
                                                    placeholder="S/ "
                                                    onChange={handleMontoPagoChange}
                                                />
                                                {montoPago > 0 && montoPago < currentVenta.total && (
                                                    <div style={{ color: 'red', fontSize: '0.8rem' }}>
                                                        El monto debe ser mayor o igual al total (S/ {currentVenta.total.toFixed(2)})
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {currentVenta.metodoPago.tipo === 'yape' && (
                                            <div className="qr-container">
                                                <i className="fab fa-yape"></i>
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
        </Modal>
    );
};