import React from 'react';
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Cell,
} from 'recharts';
import { useEventMetrics } from '../../../hooks/dashboard/useEventMetrics';

interface EventsStageChartProps {
    height?: number;
}

const EventsStageChart: React.FC<EventsStageChartProps> = ({ height = 260 }) => {
    const { eventosPorEtapa, eventosActivos, isLoading } = useEventMetrics('hoy');

    const data = eventosPorEtapa.filter((e) => e.cantidad > 0);

    if (isLoading) {
        return (
            <div className="dc-chart-loading" style={{ height }}>
                <div className="dc-chart-loading-spinner" />
                <span>Cargando etapas de eventos...</span>
            </div>
        );
    }

    if (eventosActivos === 0) {
        return (
            <div className="dc-chart-empty" style={{ height }}>
                <span className="dc-chart-empty-icon">🎉</span>
                <span className="dc-chart-empty-text">
                    No hay eventos activos ahora
                </span>
            </div>
        );
    }

    return (
        <div className="dc-events-stage-chart">
            <div className="dc-events-stage-summary">
                <span className="dc-events-stage-total">{eventosActivos}</span>
                <span className="dc-events-stage-label">
                    {eventosActivos === 1 ? 'evento activo' : 'eventos activos'}
                </span>
            </div>

            <ResponsiveContainer width="100%" height={height}>
                <BarChart
                    data={data}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
                >
                    <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#f0d6db"
                        horizontal={false}
                    />
                    <XAxis type="number" hide allowDecimals={false} />
                    <YAxis
                        type="category"
                        dataKey="label"
                        width={140}
                        stroke="#333333"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                    />
                    <Tooltip
                        contentStyle={{
                            background: '#ffffff',
                            border: '1px solid #f0d6db',
                            borderRadius: '0.6rem',
                            fontSize: '0.8rem',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                        }}
                        formatter={(value: any, _name: any, item: any) => {
                            const numValue = Number(value) || 0;
                            const label = item?.payload?.label ?? '';
                            return [
                                `${numValue} evento${numValue !== 1 ? 's' : ''}`,
                                label,
                            ];
                        }}
                        labelFormatter={() => ''}
                    />
                    <Bar
                        dataKey="cantidad"
                        radius={[0, 6, 6, 0]}
                        label={{
                            position: 'right',
                            fontSize: 11,
                            fill: '#333',
                            fontWeight: 600,
                        }}
                    >
                        {data.map((entry, idx) => (
                            <Cell key={idx} fill={entry.color} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export default EventsStageChart;