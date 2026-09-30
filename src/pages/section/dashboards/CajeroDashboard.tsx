import React from 'react';

import SectionHeader from '../../../components/dashboard/primitives/SectionHeader';
import KpiCard from '../../../components/dashboard/primitives/KpiCard';
import ChartCard from '../../../components/dashboard/primitives/ChartCard';

import SalesByHourChart from '../../../components/dashboard/charts/SalesByHourChart';
import PaymentMethodsChart from '../../../components/dashboard/charts/PaymentMethodsChart';
import TopProductsChart from '../../../components/dashboard/charts/TopProductsChart';
import RecentTransactionsPanel from '../../../components/dashboard/panels/RecentTransactionsPanel';
import DevolucionesHoyPanel from '../../../components/dashboard/panels/DevolucionesHoyPanel';

import { useSalesMetrics } from '../../../hooks/dashboard/useSalesMetrics';
import { useDevolucionesHoy } from '../../../hooks/dashboard/useDevolucionesHoy';

import { useAuth } from '../../../features/auth/context/AuthContext';

const getTrendDirection = (
    actual: number,
    anterior: number
): 'up' | 'down' | 'flat' => {
    if (anterior === 0) return 'flat';
    if (actual > anterior) return 'up';
    if (actual < anterior) return 'down';
    return 'flat';
};

const getTrendValue = (actual: number, anterior: number): number => {
    if (anterior === 0) return 0;
    return ((actual - anterior) / anterior) * 100;
};

const getTurnoActual = (): { icon: string; label: string } => {
    const hora = new Date().getHours();
    if (hora >= 6 && hora < 13) return { icon: '🌅', label: 'Turno Mañana' };
    if (hora >= 13 && hora < 19) return { icon: '☀️', label: 'Turno Tarde' };
    if (hora >= 19 && hora < 23) return { icon: '🌙', label: 'Turno Noche' };
    return { icon: '🌙', label: 'Fuera de turno' };
};

const CajeroDashboard: React.FC = () => {
    const { user } = useAuth();
    const sales = useSalesMetrics('hoy');
    const devoluciones = useDevolucionesHoy();

    const userName = user?.nombre_completo || user?.usuario || 'Cajero';
    const turno = getTurnoActual();

    const trendVentas = getTrendValue(sales.totalHoy, sales.totalAyer);
    const dirVentas = getTrendDirection(sales.totalHoy, sales.totalAyer);

    const trendTicket = getTrendValue(
        sales.ticketPromedio,
        sales.ticketPromedioAyer
    );
    const dirTicket = getTrendDirection(
        sales.ticketPromedio,
        sales.ticketPromedioAyer
    );

    const trendTransacciones = sales.transaccionesHoy - (sales.transaccionesHoy || 1);
    // Comparativa simple basada en % (usamos ticketAyer como referencia indirecta)
    const transaccionesAyer = sales.ticketPromedioAyer > 0 && sales.totalAyer > 0
        ? Math.round(sales.totalAyer / sales.ticketPromedioAyer)
        : 0;
    const dirTransacciones = getTrendDirection(
        sales.transaccionesHoy,
        transaccionesAyer
    );

    return (
        <div className="dc-cajero-dashboard">
            <div className="dc-cajero-header-wrap">
                <SectionHeader userName={userName} />
                <div className="dc-turno-badge">
                    <span className="dc-turno-icon">{turno.icon}</span>
                    <span className="dc-turno-label">{turno.label}</span>
                </div>
            </div>

            {/* ================= KPIs ================= */}
            <div className="dc-dashboard-grid dc-grid-kpis">
                <KpiCard
                    icon="💰"
                    label="Ventas Hoy"
                    value={`S/ ${sales.totalHoy.toFixed(2)}`}
                    sub={`Ayer: S/ ${sales.totalAyer.toFixed(2)}`}
                    trend={{
                        value: Math.abs(trendVentas),
                        direction: dirVentas,
                        label: 'vs ayer',
                    }}
                    variant="primary"
                    isLoading={sales.isLoading}
                />

                <KpiCard
                    icon="🎫"
                    label="Ticket Promedio"
                    value={`S/ ${sales.ticketPromedio.toFixed(2)}`}
                    sub={`Ayer: S/ ${sales.ticketPromedioAyer.toFixed(2)}`}
                    trend={{
                        value: Math.abs(trendTicket),
                        direction: dirTicket,
                        label: 'vs ayer',
                    }}
                    variant="info"
                    isLoading={sales.isLoading}
                />

                <KpiCard
                    icon="🛒"
                    label="Transacciones Hoy"
                    value={sales.transaccionesHoy}
                    sub={`Ayer: ${transaccionesAyer}`}
                    trend={{
                        value: Math.abs(
                            getTrendValue(sales.transaccionesHoy, transaccionesAyer)
                        ),
                        direction: dirTransacciones,
                        label: 'vs ayer',
                    }}
                    variant="success"
                    isLoading={sales.isLoading}
                />

                <KpiCard
                    icon="↩️"
                    label="Devoluciones Hoy"
                    value={`S/ ${devoluciones.total.toFixed(2)}`}
                    sub={`${devoluciones.cantidad} ${devoluciones.cantidad === 1 ? 'caso' : 'casos'
                        }`}
                    variant="warning"
                    isLoading={devoluciones.isLoading}
                />
            </div>

            {/* ================= FLUJO POR HORA ================= */}
            <div className="dc-dashboard-grid dc-grid-full">
                <ChartCard
                    title="Flujo de Ventas por Hora"
                    icon="📊"
                    subtitle="Distribución del día en curso"
                >
                    <SalesByHourChart height={260} />
                </ChartCard>
            </div>

            {/* ================= MÉTODOS PAGO + ÚLTIMAS TRANSACCIONES ================= */}
            <div className="dc-dashboard-grid dc-grid-2col">
                <ChartCard
                    title="Métodos de Pago Hoy"
                    icon="💳"
                    subtitle="Distribución del turno actual"
                >
                    <PaymentMethodsChart periodo="hoy" height={240} />
                </ChartCard>

                <ChartCard
                    title="Últimas Transacciones"
                    icon="🕐"
                    subtitle="Actividad reciente de caja"
                >
                    <RecentTransactionsPanel maxItems={6} />
                </ChartCard>
            </div>

            {/* ================= TOP PRODUCTOS + DEVOLUCIONES ================= */}
            <div className="dc-dashboard-grid dc-grid-2col">
                <ChartCard
                    title="Top Productos Vendidos Hoy"
                    icon="🏆"
                    subtitle="Los más pedidos del día"
                >
                    <TopProductsChart periodo="hoy" limite={5} height={260} />
                </ChartCard>

                <ChartCard
                    title="Devoluciones Hoy"
                    icon="↩️"
                    subtitle="Detalle para arqueo de caja"
                >
                    <DevolucionesHoyPanel maxItems={5} />
                </ChartCard>
            </div>
        </div>
    );
};

export default CajeroDashboard;