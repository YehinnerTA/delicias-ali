import React, { useMemo } from 'react';

import SectionHeader from '../../../components/dashboard/primitives/SectionHeader';
import KpiCard from '../../../components/dashboard/primitives/KpiCard';
import ChartCard from '../../../components/dashboard/primitives/ChartCard';

import InventoryStatusChart from '../../../components/dashboard/charts/InventoryStatusChart';
import InsumosIngresosChart from '../../../components/dashboard/charts/InsumosIngresosChart';

import EventosLogisticaPanel from '../../../components/dashboard/panels/EventosLogisticaPanel';
import LotesPorVencerPanel from '../../../components/dashboard/panels/LotesPorVencerPanel';
import InventoryAlertsPanel from '../../../components/dashboard/panels/InventoryAlertsPanel';
import ProveedoresResumenPanel from '../../../components/dashboard/panels/ProveedoresResumenPanel';

import { useInventoryMetrics } from '../../../hooks/dashboard/useInventoryMetrics';
import { useEventMetrics } from '../../../hooks/dashboard/useEventMetrics';
import { useLotesPorVencer } from '../../../hooks/dashboard/useLotesPorVencer';

import { useAuth } from '../../../features/auth/context/AuthContext';

const ESTADOS_LOGISTICOS = [
    'compra_pendiente',
    'listo_para_envio',
    'en_transito',
    'en_retorno',
];

const LogisticaDashboard: React.FC = () => {
    const { user } = useAuth();
    const inventory = useInventoryMetrics();
    const events = useEventMetrics('hoy');
    const lotes = useLotesPorVencer(5);

    const userName = user?.nombre_completo || user?.usuario || 'Logística';

    const eventosLogisticos = useMemo(
        () =>
            events.proximosEventosHoy.filter((e) =>
                ESTADOS_LOGISTICOS.includes(e.estado_flujo)
            ),
        [events.proximosEventosHoy]
    );

    const enTransito = eventosLogisticos.filter(
        (e) => e.estado_flujo === 'en_transito'
    ).length;

    return (
        <div className="dc-logistica-dashboard">
            <SectionHeader userName={userName} />

            {/* ================= KPIs ================= */}
            <div className="dc-dashboard-grid dc-grid-kpis">
                <KpiCard
                    icon="📦"
                    label="Total Items"
                    value={inventory.totalItems}
                    sub={`${inventory.totalInsumos} insumos · ${inventory.totalPostres} postres`}
                    variant="primary"
                    isLoading={inventory.isLoading}
                />

                <KpiCard
                    icon="⚠️"
                    label="Stock Crítico"
                    value={inventory.itemsStockBajo}
                    sub={`${inventory.alertas.filter((a) => a.severidad === 'critica' && a.motivo === 'stock_bajo').length} críticos`}
                    variant="danger"
                    isLoading={inventory.isLoading}
                />

                <KpiCard
                    icon="⏰"
                    label="Por Vencer"
                    value={inventory.insumosPorVencer + inventory.postresPorVencer}
                    sub="próximos 7 días"
                    variant="warning"
                    isLoading={inventory.isLoading}
                />

                <KpiCard
                    icon="🚚"
                    label="Eventos Logísticos"
                    value={eventosLogisticos.length}
                    sub={`${enTransito} en tránsito`}
                    variant="info"
                    isLoading={events.isLoading}
                />
            </div>

            {/* ================= ESTADO DEL INVENTARIO ================= */}
            <div className="dc-dashboard-grid dc-grid-full">
                <ChartCard
                    title="Estado del Inventario"
                    icon="📊"
                    subtitle="Distribución por categoría y umbrales"
                >
                    <InventoryStatusChart />
                </ChartCard>
            </div>

            {/* ================= EVENTOS + LOTES ================= */}
            <div className="dc-dashboard-grid dc-grid-2col">
                <ChartCard
                    title="Eventos en Fase Logística"
                    icon="🚚"
                    subtitle="Despachos y tránsito del día"
                >
                    <EventosLogisticaPanel maxItems={5} />
                </ChartCard>

                <ChartCard
                    title="Lotes por Vencer"
                    icon="⏰"
                    subtitle="Prioridad de consumo"
                >
                    <LotesPorVencerPanel maxItems={5} />
                </ChartCard>
            </div>

            {/* ================= INSUMOS CRÍTICOS + PROVEEDORES ================= */}
            <div className="dc-dashboard-grid dc-grid-2col">
                <ChartCard
                    title="Insumos Críticos"
                    icon="⚠️"
                    subtitle="Bajo stock mínimo"
                >
                    <InventoryAlertsPanel maxItems={6} soloStockBajo />
                </ChartCard>

                <ChartCard
                    title="Proveedores"
                    icon="🏢"
                    subtitle="Estado del padrón"
                >
                    <ProveedoresResumenPanel />
                </ChartCard>
            </div>

            {/* ================= INGRESOS DE INSUMOS ================= */}
            <div className="dc-dashboard-grid dc-grid-full">
                <ChartCard
                    title="Ingresos de Insumos"
                    icon="📈"
                    subtitle="Últimas 4 semanas"
                >
                    <InsumosIngresosChart height={240} />
                </ChartCard>
            </div>
        </div>
    );
};

export default LogisticaDashboard;