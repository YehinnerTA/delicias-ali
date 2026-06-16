import React, { useState, useEffect } from 'react';
import { Modal } from '../Modal';
import { useCateringSales } from '../../../../context/CateringContext';
import { useToast } from '../../../../hooks/base/useToast';
import { VentaCatering, ServicioCatering, MaterialVenta, CANTIDAD_MINIMA_PRODUCTOS, SERVICIOS_DISPONIBLES, CATALOGO_MATERIALES } from '../../../../features/types/catering';
import { generarVistaPreviaHTML, generarPDF } from '../../../../services/pdf/pdfService';

interface NewCateringModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (venta: VentaCatering) => void;
}

interface VentaTemporal {
    cliente: { nombre: string; documento: string };
    servicios: ServicioCatering[];
    materiales: MaterialVenta[];
    eventoData: { fecha: string; horario: string; personas: number; tipoDesayuno: string };
    descuentoActivo: boolean;
    descuentoTipo: 'porcentaje' | 'monto';
    descuentoValor: number;
    cuponActivo: boolean;
    cuponCodigo: string;
    cuponValor: number;
    metodoPago: string;
    subtotal: number;
    igv: number;
    total: number;
}

export const NewCateringModal: React.FC<NewCateringModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const { ventas, serviciosDisponibles, catalogoMateriales, addActivity, addToHistory, getNextNumeroVenta } = useCateringSales();
    const { showToast } = useToast();

    const [currentVenta, setCurrentVenta] = useState<VentaTemporal>({
        cliente: { nombre: "", documento: "" },
        servicios: [],
        materiales: [],
        eventoData: { fecha: "", horario: "12:00", personas: 1, tipoDesayuno: "Clásico" },
        descuentoActivo: false,
        descuentoTipo: 'porcentaje',
        descuentoValor: 0,
        cuponActivo: false,
        cuponCodigo: "",
        cuponValor: 0,
        metodoPago: "EFECTIVO",
        subtotal: 0, igv: 0, total: 0
    });

    const [tipoComprobante, setTipoComprobante] = useState<'ticket' | 'factura'>('ticket');
    const [fasesAbiertas, setFasesAbiertas] = useState<{ [key: number]: boolean }>({ 1: true, 2: false, 3: false, 4: false, 5: false, 6: false });

    const toggleFase = (fase: number) => {
        setFasesAbiertas(prev => ({ ...prev, [fase]: !prev[fase] }));
    };

    const calcularTotales = () => {
        let subtotalServicios = currentVenta.servicios.reduce((s, serv) =>
            s + serv.productos.reduce((sum, p) => sum + p.cantidad * p.precio, 0), 0);
        let subtotalMateriales = currentVenta.materiales.reduce((s, m) => s + m.cantidad * m.precio, 0);
        let subtotal = subtotalServicios + subtotalMateriales;

        let desc = 0;
        if (currentVenta.descuentoActivo) {
            if (currentVenta.descuentoTipo === "porcentaje") {
                desc = subtotal * (currentVenta.descuentoValor / 100);
            } else {
                desc = currentVenta.descuentoValor;
            }
        }
        if (currentVenta.cuponActivo && currentVenta.cuponValor > 0) {
            desc += currentVenta.cuponValor;
        }
        desc = Math.min(desc, subtotal);

        const after = subtotal - desc;
        const igv = after * 0.18;
        const total = after + igv;

        setCurrentVenta(prev => ({ ...prev, subtotal, igv, total }));
    };

    useEffect(() => {
        calcularTotales();
    }, [currentVenta.servicios, currentVenta.materiales, currentVenta.descuentoActivo,
    currentVenta.descuentoValor, currentVenta.descuentoTipo, currentVenta.cuponActivo, currentVenta.cuponValor]);

    // ============ SERVICIOS ============
    const agregarNuevoServicio = () => {
        const select = document.getElementById('nuevoServicioSelect') as HTMLSelectElement;
        const tipoKey = select.value;
        const servicioInfo = serviciosDisponibles[tipoKey];
        if (!servicioInfo) return;

        const nuevoServicio: ServicioCatering = {
            id: Date.now(),
            tipoKey: tipoKey,
            tipoNombre: servicioInfo.nombre,
            productos: []
        };
        setCurrentVenta(prev => ({
            ...prev,
            servicios: [...prev.servicios, nuevoServicio]
        }));
        showToast(`Servicio "${servicioInfo.nombre}" agregado`, "success");
    };

    const eliminarServicio = (servicioId: number) => {
        setCurrentVenta(prev => ({
            ...prev,
            servicios: prev.servicios.filter(s => s.id !== servicioId)
        }));
        showToast("Servicio eliminado", "info");
    };

    const agregarProductoAServicio = (servicioId: number) => {
        const servicio = currentVenta.servicios.find(s => s.id === servicioId);
        if (!servicio) return;

        const select = document.getElementById(`select-prod-${servicioId}`) as HTMLSelectElement;
        const cantidadInput = document.getElementById(`cant-prod-${servicioId}`) as HTMLInputElement;
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
        setCurrentVenta({ ...currentVenta });
        select.value = "";
        cantidadInput.value = CANTIDAD_MINIMA_PRODUCTOS.toString();
    };

    const eliminarProductoDeServicio = (servicioId: number, prodIndex: number) => {
        const servicio = currentVenta.servicios.find(s => s.id === servicioId);
        if (servicio) {
            servicio.productos.splice(prodIndex, 1);
            setCurrentVenta({ ...currentVenta });
        }
    };

    const actualizarCantProdServicio = (servicioId: number, prodIndex: number, nuevaCant: string) => {
        let cantidad = parseInt(nuevaCant) || 1;
        if (cantidad < CANTIDAD_MINIMA_PRODUCTOS) {
            showToast(`⚠️ Cantidad mínima ${CANTIDAD_MINIMA_PRODUCTOS}`, "warning");
            cantidad = CANTIDAD_MINIMA_PRODUCTOS;
        }
        const servicio = currentVenta.servicios.find(s => s.id === servicioId);
        if (servicio && servicio.productos[prodIndex]) {
            servicio.productos[prodIndex].cantidad = cantidad;
            setCurrentVenta({ ...currentVenta });
        }
    };

    const actualizarPrecioProducto = (servicioId: number, prodIndex: number, nuevoPrecio: string) => {
        const precio = parseFloat(nuevoPrecio) || 0;
        const servicio = currentVenta.servicios.find(s => s.id === servicioId);
        if (servicio && servicio.productos[prodIndex]) {
            servicio.productos[prodIndex].precio = precio;
            setCurrentVenta({ ...currentVenta });
        }
    };

    // ============ MATERIALES ============
    const agregarMaterial = () => {
        const select = document.getElementById('materialSelect') as HTMLSelectElement;
        const cantidadInput = document.getElementById('cantidadMaterial') as HTMLInputElement;
        if (!select || !cantidadInput) return;

        const matId = parseInt(select.value);
        const cantidad = parseInt(cantidadInput.value) || 1;
        const material = catalogoMateriales.find(m => m.id === matId);
        if (!material) return;

        const existente = currentVenta.materiales.find(m => m.id === material.id);
        if (existente) {
            existente.cantidad += cantidad;
        } else {
            currentVenta.materiales.push({ ...material, cantidad });
        }
        setCurrentVenta({ ...currentVenta });
        select.value = "";
        cantidadInput.value = "1";
    };

    const eliminarMaterial = (idx: number) => {
        currentVenta.materiales.splice(idx, 1);
        setCurrentVenta({ ...currentVenta });
    };

    const actualizarCantMaterial = (idx: number, val: string) => {
        const cantidad = parseInt(val) || 1;
        currentVenta.materiales[idx].cantidad = cantidad;
        setCurrentVenta({ ...currentVenta });
    };

    const actualizarPrecioMaterial = (idx: number, nuevoPrecio: string) => {
        const precio = parseFloat(nuevoPrecio) || 0;
        currentVenta.materiales[idx].precio = precio;
        setCurrentVenta({ ...currentVenta });
    };

    // ============ DESCUENTOS Y PAGO ============
    const toggleDescuento = () => {
        setCurrentVenta(prev => ({ ...prev, descuentoActivo: !prev.descuentoActivo }));
    };

    const toggleCupon = () => {
        setCurrentVenta(prev => ({ ...prev, cuponActivo: !prev.cuponActivo }));
    };

    const actualizarDescuento = () => {
        const tipo = (document.getElementById('descTipo') as HTMLSelectElement)?.value as 'porcentaje' | 'monto';
        const valor = parseFloat((document.getElementById('descValor') as HTMLInputElement)?.value) || 0;
        setCurrentVenta(prev => ({
            ...prev,
            descuentoTipo: tipo,
            descuentoValor: valor
        }));
    };

    const aplicarCupon = () => {
        const codigo = (document.getElementById('cuponCodigo') as HTMLInputElement)?.value;
        if (codigo === "DESCUENTO10") {
            setCurrentVenta(prev => ({
                ...prev,
                cuponActivo: true,
                cuponCodigo: codigo,
                cuponValor: 10
            }));
            showToast("Cupón S/10 aplicado", "success", "Cupón");
        } else if (codigo === "BIENVENIDO") {
            setCurrentVenta(prev => ({
                ...prev,
                cuponActivo: true,
                cuponCodigo: codigo,
                cuponValor: 20
            }));
            showToast("Cupón S/20 aplicado", "success", "Cupón");
        } else if (codigo && codigo !== "") {
            showToast("Cupón inválido", "error", "Error");
        }
    };

    const seleccionarMetodo = (metodo: string) => {
        setCurrentVenta(prev => ({ ...prev, metodoPago: metodo }));
    };

    // ============ REGISTRAR VENTA ============
    const registrarVenta = () => {
        const clienteNombre = (document.getElementById('clienteNombre') as HTMLInputElement)?.value.trim();
        const clienteDoc = (document.getElementById('clienteDoc') as HTMLInputElement)?.value || "";

        if (!clienteNombre) {
            showToast("Ingrese el nombre del cliente", "warning", "Campos incompletos");
            return;
        }
        if (currentVenta.servicios.length === 0 && currentVenta.materiales.length === 0) {
            showToast("Agregue al menos un servicio o material", "warning", "Campos incompletos");
            return;
        }

        const eventoFecha = (document.getElementById('eventoFecha') as HTMLInputElement)?.value || "";
        const eventoHorario = (document.getElementById('eventoHorario') as HTMLInputElement)?.value || "12:00";
        const eventoPersonas = parseInt((document.getElementById('eventoPersonas') as HTMLInputElement)?.value) || 1;
        const eventoTipoDesayuno = (document.getElementById('eventoTipoDesayuno') as HTMLSelectElement)?.value || "Clásico";

        const nuevaVenta: VentaCatering = {
            id: Date.now(),
            numero: getNextNumeroVenta(),
            fecha: new Date().toLocaleString(),
            fechaObj: new Date(),
            cliente: clienteNombre,
            clienteDoc,
            servicios: JSON.parse(JSON.stringify(currentVenta.servicios)),
            materiales: JSON.parse(JSON.stringify(currentVenta.materiales)),
            eventoData: { fecha: eventoFecha, horario: eventoHorario, personas: eventoPersonas, tipoDesayuno: eventoTipoDesayuno },
            subtotal: currentVenta.subtotal,
            descuento: currentVenta.descuentoActivo ? currentVenta.descuentoValor : 0,
            igv: currentVenta.igv,
            total: currentVenta.total,
            metodoPago: currentVenta.metodoPago,
            estado: 'completada',
            devoluciones: [],
            historial: []
        };

        addToHistory(nuevaVenta, "CREACIÓN", `${nuevaVenta.servicios.length} servicio(s), ${nuevaVenta.materiales.length} material(es) - Total S/ ${nuevaVenta.total}`);
        addActivity("VENTA", "ventas", `${nuevaVenta.numero} - ${nuevaVenta.cliente} - S/ ${nuevaVenta.total}`);
        generarPDF(nuevaVenta as any, tipoComprobante);
        showToast(`Venta ${nuevaVenta.numero} registrada y PDF generado`, "success", "Venta registrada");

        onSuccess(nuevaVenta);
        onClose();
    };

    // ============ VISTA PREVIA ============
    const ventaPreview = {
        cliente: (document.getElementById('clienteNombre') as HTMLInputElement)?.value || "Cliente",
        servicios: currentVenta.servicios,
        materiales: currentVenta.materiales,
        subtotal: currentVenta.subtotal,
        descuento: currentVenta.descuentoActivo ? currentVenta.descuentoValor : 0,
        igv: currentVenta.igv,
        total: currentVenta.total,
        numero: getNextNumeroVenta()
    };

    const actualizarPrevisualizacion = () => {
        const previewDiv = document.getElementById('vistaPreviaContenido');
        if (previewDiv) {
            const tipo = (document.getElementById('tipoComprobantePreview') as HTMLSelectElement)?.value as 'ticket' | 'factura' || 'ticket';
            previewDiv.innerHTML = generarVistaPreviaHTML(ventaPreview as any, tipo);
        }
    };

    // ============ RENDERIZAR SERVICIOS ============
    const renderServicios = () => {
        if (currentVenta.servicios.length === 0) {
            return <div className="empty-servicios">No hay servicios agregados.</div>;
        }

        return currentVenta.servicios.map(serv => {
            const catalogoServ = serviciosDisponibles[serv.tipoKey];
            const selectOptions = catalogoServ.carta.map(p =>
                `<option value="${p.id}">${p.nombre} - S/ ${p.precio}</option>`
            ).join('');

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
                                <label>Servicio</label>
                                <select id={`select-prod-${serv.id}`} dangerouslySetInnerHTML={{ __html: selectOptions }} />
                            </div>
                            <div className="dc-input-group">
                                <label>Cantidad</label>
                                <input type="number" id={`cant-prod-${serv.id}`} defaultValue={CANTIDAD_MINIMA_PRODUCTOS} min={CANTIDAD_MINIMA_PRODUCTOS} />
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

    // ============ RENDERIZAR MATERIALES ============
    const renderMateriales = () => {
        if (currentVenta.materiales.length === 0) {
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
                        {currentVenta.materiales.map((m, idx) => (
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

    const serviciosOptions = Object.keys(serviciosDisponibles).map(key =>
        `<option value="${key}">${serviciosDisponibles[key].nombre}</option>`
    ).join('');

    const materialesOptions = catalogoMateriales.map(m =>
        `<option value="${m.id}">${m.nombre} - S/ ${m.precio}</option>`
    ).join('');

    const modalFooter = (
        <>
            <button className="dc-btn secondary" onClick={onClose}>Cancelar</button>
            <button className="dc-btn success" onClick={registrarVenta}>
                <i className="fas fa-check-circle"></i> Registrar e Imprimir
            </button>
        </>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Nueva Venta - Catering" icon="fa-shopping-cart" footer={modalFooter}>
            <div className="split-layout">
                <div className="split-left">
                    {/* Fase 1: Datos del Cliente */}
                    <div className="fase">
                        <div className="fase-header" onClick={() => toggleFase(1)}>
                            <span><i className="fas fa-user"></i>Fase 1: Datos del Cliente</span>
                            <i className="fas fa-chevron-down"></i>
                        </div>
                        {fasesAbiertas[1] && (
                            <div className="fase-body">
                                <div className="dc-form-grid">
                                    <div className="dc-input-group">
                                        <label>Nombre del Cliente:</label>
                                        <input type="text" id="clienteNombre" onChange={actualizarPrevisualizacion} />
                                    </div>
                                    <div className="dc-input-group">
                                        <label>Documento:</label>
                                        <input type="text" id="clienteDoc" />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Fase 2: Servicios de Catering */}
                    <div className="fase">
                        <div className="fase-header" onClick={() => toggleFase(2)}>
                            <span><i className="fas fa-boxes"></i> Fase 2: Servicios de Catering</span>
                            <i className="fas fa-chevron-down"></i>
                        </div>
                        {fasesAbiertas[2] && (
                            <div className="fase-body">
                                <div className="dc-form-grid">
                                    <div className="dc-input-group">
                                        <label>Servicio</label>
                                        <select id="nuevoServicioSelect" dangerouslySetInnerHTML={{ __html: serviciosOptions }} />
                                    </div>
                                    <button className="dc-btn info" onClick={agregarNuevoServicio}>
                                        <i className="fas fa-plus"></i> Agregar Servicio
                                    </button>
                                </div>
                                <div id="fase-body">
                                    {renderServicios()}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Fase 3: Materiales y Equipamiento */}
                    <div className="fase">
                        <div className="fase-header" onClick={() => toggleFase(3)}>
                            <span><i className="fas fa-chair"></i> Fase 3: Materiales y Equipamiento</span>
                            <i className="fas fa-chevron-down"></i>
                        </div>
                        {fasesAbiertas[3] && (
                            <div className="fase-body">
                                <div className="dc-form-grid">
                                    <div className="dc-input-group">
                                        <label htmlFor="materialSelect">Material</label>
                                        <select id="materialSelect" dangerouslySetInnerHTML={{ __html: materialesOptions }} />
                                    </div>
                                    <div className="dc-input-group">
                                        <label htmlFor="cantidadMaterial">Cantidad</label>
                                        <input type="number" id="cantidadMaterial" defaultValue="1" min="1" />
                                    </div>
                                    <button className="dc-btn info" onClick={agregarMaterial}>
                                        <i className="fas fa-plus"></i> Agregar Material
                                    </button>
                                </div>
                                <div id="materialesContainer">
                                    {renderMateriales()}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Fase 4: Planificación del Evento */}
                    <div className="fase">
                        <div className="fase-header" onClick={() => toggleFase(4)}>
                            <span><i className="fas fa-calendar-alt"></i> Fase 4: Planificación del Evento</span>
                            <i className="fas fa-chevron-down"></i>
                        </div>
                        {fasesAbiertas[4] && (
                            <div className="fase-body">
                                <div className="dc-info-grid">
                                    <div className="dc-input-group">
                                        <label>Fecha</label>
                                        <input type="date" id="eventoFecha" onChange={actualizarPrevisualizacion} />
                                    </div>
                                    <div className="dc-input-group">
                                        <label>Horario</label>
                                        <input type="time" id="eventoHorario" defaultValue="12:00" />
                                    </div>
                                    <div className="dc-input-group">
                                        <label>Personas</label>
                                        <input type="number" id="eventoPersonas" min="1" defaultValue="1" />
                                    </div>
                                    <div className="dc-input-group">
                                        <label>Tipo Desayuno</label>
                                        <select id="eventoTipoDesayuno" defaultValue="Clásico">
                                            <option>Clásico</option>
                                            <option>Light</option>
                                            <option>Premium</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Fase 5: Descuentos y Promociones */}
                    <div className="fase">
                        <div className="fase-header" onClick={() => toggleFase(5)}>
                            <span><i className="fas fa-tags"></i> Fase 5: Descuentos y Promociones</span>
                            <i className="fas fa-chevron-down"></i>
                        </div>
                        {fasesAbiertas[5] && (
                            <div className="fase-body">
                                <div className="componentes-grid">
                                    <div className="componente-card">
                                        <div className="componente-header">
                                            <strong>💰 Descuento</strong>
                                            <div className={`toggle-componente ${currentVenta.descuentoActivo ? 'active' : ''}`} onClick={toggleDescuento}>
                                                <div className="toggle-slider"></div>
                                            </div>
                                        </div>
                                        {currentVenta.descuentoActivo && (
                                            <div className="dc-input-group">
                                                <select id="descTipo" onChange={actualizarDescuento}>
                                                    <option value="porcentaje">% Porcentaje</option>
                                                    <option value="monto">S/ Monto fijo</option>
                                                </select>
                                                <input type="number" id="descValor" placeholder="Valor" defaultValue={currentVenta.descuentoValor} onChange={actualizarDescuento} />
                                            </div>
                                        )}
                                    </div>
                                    <div className="componente-card">
                                        <div className="componente-header">
                                            <strong>🎫 Cupón</strong>
                                            <div className={`toggle-componente ${currentVenta.cuponActivo ? 'active' : ''}`} onClick={toggleCupon}>
                                                <div className="toggle-slider"></div>
                                            </div>
                                        </div>
                                        {currentVenta.cuponActivo && (
                                            <div className="dc-input-group">
                                                <input type="text" id="cuponCodigo" placeholder="DESCUENTO10 o BIENVENIDO" onBlur={aplicarCupon} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Fase 6: Método de Pago */}
                    <div className="fase">
                        <div className="fase-header" onClick={() => toggleFase(6)}>
                            <span><i className="fas fa-credit-card"></i> Fase 6: Método de Pago</span>
                            <i className="fas fa-chevron-down"></i>
                        </div>
                        {fasesAbiertas[6] && (
                            <div className="fase-body">
                                <div className="metodos-pago">
                                    {['EFECTIVO', 'TARJETA', 'YAPE', 'PLIN'].map(m => (
                                        <div key={m} className={`metodo-btn ${currentVenta.metodoPago === m ? 'selected' : ''}`} onClick={() => seleccionarMetodo(m)}>
                                            <i className={`fas ${m === 'EFECTIVO' ? 'fa-money-bill' : m === 'TARJETA' ? 'fa-credit-card' : 'fa-mobile-alt'}`}></i> {m}
                                        </div>
                                    ))}
                                </div>
                                <div id="pagoDetalle" className="dc-input-group">
                                    {currentVenta.metodoPago === 'EFECTIVO' && (
                                        <div>
                                            <label>💰 Monto recibido:</label>
                                            <input type="number" id="montoPago" placeholder="S/ " />
                                            <div className="info-note">
                                                <strong>Vuelto:</strong> S/ <span id="vuelto">0.00</span>
                                            </div>
                                        </div>
                                    )}
                                    {currentVenta.metodoPago === 'YAPE' && (
                                        <div className="qr-container">
                                            <i className="fab fa-yape"></i>
                                            <p><strong>Yape</strong> - 999 888 777</p>
                                            <p>Total: S/ {currentVenta.total.toFixed(2)}</p>
                                        </div>
                                    )}
                                    {currentVenta.metodoPago === 'PLIN' && (
                                        <div className="qr-container">
                                            <i className="fas fa-mobile-alt"></i>
                                            <p><strong>Plin</strong> - 999 888 777</p>
                                            <p>Total: S/ {currentVenta.total.toFixed(2)}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Totales */}
                    <div className="totales">
                        <div className="total-line">Subtotal: <span>S/ {currentVenta.subtotal.toFixed(2)}</span></div>
                        <div className="total-line">Descuento: <span>S/ {(currentVenta.descuentoActivo ? currentVenta.descuentoValor : 0).toFixed(2)}</span></div>
                        <div className="total-line">IGV: <span>S/ {currentVenta.igv.toFixed(2)}</span></div>
                        <div className="total-line total-grande">TOTAL: <span>S/ {currentVenta.total.toFixed(2)}</span></div>
                    </div>
                </div>

                <div className="split-right">
                    <div className="dc-input-group" style={{ marginBottom: '15px' }}>
                        <label><strong>Tipo de comprobante:</strong></label>
                        <select id="tipoComprobantePreview" value={tipoComprobante} onChange={(e) => setTipoComprobante(e.target.value as any)}>
                            <option value="ticket">Ticket</option>
                            <option value="factura">Factura Electrónica</option>
                        </select>
                    </div>
                    <div id="vistaPreviaContenido" dangerouslySetInnerHTML={{ __html: generarVistaPreviaHTML(ventaPreview as any, tipoComprobante) }} />
                </div>
            </div>
        </Modal>
    );
};