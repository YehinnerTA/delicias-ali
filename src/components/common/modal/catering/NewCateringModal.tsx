import React, { useState, useEffect } from 'react';
import { Modal } from '../Modal';
import { ConfirmModal } from '../confirmModal';
import { useCateringService } from '../../../../context/CateringContext';
import { useAuth } from '../../../../features/auth/context/AuthContext';
import { useCompany } from '../../../../features/company/context/CompanyContext';
import { useToast } from '../../../../hooks/base/useToast';
import { ServicioCatering, MaterialVenta, ProductoVenta, VentaTemporal, ProductoCarta, CANTIDAD_MINIMA_PRODUCTOS } from '../../../../features/types/catering';
import { generarVistaPreviaHTML, generarPDF } from '../../../../services/pdf/pdfService';
import { personaApi } from '../../../../services/api/personaApi';
import { Persona } from '../../../../features/types/person';

interface NewCateringModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

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

const separarFechaHora = (fechaHora: string): { fecha: string; horario: string } => {
    if (!fechaHora) return { fecha: '', horario: '' };
    const [fecha, horario] = fechaHora.split('T');
    return {
        fecha: fecha || '',
        horario: horario ? horario.substring(0, 5) : ''
    };
};

const getCurrentDateTimeLocal = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export const NewCateringModal: React.FC<NewCateringModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const { serviciosDisponibles, catalogoMateriales, addActivity, addToHistory, getNextNumeroVenta, refreshData } = useCateringService();
    const { user } = useAuth();
    const { getSelectedCompanyId } = useCompany();
    const id_empresa = getSelectedCompanyId() ?? 0;
    const { showToast } = useToast();

    const [confirmModalOpen, setConfirmModalOpen] = useState(false);
    const [documentoPendiente, setDocumentoPendiente] = useState<string>('');

    const getInitialVenta = (): VentaTemporal => ({
        id_empresa,
        cliente: { nombre: "", documento: "" },
        servicios: [],
        materiales: [],
        eventoData: { fechaHora: "", personas: 1, tipoDesayuno: "Clásico" },
        descuentoActivo: false,
        descuentoTipo: 'porcentaje',
        descuentoValor: 0,
        cuponActivo: false,
        cuponCodigo: "",
        cuponValor: 0,
        metodoPago: "EFECTIVO",
        subtotal: 0, igv: 0, total: 0
    });

    const [currentVenta, setCurrentVenta] = useState<VentaTemporal>(getInitialVenta());

    const [tipoComprobante, setTipoComprobante] = useState<'ticket' | 'factura'>('ticket');
    const [fasesAbiertas, setFasesAbiertas] = useState<{ [key: number]: boolean }>({ 1: true, 2: false, 3: false, 4: false, 5: false, 6: false });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [clienteSeleccionado, setClienteSeleccionado] = useState<Persona | null>(null);
    const [isSearching, setIsSearching] = useState(false);

    const CLIENTE_VARIOS_DOCUMENTO = '00000000';
    const CLIENTE_VARIOS_NOMBRE = 'VARIOS';

    const toggleFase = (fase: number) => {
        setFasesAbiertas(prev => ({ ...prev, [fase]: !prev[fase] }));
    };

    const resetForm = () => {
        setCurrentVenta(getInitialVenta());
        setClienteSeleccionado(null);
        setConfirmModalOpen(false);
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

    useEffect(() => {
        if (isOpen) {
            resetForm();
        }
    }, [isOpen]);

    const buscarClientePorDocumento = async (documento: string) => {
        if (!documento || documento.length < 8) {
            setClienteSeleccionado(null);
            setCurrentVenta(prev => ({
                ...prev,
                cliente: { nombre: '', documento: '' }
            }));
            return;
        }

        const esDNI = /^\d{8}$/.test(documento);
        const esRUC = /^\d{11}$/.test(documento);

        if (!esDNI && !esRUC) {
            showToast('Ingrese DNI (8 dígitos) o RUC (11 dígitos)', 'warning', 'Formato inválido');
            return;
        }

        setIsSearching(true);

        try {
            const persona = await personaApi.searchByDocumento(id_empresa, documento);

            if (persona) {
                setClienteSeleccionado(persona);
                const nombreCompleto = persona.tipo_documento === 'DNI'
                    ? `${persona.nombre || ''} ${persona.apellido || ''}`.trim()
                    : persona.razon_social || persona.nombre || '';

                setCurrentVenta(prev => ({
                    ...prev,
                    cliente: { nombre: nombreCompleto, documento: persona.numero_documento }
                }));

                showToast(`Cliente encontrado: ${nombreCompleto}`, 'success', 'Cliente encontrado');
            } else {
                setClienteSeleccionado(null);
                setCurrentVenta(prev => ({
                    ...prev,
                    cliente: { nombre: '', documento }
                }));

                setDocumentoPendiente(documento);
                setConfirmModalOpen(true);
            }
        } catch (error) {
            showToast('Error al buscar el cliente', 'error', 'Error');
        } finally {
            setIsSearching(false);
        }
    };

    const confirmarRegistroAutomatico = async () => {
        if (documentoPendiente) {
            await registrarClienteAutomatico(documentoPendiente);
            setDocumentoPendiente('');
            setConfirmModalOpen(false);
        }
    };

    const cancelarRegistroAutomatico = () => {
        setDocumentoPendiente('');
        setConfirmModalOpen(false);
        setCurrentVenta(prev => ({
            ...prev,
            cliente: { nombre: '', documento: '' }
        }));
    };

    const registrarClienteAutomatico = async (documento: string) => {
        try {
            const esDNI = /^\d{8}$/.test(documento);
            const esRUC = /^\d{11}$/.test(documento);

            if (!esDNI && !esRUC) {
                showToast('Documento inválido para registro', 'error', 'Error');
                return;
            }

            const tipoDocumento = esDNI ? 'DNI' : 'RUC';
            const tipoPersona = esDNI ? 'cliente_natural' : 'cliente_juridico';

            const personaData: Omit<Persona, 'id_persona' | 'historial'> = {
                id_empresa,
                tipo_persona: tipoPersona,
                tipo_documento: tipoDocumento,
                numero_documento: documento,
                razon_social: esRUC ? 'CLIENTE GENÉRICO' : null,
                nombre: esDNI ? 'CLIENTE GENÉRICO' : null,
                apellido: esDNI ? '' : null,
                email: '',
                celular: '000000000',
                estado: true
            };

            const nuevaPersona = await personaApi.create(personaData);

            if (nuevaPersona) {
                setClienteSeleccionado(nuevaPersona);
                const nombreCompleto = esDNI
                    ? `${nuevaPersona.nombre || 'CLIENTE GENÉRICO'} ${nuevaPersona.apellido || ''}`.trim()
                    : nuevaPersona.razon_social || 'CLIENTE GENÉRICO';

                setCurrentVenta(prev => ({
                    ...prev,
                    cliente: {
                        nombre: nombreCompleto,
                        documento: nuevaPersona.numero_documento
                    }
                }));

                showToast(`Cliente registrado automáticamente: ${nombreCompleto}`, 'success', 'Cliente registrado');
            }
        } catch (error) {
            showToast('Error al registrar el cliente automáticamente', 'error', 'Error');
        }
    };

    const cargarClienteVarios = () => {
        setCurrentVenta(prev => ({
            ...prev,
            cliente: {
                nombre: CLIENTE_VARIOS_NOMBRE,
                documento: CLIENTE_VARIOS_DOCUMENTO
            }
        }));
        setClienteSeleccionado(null);
        showToast('Cliente VARIOS cargado', 'info', 'Cliente cargado');
    };

    const agregarNuevoServicio = () => {
        const select = document.getElementById('nuevoServicioSelect') as HTMLSelectElement;
        const tipoKey = select.value;
        const servicioInfo = serviciosDisponibles[tipoKey];
        if (!servicioInfo) {
            showToast("Seleccione un servicio válido", "warning", "Error");
            return;
        }

        const nuevoServicio: ServicioCatering = {
            id: Date.now(),
            id_empresa: id_empresa,
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
        if (!servicio) {
            showToast("Servicio no encontrado", "error", "Error");
            return;
        }

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
        if (!catalogoServ) {
            showToast("Catálogo de servicio no encontrado", "error", "Error");
            return;
        }

        const producto = catalogoServ.carta.find((p: ProductoCarta) => p.id === prodId);
        if (!producto) {
            showToast("Producto no encontrado en el catálogo", "error", "Error");
            return;
        }

        setCurrentVenta(prev => {
            const servIndex = prev.servicios.findIndex(s => s.id === servicioId);
            if (servIndex === -1) return prev;

            const serv = prev.servicios[servIndex];
            const prodIndex = serv.productos.findIndex((p: ProductoVenta) => p.id === producto.id);
            let nuevosProductos;
            if (prodIndex !== -1) {
                nuevosProductos = serv.productos.map((p: ProductoVenta, idx: number) =>
                    idx === prodIndex ? { ...p, cantidad: p.cantidad + cantidad } : p
                );
            } else {
                nuevosProductos = [...serv.productos, { ...producto, cantidad }];
            }

            const nuevosServicios = prev.servicios.map((s, idx) =>
                idx === servIndex ? { ...s, productos: nuevosProductos } : s
            );

            return {
                ...prev,
                servicios: nuevosServicios
            };
        });

        select.value = "";
        cantidadInput.value = CANTIDAD_MINIMA_PRODUCTOS.toString();
        showToast(`Producto agregado al servicio`, "success", "Producto agregado");
    };

    const eliminarProductoDeServicio = (servicioId: number, prodIndex: number) => {
        setCurrentVenta(prev => {
            const servIndex = prev.servicios.findIndex(s => s.id === servicioId);
            if (servIndex === -1) return prev;

            const serv = prev.servicios[servIndex];
            const nuevosProductos = serv.productos.filter((_, idx) => idx !== prodIndex);
            const nuevosServicios = prev.servicios.map((s, idx) =>
                idx === servIndex ? { ...s, productos: nuevosProductos } : s
            );

            return {
                ...prev,
                servicios: nuevosServicios
            };
        });
        showToast("Producto eliminado del servicio", "info");
    };

    const actualizarCantProdServicio = (servicioId: number, prodIndex: number, nuevaCant: string) => {
        let cantidad = parseInt(nuevaCant) || 1;
        if (cantidad < CANTIDAD_MINIMA_PRODUCTOS) {
            showToast(`⚠️ Cantidad mínima ${CANTIDAD_MINIMA_PRODUCTOS}`, "warning");
            cantidad = CANTIDAD_MINIMA_PRODUCTOS;
        }

        setCurrentVenta(prev => {
            const servIndex = prev.servicios.findIndex(s => s.id === servicioId);
            if (servIndex === -1) return prev;

            const serv = prev.servicios[servIndex];
            const nuevosProductos = serv.productos.map((p, idx) =>
                idx === prodIndex ? { ...p, cantidad } : p
            );
            const nuevosServicios = prev.servicios.map((s, idx) =>
                idx === servIndex ? { ...s, productos: nuevosProductos } : s
            );

            return {
                ...prev,
                servicios: nuevosServicios
            };
        });
    };

    const actualizarPrecioProducto = (servicioId: number, prodIndex: number, nuevoPrecio: string) => {
        const precio = parseFloat(nuevoPrecio) || 0;

        setCurrentVenta(prev => {
            const servIndex = prev.servicios.findIndex(s => s.id === servicioId);
            if (servIndex === -1) return prev;

            const serv = prev.servicios[servIndex];
            const nuevosProductos = serv.productos.map((p, idx) =>
                idx === prodIndex ? { ...p, precio } : p
            );
            const nuevosServicios = prev.servicios.map((s, idx) =>
                idx === servIndex ? { ...s, productos: nuevosProductos } : s
            );

            return {
                ...prev,
                servicios: nuevosServicios
            };
        });
    };

    const agregarMaterial = () => {
        const select = document.getElementById('materialSelect') as HTMLSelectElement;
        const cantidadInput = document.getElementById('cantidadMaterial') as HTMLInputElement;
        if (!select || !cantidadInput) return;

        const matId = parseInt(select.value);
        const cantidad = parseInt(cantidadInput.value) || 1;
        const material = catalogoMateriales.find((m: MaterialVenta) => m.id === matId);
        if (!material) return;

        setCurrentVenta(prev => {
            const existente = prev.materiales.find((m: MaterialVenta) => m.id === material.id);
            let nuevosMateriales;
            if (existente) {
                nuevosMateriales = prev.materiales.map((m: MaterialVenta) =>
                    m.id === material.id ? { ...m, cantidad: m.cantidad + cantidad } : m
                );
            } else {
                nuevosMateriales = [...prev.materiales, { ...material, cantidad }];
            }
            return { ...prev, materiales: nuevosMateriales };
        });

        select.value = "";
        cantidadInput.value = "1";
    };

    const eliminarMaterial = (idx: number) => {
        setCurrentVenta(prev => ({
            ...prev,
            materiales: prev.materiales.filter((_, i) => i !== idx)
        }));
    };

    const actualizarCantMaterial = (idx: number, val: string) => {
        const cantidad = parseInt(val) || 1;
        setCurrentVenta(prev => ({
            ...prev,
            materiales: prev.materiales.map((m, i) => i === idx ? { ...m, cantidad } : m)
        }));
    };

    const actualizarPrecioMaterial = (idx: number, nuevoPrecio: string) => {
        const precio = parseFloat(nuevoPrecio) || 0;
        setCurrentVenta(prev => ({
            ...prev,
            materiales: prev.materiales.map((m, i) => i === idx ? { ...m, precio } : m)
        }));
    };

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

    const registrarVenta = async () => {
        if (!id_empresa) {
            showToast('No se ha seleccionado una empresa', 'warning', 'Advertencia');
            return;
        }

        const clienteNombre = currentVenta.cliente.nombre?.trim() || '';
        const clienteDoc = currentVenta.cliente.documento?.trim() || '';

        if (!clienteNombre) {
            showToast("Ingrese el nombre del cliente", "warning", "Campos incompletos");
            return;
        }
        if (!clienteDoc) {
            showToast("Ingrese el documento del cliente", "warning", "Campos incompletos");
            return;
        }
        if (currentVenta.servicios.length === 0 && currentVenta.materiales.length === 0) {
            showToast("Agregue al menos un servicio o material", "warning", "Campos incompletos");
            return;
        }

        const userId = user?.id;
        if (!userId) {
            showToast('No se pudo identificar al usuario', 'error', 'Error de autenticación');
            return;
        }

        const { fecha, horario } = separarFechaHora(currentVenta.eventoData.fechaHora);
        const eventoPersonas = currentVenta.eventoData.personas || 1;
        const eventoTipoDesayuno = currentVenta.eventoData.tipoDesayuno || "Clásico";

        setIsSubmitting(true);
        try {
            const payload = {
                cliente_documento: clienteDoc,
                cliente_nombre: clienteNombre,
                cliente_apellido: '',
                cliente_email: '',
                cliente_celular: '000000000',
                servicios: currentVenta.servicios.map(serv => ({
                    id_empresa: serv.id_empresa,
                    tipoKey: serv.tipoKey,
                    productos: serv.productos.map(p => ({
                        id: p.id,
                        nombre: p.nombre,
                        precio: p.precio,
                        cantidad: p.cantidad
                    }))
                })),
                materiales: currentVenta.materiales.map(m => ({
                    id: m.id,
                    nombre: m.nombre,
                    precio: m.precio,
                    cantidad: m.cantidad
                })),
                eventoData: {
                    fecha: fecha,
                    horario: horario,
                    personas: eventoPersonas,
                    tipoDesayuno: eventoTipoDesayuno
                },
                subtotal: currentVenta.subtotal,
                descuento: currentVenta.descuentoActivo ? currentVenta.descuentoValor : 0,
                igv: currentVenta.igv,
                total: currentVenta.total,
                metodo_pago: currentVenta.metodoPago,
                usuario_id: userId
            };

            const { cateringServiceApi } = await import('../../../../services/api/cateringServiceApi');
            const nuevaVenta = await cateringServiceApi.create(id_empresa, payload);

            await refreshData();

            await addActivity("VENTA", "ventas", `${nuevaVenta.numero} - ${nuevaVenta.cliente} - S/ ${nuevaVenta.total}`);
            await addToHistory(nuevaVenta, "CREACIÓN", `${nuevaVenta.servicios.length} servicio(s), ${nuevaVenta.materiales.length} material(es) - Total S/ ${nuevaVenta.total}`);

            generarPDF(nuevaVenta as any, tipoComprobante);
            showToast(`Venta ${nuevaVenta.numero} registrada y PDF generado`, "success", "Venta registrada");

            resetForm();
            onSuccess();
            onClose();
        } catch (error) {
            showToast('Error al registrar la venta', 'error', 'Error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const ventaPreview = {
        id_empresa,
        cliente: currentVenta.cliente.nombre || "Cliente",
        servicios: currentVenta.servicios,
        materiales: currentVenta.materiales,
        subtotal: currentVenta.subtotal,
        descuento: currentVenta.descuentoActivo ? currentVenta.descuentoValor : 0,
        igv: currentVenta.igv,
        total: currentVenta.total,
        numero: 'V-XXXXXX'
    };

    const renderServicios = () => {
        if (currentVenta.servicios.length === 0) {
            return <div className="empty-servicios">No hay servicios agregados.</div>;
        }

        return currentVenta.servicios.map(serv => {
            const catalogoServ = serviciosDisponibles[serv.tipoKey];
            if (!catalogoServ) {
                return (
                    <div key={serv.id} className="dc-container">
                        <div className="service-divider">
                            <div className="service-label-header">
                                <span className="service-name">Servicio no disponible</span>
                                <button className="dc-btn-default dc-eliminar" onClick={() => eliminarServicio(serv.id)}>
                                    <i className="fas fa-trash-alt"></i>
                                </button>
                            </div>
                        </div>
                        <div className="service-body">
                            <p style={{ color: 'red' }}>Error: Tipo de servicio "{serv.tipoKey}" no encontrado en catálogo.</p>
                        </div>
                    </div>
                );
            }

            const selectOptions = catalogoServ.carta.map((p: ProductoCarta) =>
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

    const materialesOptions = catalogoMateriales.map((m: MaterialVenta) =>
        `<option value="${m.id}">${m.nombre} - S/ ${m.precio}</option>`
    ).join('');

    const modalFooter = (
        <>
            <button className="dc-btn success" onClick={registrarVenta} disabled={isSubmitting}>
                {isSubmitting ? 'Registrando...' : <><i className="fas fa-check-circle"></i> Registrar e Imprimir</>}
            </button>
        </>
    );

    const mostrarBotonVarios = !clienteSeleccionado && !currentVenta.cliente.documento;

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} title="Nueva Venta - Catering" icon="fa-shopping-cart" footer={modalFooter}>
                <div className="split-layout">
                    <div className="split-left">
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
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                <input
                                                    type="text"
                                                    id="clienteDoc"
                                                    placeholder="Ingrese DNI o RUC"
                                                    value={currentVenta.cliente.documento}
                                                    onChange={(e) => {
                                                        const valor = e.target.value;
                                                        setCurrentVenta(prev => ({
                                                            ...prev,
                                                            cliente: { ...prev.cliente, documento: valor }
                                                        }));
                                                        if (valor.length === 8 || valor.length === 11) {
                                                            buscarClientePorDocumento(valor);
                                                        }
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            const valor = (e.target as HTMLInputElement).value;
                                                            if (valor.length === 8 || valor.length === 11) {
                                                                buscarClientePorDocumento(valor);
                                                            } else {
                                                                showToast('Ingrese DNI (8 dígitos) o RUC (11 dígitos)', 'warning', 'Formato inválido');
                                                            }
                                                        }
                                                    }}
                                                    disabled={isSearching}
                                                />
                                                {mostrarBotonVarios && (
                                                    <button
                                                        className="dc-btn secondary"
                                                        onClick={cargarClienteVarios}
                                                        style={{ padding: '8px 12px' }}
                                                    >
                                                        <i className="fas fa-users"></i> Varios
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <div className="dc-input-group">
                                            <label>Nombre del Cliente:</label>
                                            <input
                                                type="text"
                                                id="clienteNombre"
                                                placeholder="Nombre completo"
                                                value={currentVenta.cliente.nombre}
                                                onChange={(e) => {
                                                    setCurrentVenta(prev => ({
                                                        ...prev,
                                                        cliente: { ...prev.cliente, nombre: e.target.value }
                                                    }));
                                                }}
                                                readOnly={!!clienteSeleccionado}
                                            />
                                        </div>
                                    </div>
                                    {isSearching && (
                                        <div style={{ fontSize: '0.8rem', color: '#666' }}>
                                            <i className="fas fa-spinner fa-spin"></i> Buscando cliente...
                                        </div>
                                    )}
                                    {clienteSeleccionado && (
                                        <div style={{ fontSize: '0.8rem', color: '#2e7d32' }}>
                                            <i className="fas fa-check-circle"></i> Cliente seleccionado: {currentVenta.cliente.nombre}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

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

                        <div className="fase">
                            <div className="fase-header" onClick={() => toggleFase(4)}>
                                <span><i className="fas fa-calendar-alt"></i> Fase 4: Planificación del Evento</span>
                                <i className="fas fa-chevron-down"></i>
                            </div>
                            {fasesAbiertas[4] && (
                                <div className="fase-body">
                                    <div className="dc-info-grid">
                                        <div className="dc-input-group" style={{ gridColumn: 'span 2' }}>
                                            <label>Fecha y Hora del Evento</label>
                                            <input
                                                type="datetime-local"
                                                id="eventoFechaHora"
                                                value={currentVenta.eventoData.fechaHora}
                                                min={getCurrentDateTimeLocal()}
                                                onChange={(e) => {
                                                    setCurrentVenta(prev => ({
                                                        ...prev,
                                                        eventoData: {
                                                            ...prev.eventoData,
                                                            fechaHora: e.target.value
                                                        }
                                                    }));
                                                }}
                                                onClick={(e) => {
                                                    (e.target as HTMLInputElement).showPicker?.();
                                                }}
                                            />
                                        </div>
                                        <div className="dc-input-group">
                                            <label>Número de Personas</label>
                                            <input
                                                type="number"
                                                id="eventoPersonas"
                                                min="1"
                                                value={currentVenta.eventoData.personas}
                                                onChange={(e) => {
                                                    const valor = parseInt(e.target.value) || 1;
                                                    setCurrentVenta(prev => ({
                                                        ...prev,
                                                        eventoData: { ...prev.eventoData, personas: valor }
                                                    }));
                                                }}
                                            />
                                        </div>
                                        <div className="dc-input-group">
                                            <label>Tipo de Desayuno</label>
                                            <select
                                                id="eventoTipoDesayuno"
                                                value={currentVenta.eventoData.tipoDesayuno}
                                                onChange={(e) => {
                                                    setCurrentVenta(prev => ({
                                                        ...prev,
                                                        eventoData: { ...prev.eventoData, tipoDesayuno: e.target.value }
                                                    }));
                                                }}
                                            >
                                                <option value="Clásico">Clásico</option>
                                                <option value="Light">Light</option>
                                                <option value="Premium">Premium</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

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

            <ConfirmModal
                isOpen={confirmModalOpen}
                onClose={cancelarRegistroAutomatico}
                onConfirm={confirmarRegistroAutomatico}
                title="Cliente no encontrado"
                message={`No se encontró un cliente con el documento ${documentoPendiente}. ¿Desea registrarlo automáticamente como nuevo cliente?`}
                confirmText="Sí, registrar"
                cancelText="Cancelar"
                confirmVariant="success"
                icon="fa-user-plus"
            />
        </>
    );
};