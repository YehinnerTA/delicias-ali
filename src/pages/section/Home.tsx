import React, { useState, useEffect, useMemo } from 'react';
import MainLayout from '../partials/MainLayout';
import { SalesProvider, useVentas } from '../../context/SalesContext';
import { CateringServiceProvider, useCateringService } from '../../context/CateringContext';
import { useCompany } from '../../features/company/context/CompanyContext';
import { actividadApi } from '../../services/api/actividadApi';
import { ActivityLog } from '../../features/types/hist_act';
import '../../theme/section/home.css';

const DashboardContent: React.FC = () => {
    const { ventas, isLoading: salesLoading } = useVentas();
    const { ventas: cateringVentas, isLoading: cateringLoading } = useCateringService();
    const { selectedCompany } = useCompany();
    const [recentActivity, setRecentActivity] = useState<ActivityLog[]>([]);
    const [activityLoading, setActivityLoading] = useState(true);

    useEffect(() => {
        const loadActivity = async () => {
            try {
                const data = await actividadApi.getAll();
                const filtered = data
                    .filter((log) => ['ventas', 'catering'].includes(log.modulo))
                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                    .slice(0, 6);
                setRecentActivity(filtered);
            } catch (error) {
                console.error('[Home] Error cargando actividad:', error);
            } finally {
                setActivityLoading(false);
            }
        };
        loadActivity();
    }, []);

    const salesStats = useMemo(() => {
        if (!ventas.length) return { total: 0, hoy: 0, mes: 0, promedio: 0, count: 0, completadas: 0, anuladas: 0, devoluciones: 0 };
        const hoy = new Date().toDateString();
        const hoyVentas = ventas.filter((v) => new Date(v.fecha).toDateString() === hoy);
        const mesActual = new Date().getMonth();
        const anioActual = new Date().getFullYear();
        const mesVentas = ventas.filter((v) => {
            const d = new Date(v.fecha);
            return d.getMonth() === mesActual && d.getFullYear() === anioActual;
        });
        const total = ventas.reduce((acc, v) => acc + v.total, 0);
        const hoyTotal = hoyVentas.reduce((acc, v) => acc + v.total, 0);
        const mesTotal = mesVentas.reduce((acc, v) => acc + v.total, 0);
        const count = ventas.length;
        const promedio = count > 0 ? total / count : 0;
        const completadas = ventas.filter((v) => v.estado === 'completada').length;
        const anuladas = ventas.filter((v) => v.estado === 'anulada').length;
        const devoluciones = ventas.filter((v) => v.estado.includes('devolucion')).length;
        return { total, hoy: hoyTotal, mes: mesTotal, promedio, count, completadas, anuladas, devoluciones };
    }, [ventas]);

    const cateringStats = useMemo(() => {
        if (!cateringVentas.length) return { total: 0, hoy: 0, mes: 0, count: 0, eventos: 0 };
        const hoy = new Date().toDateString();
        const hoyVentas = cateringVentas.filter((v) => new Date(v.fecha).toDateString() === hoy);
        const mesActual = new Date().getMonth();
        const anioActual = new Date().getFullYear();
        const mesVentas = cateringVentas.filter((v) => {
            const d = new Date(v.fecha);
            return d.getMonth() === mesActual && d.getFullYear() === anioActual;
        });
        const total = cateringVentas.reduce((acc, v) => acc + v.total, 0);
        const hoyTotal = hoyVentas.reduce((acc, v) => acc + v.total, 0);
        const mesTotal = mesVentas.reduce((acc, v) => acc + v.total, 0);
        const count = cateringVentas.length;
        const eventos = cateringVentas.reduce((acc, v) => acc + (v.eventoData?.personas || 0), 0);
        return { total, hoy: hoyTotal, mes: mesTotal, count, eventos };
    }, [cateringVentas]);

    const topProducts = useMemo(() => {
        const map = new Map<number | string, { nombre: string; cantidad: number; total: number }>();
        ventas.forEach((v) => {
            v.productos.forEach((p) => {
                const key = `g-${p.id}`;
                if (!map.has(key)) {
                    map.set(key, { nombre: p.nombre, cantidad: 0, total: 0 });
                }
                const entry = map.get(key)!;
                entry.cantidad += p.cantidad;
                entry.total += p.cantidad * p.precio;
            });
        });
        cateringVentas.forEach((v) => {
            v.servicios?.forEach((serv) => {
                serv.productos.forEach((p) => {
                    const key = `c-${p.id}`;
                    if (!map.has(key)) {
                        map.set(key, { nombre: p.nombre, cantidad: 0, total: 0 });
                    }
                    const entry = map.get(key)!;
                    entry.cantidad += p.cantidad;
                    entry.total += p.cantidad * p.precio;
                });
            });
        });
        return Array.from(map.values())
            .sort((a, b) => b.total - a.total)
            .slice(0, 5);
    }, [ventas, cateringVentas]);

    const paymentDistribution = useMemo(() => {
        const allVentas = [...ventas, ...cateringVentas];
        const map = new Map<string, number>();
        allVentas.forEach((v) => {
            const metodo = v.metodoPago || 'EFECTIVO';
            map.set(metodo, (map.get(metodo) || 0) + v.total);
        });
        const total = allVentas.reduce((acc, v) => acc + v.total, 0);
        return Array.from(map.entries())
            .map(([key, value]) => ({ metodo: key, monto: value, porcentaje: total > 0 ? (value / total) * 100 : 0 }))
            .sort((a, b) => b.monto - a.monto);
    }, [ventas, cateringVentas]);

    const last7Days = useMemo(() => {
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            days.push(d);
        }
        return days.map((day) => {
            const dayStr = day.toDateString();
            const ventasDelDia = ventas.filter((v) => new Date(v.fecha).toDateString() === dayStr);
            const cateringDelDia = cateringVentas.filter((v) => new Date(v.fecha).toDateString() === dayStr);
            const totalVentas = ventasDelDia.reduce((acc, v) => acc + v.total, 0);
            const totalCatering = cateringDelDia.reduce((acc, v) => acc + v.total, 0);
            return {
                fecha: day.toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric' }),
                general: totalVentas,
                catering: totalCatering,
                total: totalVentas + totalCatering,
            };
        });
    }, [ventas, cateringVentas]);

    const clientesNuevos = useMemo(() => {
        const clientesSet = new Set<string>();
        ventas.forEach((v) => {
            if (v.clienteDoc) clientesSet.add(v.clienteDoc);
        });
        cateringVentas.forEach((v) => {
            if (v.clienteDoc) clientesSet.add(v.clienteDoc);
        });
        return clientesSet.size;
    }, [ventas, cateringVentas]);

    const stockCritico = [
        { nombre: 'Harina de trigo', stock: 5, umbral: 10 },
        { nombre: 'Azúcar morena', stock: 8, umbral: 10 },
        { nombre: 'Cheesecake', stock: 3, umbral: 5 },
    ];

    const isLoading = salesLoading || cateringLoading || activityLoading;

    return (
        <MainLayout>
            <div className="dc-catering-container">
                <div className="dashboard-header">
                    <h2>🏠 Dashboard</h2>
                    {selectedCompany && (
                        <span className="dashboard-company">
                            <i className="fas fa-building"></i> {selectedCompany}
                        </span>
                    )}
                </div>

                {isLoading ? (
                    <div className="loading-spinner">
                        <i className="fas fa-spinner fa-spin"></i> Cargando datos...
                    </div>
                ) : (
                    <>
                        {/* ===== KPIs ===== */}
                        <div className="stats-grid">
                            <div className="stat-card">
                                <div className="stat-icon bg-blue"><i className="fas fa-shopping-cart"></i></div>
                                <div className="stat-info">
                                    <span className="stat-label">Ventas totales</span>
                                    <span className="stat-value">S/ {salesStats.total.toFixed(2)}</span>
                                    <span className="stat-sub">{salesStats.count} ventas</span>
                                </div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-icon bg-green"><i className="fas fa-calendar-day"></i></div>
                                <div className="stat-info">
                                    <span className="stat-label">Ventas hoy</span>
                                    <span className="stat-value">S/ {(salesStats.hoy + cateringStats.hoy).toFixed(2)}</span>
                                    <span className="stat-sub">General: S/ {salesStats.hoy.toFixed(2)}</span>
                                </div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-icon bg-purple"><i className="fas fa-calendar-alt"></i></div>
                                <div className="stat-info">
                                    <span className="stat-label">Ventas del mes</span>
                                    <span className="stat-value">S/ {(salesStats.mes + cateringStats.mes).toFixed(2)}</span>
                                    <span className="stat-sub">Catering: S/ {cateringStats.mes.toFixed(2)}</span>
                                </div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-icon bg-orange"><i className="fas fa-utensils"></i></div>
                                <div className="stat-info">
                                    <span className="stat-label">Catering total</span>
                                    <span className="stat-value">S/ {cateringStats.total.toFixed(2)}</span>
                                    <span className="stat-sub">{cateringStats.count} eventos · {cateringStats.eventos} personas</span>
                                </div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-icon bg-danger"><i className="fas fa-users"></i></div>
                                <div className="stat-info">
                                    <span className="stat-label">Clientes registrados</span>
                                    <span className="stat-value">{clientesNuevos}</span>
                                    <span className="stat-sub">en el sistema</span>
                                </div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-icon bg-info"><i className="fas fa-chart-pie"></i></div>
                                <div className="stat-info">
                                    <span className="stat-label">Estado de ventas</span>
                                    <span className="stat-value">
                                        {Math.round((salesStats.completadas / (salesStats.count || 1)) * 100)}% completadas
                                    </span>
                                    <span className="stat-sub">
                                        {salesStats.anuladas} anuladas · {salesStats.devoluciones} devoluciones
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* ===== GRÁFICO DE TENDENCIA (7 días) ===== */}
                        <div className="chart-card">
                            <h3><i className="fas fa-chart-bar"></i> Ventas últimas 7 días</h3>
                            <div className="chart-bars">
                                {last7Days.map((day, idx) => {
                                    const maxValue = Math.max(...last7Days.map((d) => d.total), 1);
                                    const alturaGeneral = (day.general / maxValue) * 100;
                                    const alturaCatering = (day.catering / maxValue) * 100;
                                    const alturaTotal = (day.total / maxValue) * 100;
                                    return (
                                        <div key={idx} className="chart-bar-item">
                                            <div className="chart-bar-wrapper">
                                                <div className="chart-bar stacked" style={{ height: `${alturaTotal}%` }}>
                                                    <span className="chart-bar-value">S/ {day.total.toFixed(0)}</span>
                                                </div>
                                            </div>
                                            <div className="chart-bar-label">{day.fecha}</div>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="chart-legend">
                                <span><span className="legend-dot" style={{ background: 'var(--color-secundario)' }}></span> General</span>
                                <span><span className="legend-dot" style={{ background: 'var(--color-tercero)' }}></span> Catering</span>
                            </div>
                        </div>

                        {/* ===== TOP PRODUCTOS + DISTRIBUCIÓN ===== */}
                        <div className="two-columns">
                            <div className="card">
                                <h3><i className="fas fa-trophy"></i> Top 5 productos</h3>
                                {topProducts.length === 0 ? (
                                    <p className="empty-message">Sin ventas aún</p>
                                ) : (
                                    <table className="dc-table compact">
                                        <thead>
                                            <tr>
                                                <th>Producto</th>
                                                <th style={{ textAlign: 'right' }}>Cantidad</th>
                                                <th style={{ textAlign: 'right' }}>Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {topProducts.map((p, idx) => (
                                                <tr key={idx}>
                                                    <td>{p.nombre}</td>
                                                    <td style={{ textAlign: 'right' }}>{p.cantidad}</td>
                                                    <td style={{ textAlign: 'right' }}>S/ {p.total.toFixed(2)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>

                            <div className="card">
                                <h3><i className="fas fa-credit-card"></i> Métodos de pago</h3>
                                {paymentDistribution.length === 0 ? (
                                    <p className="empty-message">Sin datos</p>
                                ) : (
                                    <div className="payment-list">
                                        {paymentDistribution.map((p, idx) => (
                                            <div key={idx} className="payment-item">
                                                <span className="payment-label">
                                                    <i className={`fas ${p.metodo === 'EFECTIVO' ? 'fa-money-bill' : p.metodo === 'TARJETA' ? 'fa-credit-card' : 'fa-mobile-alt'}`}></i>
                                                    {p.metodo}
                                                </span>
                                                <span className="payment-bar-wrapper">
                                                    <span className="payment-bar" style={{ width: `${p.porcentaje}%` }}></span>
                                                </span>
                                                <span className="payment-value">S/ {p.monto.toFixed(2)} ({p.porcentaje.toFixed(0)}%)</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ===== STOCK CRÍTICO + ACTIVIDAD RECIENTE ===== */}
                        <div className="two-columns">
                            <div className="card">
                                <h3><i className="fas fa-exclamation-triangle"></i> Stock crítico</h3>
                                {stockCritico.length === 0 ? (
                                    <p className="empty-message">Sin alertas de stock</p>
                                ) : (
                                    <div className="stock-list">
                                        {stockCritico.map((item, idx) => (
                                            <div key={idx} className="stock-item">
                                                <span className="stock-name">{item.nombre}</span>
                                                <span className={`stock-badge ${item.stock <= item.umbral ? 'danger' : 'warning'}`}>
                                                    {item.stock} / {item.umbral}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="card">
                                <h3><i className="fas fa-clock"></i> Actividad reciente</h3>
                                {recentActivity.length === 0 ? (
                                    <p className="empty-message">Sin actividad reciente</p>
                                ) : (
                                    <div className="activity-list">
                                        {recentActivity.map((log, idx) => (
                                            <div key={idx} className="activity-item">
                                                <div className="activity-icon">
                                                    <i className={`fas ${log.modulo === 'ventas' ? 'fa-shopping-cart' : 'fa-utensils'}`}></i>
                                                </div>
                                                <div className="activity-content">
                                                    <div className="activity-action">{log.accion}</div>
                                                    <div className="activity-detail">{log.detalle}</div>
                                                    <div className="activity-meta">
                                                        <span><i className="fas fa-user"></i> {log.usuario}</span>
                                                        <span><i className="fas fa-clock"></i> {new Date(log.timestamp).toLocaleString()}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </MainLayout>
    );
};

const Home: React.FC = () => {
    return (
        <SalesProvider>
            <CateringServiceProvider>
                <DashboardContent />
            </CateringServiceProvider>
        </SalesProvider>
    );
};

export default Home;