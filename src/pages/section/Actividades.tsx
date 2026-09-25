import React, { useState, useEffect } from 'react';
import MainLayout from '../partials/MainLayout';
import { useAuth } from '../../features/auth/context/AuthContext';
import { useCompany } from '../../features/company/context/CompanyContext';
import { useToast } from '../../hooks/base/useToast';
import { cateringServiceApi } from '../../services/api/cateringServiceApi';
import { VentaCatering } from '../../features/types/catering';
import { ROLES } from '../../features/types/person';
import { Tabs } from '../../components/ui/shared/Tabs';
import { CateringEventoFlujoModal } from '../../components/common/modal/catering/CateringEventoFlujoModal';
import '../../theme/section/actividades.css';

interface TabEtapa {
    id: string;
    label: string;
    icon: string;
}

const formatLocalDate = (isoString: string): string => {
    if (!isoString) return '-';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    const dia = String(date.getDate()).padStart(2, '0');
    const mes = String(date.getMonth() + 1).padStart(2, '0');
    const año = date.getFullYear();
    return `${dia}/${mes}/${año}`;
};

const TABS_POR_ROL: Record<string, TabEtapa[]> = {
    'Administrador': [
        { id: 'verificacion_almacen', label: 'Almacén', icon: 'fa-boxes' },
        { id: 'preparacion_cocina', label: 'Cocina', icon: 'fa-utensils' },
        { id: 'carga_transporte', label: 'Despacho', icon: 'fa-truck-loading' },
        { id: 'montaje_evento', label: 'Montaje', icon: 'fa-glass-cheers' },
        { id: 'recojo_evento', label: 'Recojo', icon: 'fa-undo' },
        { id: 'retorno_empresa', label: 'Retorno', icon: 'fa-home' },
        { id: 'cierre', label: 'Cierre', icon: 'fa-check-double' },
    ],
    'Chef': [
        { id: 'preparacion_cocina', label: 'Cocina', icon: 'fa-utensils' },
    ],
    'Logística': [
        { id: 'verificacion_almacen', label: 'Almacén', icon: 'fa-boxes' },
        { id: 'carga_transporte', label: 'Despacho', icon: 'fa-truck-loading' },
        { id: 'montaje_evento', label: 'Montaje', icon: 'fa-glass-cheers' },
        { id: 'recojo_evento', label: 'Recojo', icon: 'fa-undo' },
        { id: 'retorno_empresa', label: 'Retorno', icon: 'fa-home' },
    ],
    'Cajero': [],
};

const ETAPA_A_ESTADO: Record<string, string> = {
    'verificacion_almacen': 'compra_pendiente',
    'preparacion_cocina': 'en_preparacion',
    'carga_transporte': 'listo_para_envio',
    'montaje_evento': 'en_evento',
    'recojo_evento': 'en_retorno',
    'retorno_empresa': 'retornado',
    'cierre': 'cierre',
};

const ORDEN_ESTADOS = [
    'pendiente_verificacion',
    'compra_pendiente',
    'en_preparacion',
    'listo_para_envio',
    'en_evento',
    'en_retorno',
    'retornado',
    'cierre',
    'cerrado'
];

const ETIQUETA_ESTADO: Record<string, string> = {
    'pendiente_verificacion': 'Pendiente de verificación',
    'compra_pendiente': 'Compra pendiente',
    'en_preparacion': 'En preparación',
    'listo_para_envio': 'Listo para envío',
    'en_evento': 'En evento',
    'en_retorno': 'En retorno',
    'retornado': 'Retornado',
    'cierre': 'Pendiente de cierre',
    'cerrado': 'Cerrado',
    'cancelado': 'Cancelado',
};

export const Actividades: React.FC = () => {
    const { user } = useAuth();
    const { getSelectedCompanyId } = useCompany();
    const { showToast } = useToast();
    const id_empresa = getSelectedCompanyId() ?? 0;

    const userRol = user?.id_rol ? ROLES[user.id_rol] : 'Cajero';
    const tabsDisponibles = TABS_POR_ROL[userRol] || [];

    const [ventas, setVentas] = useState<VentaCatering[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [tabActiva, setTabActiva] = useState<string>(tabsDisponibles[0]?.id || '');
    const [subtarea, setSubtarea] = useState<'pendientes' | 'completadas'>('pendientes');
    const [flujoModalOpen, setFlujoModalOpen] = useState(false);
    const [ventaSeleccionada, setVentaSeleccionada] = useState<VentaCatering | null>(null);

    useEffect(() => {
        if (tabsDisponibles.length > 0 && !tabActiva) {
            setTabActiva(tabsDisponibles[0].id);
        }
    }, [tabsDisponibles.length]);

    useEffect(() => {
        if (id_empresa) cargarVentas();
    }, [id_empresa]);

    const cargarVentas = async () => {
        if (!id_empresa) return;
        setIsLoading(true);
        try {
            const data = await cateringServiceApi.getAll(id_empresa);
            setVentas(data);
        } catch (error) {
            console.error('[Actividades] Error:', error);
            showToast('Error al cargar actividades', 'error', 'Error');
        } finally {
            setIsLoading(false);
        }
    };

    const eventosDelTab = ventas.filter(v => {
        const estado = v.eventoData?.estado_flujo || 'pendiente_verificacion';

        if (subtarea === 'pendientes' && (estado === 'cerrado' || estado === 'cancelado')) {
            return false;
        }

        const estadoTab = ETAPA_A_ESTADO[tabActiva];

        if (subtarea === 'pendientes') {
            return estado === estadoTab;
        } else {
            const idxActual = ORDEN_ESTADOS.indexOf(estado);
            const idxTab = ORDEN_ESTADOS.indexOf(estadoTab);
            return idxActual > idxTab;
        }
    });

    const abrirFlujo = (venta: VentaCatering) => {
        setVentaSeleccionada(venta);
        setFlujoModalOpen(true);
    };

    if (userRol === 'Cajero') {
        return (
            <MainLayout>
                <div className="dc-actividades-container">
                    <div className="dc-empty-state">
                        <i className="fas fa-user-tie"></i>
                        <h3>No tienes tareas pendientes</h3>
                        <p>Como cajero, gestionas las ventas desde el módulo de Catering.</p>
                    </div>
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <div className="dc-actividades-container">
                <div className="dc-catering-header-card">
                    <div className="dc-title">
                        <h1><i className="fas fa-clipboard-list"></i> Actividades Pendientes</h1>
                        <p>Panel de {userRol}</p>
                    </div>
                </div>

                <Tabs tabs={tabsDisponibles} activeTab={tabActiva} onTabChange={setTabActiva} />

                <div className="dc-subtabs">
                    <button
                        className={`dc-subtab ${subtarea === 'pendientes' ? 'active' : ''}`}
                        onClick={() => setSubtarea('pendientes')}
                    >
                        <i className="fas fa-hourglass-half"></i> Pendientes
                    </button>
                    <button
                        className={`dc-subtab ${subtarea === 'completadas' ? 'active' : ''}`}
                        onClick={() => setSubtarea('completadas')}
                    >
                        <i className="fas fa-check-circle"></i> Completadas
                    </button>
                </div>

                {isLoading ? (
                    <div style={{ textAlign: 'center', padding: '3rem' }}>
                        <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', color: '#007bff' }}></i>
                    </div>
                ) : eventosDelTab.length === 0 ? (
                    <div className="dc-empty-state">
                        <i className="fas fa-inbox"></i>
                        <h3>Sin eventos {subtarea === 'pendientes' ? 'pendientes' : 'completados'}</h3>
                        <p>No hay eventos en esta categoría.</p>
                    </div>
                ) : (
                    <div className="dc-actividades-grid">
                        {eventosDelTab.map((venta) => {
                            const estado = venta.eventoData?.estado_flujo || 'pendiente_verificacion';
                            const esCompletado = subtarea === 'completadas';

                            return (
                                <div
                                    key={venta.id}
                                    className={`dc-actividad-card ${esCompletado ? 'completado' : ''}`}
                                    onClick={() => !esCompletado && abrirFlujo(venta)}
                                    style={{ cursor: esCompletado ? 'default' : 'pointer' }}
                                >
                                    <div className="dc-actividad-card-header">
                                        <div>
                                            <div className="dc-actividad-numero">{venta.numero}</div>
                                            <div className="dc-actividad-cliente">{venta.cliente}</div>
                                        </div>
                                        <span className={`dc-estado-badge ${estado}`}>
                                            {ETIQUETA_ESTADO[estado] || estado}
                                        </span>
                                    </div>

                                    <div className="dc-actividad-card-body">
                                        <div><i className="fas fa-calendar-alt"></i> {formatLocalDate(venta.eventoData?.fecha) || 'Sin fecha'} · {venta.eventoData?.horario || ''}</div>
                                        <div><i className="fas fa-users"></i> {venta.eventoData?.personas || 0} personas</div>
                                        {venta.eventoData?.direccion && (
                                            <div><i className="fas fa-map-marker-alt"></i> {venta.eventoData.direccion}</div>
                                        )}
                                    </div>

                                    <div className="dc-actividad-card-footer">
                                        {esCompletado ? (
                                            <button className="dc-btn secondary" disabled>
                                                <i className="fas fa-check"></i> Completado
                                            </button>
                                        ) : (
                                            <button className="dc-btn success">
                                                <i className="fas fa-play"></i> Iniciar actividad
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <CateringEventoFlujoModal
                isOpen={flujoModalOpen}
                onClose={() => {
                    setFlujoModalOpen(false);
                    setVentaSeleccionada(null);
                    cargarVentas();
                }}
                idEvento={ventaSeleccionada?.eventoData?.id_evento || null}
                numeroVenta={ventaSeleccionada?.numero}
                cliente={ventaSeleccionada?.cliente}
                venta={ventaSeleccionada}
            />
        </MainLayout>
    );
};

export default Actividades;