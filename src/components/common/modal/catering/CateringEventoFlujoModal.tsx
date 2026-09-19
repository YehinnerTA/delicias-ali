import React, { useState, useEffect } from 'react';
import { ETAPA_COMPONENTES } from './flujo/EtapasFlujo';
import { Modal } from '../Modal';
import { useAuth } from '../../../../features/auth/context/AuthContext';
import { useCompany } from '../../../../features/company/context/CompanyContext';
import { useToast } from '../../../../hooks/base/useToast';
import { cateringEventoApi, EtapaEvento, EventoFlujo } from '../../../../services/api/cateringEventoApi';
import { ROLES } from '../../../../features/types/person';
import { VentaCatering } from '../../../../features/types/catering';
import '../../../../theme/section/evento-flujo.css';

interface CateringEventoFlujoModalProps {
    isOpen: boolean;
    onClose: () => void;
    idEvento: number | null;
    numeroVenta?: string;
    cliente?: string;
    venta?: VentaCatering | null;
}

const FLUJO_ESTADOS = [
    { key: 'pendiente_verificacion', label: 'Ventas', icon: 'fa-file-invoice', area: 'Ventas' },
    { key: 'compra_pendiente', label: 'Almacén', icon: 'fa-boxes', area: 'Logística' },
    { key: 'en_preparacion', label: 'Cocina', icon: 'fa-utensils', area: 'Cocina' },
    { key: 'listo_para_envio', label: 'Despacho', icon: 'fa-truck-loading', area: 'Logística' },
    { key: 'en_transito', label: 'En Tránsito', icon: 'fa-truck', area: 'Logística' },
    { key: 'en_evento', label: 'Evento', icon: 'fa-glass-cheers', area: 'Logística' },
    { key: 'en_retorno', label: 'Recojo', icon: 'fa-undo', area: 'Logística' },
    { key: 'retornado', label: 'Retorno', icon: 'fa-home', area: 'Logística' },
    { key: 'cerrado', label: 'Cierre', icon: 'fa-check-double', area: 'Admin' },
];

const ESTADO_A_ETAPA: Record<string, string> = {
    'pendiente_verificacion': '',
    'compra_pendiente': 'verificacion_almacen',
    'en_preparacion': 'preparacion_cocina',
    'listo_para_envio': 'carga_transporte',
    'en_transito': 'carga_transporte',
    'en_evento': 'montaje_evento',
    'en_retorno': 'recojo_evento',
    'retornado': 'retorno_empresa',
    'cierre': 'cierre',           // 🆕 Estado CIERRE → etapa cierre
    'cerrado': 'cierre'
};

const ETAPAS_POR_ROL: Record<string, string[]> = {
    'Administrador': [
        'verificacion_almacen', 'preparacion_cocina', 'carga_transporte',
        'montaje_evento', 'recojo_evento', 'retorno_empresa', 'cierre'
    ],
    'Chef': ['preparacion_cocina'],
    'Cajero': [],
    'Logística': [
        'verificacion_almacen', 'carga_transporte', 'montaje_evento',
        'recojo_evento', 'retorno_empresa'
    ]
};

const formatTiempo = (minutos: number): string => {
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    if (horas > 0) return `${String(horas).padStart(2, '0')}:${String(mins).padStart(2, '0')}:00`;
    return `${String(mins).padStart(2, '0')}:00`;
};

const formatHora = (isoString: string | null): string => {
    if (!isoString) return '—';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '—';
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

export const CateringEventoFlujoModal: React.FC<CateringEventoFlujoModalProps> = ({
    isOpen, onClose, idEvento, numeroVenta, cliente, venta
}) => {
    const { user } = useAuth();
    const { getSelectedCompanyId } = useCompany();
    const { showToast } = useToast();
    const id_empresa = getSelectedCompanyId() ?? 0;

    const [flujo, setFlujo] = useState<EventoFlujo | null>(null);
    const [etapaActual, setEtapaActual] = useState<EtapaEvento | null>(null);
    const [verificaciones, setVerificaciones] = useState<Record<string, boolean>>({});
    const [tiempoTranscurrido, setTiempoTranscurrido] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [mostrarIncidencia, setMostrarIncidencia] = useState(false);
    const [incidenciaData, setIncidenciaData] = useState({ tipo: 'falta_stock', descripcion: '', impacto: '' });
    const [observaciones, setObservaciones] = useState('');

    const userRol = user?.id_rol ? ROLES[user.id_rol] : 'Cajero';
    const esAdmin = userRol === 'Administrador';

    const puedeActuarEnEtapa = (etapaKey: string): boolean => {
        if (esAdmin) return true;
        return (ETAPAS_POR_ROL[userRol] || []).includes(etapaKey);
    };

    const puedeActuar = etapaActual ? puedeActuarEnEtapa(etapaActual.etapa) : false;

    useEffect(() => {
        if (isOpen && idEvento) cargarFlujo();
    }, [isOpen, idEvento]);

    useEffect(() => {
        if (!etapaActual?.hora_inicio || etapaActual.completada) return;
        const interval = setInterval(() => {
            const inicio = new Date(etapaActual.hora_inicio!).getTime();
            setTiempoTranscurrido(Math.floor((Date.now() - inicio) / 60000));
        }, 1000);
        return () => clearInterval(interval);
    }, [etapaActual]);

    const cargarFlujo = async () => {
        if (!idEvento || !id_empresa) return;
        setIsLoading(true);
        try {
            const data = await cateringEventoApi.getFlujo(idEvento, id_empresa);
            setFlujo(data);

            const estadoActual = data.evento.estado_flujo || 'pendiente_verificacion';
            const etapaKey = ESTADO_A_ETAPA[estadoActual];

            if (etapaKey) {
                const etapaData = await cateringEventoApi.abrirEtapa(
                    idEvento, etapaKey, id_empresa, user?.id || 0
                );

                const verifs = await cateringEventoApi.getVerificaciones(idEvento, etapaKey, id_empresa);
                setVerificaciones(verifs);

                setEtapaActual(etapaData.etapa);
                setTiempoTranscurrido(etapaData.tiempo_transcurrido_min);
            } else {
                setEtapaActual(null);
                setVerificaciones({});
            }
        } catch (error) {
            console.error('[CateringEventoFlujoModal] Error:', error);
            showToast('Error al cargar el flujo del evento', 'error', 'Error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerificar = async (nombreItem: string, verificado: boolean) => {
        if (!idEvento || !id_empresa || !user?.id || !etapaActual) return;

        if (!puedeActuar) {
            showToast('No es tu turno para esta etapa', 'warning', 'Sin permiso');
            return;
        }

        setVerificaciones(prev => ({ ...prev, [nombreItem]: verificado }));

        try {
            await cateringEventoApi.marcarItemVerificado(
                idEvento, etapaActual.etapa, id_empresa, user.id, nombreItem, verificado
            );
        } catch (error) {
            setVerificaciones(prev => ({ ...prev, [nombreItem]: !verificado }));
            console.error('[CateringEventoFlujoModal] Error al marcar:', error);
            showToast('Error al marcar el item', 'error', 'Error');
        }
    };

    const handleConfirmarEtapa = async (obsOverride?: string) => {
        if (!idEvento || !id_empresa || !user?.id || !etapaActual) return;

        if (!puedeActuar) {
            showToast('No es tu turno para esta etapa', 'warning', 'Sin permiso');
            return;
        }

        setIsSubmitting(true);
        try {
            await cateringEventoApi.confirmarEtapa(
                idEvento, etapaActual.etapa, id_empresa, user.id, obsOverride || observaciones
            );

            showToast('Etapa confirmada correctamente', 'success', 'Confirmado');

            // 🆕 CERRAR EL MODAL en vez de recargar
            setObservaciones('');
            setMostrarIncidencia(false);
            onClose();
        } catch (error) {
            console.error('[CateringEventoFlujoModal] Error al confirmar:', error);
            showToast('Error al confirmar la etapa', 'error', 'Error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReportarIncidencia = async () => {
        if (!idEvento || !id_empresa || !user?.id || !etapaActual) return;

        if (!puedeActuar) {
            showToast('No es tu turno para esta etapa', 'warning', 'Sin permiso');
            return;
        }

        if (!incidenciaData.descripcion.trim()) {
            showToast('Ingrese una descripción', 'warning', 'Campos incompletos');
            return;
        }

        try {
            await cateringEventoApi.reportarIncidencia(idEvento, id_empresa, user.id, {
                etapa: etapaActual.etapa,
                tipo: incidenciaData.tipo,
                descripcion: incidenciaData.descripcion,
                impacto: incidenciaData.impacto
            });

            showToast('Incidencia reportada', 'success', 'Reportado');
            setMostrarIncidencia(false);
            setIncidenciaData({ tipo: 'falta_stock', descripcion: '', impacto: '' });
        } catch (error) {
            console.error('[CateringEventoFlujoModal] Error al reportar:', error);
            showToast('Error al reportar la incidencia', 'error', 'Error');
        }
    };

    const estadoActualIndex = flujo?.evento?.estado_flujo
        ? FLUJO_ESTADOS.findIndex(e => e.key === flujo.evento.estado_flujo)
        : 0;
    const estadoActualKey = flujo?.evento?.estado_flujo || 'pendiente_verificacion';

    if (!idEvento) return null;

    const areaActual = FLUJO_ESTADOS[estadoActualIndex]?.area || '-';

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Flujo del Evento - ${numeroVenta || ''}`}
            icon="fa-project-diagram"
        >
            <div className="dc-flujo-container">
                {isLoading ? (
                    <div style={{ textAlign: 'center', padding: '3rem' }}>
                        <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', color: '#007bff' }}></i>
                        <p style={{ marginTop: '1rem', color: '#666' }}>Cargando flujo del evento...</p>
                    </div>
                ) : (
                    <>
                        {/* Info del evento */}
                        <div className="dc-info-card" style={{ marginBottom: '1.5rem' }}>
                            <div className="dc-info-grid">
                                <div className="dc-info-item">
                                    <div className="dc-info-label">Venta</div>
                                    <div className="dc-info-value">{numeroVenta || flujo?.evento?.venta_numero || '-'}</div>
                                </div>
                                <div className="dc-info-item">
                                    <div className="dc-info-label">Cliente</div>
                                    <div className="dc-info-value">{cliente || '-'}</div>
                                </div>
                                <div className="dc-info-item">
                                    <div className="dc-info-label">Estado Actual</div>
                                    <div className="dc-info-value">
                                        <span className={`dc-estado-badge ${estadoActualKey}`}>
                                            {FLUJO_ESTADOS[estadoActualIndex]?.label || estadoActualKey}
                                        </span>
                                    </div>
                                </div>
                                <div className="dc-info-item">
                                    <div className="dc-info-label">Área Actual</div>
                                    <div className="dc-info-value">{areaActual}</div>
                                </div>
                            </div>
                        </div>

                        {/* Banner de turno */}
                        {etapaActual && (
                            <div className={`dc-turno-banner ${puedeActuar ? 'activo' : 'esperando'}`}>
                                {puedeActuar ? (
                                    <>
                                        <i className="fas fa-hand-pointer"></i>
                                        <strong>Es tu turno</strong> — {esAdmin ? 'Puedes actuar como administrador' : `Rol: ${userRol}`}
                                    </>
                                ) : (
                                    <>
                                        <i className="fas fa-hourglass-half"></i>
                                        <strong>Esperando a {areaActual}</strong> — No es tu turno ({userRol})
                                    </>
                                )}
                            </div>
                        )}

                        {/* Stepper */}
                        <div className="dc-flujo-stepper">
                            {FLUJO_ESTADOS.map((estado, index) => {
                                let className = 'dc-flujo-step';
                                if (index < estadoActualIndex) className += ' completed';
                                else if (index === estadoActualIndex) className += ' active';
                                else className += ' pending';

                                return (
                                    <div key={estado.key} className={className}>
                                        <div className="dc-flujo-step-icon">
                                            <i className={`fas ${index < estadoActualIndex ? 'fa-check' : estado.icon}`}></i>
                                        </div>
                                        <div className="dc-flujo-step-label">{estado.label}</div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Etapa actual */}
                        {etapaActual && (
                            <>
                                <div className={`dc-tiempo-container ${etapaActual.tiempo_estimado_min && tiempoTranscurrido > etapaActual.tiempo_estimado_min ? 'excedido' : ''}`}>
                                    <i className="fas fa-clock dc-tiempo-icon"></i>
                                    <div className="dc-tiempo-info">
                                        <div className="dc-tiempo-transcurrido">{formatTiempo(tiempoTranscurrido)}</div>
                                        <div className="dc-tiempo-detalles">
                                            Inicio: {formatHora(etapaActual.hora_inicio)} |
                                            Estimado: {etapaActual.tiempo_estimado_min ? `${etapaActual.tiempo_estimado_min} min` : 'N/A'}
                                            {etapaActual.tiempo_estimado_min && tiempoTranscurrido > etapaActual.tiempo_estimado_min && (
                                                <span style={{ color: '#856404', fontWeight: '600', marginLeft: '0.5rem' }}>⚠️ Tiempo excedido</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="dc-etapa-card active">
                                    {(() => {
                                        const EtapaComponent = ETAPA_COMPONENTES[etapaActual.etapa];
                                        if (!EtapaComponent) {
                                            return (
                                                <div className="dc-etapa-body">
                                                    <p style={{ textAlign: 'center', color: '#999', padding: '1rem' }}>
                                                        No hay UI definida para esta etapa
                                                    </p>
                                                </div>
                                            );
                                        }
                                        return (
                                            <EtapaComponent
                                                etapa={etapaActual}
                                                venta={venta || null}
                                                verificaciones={verificaciones}
                                                puedeActuar={puedeActuar}
                                                onVerificar={handleVerificar}
                                                onConfirmar={handleConfirmarEtapa}
                                                onReportarIncidencia={() => setMostrarIncidencia(true)}
                                                isSubmitting={isSubmitting}
                                            />
                                        );
                                    })()}
                                </div>

                                {/* Formulario incidencia */}
                                {mostrarIncidencia && (
                                    <div className="dc-incidencia-form">
                                        <div className="dc-incidencia-form-header">
                                            <i className="fas fa-exclamation-triangle"></i> Reportar Incidencia
                                        </div>
                                        <div className="dc-input-group">
                                            <label>Tipo</label>
                                            <select value={incidenciaData.tipo} onChange={(e) => setIncidenciaData({ ...incidenciaData, tipo: e.target.value })}>
                                                <option value="falta_stock">Falta de stock</option>
                                                <option value="retraso">Retraso</option>
                                                <option value="producto_defectuoso">Producto defectuoso</option>
                                                <option value="cliente_ausente">Cliente ausente</option>
                                                <option value="otro">Otro</option>
                                            </select>
                                        </div>
                                        <div className="dc-input-group">
                                            <label>Descripción</label>
                                            <textarea value={incidenciaData.descripcion} onChange={(e) => setIncidenciaData({ ...incidenciaData, descripcion: e.target.value })} rows={2} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }} />
                                        </div>
                                        <div className="dc-input-group">
                                            <label>Impacto (opcional)</label>
                                            <input type="text" value={incidenciaData.impacto} onChange={(e) => setIncidenciaData({ ...incidenciaData, impacto: e.target.value })} placeholder="Ej: +10 min de retraso" />
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                            <button className="dc-btn secondary" onClick={() => setMostrarIncidencia(false)}>Cancelar</button>
                                            <button className="dc-btn warning" onClick={handleReportarIncidencia}>
                                                <i className="fas fa-paper-plane"></i> Enviar
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {/* Evento cerrado */}
                        {!etapaActual && flujo?.evento?.estado_flujo === 'cerrado' && (
                            <div className="dc-info-card" style={{ textAlign: 'center', padding: '2rem' }}>
                                <i className="fas fa-check-circle" style={{ fontSize: '3rem', color: '#28a745', marginBottom: '1rem' }}></i>
                                <h3 style={{ color: '#28a745', marginBottom: '0.5rem' }}>Evento Cerrado</h3>
                                <p style={{ color: '#666' }}>Este evento ha sido cerrado correctamente.</p>
                            </div>
                        )}

                        {/* Evento cancelado */}
                        {!etapaActual && flujo?.evento?.estado_flujo === 'cancelado' && (
                            <div className="dc-info-card" style={{ textAlign: 'center', padding: '2rem' }}>
                                <i className="fas fa-ban" style={{ fontSize: '3rem', color: '#dc3545', marginBottom: '1rem' }}></i>
                                <h3 style={{ color: '#dc3545', marginBottom: '0.5rem' }}>Evento Cancelado</h3>
                                <p style={{ color: '#666' }}>Este evento fue cancelado.</p>
                            </div>
                        )}
                    </>
                )}
            </div>
        </Modal>
    );
};