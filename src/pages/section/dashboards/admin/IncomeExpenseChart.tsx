import React, { useMemo } from 'react';
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
} from 'recharts';
import { useVentas } from '../../../../context/SalesContext';
import { useCateringService } from '../../../../context/CateringContext';
import { useInventory } from '../../../../context/InventoryContext';

interface IncomeExpenseChartProps {
    height?: number;
}

interface MonthPoint {
    mes: string;
    ingresos: number;
    egresos: number;
    margen: number;
}

const MESES_CORTOS = [
    'Ene',
    'Feb',
    'Mar',
    'Abr',
    'May',
    'Jun',
    'Jul',
    'Ago',
    'Sep',
    'Oct',
    'Nov',
    'Dic',
];

const formatCurrency = (value: number): string => {
    if (value >= 1000) return `S/ ${(value / 1000).toFixed(0)}k`;
    return `S/ ${value.toFixed(0)}`;
};

const IncomeExpenseChart: React.FC<IncomeExpenseChartProps> = ({ height = 260 }) => {
    const { ventas, isLoading: loadingVentas } = useVentas();
    const { ventas: cateringVentas, isLoading: loadingCatering } = useCateringService();
    const { cateringItems, isLoading: loadingInv } = useInventory();

    const { data, totalIngresos, totalEgresos, margen } = useMemo(() => {
        const now = new Date();

        // Últimos 6 meses (incluyendo actual)
        const meses: { anio: number; mes: number; label: string }[] = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            meses.push({
                anio: d.getFullYear(),
                mes: d.getMonth(),
                label: MESES_CORTOS[d.getMonth()],
            });
        }

        const puntos: MonthPoint[] = meses.map(({ anio, mes, label }) => {
            const ingresosTienda = ventas
                .filter((v) => {
                    const f = new Date(v.fecha);
                    return f.getFullYear() === anio && f.getMonth() === mes;
                })
                .reduce((acc, v) => acc + v.total, 0);

            const ingresosEventos = cateringVentas
                .filter((v) => {
                    const f = new Date(v.fecha);
                    return f.getFullYear() === anio && f.getMonth() === mes;
                })
                .reduce((acc, v) => acc + v.total, 0);

            const ingresos = ingresosTienda + ingresosEventos;

            // Egresos: basados en la fecha de última edición de cateringItems
            // (aproximación: los items editados en ese mes se consideran comprados)
            const egresos = cateringItems
                .filter((item) => {
                    if (!item.precio_compra) return false;
                    const f = new Date(item.ultimaEdicion || item.createdAt);
                    return f.getFullYear() === anio && f.getMonth() === mes;
                })
                .reduce(
                    (acc, item) => acc + (item.precio_compra || 0) * Math.max(item.stock, 1),
                    0
                );

            return {
                mes: label,
                ingresos,
                egresos,
                margen: ingresos - egresos,
            };
        });

        const mesActual = puntos[puntos.length - 1];
        const totalIngresos = mesActual?.ingresos || 0;
        const totalEgresos = mesActual?.egresos || 0;

        return {
            data: puntos,
            totalIngresos,
            totalEgresos,
            margen: totalIngresos - totalEgresos,
        };
    }, [ventas, cateringVentas, cateringItems]);

    const isLoading = loadingVentas || loadingCatering || loadingInv;
    const porcentajeMargen =
        totalIngresos > 0 ? (margen / totalIngresos) * 100 : 0;

    if (isLoading) {
        return (
            <div className="dc-chart-loading" style={{ height }}>
                <div className="dc-chart-loading-spinner" />
                <span>Cargando ingresos y egresos...</span>
            </div>
        );
    }

    const sinDatos = data.every((d) => d.ingresos === 0 && d.egresos === 0);

    if (sinDatos) {
        return (
            <div className="dc-chart-empty" style={{ height }}>
                <span className="dc-chart-empty-icon">💵</span>
                <span className="dc-chart-empty-text">
                    Sin movimientos en los últimos 6 meses
                </span>
            </div>
        );
    }

    return (
        <div className="dc-income-expense">
            <div className="dc-income-expense-summary">
                <div className="dc-income-summary-item">
                    <span className="dc-income-summary-label">Ingresos (mes)</span>
                    <span className="dc-income-summary-value dc-trend-up">
                        S/ {totalIngresos.toFixed(2)}
                    </span>
                </div>
                <div className="dc-income-summary-item">
                    <span className="dc-income-summary-label">
                        Egresos (compras)
                    </span>
                    <span className="dc-income-summary-value dc-trend-down">
                        S/ {totalEgresos.toFixed(2)}
                    </span>
                </div>
                <div className="dc-income-summary-item">
                    <span className="dc-income-summary-label">Margen bruto</span>
                    <span
                        className={`dc-income-summary-value ${margen >= 0 ? 'dc-trend-up' : 'dc-trend-down'
                            }`}
                    >
                        S/ {margen.toFixed(2)} ({porcentajeMargen.toFixed(1)}%)
                    </span>
                </div>
            </div>

            <ResponsiveContainer width="100%" height={height}>
                <BarChart
                    data={data}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    barGap={4}
                >
                    <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#f0d6db"
                        vertical={false}
                    />
                    <XAxis
                        dataKey="mes"
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
                        formatter={(value: any) => `S/ ${(Number(value) || 0).toFixed(2)}`}
                        cursor={{ fill: 'rgba(217, 10, 70, 0.05)' }}
                    />
                    <Legend
                        wrapperStyle={{ fontSize: '0.75rem', paddingTop: '0.5rem' }}
                        iconType="circle"
                        iconSize={8}
                    />
                    <Bar
                        dataKey="ingresos"
                        name="Ingresos"
                        fill="#00811e"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={40}
                    />
                    <Bar
                        dataKey="egresos"
                        name="Egresos (compras)"
                        fill="#d90a46"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={40}
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export default IncomeExpenseChart;