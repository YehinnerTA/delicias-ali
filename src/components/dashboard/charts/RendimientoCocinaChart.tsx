import React from 'react';
import {
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Tooltip,
} from 'recharts';
import { useCocinaPerformance } from '../../../hooks/dashboard/useCocinaPerformance';

interface RendimientoCocinaChartProps {
    height?: number;
}

const formatMinutos = (min: number): string => {
    if (min == null) return '—';
    const h = Math.floor(min / 60);
    const m = min % 60;
    if (h > 0) return `${h}h ${m}min`;
    return `${m} min`;
};

const RendimientoCocinaChart: React.FC<RendimientoCocinaChartProps> = ({
    height = 260,
}) => {
    const {
        eficienciaPromedio,
        totalRealMin,
        totalEstimadoMin,
        diferenciaMin,
        eventosConDatos,
        topRecetasRapidas,
        isLoading,
    } = useCocinaPerformance();

    if (isLoading) {
        return (
            <div className="dc-chart-loading" style={{ height }}>
                <div className="dc-chart-loading-spinner" />
                <span>Cargando rendimiento...</span>
            </div>
        );
    }

    if (eventosConDatos === 0) {
        return (
            <div className="dc-chart-empty" style={{ height }}>
                <span className="dc-chart-empty-icon">📊</span>
                <span className="dc-chart-empty-text">
                    Aún no hay etapas completadas
                </span>
                <span className="dc-chart-empty-desc">
                    Las métricas aparecen cuando se cierran etapas del flujo
                </span>
            </div>
        );
    }

    const eficienciaRedondeada = Math.max(
        0,
        Math.min(150, eficienciaPromedio)
    );
    const data = [
        { name: 'Eficiencia', value: eficienciaRedondeada },
        { name: 'Restante', value: Math.max(0, 100 - eficienciaRedondeada) },
    ];

    const colorEficiencia =
        eficienciaRedondeada >= 100
            ? '#00811e'
            : eficienciaRedondeada >= 85
                ? '#ffc107'
                : '#ff0019';

    const atrasado = diferenciaMin > 0;

    return (
        <div className="dc-rendimiento-cocina">
            <div className="dc-rendimiento-dona">
                <ResponsiveContainer width="100%" height={height}>
                    <PieChart>
                        <Pie
                            data={data}
                            dataKey="value"
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={80}
                            startAngle={90}
                            endAngle={-270}
                            stroke="#ffffff"
                            strokeWidth={2}
                        >
                            <Cell fill={colorEficiencia} />
                            <Cell fill="#f0d6db" />
                        </Pie>
                        <Tooltip
                            contentStyle={{
                                background: '#ffffff',
                                border: '1px solid #f0d6db',
                                borderRadius: '0.6rem',
                                fontSize: '0.8rem',
                            }}
                            formatter={(value: any) =>
                                `${(Number(value) || 0).toFixed(1)}%`
                            }
                        />
                    </PieChart>
                </ResponsiveContainer>

                <div className="dc-rendimiento-dona-label">
                    <span className="dc-rendimiento-dona-value">
                        {eficienciaRedondeada.toFixed(0)}%
                    </span>
                    <span className="dc-rendimiento-dona-text">
                        Eficiencia
                    </span>
                </div>
            </div>

            <div className="dc-rendimiento-detalle">
                <div className="dc-rendimiento-comparativa">
                    <div className="dc-rendimiento-bar-item">
                        <span className="dc-rendimiento-bar-label">
                            Real
                        </span>
                        <span
                            className="dc-rendimiento-bar dc-rendimiento-bar--real"
                            style={{ width: '100%' }}
                        />
                        <span className="dc-rendimiento-bar-value">
                            {formatMinutos(totalRealMin)}
                        </span>
                    </div>
                    <div className="dc-rendimiento-bar-item">
                        <span className="dc-rendimiento-bar-label">
                            Estimado
                        </span>
                        <span
                            className="dc-rendimiento-bar dc-rendimiento-bar--estimado"
                            style={{
                                width: `${totalRealMin > 0
                                        ? Math.min(
                                            100,
                                            (totalEstimadoMin / totalRealMin) * 100
                                        )
                                        : 100
                                    }%`,
                            }}
                        />
                        <span className="dc-rendimiento-bar-value">
                            {formatMinutos(totalEstimadoMin)}
                        </span>
                    </div>

                    <div className="dc-rendimiento-total">
                        <span className="dc-rendimiento-total-label">
                            Diferencia:
                        </span>
                        <span
                            className={`dc-rendimiento-total-value ${atrasado ? 'dc-trend-down' : 'dc-trend-up'
                                }`}
                        >
                            {atrasado ? '+' : ''}
                            {diferenciaMin} min
                        </span>
                    </div>

                    <div className="dc-rendimiento-info">
                        {eventosConDatos}{' '}
                        {eventosConDatos === 1 ? 'evento medido' : 'eventos medidos'}
                    </div>
                </div>

                {topRecetasRapidas.length > 0 && (
                    <div className="dc-rendimiento-top">
                        <span className="dc-rendimiento-top-title">
                            Recetas más rápidas
                        </span>
                        {topRecetasRapidas.map((r, idx) => (
                            <div key={idx} className="dc-rendimiento-top-item">
                                <span>⚡ {r.nombre}</span>
                                <span className="dc-trend-up">
                                    {formatMinutos(r.duracionMin)}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default RendimientoCocinaChart;