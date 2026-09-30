import React from 'react';
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
} from 'recharts';
import { useIngresosInsumos } from '../../../hooks/dashboard/useIngresosInsumos';

interface InsumosIngresosChartProps {
    height?: number;
}

const InsumosIngresosChart: React.FC<InsumosIngresosChartProps> = ({
    height = 240,
}) => {
    const { data, total, promedioSemanal, isLoading } = useIngresosInsumos(4);

    if (isLoading) {
        return (
            <div className="dc-chart-loading" style={{ height }}>
                <div className="dc-chart-loading-spinner" />
                <span>Cargando ingresos...</span>
            </div>
        );
    }

    if (total === 0) {
        return (
            <div className="dc-chart-empty" style={{ height }}>
                <span className="dc-chart-empty-icon">📊</span>
                <span className="dc-chart-empty-text">
                    Sin ingresos registrados aún
                </span>
            </div>
        );
    }

    return (
        <div className="dc-insumos-ingresos">
            <div className="dc-chart-summary">
                <div className="dc-chart-summary-item">
                    <span className="dc-chart-summary-label">
                        Total recibido
                    </span>
                    <span className="dc-chart-summary-value">
                        {total} insumos
                    </span>
                </div>
                <div className="dc-chart-summary-item">
                    <span className="dc-chart-summary-label">
                        Promedio semanal
                    </span>
                    <span className="dc-chart-summary-value">
                        {promedioSemanal.toFixed(1)} / semana
                    </span>
                </div>
            </div>

            <ResponsiveContainer width="100%" height={height}>
                <AreaChart
                    data={data}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                    <defs>
                        <linearGradient id="ingresoArea" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#d90a46" stopOpacity={0.4} />
                            <stop offset="100%" stopColor="#d90a46" stopOpacity={0.02} />
                        </linearGradient>
                    </defs>

                    <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#f0d6db"
                        vertical={false}
                    />
                    <XAxis
                        dataKey="semana"
                        stroke="#333333"
                        fontSize={11}
                        tickLine={false}
                        axisLine={{ stroke: '#f0d6db' }}
                    />
                    <YAxis
                        stroke="#333333"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                    />
                    <Tooltip
                        contentStyle={{
                            background: '#ffffff',
                            border: '1px solid #f0d6db',
                            borderRadius: '0.6rem',
                            fontSize: '0.8rem',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                        }}
                        formatter={(value: any) => [
                            `${Number(value) || 0} insumos`,
                            'Registrados',
                        ]}
                    />
                    <Area
                        type="monotone"
                        dataKey="cantidad"
                        stroke="#d90a46"
                        strokeWidth={2.5}
                        fill="url(#ingresoArea)"
                        dot={{ r: 4, fill: '#d90a46' }}
                        activeDot={{ r: 6 }}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};

export default InsumosIngresosChart;