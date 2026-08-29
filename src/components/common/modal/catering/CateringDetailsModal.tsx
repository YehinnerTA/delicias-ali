import React, { useState, useEffect } from 'react';
import { Modal } from '../Modal';
import { VentaCatering } from '../../../../features/types/catering';
import { HistorialEntry } from '../../../../features/types/hist_act';
import { historialApi } from '../../../../services/api/historialApi';
import { useToast } from '../../../../hooks/base/useToast';

const formatLocalDate = (isoString: string): string => {
    if (!isoString) return '-';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    const dia = String(date.getDate()).padStart(2, '0');
    const mes = String(date.getMonth() + 1).padStart(2, '0');
    const año = date.getFullYear();
    return `${dia}/${mes}/${año}`;
};

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

interface CateringDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    venta: VentaCatering | null;
}

type TabType = 'detalle' | 'historial';

export const CateringDetailsModal: React.FC<CateringDetailsModalProps> = ({ isOpen, onClose, venta }) => {
    const [activeTab, setActiveTab] = useState<TabType>('detalle');
    const [historial, setHistorial] = useState<HistorialEntry[]>([]);
    const [isLoadingHistorial, setIsLoadingHistorial] = useState(false);
    const { showToast } = useToast();

    useEffect(() => {
        if (isOpen && venta?.id) {
            cargarHistorial(venta.id);
        }
    }, [isOpen, venta]);

    const cargarHistorial = async (ventaId: number) => {
        setIsLoadingHistorial(true);
        try {
            const data = await historialApi.getByEntity('ventas', ventaId);
            setHistorial(data);
        } catch (error) {
            showToast('Error al cargar el historial', 'error', 'Error');
            setHistorial([]);
        } finally {
            setIsLoadingHistorial(false);
        }
    };

    if (!venta) return null;

    const serviciosFiltrados = venta.servicios?.map(serv => ({
        ...serv,
        productos: serv.productos.filter(p => p.cantidad > 0)
    })).filter(serv => serv.productos.length > 0) || [];

    const materialesFiltrados = venta.materiales?.filter(m => m.cantidad > 0) || [];

    const serviciosHtml = serviciosFiltrados.length > 0 ? (
        serviciosFiltrados.map((serv, servIdx) => (
            <div key={servIdx} className="dc-container">
                <div className="service-divider">
                    <div className="service-label-header">
                        <strong className="service-name">{serv.tipoNombre}</strong>
                    </div>
                </div>

                {serv.productos.map((p, prodIdx) => (
                    <div key={prodIdx} className="insumo-ingrediente">
                        <div>▸ <strong>{p.nombre}</strong> - S/ {p.precio.toFixed(2)}</div>
                        <div>Cant: {p.cantidad} | Subtotal: S/ {(p.cantidad * p.precio).toFixed(2)}</div>
                    </div>
                ))}
            </div>
        ))
    ) : (
        <div className="detalle-producto-item">No hay servicios registrados</div>
    );

    const materialesHtml = materialesFiltrados.length > 0 ? (
        materialesFiltrados.map((m, idx) => (
            <div key={idx} className="insumo-ingrediente">
                <div>▸ <strong>{m.nombre}</strong> - S/ {m.precio.toFixed(2)}</div>
                <div>Cant: {m.cantidad} | Subtotal: S/ {(m.cantidad * m.precio).toFixed(2)}</div>
            </div>
        ))
    ) : (
        <div className="detalle-producto-item">No hay materiales registrados</div>
    );

    const devHtml = (venta.devoluciones || []).map((d, idx) => (
        <div key={idx} className="devolucion-card">
            <small>{formatLocalDateTime(d.fecha)}</small><br />
            <strong>NC: {d.notaCredito}</strong><br />
            Monto: S/ {d.monto.toFixed(2)}<br />
            Motivo: {d.motivo}<br />
            Productos: {d.productos?.map((p: any) => `${p.nombre} x${p.cantidad}`).join(', ') || 'Sin productos'}
        </div>
    ));

    const histHtml = (historial.length > 0 ? historial : venta.historial || []).map((h, idx) => (
        <div key={idx} className="dc-history-entry">
            <div>
                <span className="dc-history-date">{formatLocalDateTime(h.fecha)}</span>
                <span className="dc-history-user"><i className="fas fa-user-circle"></i> {h.usuario}</span>
            </div>
            <div className="dc-history-action">{h.accion}</div>
            <div className="dc-history-desc">{h.descripcion}</div>
        </div>
    ));

    const eventoInfo = venta.eventoData ? (
        <div className="dc-info-grid">
            <div className="dc-info-item">
                <div className="dc-info-label">Fecha Evento</div>
                <div className="dc-info-value">{formatLocalDate(venta.eventoData.fecha) || 'No especificada'}</div>
            </div>
            <div className="dc-info-item">
                <div className="dc-info-label">Horario</div>
                <div className="dc-info-value">{venta.eventoData.horario || '00:00'}</div>
            </div>
            <div className="dc-info-item">
                <div className="dc-info-label">Personas</div>
                <div className="dc-info-value">{venta.eventoData.personas || 1}</div>
            </div>
            <div className="dc-info-item">
                <div className="dc-info-label">Tipo Desayuno</div>
                <div className="dc-info-value">{venta.eventoData.tipoDesayuno || 'Clásico'}</div>
            </div>
        </div>
    ) : null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Detalle de Venta - ${venta.numero}`} icon="fa-receipt">
            <div className="dc-tabs">
                <button
                    className={`dc-tab-btn ${activeTab === 'detalle' ? 'active' : ''}`}
                    onClick={() => setActiveTab('detalle')}
                >
                    <i className="fas fa-info-circle"></i> Detalle
                </button>
                <button
                    className={`dc-tab-btn ${activeTab === 'historial' ? 'active' : ''}`}
                    onClick={() => setActiveTab('historial')}
                >
                    <i className="fas fa-history"></i> Historial
                </button>
            </div>

            {activeTab === 'detalle' && (
                <>
                    <div className="detalle-venta-card">
                        <div className="dc-info-card">
                            <h4><i className="fa fa-info-circle"></i> Información de la Venta</h4>
                            <div className="dc-info-grid">
                                <div className="dc-info-item">
                                    <div className="dc-info-label">Venta</div>
                                    <div className="dc-info-value">{venta.numero}</div>
                                </div>
                                <div className="dc-info-item">
                                    <div className="dc-info-label">Fecha</div>
                                    <div className="dc-info-value">{formatLocalDateTime(venta.fecha)}</div>
                                </div>
                                <div className="dc-info-item">
                                    <div className="dc-info-label">Cliente</div>
                                    <div className="dc-info-value">{venta.cliente}</div>
                                </div>
                                <div className="dc-info-item">
                                    <div className="dc-info-label">Documento</div>
                                    <div className="dc-info-value">{venta.clienteDoc || 'No registrado'}</div>
                                </div>
                                <div className="dc-info-item">
                                    <div className="dc-info-label">Método de Pago</div>
                                    <div className="dc-info-value">{venta.metodoPago}</div>
                                </div>
                                <div className="dc-info-item">
                                    <div className="dc-info-label">Estado</div>
                                    <div className="dc-info-value">
                                        <span className={`dc-badge ${venta.estado === 'completada' ? 'dc-badge-active' : 'dc-badge-inactive'}`}>
                                            {venta.estado.toUpperCase().replace('-', ' ')}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {eventoInfo && (
                            <div className="dc-info-card">
                                <h4><i className="fas fa-calendar-alt"></i> Información del Evento</h4>
                                {eventoInfo}
                            </div>
                        )}

                        {devHtml.length > 0 && (
                            <div className="detalle-venta-card notas-credito">
                                <h4>Notas de Crédito</h4>
                                {devHtml}
                            </div>
                        )}

                        <div className="dc-info-card">
                            <h4><i className="fas fa-utensils"></i> Servicios de Catering</h4>
                            {serviciosHtml}
                        </div>

                        <div className="dc-info-card">
                            <h4><i className="fas fa-chair"></i> Materiales y Equipamiento</h4>
                            {materialesHtml}
                        </div>

                        <div className="totales">
                            <div className="total-line">Subtotal: <span>S/ {venta.subtotal.toFixed(2)}</span></div>
                            <div className="total-line">Descuento: <span>S/ {(venta.descuento || 0).toFixed(2)}</span></div>
                            <div className="total-line">IGV (18%): <span>S/ {venta.igv.toFixed(2)}</span></div>
                            <div className="total-line total-grande">TOTAL: <span>S/ {venta.total.toFixed(2)}</span></div>
                        </div>
                    </div>
                </>
            )}

            {activeTab === 'historial' && (
                <div className="dc-history-card">
                    <h4>{venta.numero} - {venta.cliente}</h4>
                    <div className="dc-history-log">
                        {isLoadingHistorial ? (
                            <div style={{ textAlign: 'center', padding: '2rem' }}>
                                <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem' }}></i>
                                <p>Cargando historial...</p>
                            </div>
                        ) : (
                            <>
                                {histHtml.length > 0 ? histHtml : <p>Sin historial registrado</p>}
                            </>
                        )}
                    </div>
                </div>
            )}
        </Modal>
    );
};