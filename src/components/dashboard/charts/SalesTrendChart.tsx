import React from 'react';
import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
} from 'recharts';
import { useSalesTrend } from '../../../hooks/dashboard/useSalesTrend';

interface SalesTrendChartProps {
    dias?: number;
    compararConAnterior?: boolean;
    height?: number;
}

const formatCurrency = (value: number): string => {
    if (value >= 1000) return `S/ ${(value / 1000).toFixed(1)}k`;
    return `S/ ${value.toFixed(0)}`;
};

const formatTooltipValue = (value: number): string => {
    return `S/ ${value.toFixed(2)}`;
};

const SalesTrendChart: React.FC<SalesTrendChartProps> = ({
    dias = 7,
    compararConAnterior = true,
    height = 280,
}) => {
    const { data, isLoading, totalPeriodo, mejorDia, vsPeriodoAnterior } =
        useSalesTrend(dias, compararConAnterior);

    const sinDatos = !isLoading && data.every((d) => d.total === 0);

    if (isLoading) {
        return (
            <div className="dc-chart-loading" style={{ height }}>
                <div className="dc-chart-loading-spinner" />
                <span>Cargando tendencia...</span>
            </div>
        );
    }

    if (sinDatos) {
        return (
            <div className="dc-chart-empty" style={{ height }}>
                <span className="dc-chart-empty-icon">📈</span>
                <span className="dc-chart-empty-text">
                    Sin datos del período seleccionado
                </span>
            </div>
        );
    }

    return (
        <div className="dc-sales-trend">
            <div className="dc-chart-summary">
                <div className="dc-chart-summary-item">
                    <span className="dc-chart-summary-label">Total período</span>
                    <span className="dc-chart-summary-value">
                        S/ {totalPeriodo.toFixed(2)}
                    </span>
                </div>
                {mejorDia && (
                    <div className="dc-chart-summary-item">
                        <span className="dc-chart-summary-label">Mejor día</span>
                        <span className="dc-chart-summary-value">
                            {mejorDia.fecha} · S/ {mejorDia.total.toFixed(0)}
                        </span>
                    </div>
                )}
                {compararConAnterior && (
                    <div className="dc-chart-summary-item">
                        <span className="dc-chart-summary-label">vs anterior</span>
                        <span
                            className={`dc-chart-summary-value ${vsPeriodoAnterior >= 0
                                ? 'dc-trend-up'
                                : 'dc-trend-down'
                                }`}
                        >
                            {vsPeriodoAnterior >= 0 ? '▲' : '▼'}{' '}
                            {Math.abs(vsPeriodoAnterior).toFixed(1)}%
                        </span>
                    </div>
                )}
            </div>

            <ResponsiveContainer width="100%" height={height}>
                <LineChart
                    data={data}
                    margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                >
                    <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#f0d6db"
                        vertical={false}
                    />
                    <XAxis
                        dataKey="fecha"
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
                        tickFormatter={formatCurrency}
                    />
                    <Tooltip
                        contentStyle={{
                            background: '#ffffff',
                            border: '1px solid #f0d6db',
                            borderRadius: '0.6rem',
                            fontSize: '0.8rem',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                        }}
                        formatter={(value: any, name: any) => [
                            formatTooltipValue(Number(value) || 0),
                            String(name),
                        ]}
                        labelStyle={{ fontWeight: 600, marginBottom: 4 }}
                    />
                    <Legend
                        wrapperStyle={{ fontSize: '0.75rem', paddingTop: '0.5rem' }}
                        iconType="circle"
                        iconSize={8}
                    />
                    <Line
                        type="monotone"
                        dataKey="tienda"
                        name="Tienda Física"
                        stroke="#d90a46"
                        strokeWidth={2.5}
                        dot={{ r: 3, fill: '#d90a46' }}
                        activeDot={{ r: 5 }}
                    />
                    <Line
                        type="monotone"
                        dataKey="eventos"
                        name="Catering Eventos"
                        stroke="#a66cff"
                        strokeWidth={2.5}
                        dot={{ r: 3, fill: '#a66cff' }}
                        activeDot={{ r: 5 }}
                    />
                    {compararConAnterior && (
                        <Line
                            type="monotone"
                            dataKey="totalAnterior"
                            name="Período anterior"
                            stroke="#adb5bd"
                            strokeWidth={1.5}
                            strokeDasharray="5 5"
                            dot={false}
                        />
                    )}
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

export default SalesTrendChart;