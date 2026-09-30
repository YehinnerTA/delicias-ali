import React from 'react';

import SectionHeader from '../../../components/dashboard/primitives/SectionHeader';
import KpiCard from '../../../components/dashboard/primitives/KpiCard';
import ChartCard from '../../../components/dashboard/primitives/ChartCard';

import PreparacionesEnCurso from '../../../components/dashboard/panels/PreparacionesEnCurso';
import RendimientoCocinaChart from '../../../components/dashboard/charts/RendimientoCocinaChart';
import IncidenciasPanel from '../../../components/dashboard/panels/IncidenciasPanel';
import TopProductsChart from '../../../components/dashboard/charts/TopProductsChart';
import UpcomingEventsPanel from '../../../components/dashboard/panels/UpcomingEventsPanel';

import { usePreparacionesMetrics } from '../../../hooks/dashboard/usePreparacionesMetrics';
import { useRecetasMetrics } from '../../../hooks/dashboard/useRecetasMetrics';
import { useEventMetrics } from '../../../hooks/dashboard/useEventMetrics';
import { useInventoryMetrics } from '../../../hooks/dashboard/useInventoryMetrics';
import { useIncidenciasCocina } from '../../../hooks/dashboard/useIncidenciasCocina';

import { useAuth } from '../../../features/auth/context/AuthContext';

const ChefDashboard: React.FC = () => {
    const { user } = useAuth();

    const prep = usePreparacionesMetrics();
    const recetas = useRecetasMetrics();
    const events = useEventMetrics('hoy');
    const inventory = useInventoryMetrics();
    const incidencias = useIncidenciasCocina();

    const userName = user?.nombre_completo || user?.usuario || 'Chef';

    // Filtramos alertas de insumos (solo stock bajo)
    const insumosFaltantes = inventory.alertas.filter(
        (a) => a.motivo === 'stock_bajo'
    );

    return (
        <div className="dc-chef-dashboard">
            <SectionHeader userName={userName} />

            {/* ================= KPIs ================= */}
            <div className="dc-dashboard-grid dc-grid-kpis">
                <KpiCard
                    icon="👨‍🍳"
                    label="En Preparación Ahora"
                    value={prep.totalEnProgreso}
                    sub={`${prep.enTiempo} en tiempo · ${prep.retrasadas} retrasadas`}
                    variant="primary"
                    isLoading={prep.isLoading}
                />

                <KpiCard
                    icon="📖"
                    label="Recetas Activas"
                    value={recetas.recetasActivas}
                    sub={`de ${recetas.totalRecetas} totales`}
                    variant="info"
                    isLoading={recetas.isLoading}
                />

                <KpiCard
                    icon="🎯"
                    label="Eventos Hoy"
                    value={events.eventosHoy}
                    sub={`${events.totalPersonasHoy} personas · ${events.eventosActivos} activos`}
                    variant="success"
                    isLoading={events.isLoading}
                />

                <KpiCard
                    icon="⚠️"
                    label="Insumos Faltantes"
                    value={insumosFaltantes.length}
                    sub={`${insumosFaltantes.filter((a) => a.severidad === 'critica').length} críticos`}
                    variant="danger"
                    isLoading={inventory.isLoading}
                />
            </div>

            {/* ================= PREPARACIONES EN CURSO ================= */}
            <div className="dc-dashboard-grid dc-grid-full">
                <ChartCard
                    title="Preparaciones en Curso"
                    icon="🔥"
                    subtitle="Estado de cocina en tiempo real"
                >
                    <PreparacionesEnCurso maxItems={5} />
                </ChartCard>
            </div>

            {/* ================= RENDIMIENTO + EVENTOS DEL DÍA ================= */}
            <div className="dc-dashboard-grid dc-grid-2col">
                <ChartCard
                    title="Rendimiento de Cocina"
                    icon="📊"
                    subtitle="Últimos 10 eventos procesados"
                >
                    <RendimientoCocinaChart height={240} />
                </ChartCard>

                <ChartCard
                    title="Eventos del Día"
                    icon="🎯"
                    subtitle="Producciones programadas"
                >
                    <UpcomingEventsPanel maxItems={4} />
                </ChartCard>
            </div>

            {/* ================= TOP RECETAS + INSUMOS FALTANTES ================= */}
            <div className="dc-dashboard-grid dc-grid-2col">
                <ChartCard
                    title="Top Recetas Más Pedidas"
                    icon="🏆"
                    subtitle="Últimos 30 días"
                >
                    <TopProductsChart periodo="30d" limite={5} height={260} />
                </ChartCard>

                <ChartCard
                    title="Insumos Faltantes"
                    icon="⚠️"
                    subtitle="Solicitar a Logística"
                >
                    <div className="dc-insumos-faltantes">
                        {insumosFaltantes.length === 0 ? (
                            <div className="dc-panel-empty dc-panel-empty--success">
                                <span className="dc-panel-empty-icon">✅</span>
                                <span className="dc-panel-empty-title">
                                    Insumos suficientes
                                </span>
                                <span className="dc-panel-empty-desc">
                                    Todo en orden para cocinar
                                </span>
                            </div>
                        ) : (
                            insumosFaltantes.slice(0, 6).map((a) => (
                                <div
                                    key={`${a.tipo}-${a.id}`}
                                    className={`dc-insumo-item dc-insumo-item--${a.severidad}`}
                                >
                                    <span className="dc-insumo-icon">
                                        {a.severidad === 'critica' ? '🔴' : '🟠'}
                                    </span>
                                    <span className="dc-insumo-nombre">{a.nombre}</span>
                                    <span className="dc-insumo-badge">
                                        {a.stock} / {a.minimo}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </ChartCard>
            </div>

            {/* ================= INCIDENCIAS ================= */}
            <div className="dc-dashboard-grid dc-grid-full">
                <ChartCard
                    title="Incidencias de Cocina"
                    icon="⚠️"
                    subtitle={`${incidencias.totalAbiertas} abiertas · ${incidencias.totalCriticas} críticas`}
                >
                    <IncidenciasPanel maxItems={5} />
                </ChartCard>
            </div>
        </div>
    );
};

export default ChefDashboard;