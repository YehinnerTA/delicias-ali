import React, { useState, useEffect } from 'react';
import { CateringSalesProvider, useCateringSales } from '../../context/CateringContext';
import MainLayout from '../partials/MainLayout';
import { NewCateringModal } from '../../components/common/modal/catering/NewCateringModal';
import { CateringDetailsModal } from '../../components/common/modal/catering/CateringDetailsModal';
import { CateringModifyModal } from '../../components/common/modal/catering/CateringModifyModal';
import { CateringAddProductsModal } from '../../components/common/modal/catering/CateringAddProductModal';
import { CateringReturnModal } from '../../components/common/modal/catering/CateringReturnModal';
import { CocinaLogisticaModal } from '../../components/common/modal/catering/CocinaLogisticaModal';
import { CateringReprintModal } from '../../components/common/modal/catering/CateringReprintModal';
import { CateringCancelModal } from '../../components/common/modal/catering/CateringCancelModal';
import { DataTable, Column } from '../../components/common/DataTable';
import { FilterSection, FilterField } from '../../components/common/FilterSection';
import { ActivityLog } from '../../components/common/ActivityLog';
import { VentaCatering } from '../../features/types/catering';
import { useToast } from '../../hooks/base/useToast';
import { Toast } from '../../components/common/Toast';
import '../../theme/section/management.css';

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
    { id: 'fecha', label: 'Fecha', type: 'text', placeholder: 'YYYY-MM-DD' }
];

const CateringSalesContent: React.FC = () => {
    const { ventas, filters, setFilters, activityLogs, setVentas } = useCateringSales();
    const { toasts, showToast, removeToast } = useToast();

    // Estados para modales
    const [nuevaVentaOpen, setNuevaVentaOpen] = useState(false);
    const [detalleVentaOpen, setDetalleVentaOpen] = useState(false);
    const [editarVentaOpen, setEditarVentaOpen] = useState(false);
    const [agregarProductosOpen, setAgregarProductosOpen] = useState(false);
    const [devolucionOpen, setDevolucionOpen] = useState(false);
    const [reimprimirOpen, setReimprimirOpen] = useState(false);
    const [historialOpen, setHistorialOpen] = useState(false);
    const [cocinaOpen, setCocinaOpen] = useState(false);
    const [anularOpen, setAnularOpen] = useState(false);
    const [selectedVenta, setSelectedVenta] = useState<VentaCatering | null>(null); const [filterValues, setFilterValues] = useState<Record<string, string>>({
        search: filters.search,
        estado: filters.estado,
        fecha: filters.fecha
    });
    const [filteredData, setFilteredData] = useState<VentaCatering[]>(ventas);

    useEffect(() => {
        setFilterValues({
            search: filters.search,
            estado: filters.estado,
            fecha: filters.fecha
        });
    }, [filters]);

    useEffect(() => {
        let filtered = ventas.filter(v => {
            const matchSearch = !filterValues.search ||
                v.numero.toLowerCase().includes(filterValues.search.toLowerCase()) ||
                v.cliente.toLowerCase().includes(filterValues.search.toLowerCase());
            const matchEstado = !filterValues.estado || v.estado === filterValues.estado;
            const matchFecha = !filterValues.fecha ||
                (v.fechaObj ? v.fechaObj.toISOString().split('T')[0] : v.fecha.split(',')[0]).includes(filterValues.fecha);
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

    const columns: Column<VentaCatering>[] = [
        { key: 'numero', header: 'N° Venta', render: (v) => <strong>{v.numero}</strong> },
        { key: 'fecha', header: 'Fecha' },
        { key: 'cliente', header: 'Cliente' },
        { key: 'total', header: 'Total', render: (v) => `S/ ${v.total.toFixed(2)}` },
        { key: 'estado', header: 'Estado', render: (v) => getEstadoBadge(v.estado) }
    ];

    const ventasActivityLogs = activityLogs.filter(log => log.modulo === 'ventas').slice(0, 8);

    const handleNuevaVentaSuccess = (nuevaVenta: VentaCatering) => {
        setVentas([nuevaVenta, ...ventas]);
        setNuevaVentaOpen(false);
    };

    return (
        <>
            <div className="dc-catering-container">
                <div className="dc-catering-header-card">
                    <div className="dc-title">
                        <h1><i className="fas fa-utensils"></i> Delicias Catering</h1>
                        <p>Sistema de Ventas Profesional - Catering</p>
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
                            <i className="fas fa-edit" onClick={() => { setSelectedVenta(item); setEditarVentaOpen(true); }} title="Editar venta"></i>
                            <i className="fas fa-plus-circle" onClick={() => { setSelectedVenta(item); setAgregarProductosOpen(true); }} title="Agregar productos"></i>
                            <i className="fas fa-exchange-alt" onClick={() => { setSelectedVenta(item); setDevolucionOpen(true); }} title="Devolución"></i>
                            <i className="fas fa-print" onClick={() => { setSelectedVenta(item); setReimprimirOpen(true); }} title="Reimprimir"></i>
                            <i className="fas fa-clipboard-list" onClick={() => { setSelectedVenta(item); setCocinaOpen(true); }} title="Cocina/Logística"></i>
                            <i className="fas fa-times-circle" onClick={() => { setSelectedVenta(item); setAnularOpen(true); }} title="Anular"></i>
                        </>
                    )}
                />

                <ActivityLog logs={ventasActivityLogs} title="Actividad Reciente - Ventas" />

                {toasts.map(toast => (
                    <Toast key={toast.id} toast={toast} onClose={removeToast} />
                ))}
            </div>

            {/* Modales de Catering */}
            <NewCateringModal isOpen={nuevaVentaOpen} onClose={() => setNuevaVentaOpen(false)} onSuccess={handleNuevaVentaSuccess} />
            <CateringDetailsModal isOpen={detalleVentaOpen} onClose={() => setDetalleVentaOpen(false)} venta={selectedVenta} />
            <CateringModifyModal isOpen={editarVentaOpen} onClose={() => setEditarVentaOpen(false)} venta={selectedVenta} onSuccess={() => setEditarVentaOpen(false)} />
            <CateringAddProductsModal isOpen={agregarProductosOpen} onClose={() => setAgregarProductosOpen(false)} venta={selectedVenta} onSuccess={() => setAgregarProductosOpen(false)} />
            <CateringReturnModal isOpen={devolucionOpen} onClose={() => setDevolucionOpen(false)} venta={selectedVenta} onSuccess={() => setDevolucionOpen(false)} />
            <CateringReprintModal isOpen={reimprimirOpen} onClose={() => setReimprimirOpen(false)} venta={selectedVenta} />
            <CocinaLogisticaModal isOpen={cocinaOpen} onClose={() => setCocinaOpen(false)} venta={selectedVenta} />
            <CateringCancelModal isOpen={anularOpen} onClose={() => setAnularOpen(false)} venta={selectedVenta} onSuccess={() => setAnularOpen(false)} />
        </>
    );
};

const CateringSalesManagement: React.FC = () => {
    return (
        <CateringSalesProvider>
            <MainLayout>
                <CateringSalesContent />
            </MainLayout>
        </CateringSalesProvider>
    );
};

export default CateringSalesManagement;