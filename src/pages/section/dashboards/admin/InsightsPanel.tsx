import React, { useMemo } from 'react';
import { useSalesMetrics } from '../../../../hooks/dashboard/useSalesMetrics';
import { useEventMetrics } from '../../../../hooks/dashboard/useEventMetrics';
import { useInventoryMetrics } from '../../../../hooks/dashboard/useInventoryMetrics';
import { usePaymentDistribution } from '../../../../hooks/dashboard/usePaymentDistribution';

interface InsightsPanelProps {
    maxInsights?: number;
}

interface Insight {
    icon: string;
    text: string;
    tono: 'positivo' | 'negativo' | 'neutral' | 'alerta';
}

const InsightsPanel: React.FC<InsightsPanelProps> = ({ maxInsights = 4 }) => {
    const sales = useSalesMetrics('hoy');
    const events = useEventMetrics('hoy');
    const inventory = useInventoryMetrics();
    const payments = usePaymentDistribution('mes');

    const insights = useMemo<Insight[]>(() => {
        const resultado: Insight[] = [];

        // 1. Comparativo ventas hoy vs ayer
        if (sales.totalAyer > 0) {
            const diff = ((sales.totalHoy - sales.totalAyer) / sales.totalAyer) * 100;
            if (Math.abs(diff) >= 5) {
                resultado.push({
                    icon: diff > 0 ? '📈' : '📉',
                    text:
                        diff > 0
                            ? `Las ventas de tienda crecieron ${diff.toFixed(1)}% vs ayer`
                            : `Las ventas de tienda cayeron ${Math.abs(diff).toFixed(1)}% vs ayer`,
                    tono: diff > 0 ? 'positivo' : 'negativo',
                });
            }
        } else if (sales.totalHoy > 0) {
            resultado.push({
                icon: '🌟',
                text: `Primeras ventas del día: S/ ${sales.totalHoy.toFixed(2)}`,
                tono: 'positivo',
            });
        }

        // 2. Catering eventos vs ayer
        if (events.totalAyer > 0 && events.totalHoy > 0) {
            const diffEv =
                ((events.totalHoy - events.totalAyer) / events.totalAyer) * 100;
            if (Math.abs(diffEv) >= 10) {
                resultado.push({
                    icon: diffEv > 0 ? '🎉' : '⚠️',
                    text:
                        diffEv > 0
                            ? `Catering eventos creció ${diffEv.toFixed(1)}% vs ayer`
                            : `Catering eventos bajó ${Math.abs(diffEv).toFixed(1)}% vs ayer`,
                    tono: diffEv > 0 ? 'positivo' : 'negativo',
                });
            }
        }

        // 3. Método de pago dominante
        if (payments.slices.length > 0) {
            const top = payments.slices[0];
            if (top.porcentaje >= 30) {
                resultado.push({
                    icon: '💳',
                    text: `${top.label} representa el ${top.porcentaje.toFixed(1)}% de las transacciones del mes`,
                    tono: 'neutral',
                });
            }
        }

        // 4. Stock crítico
        if (inventory.itemsStockBajo > 0) {
            resultado.push({
                icon: '⚠️',
                text: `${inventory.itemsStockBajo} ${inventory.itemsStockBajo === 1 ? 'insumo está' : 'insumos están'
                    } bajo el stock mínimo — riesgo operativo`,
                tono: 'alerta',
            });
        }

        // 5. Productos por vencer
        const porVencer = inventory.insumosPorVencer + inventory.postresPorVencer;
        if (porVencer > 0) {
            resultado.push({
                icon: '⏰',
                text: `${porVencer} ${porVencer === 1 ? 'producto vence' : 'productos vencen'
                    } en menos de 7 días`,
                tono: 'alerta',
            });
        }

        // 6. Ticket promedio
        if (sales.ticketPromedio > 0 && sales.ticketPromedioAyer > 0) {
            const diffTicket =
                ((sales.ticketPromedio - sales.ticketPromedioAyer) /
                    sales.ticketPromedioAyer) *
                100;
            if (Math.abs(diffTicket) >= 8) {
                resultado.push({
                    icon: '🎫',
                    text:
                        diffTicket > 0
                            ? `El ticket promedio subió ${diffTicket.toFixed(1)}% (S/ ${sales.ticketPromedio.toFixed(2)})`
                            : `El ticket promedio bajó ${Math.abs(diffTicket).toFixed(1)}% (S/ ${sales.ticketPromedio.toFixed(2)})`,
                    tono: diffTicket > 0 ? 'positivo' : 'negativo',
                });
            }
        }

        // 7. Eventos activos
        if (events.eventosActivos > 0) {
            resultado.push({
                icon: '🎯',
                text: `${events.eventosActivos} ${events.eventosActivos === 1 ? 'evento activo' : 'eventos activos'
                    } en el flujo operativo`,
                tono: 'neutral',
            });
        }

        return resultado.slice(0, maxInsights);
    }, [sales, events, inventory, payments, maxInsights]);

    if (
        sales.isLoading ||
        events.isLoading ||
        inventory.isLoading ||
        payments.isLoading
    ) {
        return (
            <div className="dc-panel-loading">
                <div className="dc-panel-loading-spinner" />
                <span>Analizando datos...</span>
            </div>
        );
    }

    if (insights.length === 0) {
        return (
            <div className="dc-panel-empty">
                <span className="dc-panel-empty-icon">💡</span>
                <span className="dc-panel-empty-title">Sin insights por ahora</span>
                <span className="dc-panel-empty-desc">
                    Se necesitan más datos para generar conclusiones
                </span>
            </div>
        );
    }

    return (
        <div className="dc-insights">
            {insights.map((insight, idx) => (
                <div
                    key={idx}
                    className={`dc-insight-item dc-insight-item--${insight.tono}`}
                >
                    <span className="dc-insight-icon">{insight.icon}</span>
                    <span className="dc-insight-text">{insight.text}</span>
                </div>
            ))}
        </div>
    );
};

export default InsightsPanel;