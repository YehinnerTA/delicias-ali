import React, { useState } from 'react';
import { SalesProvider, useVentas } from '../../context/SalesContext';
import MainLayout from '../partials/MainLayout';
import { NewSaleModal } from '../../components/common/modal/sales/NewSaleModal';
import { DetalleVentaModal } from '../../components/common/modal/sales/DetailsSalesModal';
import { ModifySalesModal } from '../../components/common/modal/sales/ModifySalesModal';
import { AgregarProductosModal } from '../../components/common/modal/sales/AddProductModal';
import { DevolucionModal } from '../../components/common/modal/sales/ReturnModal';
import { ReimprimirModal } from '../../components/common/modal/sales/ReprintModal';
import { AnularVentaModal } from '../../components/common/modal/sales/CancelSaleModal';
import { DataTable, Column } from '../../components/common/DataTable';
import { FilterSection, FilterField } from '../../components/common/FilterSection';
import { ActivityLog } from '../../components/common/ActivityLog';
import { Venta } from '../../features/types/sales';
import { useToast } from '../../hooks/base/useToast';
import { Toast } from '../../components/common/Toast';
import '../../theme/section/management.css';

const formatLocalDateTime = (isoString: string): string => {
    if (!isoString) return '-';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    const dia = String(date.getDate()).padStart(2, '0');
    const mes = String(date.getMonth() + 1).padStart(2, '0');
    const año = date.getFullYear();
    return `${dia}/${mes}/${año}`;
};

const parseDateFilter = (filterValue: string): string => {
    if (!filterValue) return '';

    if (/^\d{4}-\d{2}-\d{2}$/.test(filterValue)) {
        return filterValue;
    }

    if (/^\d{2}\/\d{2}\/\d{4}$/.test(filterValue)) {
        const partes = filterValue.split('/');
        return `${partes[2]}-${partes[1]}-${partes[0]}`;
    }

    return filterValue;
};

const ventasFiltersConfig: FilterField[] = [
    { id: 'search', label: 'Buscar', type: 'text', placeholder: 'N° venta, cliente...' },
    {
        id: 'estado', label: 'Estado', type: 'select', options: [
            { value: '', label: 'Todos' },
            { value: 'completada', label: 'Completadas' },
            { value: 'devolucion-parcial', label: 'Devolución Parcial' },
            { value: 'devolucion-total', label: 'Devolución Total' },
            { value: 'anulada', label: 'Anuladas' }
        ]
    },
    { id: 'fecha', label: 'Fecha', type: 'text', placeholder: 'DD/MM/YYYY' }
];

const VentasContent: React.FC = () => {
    const { ventas, filters, setFilters, activityLogs, setVentas } = useVentas();
    const { toasts, showToast, removeToast } = useToast();

    const [nuevaVentaOpen, setNuevaVentaOpen] = useState(false);
    const [detalleVentaOpen, setDetalleVentaOpen] = useState(false);
    const [editarVentaOpen, setEditarVentaOpen] = useState(false);
    const [agregarProductosOpen, setAgregarProductosOpen] = useState(false);
    const [devolucionOpen, setDevolucionOpen] = useState(false);
    const [reimprimirOpen, setReimprimirOpen] = useState(false);
    const [anularOpen, setAnularOpen] = useState(false);
    const [selectedVenta, setSelectedVenta] = useState<Venta | null>(null);
    const [filterValues, setFilterValues] = useState<Record<string, string>>({
        search: filters.search,
        estado: filters.estado,
        fecha: filters.fecha
    });
    const [filteredData, setFilteredData] = useState<Venta[]>(ventas);

    React.useEffect(() => {
        setFilterValues({
            search: filters.search,
            estado: filters.estado,
            fecha: filters.fecha
        });
    }, [filters]);

    React.useEffect(() => {
        let filtered = ventas.filter(v => {
            const matchSearch = !filterValues.search ||
                v.numero.toLowerCase().includes(filterValues.search.toLowerCase()) ||
                v.cliente.toLowerCase().includes(filterValues.search.toLowerCase());

            const matchEstado = !filterValues.estado || v.estado === filterValues.estado;

            let matchFecha = true;
            if (filterValues.fecha) {
                const fechaFiltro = filterValues.fecha.trim();
                let fechaVentaStr = '';
                if (v.fechaObj) {
                    fechaVentaStr = v.fechaObj.toISOString().split('T')[0];
                } else if (v.fecha) {
                    if (v.fecha.includes('T')) {
                        fechaVentaStr = v.fecha.split('T')[0];
                    } else {
                        fechaVentaStr = v.fecha.split(',')[0];
                    }
                }

                const fechaFiltroNormalizada = parseDateFilter(fechaFiltro);

                matchFecha = fechaVentaStr.includes(fechaFiltroNormalizada) ||
                    fechaVentaStr === fechaFiltroNormalizada;

                if (/^\d{2}\/\d{2}\/\d{4}$/.test(fechaFiltro)) {
                    const fechaVentaFormateada = formatLocalDateTime(v.fecha).split(' ')[0];
                    matchFecha = matchFecha || fechaVentaFormateada === fechaFiltro;
                }
            }

            return matchSearch && matchEstado && matchFecha;
        });
        setFilteredData(filtered);
    }, [ventas, filterValues]);

    const handleFilterChange = (id: string, value: string) => {
        const newFilters = { ...filterValues, [id]: value };
        setFilterValues(newFilters);
        setFilters({
            search: newFilters.search,
            estado: newFilters.estado,
            fecha: newFilters.fecha
        });
    };

    const handleClearFilters = () => {
        setFilterValues({ search: '', estado: '', fecha: '' });
        setFilters({ search: '', estado: '', fecha: '' });
        showToast("Filtros de ventas limpiados", "info", "Filtros reseteados");
    };

    const getEstadoBadge = (estado: string) => {
        const estadoMap: Record<string, string> = {
            'completada': 'dc-badge-active',
            'anulada': 'dc-badge-inactive',
            'devolucion-parcial': 'badge-near-expiry',
            'devolucion-total': 'badge-expired'
        };
        const estadoTexto: Record<string, string> = {
            'completada': 'COMPLETADA',
            'anulada': 'ANULADA',
            'devolucion-parcial': 'DEVOLUCIÓN PARCIAL',
            'devolucion-total': 'DEVOLUCIÓN TOTAL'
        };
        return <span className={`dc-badge ${estadoMap[estado] || ''}`}>{estadoTexto[estado] || estado.toUpperCase()}</span>;
    };

    const columns: Column<Venta>[] = [
        { key: 'numero', header: 'N° Venta', render: (v) => <strong>{v.numero}</strong> },
        { key: 'fecha', header: 'Fecha', render: (v) => formatLocalDateTime(v.fecha) },
        { key: 'cliente', header: 'Cliente' },
        { key: 'total', header: 'Total', render: (v) => `S/ ${v.total.toFixed(2)}` },
        { key: 'estado', header: 'Estado', render: (v) => getEstadoBadge(v.estado) }
    ];

    const ventasActivityLogs = activityLogs.filter(log => log.modulo === 'ventas').slice(0, 8);

    const handleNuevaVentaSuccess = (nuevaVenta: Venta) => {
        const nuevasVentas = [nuevaVenta, ...ventas];
        setVentas(nuevasVentas);
        setNuevaVentaOpen(false);
    };

    return (
        <>
            <div className="dc-catering-container">
                <div className="dc-catering-header-card">
                    <div className="dc-title">
                        <h1><i className="fas fa-receipt"></i> Delicias Catering</h1>
                        <p>Sistema de Ventas Profesional</p>
                    </div>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                    <button className="dc-btn" onClick={() => setNuevaVentaOpen(true)}>
                        <i className="fas fa-plus-circle"></i> Nueva Venta
                    </button>
                </div>

                <FilterSection
                    title="Filtrar Ventas"
                    filters={ventasFiltersConfig}
                    values={filterValues}
                    onChange={handleFilterChange}
                    onClear={handleClearFilters}
                />

                <div className="dc-results-count">
                    <i className="fas fa-list-ul"></i> Mostrando {filteredData.length} de {ventas.length} ventas
                </div>

                <DataTable
                    columns={columns}
                    data={filteredData}
                    emptyMessage="📭 No hay ventas registradas"
                    actions={(item) => (
                        <>
                            <i className="fas fa-eye" onClick={() => { setSelectedVenta(item); setDetalleVentaOpen(true); }} title="Ver detalle"></i>
                            {item.estado !== 'devolucion-parcial' && item.estado !== 'devolucion-total' && (
                                <i className="fas fa-edit" onClick={() => { setSelectedVenta(item); setEditarVentaOpen(true); }} title="Editar venta"></i>
                            )}
                            <i className="fas fa-plus-circle" onClick={() => { setSelectedVenta(item); setAgregarProductosOpen(true); }} title="Agregar productos"></i>
                            <i className="fas fa-exchange-alt" onClick={() => { setSelectedVenta(item); setDevolucionOpen(true); }} title="Devolución"></i>
                            <i className="fas fa-print" onClick={() => { setSelectedVenta(item); setReimprimirOpen(true); }} title="Reimprimir"></i>
                            <i className="fas fa-trash-alt" onClick={() => { setSelectedVenta(item); setAnularOpen(true); }} title="Anular"></i>
                        </>
                    )}
                />

                <ActivityLog logs={ventasActivityLogs} title="Actividad Reciente - Ventas" />

                {toasts.map(toast => (
                    <Toast key={toast.id} toast={toast} onClose={removeToast} />
                ))}
            </div>

            <NewSaleModal isOpen={nuevaVentaOpen} onClose={() => setNuevaVentaOpen(false)} onSuccess={handleNuevaVentaSuccess} />
            <DetalleVentaModal isOpen={detalleVentaOpen} onClose={() => setDetalleVentaOpen(false)} venta={selectedVenta} />
            <ModifySalesModal isOpen={editarVentaOpen} onClose={() => setEditarVentaOpen(false)} venta={selectedVenta} onSuccess={() => setEditarVentaOpen(false)} />
            <AgregarProductosModal isOpen={agregarProductosOpen} onClose={() => setAgregarProductosOpen(false)} venta={selectedVenta} onSuccess={() => setAgregarProductosOpen(false)} />
            <DevolucionModal isOpen={devolucionOpen} onClose={() => setDevolucionOpen(false)} venta={selectedVenta} onSuccess={() => setDevolucionOpen(false)} />
            <ReimprimirModal isOpen={reimprimirOpen} onClose={() => setReimprimirOpen(false)} venta={selectedVenta} />
            <AnularVentaModal isOpen={anularOpen} onClose={() => setAnularOpen(false)} venta={selectedVenta} onSuccess={() => setAnularOpen(false)} />
        </>
    );
};

const VentasManagement: React.FC = () => {
    return (
        <SalesProvider>
            <MainLayout>
                <VentasContent />
            </MainLayout>
        </SalesProvider>
    );
};

export default VentasManagement;