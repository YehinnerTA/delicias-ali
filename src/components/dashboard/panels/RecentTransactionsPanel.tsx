import React from 'react';
import { useRecentTransactions } from '../../../hooks/dashboard/useRecentTransactions';
import { Venta } from '../../../features/types/sales';

interface RecentTransactionsPanelProps {
    maxItems?: number;
}

const METODO_ICONS: Record<string, string> = {
    EFECTIVO: '💵',
    TARJETA: '💳',
    YAPE: '📱',
    PLIN: '📲',
};

const ESTADO_CLASSES: Record<string, string> = {
    completada: 'estado-completada',
    anulada: 'estado-anulada',
    'devolucion-parcial': 'estado-devolucion',
    'devolucion-total': 'estado-devolucion',
};

const RecentTransactionsPanel: React.FC<RecentTransactionsPanelProps> = ({
    maxItems = 6,
}) => {
    const { transactions, isLoading } = useRecentTransactions(maxItems);

    if (isLoading) {
        return (
            <div className="dc-panel-loading">
                <div className="dc-panel-loading-spinner" />
                <span>Cargando transacciones...</span>
            </div>
        );
    }

    if (transactions.length === 0) {
        return (
            <div className="dc-panel-empty">
                <span className="dc-panel-empty-icon">🛒</span>
                <span className="dc-panel-empty-title">Sin transacciones aún</span>
                <span className="dc-panel-empty-desc">
                    Las ventas del día aparecerán aquí
                </span>
            </div>
        );
    }

    return (
        <div className="dc-recent-transactions">
            {transactions.map((v: Venta) => (
                <div key={v.id} className="dc-transaction-item">
                    <div className="dc-transaction-icon">
                        {METODO_ICONS[v.metodoPago] || '💰'}
                    </div>

                    <div className="dc-transaction-body">
                        <div className="dc-transaction-header">
                            <span className="dc-transaction-numero">{v.numero}</span>
                            <span className="dc-transaction-total">
                                S/ {v.total.toFixed(2)}
                            </span>
                        </div>

                        <div className="dc-transaction-meta">
                            <span className="dc-transaction-hora">
                                {new Date(v.fecha).toLocaleTimeString('es-PE', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12: false,
                                })}
                            </span>
                            <span>·</span>
                            <span className="dc-transaction-metodo">{v.metodoPago}</span>
                            <span>·</span>
                            <span className="dc-transaction-cliente">
                                {v.cliente || 'Cliente varios'}
                            </span>
                        </div>
                    </div>

                    <span
                        className={`dc-transaction-estado ${ESTADO_CLASSES[v.estado] || 'estado-completada'
                            }`}
                    >
                        {v.estado === 'completada'
                            ? '✓'
                            : v.estado === 'anulada'
                                ? '✕'
                                : '↩'}
                    </span>
                </div>
            ))}
        </div>
    );
};

export default RecentTransactionsPanel;