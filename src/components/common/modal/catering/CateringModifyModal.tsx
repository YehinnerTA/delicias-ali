import React, { useState, useEffect } from 'react';
import { Modal } from '../Modal';
import { useCateringService } from '../../../../context/CateringContext';
import { useAuth } from '../../../../features/auth/context/AuthContext';
import { useCompany } from '../../../../features/company/context/CompanyContext'; // ← AGREGADO
import { useToast } from '../../../../hooks/base/useToast';
import { VentaCatering, ServicioCatering, MaterialVenta, ProductoVenta, ProductoCarta, CANTIDAD_MINIMA_PRODUCTOS } from '../../../../features/types/catering';

interface CateringModifyModalProps {
    isOpen: boolean;
    onClose: () => void;
    venta: VentaCatering | null;
    onSuccess: () => void;
}

export const CateringModifyModal: React.FC<CateringModifyModalProps> = ({ isOpen, onClose, venta, onSuccess }) => {
    const { serviciosDisponibles, catalogoMateriales, addActivity, addToHistory, refreshData } = useCateringService();
    const { user } = useAuth();
    const { getSelectedCompanyId } = useCompany(); // ← AGREGADO
    const id_empresa = getSelectedCompanyId() ?? 0; // ← AGREGADO
    const { showToast } = useToast();

    const [servicios, setServicios] = useState<ServicioCatering[]>([]);
    const [materiales, setMateriales] = useState<MaterialVenta[]>([]);
    const [clienteNombre, setClienteNombre] = useState('');
    const [clienteDoc, setClienteDoc] = useState('');
    const [eventoData, setEventoData] = useState({ fecha: "", horario: "12:00", personas: 1, tipoDesayuno: "Clásico" });
    const [fasesAbiertas, setFasesAbiertas] = useState<{ [key: number]: boolean }>({ 1: true, 2: false, 3: false, 4: false, 5: false });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (venta) {
            setServicios(JSON.parse(JSON.stringify(venta.servicios || [])));
            setMateriales(JSON.parse(JSON.stringify(venta.materiales || [])));
            setClienteNombre(venta.cliente);
            setClienteDoc(venta.clienteDoc || '');
            setEventoData(venta.eventoData || { fecha: "", horario: "12:00", personas: 1, tipoDesayuno: "Clásico" });
        }
    }, [venta]);

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
            id_empresa: id_empresa, // ← AGREGADO
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

        const userId = user?.id;
        if (!userId) {
            showToast('No se pudo identificar al usuario', 'error', 'Error de autenticación');
            return;
        }

        const { subtotal, igv, total } = calcularTotales();
        const totalProductos = servicios.reduce((count, s) => count + s.productos.length, 0);
        const cambiosStr = `${servicios.length} servicio(s), ${totalProductos} producto(s), ${materiales.length} material(es)`;

        setIsSubmitting(true);
        try {
            const payload = {
                id_empresa, // ← AGREGADO (aunque la función update lo recibe por separado, se incluye en el payload por consistencia)
                cliente: clienteNombre,
                clienteDoc: clienteDoc,
                servicios: servicios.map(serv => ({
                    id_empresa: serv.id_empresa, // ← AGREGADO
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
                    fecha: eventoData.fecha,
                    horario: eventoData.horario,
                    personas: eventoData.personas,
                    tipoDesayuno: eventoData.tipoDesayuno
                },
                subtotal,
                igv,
                total,
                metodo_pago: venta.metodoPago,
                usuario_id: userId
            };

            const { cateringServiceApi } = await import('../../../../services/api/cateringServiceApi');
            await cateringServiceApi.update(venta.id, id_empresa, payload); // ← PASAMOS id_empresa

            await refreshData();

            await addActivity("EDITAR", "ventas", `${venta.numero} modificada - ${cambiosStr}`);
            await addToHistory(venta, "MODIFICACIÓN", `${cambiosStr}. Nuevo total: S/ ${total}`);

            showToast("Venta actualizada correctamente", "success", "Actualizado");
            onSuccess();
            onClose();
        } catch (error) {
            console.error('[CateringModifyModal] Error al actualizar venta:', error);
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
                                <input
                                    type="date"
                                    value={eventoData.fecha}
                                    onChange={(e) => setEventoData({ ...eventoData, fecha: e.target.value })}
                                />
                            </div>
                            <div className="dc-input-group">
                                <label>Horario</label>
                                <input
                                    type="time"
                                    value={eventoData.horario}
                                    onChange={(e) => setEventoData({ ...eventoData, horario: e.target.value })}
                                />
                            </div>
                            <div className="dc-input-group">
                                <label>Personas</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={eventoData.personas}
                                    onChange={(e) => setEventoData({ ...eventoData, personas: parseInt(e.target.value) || 1 })}
                                />
                            </div>
                            <div className="dc-input-group">
                                <label>Tipo Desayuno</label>
                                <select
                                    value={eventoData.tipoDesayuno}
                                    onChange={(e) => setEventoData({ ...eventoData, tipoDesayuno: e.target.value })}
                                >
                                    <option>Clásico</option>
                                    <option>Light</option>
                                    <option>Premium</option>
                                </select>
                            </div>
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