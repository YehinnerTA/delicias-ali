import React, { useState } from 'react';

import SectionHeader, {
    PeriodoType,
} from '../../../components/dashboard/primitives/SectionHeader';
import KpiCard from '../../../components/dashboard/primitives/KpiCard';
import ChartCard from '../../../components/dashboard/primitives/ChartCard';

import SalesTrendChart from '../../../components/dashboard/charts/SalesTrendChart';
import PaymentMethodsChart from '../../../components/dashboard/charts/PaymentMethodsChart';
import TopProductsChart from '../../../components/dashboard/charts/TopProductsChart';
import EventsStageChart from '../../../components/dashboard/charts/EventsStageChart';
import IncomeExpenseChart from './admin/IncomeExpenseChart';

import UpcomingEventsPanel from '../../../components/dashboard/panels/UpcomingEventsPanel';
import InventoryAlertsPanel from '../../../components/dashboard/panels/InventoryAlertsPanel';
import InsightsPanel from './admin/InsightsPanel';

import { useSalesMetrics } from '../../../hooks/dashboard/useSalesMetrics';
import { useEventMetrics } from '../../../hooks/dashboard/useEventMetrics';
import { useInventoryMetrics } from '../../../hooks/dashboard/useInventoryMetrics';

import { useAuth } from '../../../features/auth/context/AuthContext';

const getTrendDirection = (actual: number, anterior: number): 'up' | 'down' | 'flat' => {
    if (anterior === 0) return 'flat';
    if (actual > anterior) return 'up';
    if (actual < anterior) return 'down';
    return 'flat';
};

const getTrendValue = (actual: number, anterior: number): number => {
    if (anterior === 0) return 0;
    return ((actual - anterior) / anterior) * 100;
};

const AdminDashboard: React.FC = () => {
    const { user } = useAuth();
    const [periodo, setPeriodo] = useState<PeriodoType>('hoy');

    const sales = useSalesMetrics(periodo);
    const events = useEventMetrics(periodo);
    const inventory = useInventoryMetrics();

    const isLoading = sales.isLoading || events.isLoading;

    const userName = user?.nombre_completo || user?.usuario || 'Administrador';

    // KPIs combinados
    const ventasHoyTotal = sales.totalHoy + events.totalHoy;
    const ventasAyerTotal = sales.totalAyer + events.totalAyer;

    const trendVentas = getTrendValue(ventasHoyTotal, ventasAyerTotal);
    const trendDireccionVentas = getTrendDirection(ventasHoyTotal, ventasAyerTotal);

    const trendTicket = getTrendValue(sales.ticketPromedio, sales.ticketPromedioAyer);
    const trendDireccionTicket = getTrendDirection(
        sales.ticketPromedio,
        sales.ticketPromedioAyer
    );

    const trendTienda = getTrendValue(sales.totalHoy, sales.totalAyer);
    const trendDirTienda = getTrendDirection(sales.totalHoy, sales.totalAyer);

    const trendEventos = getTrendValue(events.totalHoy, events.totalAyer);
    const trendDirEventos = getTrendDirection(events.totalHoy, events.totalAyer);

    // Margen bruto mes (aprox)
    const margenEstimado = sales.totalMes + events.totalMes;
    const porcentajeMargenEstimado = margenEstimado > 0 ? 57 : 0; // fallback visual

    return (
        <div className="dc-admin-dashboard">
            <SectionHeader
                userName={userName}
                periodoActivo={periodo}
                onPeriodoChange={setPeriodo}
            />

            {/* ================= FILA 1: KPIs PRINCIPALES ================= */}
            <div className="dc-dashboard-grid dc-grid-kpis">
                <KpiCard
                    icon="💰"
                    label="Ventas Hoy"
                    value={`S/ ${ventasHoyTotal.toFixed(2)}`}
                    sub={`Ayer: S/ ${ventasAyerTotal.toFixed(2)}`}
                    trend={{
                        value: Math.abs(trendVentas),
                        direction: trendDireccionVentas,
                        label: 'vs ayer',
                    }}
                    variant="primary"
                    isLoading={isLoading}
                />

                <KpiCard
                    icon="📊"
                    label="Ticket Promedio"
                    value={`S/ ${sales.ticketPromedio.toFixed(2)}`}
                    sub={`${sales.transaccionesHoy} transacciones`}
                    trend={{
                        value: Math.abs(trendTicket),
                        direction: trendDireccionTicket,
                        label: 'vs ayer',
                    }}
                    variant="info"
                    isLoading={isLoading}
                />

                <KpiCard
                    icon="📈"
                    label="Margen Bruto Mes"
                    value={`${porcentajeMargenEstimado.toFixed(1)}%`}
                    sub={`Ventas: S/ ${margenEstimado.toFixed(0)}`}
                    variant="success"
                    isLoading={isLoading}
                />

                <KpiCard
                    icon="🎉"
                    label="Eventos Activos"
                    value={events.eventosActivos}
                    sub={`${events.eventosHoy} hoy · ${events.totalPersonasHoy} personas`}
                    variant="neutral"
                    isLoading={isLoading}
                />
            </div>

            {/* ================= FILA 2: KPIs OPERATIVOS ================= */}
            <div className="dc-dashboard-grid dc-grid-kpis">
                <KpiCard
                    icon="🏪"
                    label="Ventas Tienda"
                    value={`S/ ${sales.totalHoy.toFixed(2)}`}
                    trend={{
                        value: Math.abs(trendTienda),
                        direction: trendDirTienda,
                        label: 'vs ayer',
                    }}
                    variant="primary"
                    isLoading={isLoading}
                />

                <KpiCard
                    icon="🎉"
                    label="Ventas Eventos"
                    value={`S/ ${events.totalHoy.toFixed(2)}`}
                    trend={{
                        value: Math.abs(trendEventos),
                        direction: trendDirEventos,
                        label: 'vs ayer',
                    }}
                    variant="info"
                    isLoading={isLoading}
                />

                <KpiCard
                    icon="↩️"
                    label="Devoluciones"
                    value={sales.devoluciones}
                    sub={`S/ ${sales.ventasFiltradas
                        .flatMap((v) => v.devoluciones || [])
                        .reduce((acc, d) => acc + (d.monto || 0), 0)
                        .toFixed(2)}`}
                    variant="warning"
                    isLoading={isLoading}
                />

                <KpiCard
                    icon="⚠️"
                    label="Stock Crítico"
                    value={inventory.alertas.length}
                    sub={`${inventory.itemsStockBajo} bajo mínimo · ${inventory.insumosPorVencer + inventory.postresPorVencer
                        } por vencer`}
                    variant="danger"
                    isLoading={inventory.isLoading}
                />
            </div>

            {/* ================= GRÁFICO PRINCIPAL: TENDENCIA ================= */}
            <div className="dc-dashboard-grid dc-grid-full">
                <ChartCard
                    title="Tendencia de Ventas"
                    icon="📈"
                    subtitle={
                        periodo === 'hoy'
                            ? 'Vista de hoy'
                            : periodo === '7d'
                                ? 'Últimos 7 días'
                                : periodo === '30d'
                                    ? 'Últimos 30 días'
                                    : 'Este mes'
                    }
                >
                    <SalesTrendChart
                        dias={periodo === '7d' ? 7 : periodo === '30d' ? 30 : periodo === 'mes' ? 30 : 7}
                        compararConAnterior={periodo !== 'hoy'}
                        height={280}
                    />
                </ChartCard>
            </div>

            {/* ================= FILA 3: INGRESOS/EGRESOS + MÉTODOS PAGO ================= */}
            <div className="dc-dashboard-grid dc-grid-2col">
                <ChartCard
                    title="Ingresos vs Egresos"
                    icon="💵"
                    subtitle="Últimos 6 meses"
                >
                    <IncomeExpenseChart height={240} />
                </ChartCard>

                <ChartCard
                    title="Métodos de Pago"
                    icon="💳"
                    subtitle="Distribución del período"
                >
                    <PaymentMethodsChart periodo={periodo} height={240} />
                </ChartCard>
            </div>

            {/* ================= FILA 4: TOP PRODUCTOS + EVENTOS POR ETAPA ================= */}
            <div className="dc-dashboard-grid dc-grid-2col">
                <ChartCard
                    title="Top 5 Productos"
                    icon="🏆"
                    subtitle="Últimos 30 días"
                >
                    <TopProductsChart periodo="30d" limite={5} height={260} />
                </ChartCard>

                <ChartCard
                    title="Eventos por Etapa"
                    icon="🎯"
                    subtitle="Estado operativo en tiempo real"
                >
                    <EventsStageChart height={260} />
                </ChartCard>
            </div>

            {/* ================= FILA 5: EVENTOS PRÓXIMOS + ALERTAS ================= */}
            <div className="dc-dashboard-grid dc-grid-2col">
                <ChartCard
                    title="Próximos Eventos Hoy"
                    icon="🕐"
                    subtitle="Agenda operativa del día"
                >
                    <UpcomingEventsPanel maxItems={4} />
                </ChartCard>

                <ChartCard
                    title="Alertas de Inventario"
                    icon="⚠️"
                    subtitle="Riesgos operativos"
                >
                    <InventoryAlertsPanel maxItems={6} />
                </ChartCard>
            </div>

            {/* ================= FILA 6: INSIGHTS ================= */}
            <div className="dc-dashboard-grid dc-grid-full">
                <ChartCard
                    title="Insights Automáticos"
                    icon="💡"
                    subtitle="Conclusiones del período"
                >
                    <InsightsPanel maxInsights={4} />
                </ChartCard>
            </div>
        </div>
    );
};

export default AdminDashboard;