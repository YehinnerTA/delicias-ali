import React, { useState, useEffect } from 'react';
import { Modal } from '../Modal';
import { ConfirmModal } from '../confirmModal';
import { useCateringService } from '../../../../context/CateringContext';
import { useAuth } from '../../../../features/auth/context/AuthContext';
import { useCompany } from '../../../../features/company/context/CompanyContext';
import { useToast } from '../../../../hooks/base/useToast';
import { VentaCatering, ServicioCatering, MaterialVenta, ProductoVenta, ProductoCarta, CANTIDAD_MINIMA_PRODUCTOS } from '../../../../features/types/catering';
import { personaApi } from '../../../../services/api/personaApi';
import { Persona } from '../../../../features/types/person';

interface CateringModifyModalProps {
    isOpen: boolean;
    onClose: () => void;
    venta: VentaCatering | null;
    onSuccess: () => void;
}

const separarFechaHora = (fechaHora: string): { fecha: string; horario: string } => {
    if (!fechaHora) return { fecha: '', horario: '' };
    try {
        let fecha = '';
        let horario = '';

        const date = new Date(fechaHora);
        if (!isNaN(date.getTime())) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            fecha = `${year}-${month}-${day}`;
            horario = `${hours}:${minutes}`;
            return { fecha, horario };
        }

        const [fechaPart, horarioPart] = fechaHora.split('T');
        if (fechaPart) {
            fecha = fechaPart;
            horario = horarioPart ? horarioPart.substring(0, 5) : '00:00';
        }
        return { fecha, horario };
    } catch {
        return { fecha: '', horario: '' };
    }
};

export const CateringModifyModal: React.FC<CateringModifyModalProps> = ({ isOpen, onClose, venta, onSuccess }) => {
    const { serviciosDisponibles, catalogoMateriales, addActivity, addToHistory, refreshData } = useCateringService();
    const { user } = useAuth();
    const { getSelectedCompanyId } = useCompany();
    const id_empresa = getSelectedCompanyId() ?? 0;
    const { showToast } = useToast();

    const [confirmModalOpen, setConfirmModalOpen] = useState(false);
    const [documentoPendiente, setDocumentoPendiente] = useState<string>('');
    const [clienteSeleccionado, setClienteSeleccionado] = useState<Persona | null>(null);

    const [isSearching, setIsSearching] = useState(false);

    const [servicios, setServicios] = useState<ServicioCatering[]>([]);
    const [materiales, setMateriales] = useState<MaterialVenta[]>([]);
    const [clienteNombre, setClienteNombre] = useState('');
    const [clienteDoc, setClienteDoc] = useState('');
    const [eventoData, setEventoData] = useState<{
        fechaHora: string;
        personas: number;
        tipoDesayuno: string;
    }>({
        fechaHora: "",
        personas: 1,
        tipoDesayuno: "Clásico"
    });
    const [fasesAbiertas, setFasesAbiertas] = useState<{ [key: number]: boolean }>({ 1: true, 2: false, 3: false, 4: false, 5: false });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const CLIENTE_VARIOS_DOCUMENTO = '00000000';
    const CLIENTE_VARIOS_NOMBRE = 'VARIOS';

    useEffect(() => {
        if (venta) {
            setServicios(JSON.parse(JSON.stringify(venta.servicios || [])));
            setMateriales(JSON.parse(JSON.stringify(venta.materiales || [])));
            setClienteNombre(venta.cliente);
            setClienteDoc(venta.clienteDoc || '');

            if (venta.clienteDoc) {
                buscarClientePorDocumento(venta.clienteDoc);
            }

            let fechaHora = '';
            if (venta.eventoData?.fecha) {
                let fechaBase = venta.eventoData.fecha;

                if (fechaBase.includes('T')) {
                    fechaBase = fechaBase.split('T')[0];
                }
                if (fechaBase.includes('Z')) {
                    fechaBase = fechaBase.split('Z')[0];
                }

                let horario = venta.eventoData.horario || '00:00:00';

                if (horario.includes(':')) {
                    const partes = horario.split(':');
                    horario = `${partes[0]}:${partes[1]}`;
                }

                fechaHora = `${fechaBase}T${horario}`;
            }

            setEventoData({
                fechaHora: fechaHora,
                personas: venta.eventoData?.personas || 1,
                tipoDesayuno: venta.eventoData?.tipoDesayuno || "Clásico"
            });
        }
    }, [venta]);

    const buscarClientePorDocumento = async (documento: string) => {
        if (!documento || documento.length < 8) {
            setClienteSeleccionado(null);
            setClienteDoc(documento);
            setClienteNombre('');
            return;
        }

        const esDNI = /^\d{8}$/.test(documento);
        const esRUC = /^\d{11}$/.test(documento);

        if (!esDNI && !esRUC) {
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

                setClienteDoc(persona.numero_documento);
                setClienteNombre(nombreCompleto);

                showToast(`Cliente encontrado: ${nombreCompleto}`, 'success', 'Cliente encontrado');
            } else {
                setClienteSeleccionado(null);
                setClienteDoc(documento);
                setClienteNombre('');

                setDocumentoPendiente(documento);
                setConfirmModalOpen(true);
            }
        } catch (error) {
            console.error('[CateringModifyModal] Error al buscar cliente:', error);
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
        setClienteDoc('');
        setClienteNombre('');
        setClienteSeleccionado(null);
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

                setClienteDoc(nuevaPersona.numero_documento);
                setClienteNombre(nombreCompleto);

                showToast(`Cliente registrado automáticamente: ${nombreCompleto}`, 'success', 'Cliente registrado');
            }
        } catch (error) {
            console.error('[CateringModifyModal] Error al registrar cliente:', error);
            showToast('Error al registrar el cliente automáticamente', 'error', 'Error');
        }
    };

    const cargarClienteVarios = () => {
        setClienteDoc(CLIENTE_VARIOS_DOCUMENTO);
        setClienteNombre(CLIENTE_VARIOS_NOMBRE);
        setClienteSeleccionado(null);
        showToast('Cliente VARIOS cargado', 'info', 'Cliente cargado');
    };

    const toggleFase = (fase: number) => {
        setFasesAbiertas(prev => ({ ...prev, [fase]: !prev[fase] }));
    };

    const agregarNuevoServicio = () => {
        const select = document.getElementById('nuevoServicioSelectEditar') as HTMLSelectElement;
        const tipoKey = select.value;
        const servicioInfo = serviciosDisponibles[tipoKey];
        if (!servicioInfo) return;

        const nuevoServicio: ServicioCatering = {
            id: Date.now(),
            id_empresa: id_empresa,
            tipoKey: tipoKey,
            tipoNombre: servicioInfo.nombre,
            productos: []
        };
        setServicios([...servicios, nuevoServicio]);
        showToast(`Servicio "${servicioInfo.nombre}" agregado`, "success");
    };

    const eliminarServicio = (servicioId: number) => {
        setServicios(servicios.filter(s => s.id !== servicioId));
        showToast("Servicio eliminado", "info");
    };

    const agregarProductoAServicio = (servicioId: number) => {
        const servicio = servicios.find(s => s.id === servicioId);
        if (!servicio) return;

        const select = document.getElementById(`select-prod-editar-${servicioId}`) as HTMLSelectElement;
        const cantidadInput = document.getElementById(`cant-prod-editar-${servicioId}`) as HTMLInputElement;
        if (!select || !cantidadInput) return;

        const prodId = parseInt(select.value);
        let cantidad = parseInt(cantidadInput.value) || 1;

        if (cantidad < CANTIDAD_MINIMA_PRODUCTOS) {
            showToast(`⚠️ Cantidad mínima ${CANTIDAD_MINIMA_PRODUCTOS}`, "warning");
            return;
        }

        const catalogoServ = serviciosDisponibles[servicio.tipoKey];
        const producto = catalogoServ.carta.find((p: ProductoCarta) => p.id === prodId);
        if (!producto) return;

        const existente = servicio.productos.find((p: ProductoVenta) => p.id === producto.id);
        if (existente) {
            existente.cantidad += cantidad;
        } else {
            servicio.productos.push({ ...producto, cantidad: cantidad });
        }
        setServicios([...servicios]);
        select.value = "";
        cantidadInput.value = CANTIDAD_MINIMA_PRODUCTOS.toString();
    };

    const eliminarProductoDeServicio = (servicioId: number, prodIndex: number) => {
        const servicio = servicios.find(s => s.id === servicioId);
        if (servicio) {
            servicio.productos.splice(prodIndex, 1);
            setServicios([...servicios]);
        }
    };

    const actualizarCantProdServicio = (servicioId: number, prodIndex: number, nuevaCant: string) => {
        let cantidad = parseInt(nuevaCant) || 1;
        if (cantidad < CANTIDAD_MINIMA_PRODUCTOS) {
            showToast(`⚠️ Cantidad mínima ${CANTIDAD_MINIMA_PRODUCTOS}`, "warning");
            cantidad = CANTIDAD_MINIMA_PRODUCTOS;
        }
        const servicio = servicios.find(s => s.id === servicioId);
        if (servicio && servicio.productos[prodIndex]) {
            servicio.productos[prodIndex].cantidad = cantidad;
            setServicios([...servicios]);
        }
    };

    const actualizarPrecioProducto = (servicioId: number, prodIndex: number, nuevoPrecio: string) => {
        const precio = parseFloat(nuevoPrecio) || 0;
        const servicio = servicios.find(s => s.id === servicioId);
        if (servicio && servicio.productos[prodIndex]) {
            servicio.productos[prodIndex].precio = precio;
            setServicios([...servicios]);
        }
    };

    const agregarMaterial = () => {
        const select = document.getElementById('materialSelectEditar') as HTMLSelectElement;
        const cantidadInput = document.getElementById('cantidadMaterialEditar') as HTMLInputElement;
        if (!select || !cantidadInput) return;

        const matId = parseInt(select.value);
        const cantidad = parseInt(cantidadInput.value) || 1;
        const material = catalogoMateriales.find((m: MaterialVenta) => m.id === matId);
        if (!material) return;

        const existente = materiales.find((m: MaterialVenta) => m.id === material.id);
        if (existente) {
            existente.cantidad += cantidad;
        } else {
            materiales.push({ ...material, cantidad });
        }
        setMateriales([...materiales]);
        select.value = "";
        cantidadInput.value = "1";
    };

    const eliminarMaterial = (idx: number) => {
        materiales.splice(idx, 1);
        setMateriales([...materiales]);
    };

    const actualizarCantMaterial = (idx: number, val: string) => {
        const cantidad = parseInt(val) || 1;
        materiales[idx].cantidad = cantidad;
        setMateriales([...materiales]);
    };

    const actualizarPrecioMaterial = (idx: number, nuevoPrecio: string) => {
        const precio = parseFloat(nuevoPrecio) || 0;
        materiales[idx].precio = precio;
        setMateriales([...materiales]);
    };

    const calcularTotales = () => {
        let subtotalServicios = servicios.reduce((s, serv) =>
            s + serv.productos.reduce((sum, p) => sum + p.cantidad * p.precio, 0), 0);
        let subtotalMateriales = materiales.reduce((s, m) => s + m.cantidad * m.precio, 0);
        let subtotal = subtotalServicios + subtotalMateriales;
        const igv = subtotal * 0.18;
        const total = subtotal + igv;
        return { subtotal, igv, total };
    };

    const guardarCambios = async () => {
        if (!venta) return;
        if (!id_empresa) {
            showToast('No se ha seleccionado una empresa', 'warning', 'Advertencia');
            return;
        }
        if (servicios.length === 0 && materiales.length === 0) {
            showToast("Agregue al menos un servicio o material", "warning", "Campos incompletos");
            return;
        }
        if (!clienteDoc || clienteDoc.trim() === '') {
            showToast('Ingrese el documento del cliente', 'warning', 'Campos incompletos');
            return;
        }
        if (!clienteNombre || clienteNombre.trim() === '') {
            showToast('Ingrese el nombre del cliente', 'warning', 'Campos incompletos');
            return;
        }

        const userId = user?.id;
        if (!userId) {
            showToast('No se pudo identificar al usuario', 'error', 'Error de autenticación');
            return;
        }

        const { fecha, horario } = separarFechaHora(eventoData.fechaHora);
        const eventoPersonas = eventoData.personas || 1;
        const eventoTipoDesayuno = eventoData.tipoDesayuno || "Clásico";

        const { subtotal, igv, total } = calcularTotales();
        const totalProductos = servicios.reduce((count, s) => count + s.productos.length, 0);
        const cambiosStr = `${servicios.length} servicio(s), ${totalProductos} producto(s), ${materiales.length} material(es)`;

        const idCliente = clienteSeleccionado?.id_persona || null;

        setIsSubmitting(true);
        try {
            const payload = {
                id_empresa,
                id_cliente: idCliente,
                cliente: clienteNombre,
                clienteDoc: clienteDoc,
                servicios: servicios.map(serv => ({
                    id_empresa: serv.id_empresa,
                    tipoKey: serv.tipoKey,
                    productos: serv.productos.map(p => ({
                        id: p.id,
                        nombre: p.nombre,
                        precio: p.precio,
                        cantidad: p.cantidad
                    }))
                })),
                materiales: materiales.map(m => ({
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
                subtotal,
                igv,
                total,
                metodo_pago: venta.metodoPago,
                usuario_id: userId
            };

            const { cateringServiceApi } = await import('../../../../services/api/cateringServiceApi');
            await cateringServiceApi.update(venta.id, id_empresa, payload);

            await refreshData();
            await addActivity("EDITAR", "ventas", `${venta.numero} modificada - ${cambiosStr}`);
            await addToHistory(venta, "MODIFICACIÓN", `${cambiosStr}. Nuevo total: S/ ${total}`);

            showToast("Venta actualizada correctamente", "success", "Actualizado");
            onSuccess();
            onClose();
        } catch (error) {
            showToast('Error al actualizar la venta', 'error', 'Error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const { subtotal, igv, total } = calcularTotales();

    const modalFooter = (
        <>
            <button className="dc-btn success" onClick={guardarCambios} disabled={isSubmitting}>
                {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
            </button>
        </>
    );

    const mostrarBotonVarios = !clienteSeleccionado && !clienteDoc;

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} title={`Editar Venta - ${venta?.numero}`} icon="fa-edit" footer={modalFooter}>
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
                                            value={clienteDoc}
                                            onChange={(e) => {
                                                const valor = e.target.value;
                                                setClienteDoc(valor);
                                                setClienteSeleccionado(null);
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
                                        value={clienteNombre}
                                        onChange={(e) => setClienteNombre(e.target.value)}
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
                                    <i className="fas fa-check-circle"></i> Cliente seleccionado: {clienteNombre}
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
                                    <select id="nuevoServicioSelectEditar">
                                        <option value="">Seleccionar servicio...</option>
                                        {Object.keys(serviciosDisponibles).map(key => (
                                            <option key={key} value={key}>{serviciosDisponibles[key].nombre}</option>
                                        ))}
                                    </select>
                                </div>
                                <button className="dc-btn info" onClick={agregarNuevoServicio}>
                                    <i className="fas fa-plus"></i> Agregar Servicio
                                </button>
                            </div>
                            <div id="serviciosContainerEditar">
                                {servicios.length === 0 ? (
                                    <div className="empty-servicios">No hay servicios agregados.</div>
                                ) : (
                                    servicios.map(serv => {
                                        const catalogoServ = serviciosDisponibles[serv.tipoKey];

                                        return (
                                            <div key={serv.id} className="dc-container">
                                                <div className='service-divider'>
                                                    <div className="service-label-header">
                                                        <span className="service-name">{serv.tipoNombre}</span>
                                                        <button className="dc-btn-default dc-eliminar" onClick={() => eliminarServicio(serv.id)}>
                                                            <i className="fas fa-trash-alt"></i>
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className='service-body'>
                                                    <div className="dc-form-grid">
                                                        <div className='dc-input-group'>
                                                            <label>Servicio</label>
                                                            <select id={`select-prod-editar-${serv.id}`}>
                                                                <option value="">Seleccionar producto...</option>
                                                                {catalogoServ.carta.map((p: ProductoCarta) => (
                                                                    <option key={p.id} value={p.id}>{p.nombre} - S/ {p.precio}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <div className='dc-input-group'>
                                                            <label>Cantidad</label>
                                                            <input type="number" id={`cant-prod-editar-${serv.id}`} defaultValue={CANTIDAD_MINIMA_PRODUCTOS} min={CANTIDAD_MINIMA_PRODUCTOS} />
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
                                                                {serv.productos.map((p, idx) => (
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
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
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
                                    <label>Material</label>
                                    <select id="materialSelectEditar">
                                        <option value="">Seleccionar material...</option>
                                        {catalogoMateriales.map((m: MaterialVenta) => (
                                            <option key={m.id} value={m.id}>{m.nombre} - S/ {m.precio}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="dc-input-group">
                                    <label>Cantidad</label>
                                    <input type="number" id="cantidadMaterialEditar" defaultValue="1" min="1" />
                                </div>
                                <button className="dc-btn info" onClick={agregarMaterial}>
                                    <i className="fas fa-plus"></i> Agregar Material
                                </button>
                            </div>
                            <div id="materialesContainerEditar">
                                {materiales.length === 0 ? (
                                    <div className="empty-servicios">No hay materiales agregados.</div>
                                ) : (
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
                                                {materiales.map((m, idx) => (
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
                                )}
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
                                        id="eventoFechaHoraEditar"
                                        value={eventoData.fechaHora}
                                        onChange={(e) => {
                                            setEventoData({
                                                ...eventoData,
                                                fechaHora: e.target.value
                                            });
                                        }}
                                        onClick={(e) => {
                                            (e.target as HTMLInputElement).showPicker?.();
                                        }}
                                        style={{
                                            width: '100%',
                                            padding: '10px',
                                            fontSize: '1rem',
                                            borderRadius: '4px',
                                            border: '1px solid #ccc',
                                            cursor: 'pointer'
                                        }}
                                    />
                                </div>
                                <div className="dc-input-group">
                                    <label>Personas</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={eventoData.personas}
                                        onChange={(e) => setEventoData({
                                            ...eventoData,
                                            personas: parseInt(e.target.value) || 1
                                        })}
                                    />
                                </div>
                                <div className="dc-input-group">
                                    <label>Tipo Desayuno</label>
                                    <select
                                        value={eventoData.tipoDesayuno}
                                        onChange={(e) => setEventoData({
                                            ...eventoData,
                                            tipoDesayuno: e.target.value
                                        })}
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