import React from 'react';
import {
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Tooltip,
    Legend,
} from 'recharts';
import { usePaymentDistribution } from '../../../hooks/dashboard/usePaymentDistribution';

interface PaymentMethodsChartProps {
    periodo?: 'hoy' | '7d' | '30d' | 'mes';
    height?: number;
}

const PaymentMethodsChart: React.FC<PaymentMethodsChartProps> = ({
    periodo = 'hoy',
    height = 250,
}) => {
    const { slices, total, isLoading } = usePaymentDistribution(periodo);

    if (isLoading) {
        return (
            <div className="dc-chart-loading" style={{ height }}>
                <div className="dc-chart-loading-spinner" />
                <span>Cargando métodos de pago...</span>
            </div>
        );
    }

    if (slices.length === 0) {
        return (
            <div className="dc-chart-empty" style={{ height }}>
                <span className="dc-chart-empty-icon">💳</span>
                <span className="dc-chart-empty-text">Sin transacciones</span>
            </div>
        );
    }

    return (
        <div className="dc-payment-chart">
            <div className="dc-payment-total">
                <span className="dc-payment-total-label">Total del período</span>
                <span className="dc-payment-total-value">
                    S/ {total.toFixed(2)}
                </span>
            </div>

            <ResponsiveContainer width="100%" height={height}>
                <PieChart>
                    <Pie
                        data={slices}
                        dataKey="monto"
                        nameKey="label"
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={3}
                        stroke="#ffffff"
                        strokeWidth={2}
                    >
                        {slices.map((slice, idx) => (
                            <Cell key={idx} fill={slice.color} />
                        ))}
                    </Pie>
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
                            const porcentaje = item?.payload?.porcentaje ?? 0;
                            const label = item?.payload?.label ?? '';
                            return [
                                `S/ ${numValue.toFixed(2)} (${Number(porcentaje).toFixed(1)}%)`,
                                label,
                            ];
                        }}
                    />
                    <Legend
                        wrapperStyle={{ fontSize: '0.75rem', paddingTop: '0.3rem' }}
                        iconType="circle"
                        iconSize={8}
                        formatter={(value: any, entry: any) => {
                            const data = entry?.payload;
                            const pct = Number(data?.porcentaje) || 0;
                            return `${String(value)} (${pct.toFixed(0)}%)`;
                        }}
                    />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
};

export default PaymentMethodsChart;