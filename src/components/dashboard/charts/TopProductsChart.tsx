import React, { useState, useMemo } from 'react';
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Cell,
    LabelList,
} from 'recharts';
import {
    useTopProducts,
    TopProductsVista,
} from '../../../hooks/dashboard/useTopProducts';

interface TopProductsChartProps {
    periodo?: 'hoy' | '7d' | '30d' | 'mes';
    limite?: number;
    height?: number;
}

const ORIGEN_COLORS: Record<string, string> = {
    tienda: '#d90a46',
    eventos: '#a66cff',
    ambos: '#4f8cf7',
};

const TopProductsChart: React.FC<TopProductsChartProps> = ({
    periodo = '30d',
    limite = 5,
    height = 260,
}) => {
    const [vista, setVista] = useState<TopProductsVista>('unidades');
    const { top, isLoading } = useTopProducts(periodo, limite);

    const data = useMemo(() => {
        if (top.length === 0) return [];

        const maxUnidades = Math.max(...top.map((p) => p.cantidad), 1);
        const maxTotal = Math.max(...top.map((p) => p.total), 1);
        const totalGeneral = top.reduce((acc, p) => acc + p.total, 0);

        return top.map((p) => {
            let valor = 0;
            let label = '';

            if (vista === 'unidades') {
                valor = p.cantidad;
                label = `${p.cantidad} u`;
            } else if (vista === 'soles') {
                valor = p.total;
                label = `S/ ${p.total.toFixed(2)}`;
            } else {
                valor = totalGeneral > 0 ? (p.total / totalGeneral) * 100 : 0;
                label = `${valor.toFixed(1)}%`;
            }

            const max = vista === 'unidades' ? maxUnidades : vista === 'soles' ? maxTotal : 100;
            const porcentajeBarra = max > 0 ? (valor / max) * 100 : 0;

            return {
                nombre: p.nombre.length > 20 ? p.nombre.slice(0, 18) + '…' : p.nombre,
                nombreCompleto: p.nombre,
                valor,
                valorLabel: label,
                porcentajeBarra,
                origen: p.origen,
                color: ORIGEN_COLORS[p.origen] || '#6c757d',
            };
        });
    }, [top, vista]);

    if (isLoading) {
        return (
            <div className="dc-chart-loading" style={{ height }}>
                <div className="dc-chart-loading-spinner" />
                <span>Cargando top productos...</span>
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className="dc-chart-empty" style={{ height }}>
                <span className="dc-chart-empty-icon">🏆</span>
                <span className="dc-chart-empty-text">Sin ventas en el período</span>
            </div>
        );
    }

    return (
        <div className="dc-top-products">
            <div className="dc-top-products-toggle">
                {(['unidades', 'soles', 'porcentaje'] as TopProductsVista[]).map(
                    (v) => (
                        <button
                            key={v}
                            type="button"
                            className={`dc-toggle-btn ${vista === v ? 'active' : ''}`}
                            onClick={() => setVista(v)}
                        >
                            {v === 'unidades' ? 'U' : v === 'soles' ? 'S/' : '%'}
                        </button>
                    )
                )}
            </div>

            <ResponsiveContainer width="100%" height={height}>
                <BarChart
                    data={data}
                    layout="vertical"
                    margin={{ top: 5, right: 40, left: 0, bottom: 5 }}
                >
                    <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#f0d6db"
                        horizontal={false}
                    />
                    <XAxis type="number" hide />
                    <YAxis
                        type="category"
                        dataKey="nombre"
                        width={130}
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
                        formatter={(_value: any, _name: any, item: any) => [
                            item?.payload?.valorLabel ?? '',
                            item?.payload?.nombreCompleto ?? '',
                        ]}
                        labelFormatter={() => ''}
                    />
                    <Bar dataKey="valor" radius={[0, 6, 6, 0]}>
                        <LabelList
                            dataKey="valorLabel"
                            position="right"
                            style={{ fontSize: 10, fill: '#333', fontWeight: 600 }}
                        />
                        {data.map((entry, idx) => (
                            <Cell key={idx} fill={entry.color} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>

            <div className="dc-top-products-legend">
                <span className="dc-legend-item">
                    <span
                        className="dc-legend-dot"
                        style={{ background: ORIGEN_COLORS.tienda }}
                    />
                    Tienda
                </span>
                <span className="dc-legend-item">
                    <span
                        className="dc-legend-dot"
                        style={{ background: ORIGEN_COLORS.eventos }}
                    />
                    Eventos
                </span>
                <span className="dc-legend-item">
                    <span
                        className="dc-legend-dot"
                        style={{ background: ORIGEN_COLORS.ambos }}
                    />
                    Ambos
                </span>
            </div>
        </div>
    );
};

export default TopProductsChart;