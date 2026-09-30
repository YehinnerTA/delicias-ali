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
import { useSalesByHour } from '../../../hooks/dashboard/useSalesByHour';

interface SalesByHourChartProps {
    height?: number;
}

const SalesByHourChart: React.FC<SalesByHourChartProps> = ({ height = 260 }) => {
    const { data, horaPico, totalDia, promedioHora, isLoading } = useSalesByHour();

    if (isLoading) {
        return (
            <div className="dc-chart-loading" style={{ height }}>
                <div className="dc-chart-loading-spinner" />
                <span>Cargando flujo de ventas...</span>
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className="dc-chart-empty" style={{ height }}>
                <span className="dc-chart-empty-icon">📊</span>
                <span className="dc-chart-empty-text">Sin ventas hoy aún</span>
            </div>
        );
    }

    const maxValue = Math.max(...data.map((d) => d.total), 1);

    return (
        <div className="dc-sales-by-hour">
            <div className="dc-chart-summary">
                <div className="dc-chart-summary-item">
                    <span className="dc-chart-summary-label">Total del día</span>
                    <span className="dc-chart-summary-value">
                        S/ {totalDia.toFixed(2)}
                    </span>
                </div>
                {horaPico && (
                    <div className="dc-chart-summary-item">
                        <span className="dc-chart-summary-label">Hora pico</span>
                        <span className="dc-chart-summary-value">
                            {horaPico.hora} · S/ {horaPico.total.toFixed(0)}
                        </span>
                    </div>
                )}
                <div className="dc-chart-summary-item">
                    <span className="dc-chart-summary-label">Promedio/hora</span>
                    <span className="dc-chart-summary-value">
                        S/ {promedioHora.toFixed(2)}
                    </span>
                </div>
            </div>

            <ResponsiveContainer width="100%" height={height}>
                <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#f0d6db"
                        vertical={false}
                    />
                    <XAxis
                        dataKey="hora"
                        stroke="#333333"
                        fontSize={10}
                        tickLine={false}
                        axisLine={{ stroke: '#f0d6db' }}
                    />
                    <YAxis
                        stroke="#333333"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v: any) =>
                            v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${v}`
                        }
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
                            const v = Number(value) || 0;
                            const count = item?.payload?.transacciones ?? 0;
                            return [
                                `S/ ${v.toFixed(2)} · ${count} venta${count !== 1 ? 's' : ''}`,
                                'Total',
                            ];
                        }}
                        cursor={{ fill: 'rgba(217, 10, 70, 0.05)' }}
                    />
                    <Bar dataKey="total" radius={[6, 6, 0, 0]} maxBarSize={50}>
                        {data.map((entry, idx) => (
                            <Cell
                                key={idx}
                                fill={entry.total === maxValue ? '#d90a46' : '#4f8cf7'}
                            />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export default SalesByHourChart;