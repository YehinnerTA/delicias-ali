import React, { useState, useEffect } from 'react';
import { useInventory } from '../../../../context/InventoryContext';
import { useToast } from '../../../../hooks/base/useToast';
import { useAuth } from '../../../../features/auth/context/AuthContext';
import { useCompany } from '../../../../features/company/context/CompanyContext';
import { Toast } from '../../../common/Toast';
import { Modal } from '../../../common/modal/Modal';
import { DataTable, Column } from '../../../common/DataTable';
import { FilterSection, FilterField } from '../../../common/FilterSection';
import { ActivityLog } from '../../../common/ActivityLog';
import { Postre, Lote } from '../../../../features/types/inventory';
import { postreApi } from '../../../../services/api/postreApi';
import { loteApi } from '../../../../services/api/loteApi';
import { historialApi } from '../../../../services/api/historialApi';
import * as XLSX from 'xlsx';

const postreFiltersConfig: FilterField[] = [
    { id: 'nombre', label: 'Buscar por nombre', type: 'text', placeholder: 'Ej: Cheesecake, Tarta...' },
    {
        id: 'estado', label: 'Estado vencimiento', type: 'select', options: [
            { value: '', label: 'Todos' },
            { value: 'vigente', label: 'Solo vigentes' },
            { value: 'vencido', label: 'Vencidos' },
            { value: 'proximo', label: 'Próximos a vencer (≤2 días)' }
        ]
    }
];

const filtersToRecord = (filters: { nombre: string; estado: string }): Record<string, string> => ({
    nombre: filters.nombre,
    estado: filters.estado
});

const recordToFilters = (record: Record<string, string>): { nombre: string; estado: string } => ({
    nombre: record.nombre || '',
    estado: record.estado || ''
});

const getTodayLocal = (): string => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

const formatearFecha = (fecha: string): string => {
    if (!fecha) return '-';
    const fechaStr = fecha.includes('T') ? fecha.split('T')[0] : fecha;
    const partes = fechaStr.split('-');
    if (partes.length === 3 && partes[0].length === 4) {
        return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }
    return fechaStr;
};

const formatLocalDateTime = (isoString: string): string => {
    if (!isoString) return '-';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    const dia = String(date.getDate()).padStart(2, '0');
    const mes = String(date.getMonth() + 1).padStart(2, '0');
    const año = date.getFullYear();
    const horas = String(date.getHours()).padStart(2, '0');
    const minutos = String(date.getMinutes()).padStart(2, '0');
    return `${dia}/${mes}/${año} ${horas}:${minutos}`;
};

export const PasteleriaSection: React.FC = () => {
    const {
        postresItems, setPostresItems,
        postreFilters, setPostreFilters,
        addActivity, addToHistory,
        calcularFechaVencimiento, getDiasRestantes,
        activityLogs
    } = useInventory();
    const { user } = useAuth();
    const { getSelectedCompanyId } = useCompany();
    const { toasts, showToast, removeToast } = useToast();

    const [createFormValues, setCreateFormValues] = useState({
        nombre: '',
        precio: '',
        stock: '',
        diasVenc: ''
    });
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const [bulkModalOpen, setBulkModalOpen] = useState(false);
    const [bulkRows, setBulkRows] = useState<Array<{
        id: string;
        nombre: string;
        stock: string;
        precio: string;
        dias_duracion: string;
    }>>([{ id: crypto.randomUUID(), nombre: '', stock: '', precio: '', dias_duracion: '' }]);
    const [bulkSubmitting, setBulkSubmitting] = useState(false);

    const [modalOpen, setModalOpen] = useState(false);
    const [modalContent, setModalContent] = useState<{ title: string; icon: string; children: React.ReactNode; footer?: React.ReactNode } | null>(null);
    const [filteredData, setFilteredData] = useState<Postre[]>(postresItems);
    const [filterValues, setFilterValues] = useState<Record<string, string>>(filtersToRecord(postreFilters));
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        setFilterValues(filtersToRecord(postreFilters));
    }, [postreFilters]);

    useEffect(() => {
        let filtered = postresItems.filter(postre => {
            const matchNombre = !filterValues.nombre ||
                postre.nombre.toLowerCase().includes(filterValues.nombre.toLowerCase());

            if (!filterValues.estado) return matchNombre;

            const hoy = new Date();
            if (filterValues.estado === 'vigente') {
                return matchNombre && postre.lotes.some(l => {
                    if (l.descartado === true || l.descartado === 1) return false;
                    return new Date(l.fechaVencimiento) >= hoy;
                });
            }
            if (filterValues.estado === 'vencido') {
                return matchNombre && postre.lotes.some(l => {
                    if (l.descartado === true || l.descartado === 1) return false;
                    return new Date(l.fechaVencimiento) < hoy;
                });
            }
            if (filterValues.estado === 'proximo') {
                const dosDias = new Date();
                dosDias.setDate(hoy.getDate() + 2);
                return matchNombre && postre.lotes.some(l => {
                    if (l.descartado === true || l.descartado === 1) return false;
                    const venc = new Date(l.fechaVencimiento);
                    return venc >= hoy && venc <= dosDias;
                });
            }
            return matchNombre;
        });
        setFilteredData(filtered);
    }, [postresItems, filterValues]);

    const handleFilterChange = (id: string, value: string) => {
        const newFilters = { ...filterValues, [id]: value };
        setFilterValues(newFilters);
        setPostreFilters(recordToFilters(newFilters));
    };

    const handleClearFilters = () => {
        setFilterValues({ nombre: '', estado: '' });
        setPostreFilters({ nombre: '', estado: '' });
        showToast("Filtros de postres limpiados", "info", "Filtros reseteados");
    };

    const getStockTotal = (postre: Postre): number => {
        return postre.lotes
            .filter(l => l.descartado !== true && l.descartado !== 1)
            .reduce((s, l) => s + l.stock, 0);
    };

    const getEstadoLote = (lote: Lote): { className: string; texto: string; badgeColor: string } => {
        const esDescartado = lote.descartado === true || lote.descartado === 1;
        if (esDescartado) {
            return { className: 'badge-discarded', texto: 'DESCARTADO', badgeColor: '#888' };
        }
        const diasRestantes = getDiasRestantes(lote.fechaVencimiento);
        if (diasRestantes < 0) return { className: 'badge-expired', texto: 'VENCIDO', badgeColor: '#d32f2f' };
        if (diasRestantes <= 2) return { className: 'badge-near-expiry', texto: `¡PRÓXIMO! (${diasRestantes} días)`, badgeColor: '#ff9800' };
        return { className: '', texto: `Vigente (${diasRestantes} días)`, badgeColor: '#4caf50' };
    };

    const handleDescartarLote = (lote: Lote, postre: Postre) => {
        if (lote.descartado === true || lote.descartado === 1) {
            showToast('Este lote ya fue descartado', 'info', 'Sin cambios');
            return;
        }

        setModalContent({
            title: `Descartar lote de "${postre.nombre}"`,
            icon: 'fa-trash-alt',
            children: (
                <>
                    <div className="dc-warning-box">
                        <i className="fas fa-exclamation-triangle"></i>
                        <p><strong>¡Atención!</strong> Estás a punto de descartar un lote de "{postre.nombre}"</p>
                    </div>
                    <div style={{ marginBottom: '1rem' }}>
                        <p><strong>Detalles del lote:</strong></p>
                        <ul style={{ listStyle: 'none', padding: 0 }}>
                            <li>📦 <strong>Stock:</strong> {lote.stock} unidades</li>
                            <li>📅 <strong>Vence:</strong> {formatearFecha(lote.fechaVencimiento)}</li>
                            <li>📋 <strong>Registro:</strong> {formatearFecha(lote.fechaRegistro)}</li>
                            <li>⏱️ <strong>Días de duración:</strong> {lote.diasDuracion} días</li>
                        </ul>
                    </div>
                    <p>
                        El lote será marcado como <strong>DESCARTADO</strong> y su stock dejará de contarse en el total.
                        <br />
                        <span style={{ color: '#d32f2f' }}>Esta acción no se puede deshacer.</span>
                    </p>
                    <p>¿Confirmas que deseas proceder con el descarte?</p>
                </>
            ),
            footer: (
                <>
                    <button
                        className="dc-btn danger"
                        onClick={async () => {
                            const empresaId = getSelectedCompanyId();
                            if (!empresaId) {
                                showToast('No se pudo identificar la empresa', 'error', 'Error');
                                setModalOpen(false);
                                setModalContent(null);
                                return;
                            }

                            setIsSubmitting(true);
                            try {
                                const loteDescartado = await loteApi.descartar(lote.id, empresaId);

                                const updatedPostres = postresItems.map(p => {
                                    if (p.id === postre.id) {
                                        const updatedLotes = p.lotes.map(l =>
                                            l.id === lote.id ? loteDescartado : l
                                        );
                                        return { ...p, lotes: updatedLotes };
                                    }
                                    return p;
                                });
                                setPostresItems(updatedPostres);

                                await addActivity('MODIFICAR', 'tienda', `Lote descartado: "${postre.nombre}" (${lote.stock} und)`);
                                await addToHistory(loteDescartado, postre.nombre, 'DESCARTE', `Lote descartado - stock: ${lote.stock}`);
                                showToast(`Lote de "${postre.nombre}" descartado correctamente`, 'success', 'Lote descartado');
                                setModalOpen(false);
                                setModalContent(null);
                            } catch (error) {
                                console.error('[TiendaSection] Error al descartar lote:', error);
                                showToast('Error al descartar el lote', 'error', 'Error');
                                setModalOpen(false);
                                setModalContent(null);
                            } finally {
                                setIsSubmitting(false);
                            }
                        }}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Descartando...' : <><i className="fas fa-trash"></i> Sí, Descartar</>}
                    </button>
                </>
            )
        });
        setModalOpen(true);
    };

    const columns: Column<Postre>[] = [
        { key: 'nombre', header: 'Postre', render: (item) => <strong>{item.nombre}</strong> },
        { key: 'stockTotal', header: 'Stock', render: (item) => getStockTotal(item) },
        { key: 'precio', header: 'Precio', render: (item) => `$${item.precio.toFixed(2)}` },
        {
            key: 'lotes',
            header: 'Lotes',
            render: (item) => (
                <>
                    {item.lotes.map((l, idx) => {
                        const estado = getEstadoLote(l);
                        const esDescartado = l.descartado === true || l.descartado === 1;
                        return (
                            <div key={idx} style={{ fontSize: '0.7rem', margin: '3px 0' }}>
                                <span className="dc-badge" style={{
                                    background: estado.badgeColor,
                                    color: '#000000',
                                }}>
                                    {formatearFecha(l.fechaVencimiento)} - {estado.texto}
                                </span>
                                · {l.stock} und ·
                                <span className="dc-badge">{l.diasDuracion} días</span>
                            </div>
                        );
                    })}
                </>
            )
        }
    ];

    const handleCreatePostre = async () => {
        const { nombre, precio, stock, diasVenc } = createFormValues;

        if (!nombre || !diasVenc || parseInt(diasVenc) <= 0 ||
            parseInt(stock) <= 0 || parseFloat(precio) <= 0) {
            showToast("Complete todos los campos del lote inicial", "warning", "Campos incompletos");
            return;
        }

        const userId = user?.id;
        const empresaId = getSelectedCompanyId();
        if (!userId || !empresaId) {
            showToast('No se pudo identificar al usuario o empresa', 'error', 'Error de autenticación');
            return;
        }

        setIsSubmitting(true);
        try {
            const fechaVencimiento = calcularFechaVencimiento(parseInt(diasVenc));
            const nuevoLote = {
                stock: parseInt(stock),
                fecha_vencimiento: fechaVencimiento,
                dias_duracion: parseInt(diasVenc),
                fecha_registro: getTodayLocal(),
            };

            const nuevoPostre = await postreApi.create({
                nombre: nombre,
                precio: parseFloat(precio),
                lotes: [nuevoLote],
                usuario_id: userId,
                id_empresa: empresaId
            });

            const todosLosPostres = await postreApi.getAll(empresaId);
            setPostresItems(todosLosPostres);

            await addActivity('INSERT', 'tienda', `Nuevo postre "${nombre}" con lote (${stock} und, ${diasVenc} días de duración)`);
            await addToHistory(nuevoPostre, nombre, 'CREACIÓN', `Postre creado con lote inicial de ${stock} und`);

            showToast(`Postre "${nombre}" creado exitosamente`, "success", "Postre registrado");
            setCreateFormValues({ nombre: '', precio: '0', stock: '0', diasVenc: '7' });
            setIsCreateModalOpen(false);
        } catch (error) {
            console.error('[TiendaSection] Error al crear postre:', error);
            showToast('Error al crear el postre', 'error', 'Error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAddBulkRow = () => {
        setBulkRows(prev => [...prev, {
            id: crypto.randomUUID(),
            nombre: '',
            stock: '',
            precio: '',
            dias_duracion: ''
        }]);
    };

    const handleRemoveBulkRow = (id: string) => {
        if (bulkRows.length <= 1) {
            showToast('Debe haber al menos una fila', 'warning', '');
            return;
        }
        setBulkRows(prev => prev.filter(row => row.id !== id));
    };

    const handleBulkRowChange = (id: string, field: string, value: string) => {
        setBulkRows(prev => prev.map(row =>
            row.id === id ? { ...row, [field]: value } : row
        ));
    };

    const handleBulkAdd = async () => {
        const invalidRows = bulkRows.filter(row => !row.nombre.trim() || !row.stock.trim() || !row.precio.trim() || !row.dias_duracion.trim());
        if (invalidRows.length > 0) {
            showToast('Todos los registros deben tener nombre, stock, precio y días de duración', 'warning', 'Campos incompletos');
            return;
        }

        const userId = user?.id;
        const empresaId = getSelectedCompanyId();
        if (!userId || !empresaId) {
            showToast('No se pudo identificar al usuario o empresa', 'error', 'Error de autenticación');
            return;
        }

        setBulkSubmitting(true);
        let postresSuccess: any[] = [];
        let postresErrors: any[] = [];
        let lotesErrors: any[] = [];

        try {
            const postresPayload = {
                items: bulkRows.map(row => ({
                    nombre: row.nombre.trim(),
                    stock: parseInt(row.stock, 10),
                    precio: parseFloat(row.precio),
                    dias_duracion: parseInt(row.dias_duracion, 10),
                    fecha_registro: getTodayLocal()
                })),
                usuario_id: userId,
                id_empresa: empresaId
            };

            const postresResult = await postreApi.createBulk(postresPayload);
            postresSuccess = postresResult.success || [];
            postresErrors = postresResult.errors || [];

            if (postresSuccess.length > 0) {
                const lotesItems: {
                    postre_id: number;
                    stock: number;
                    fecha_vencimiento: string;
                    dias_duracion: number;
                    fecha_registro: string;
                }[] = [];

                for (const postre of postresSuccess) {
                    const originalRow = bulkRows.find(row => row.nombre.trim() === postre.nombre);
                    if (!originalRow) continue;

                    const diasDuracion = parseInt(originalRow.dias_duracion, 10);
                    const fechaRegistro = getTodayLocal();
                    const fechaVencimiento = calcularFechaVencimiento(diasDuracion);

                    lotesItems.push({
                        postre_id: postre.id,
                        stock: parseInt(originalRow.stock, 10),
                        fecha_vencimiento: fechaVencimiento,
                        dias_duracion: diasDuracion,
                        fecha_registro: fechaRegistro
                    });
                }

                if (lotesItems.length > 0) {
                    const lotesResult = await loteApi.createBulk({
                        items: lotesItems,
                        usuario_id: userId,
                        id_empresa: empresaId
                    });
                    lotesErrors = lotesResult.errors || [];
                }
            }

            if (postresSuccess.length > 0) {
                const updatedPostres = await postreApi.getAll(empresaId);
                setPostresItems(updatedPostres);
            }

            const totalExitosos = postresSuccess.length;
            const totalErrores = postresErrors.length + lotesErrors.length;

            if (totalExitosos > 0) {
                showToast(`${totalExitosos} postres creados exitosamente`, 'success', 'Carga completada');
            }
            if (totalErrores > 0) {
                const allErrors = [...postresErrors, ...lotesErrors];
                const errorMessages = allErrors.map(e => `Fila ${e.index + 1}: ${e.message}`).join('\n');
                showToast(`Fallaron ${totalErrores} registros. Ver detalles en consola.`, 'error', 'Errores');
                console.error('Errores en carga:', allErrors);
            }

            await addActivity('INSERT', 'tienda', `Carga masiva: ${totalExitosos} postres registrados`);

            setBulkModalOpen(false);
            setBulkRows([{ id: crypto.randomUUID(), nombre: '', stock: '', precio: '', dias_duracion: '' }]);

        } catch (error) {
            console.error('[TiendaSection] Error en carga masiva:', error);
            showToast('Error al procesar la carga', 'error', 'Error');
        } finally {
            setBulkSubmitting(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const userId = user?.id;
        const empresaId = getSelectedCompanyId();
        if (!userId || !empresaId) {
            showToast('No se pudo identificar al usuario o empresa', 'error', 'Error de autenticación');
            return;
        }

        setBulkSubmitting(true);
        try {
            const reader = new FileReader();
            reader.onload = async (evt) => {
                try {
                    const data = evt.target?.result;
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                    const jsonData = XLSX.utils.sheet_to_json(firstSheet);

                    if (jsonData.length === 0) {
                        showToast('No se encontraron datos en el archivo', 'warning', '');
                        return;
                    }

                    const items = jsonData.map((row: any) => ({
                        nombre: row['nombre'] || row['Nombre'] || '',
                        stock: parseInt(row['stock'] || row['Stock'] || 0, 10),
                        precio: parseFloat(row['precio'] || row['Precio'] || row['price'] || 0),
                        dias_duracion: parseInt(row['dias_duracion'] || row['diasDuracion'] || row['Días duración'] || 0, 10)
                    }));

                    const invalidRows = items.filter(item => !item.nombre || !item.stock || !item.precio || !item.dias_duracion);
                    if (invalidRows.length > 0) {
                        showToast(`Hay ${invalidRows.length} filas con campos incompletos (nombre, stock, precio, días)`, 'warning', '');
                        return;
                    }

                    const postresPayload = {
                        items: items.map(item => ({
                            ...item,
                            fecha_registro: getTodayLocal()
                        })),
                        usuario_id: userId,
                        id_empresa: empresaId
                    };

                    const postresResult = await postreApi.createBulk(postresPayload);
                    const postresSuccess = postresResult.success || [];
                    const postresErrors = postresResult.errors || [];

                    let lotesErrors: any[] = [];
                    if (postresSuccess.length > 0) {
                        const lotesItems: {
                            postre_id: number;
                            stock: number;
                            fecha_vencimiento: string;
                            dias_duracion: number;
                            fecha_registro: string;
                        }[] = [];

                        for (const postre of postresSuccess) {
                            const originalItem = items.find(row => row.nombre.trim() === postre.nombre);
                            if (!originalItem) continue;

                            const diasDuracion = originalItem.dias_duracion;
                            const fechaRegistro = getTodayLocal();
                            const fechaVencimiento = calcularFechaVencimiento(diasDuracion);

                            lotesItems.push({
                                postre_id: postre.id,
                                stock: originalItem.stock,
                                fecha_vencimiento: fechaVencimiento,
                                dias_duracion: diasDuracion,
                                fecha_registro: fechaRegistro
                            });
                        }

                        if (lotesItems.length > 0) {
                            const lotesResult = await loteApi.createBulk({
                                items: lotesItems,
                                usuario_id: userId,
                                id_empresa: empresaId
                            });
                            lotesErrors = lotesResult.errors || [];
                        }
                    }

                    if (postresSuccess.length > 0) {
                        const updatedPostres = await postreApi.getAll(empresaId);
                        setPostresItems(updatedPostres);
                    }

                    const totalExitosos = postresSuccess.length;
                    const totalErrores = postresErrors.length + lotesErrors.length;

                    if (totalExitosos > 0) {
                        showToast(`${totalExitosos} postres creados exitosamente desde Excel`, 'success', 'Carga completada');
                    }
                    if (totalErrores > 0) {
                        const allErrors = [...postresErrors, ...lotesErrors];
                        const errorMessages = allErrors.map(e => `Fila ${e.index + 1}: ${e.message}`).join('\n');
                        showToast(`Fallaron ${totalErrores} registros. Ver detalles en consola.`, 'error', 'Errores');
                        console.error('Errores en Excel:', allErrors);
                    }

                    await addActivity('INSERT', 'tienda', `Carga Excel: ${totalExitosos} postres registrados`);

                    setBulkModalOpen(false);
                    e.target.value = '';

                } catch (error) {
                    console.error('[TiendaSection] Error al leer Excel:', error);
                    showToast('Error al leer el archivo Excel', 'error', '');
                } finally {
                    setBulkSubmitting(false);
                }
            };
            reader.readAsArrayBuffer(file);
        } catch (error) {
            console.error('[TiendaSection] Error al procesar Excel:', error);
            showToast('Error al procesar el archivo', 'error', '');
            setBulkSubmitting(false);
        }
    };

    const handleView = async (postre: Postre) => {
        try {
            const historialPostre = await historialApi.getByEntity('postres', postre.id);

            const historialesLotes = await Promise.all(
                postre.lotes.map(async (lote) => {
                    const hist = await historialApi.getByEntity('lotes', lote.id);
                    return hist.map((entry: any) => ({
                        ...entry,
                        _loteId: lote.id,
                        _loteInfo: `Lote ${lote.id} (vence ${formatearFecha(lote.fechaVencimiento)})`
                    }));
                })
            );

            const historialCombinado = [
                ...historialPostre.map((h: any) => ({ ...h, _tipo: 'Postre' })),
                ...historialesLotes.flat().map((h: any) => ({ ...h, _tipo: 'Lote' }))
            ];

            historialCombinado.sort((a, b) => {
                return new Date(b.fecha).getTime() - new Date(a.fecha).getTime();
            });

            const postreConHistorial = {
                ...postre,
                historial: historialCombinado
            };

            const stockTotal = getStockTotal(postreConHistorial);

            setModalContent({
                title: `Detalle de ${postreConHistorial.nombre}`,
                icon: 'fa-eye',
                children: (
                    <>
                        <div className="dc-info-card">
                            <h4><i className="fas fa-info-circle"></i> Información del Postre</h4>
                            <div className="dc-info-grid">
                                <div className="dc-info-item">
                                    <span className="dc-info-label">NOMBRE</span>
                                    <span className="dc-info-value">{postreConHistorial.nombre}</span>
                                </div>
                                <div className="dc-info-item">
                                    <span className="dc-info-label">PRECIO</span>
                                    <span className="dc-info-value">${postreConHistorial.precio.toFixed(2)}</span>
                                </div>
                                <div className="dc-info-item">
                                    <span className="dc-info-label">CANTIDAD DE LOTES</span>
                                    <span className="dc-info-value">{postreConHistorial.lotes.length}</span>
                                </div>
                                <div className="dc-info-item">
                                    <span className="dc-info-label">STOCK TOTAL</span>
                                    <span className="dc-info-value">{stockTotal} unidades</span>
                                </div>
                            </div>
                        </div>

                        <div className="dc-info-card">
                            <h4><i className="fas fa-boxes"></i> Detalle de Lotes</h4>
                            {postreConHistorial.lotes.map((l, idx) => {
                                const esDescartado = l.descartado === true || l.descartado === 1;
                                const diasRestantes = getDiasRestantes(l.fechaVencimiento);
                                const estado = esDescartado ? 'DESCARTADO' : (diasRestantes < 0 ? 'VENCIDO' : (diasRestantes <= 2 ? 'PRÓXIMO' : 'Vigente'));
                                const badgeColor = esDescartado ? '#888' : (diasRestantes < 0 ? '#d32f2f' : (diasRestantes <= 2 ? '#ff9800' : '#4caf50'));
                                return (
                                    <div key={idx} className="batch-group" style={{
                                        border: '1px solid #f0d6db',
                                        borderRadius: '1rem',
                                        marginBottom: '1rem',
                                        padding: '1rem',
                                        background: esDescartado ? '#f5f5f5' : '#fffbfc'
                                    }}>
                                        <strong>Lote {idx + 1}</strong> | Vence: {formatearFecha(l.fechaVencimiento)}
                                        <span className="dc-badge" style={{
                                            background: badgeColor,
                                            color: '#fff',
                                            marginLeft: '0.5rem'
                                        }}>
                                            {estado} {!esDescartado && l.stock > 0 && `(${Math.abs(diasRestantes)} días ${diasRestantes < 0 ? 'vencidos' : 'restantes'})`}
                                        </span><br />
                                        ⏱️ Duración original: {l.diasDuracion} días<br />
                                        📦 Stock: {l.stock}<br />
                                        📅 Registro: {formatearFecha(l.fechaRegistro)}
                                        {!esDescartado && l.stock > 0 && (
                                            <button
                                                className="dc-btn danger"
                                                style={{ marginTop: '0.5rem', padding: '0.2rem 0.8rem', fontSize: '0.7rem' }}
                                                onClick={() => handleDescartarLote(l, postre)}
                                                disabled={isSubmitting}
                                            >
                                                <i className="fas fa-trash"></i> Descartar
                                            </button>
                                        )}
                                        {esDescartado && (
                                            <span style={{ marginLeft: '0.5rem', color: '#888', fontSize: '0.8rem' }}>
                                                <i className="fas fa-check-circle"></i> Descartado
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <div className="dc-history-card">
                            <h4><i className="fas fa-history"></i> Historial de Cambios</h4>
                            <div className="dc-history-log">
                                {postreConHistorial.historial && postreConHistorial.historial.length > 0 ? (
                                    postreConHistorial.historial.map((h, idx) => (
                                        <div key={idx} className="dc-history-entry">
                                            <div>
                                                <span className="dc-history-date">{formatLocalDateTime(h.fecha)}</span>
                                                <span className="dc-history-user"><i className="fas fa-user-circle"></i> {h.usuario}</span>
                                                <span className="dc-badge" style={{ marginLeft: '0.5rem', fontSize: '0.6rem' }}>
                                                    {h._tipo}
                                                </span>
                                                {h._tipo === 'Lote' && h._loteInfo && (
                                                    <span style={{ marginLeft: '0.5rem', fontSize: '0.65rem', color: '#666' }}>
                                                        ({h._loteInfo})
                                                    </span>
                                                )}
                                            </div>
                                            <div className="dc-history-action">{h.accion}</div>
                                            <div className="dc-history-desc">{h.descripcion}</div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="dc-history-entry">Sin historial registrado</div>
                                )}
                            </div>
                        </div>
                    </>
                )
            });
            setModalOpen(true);
        } catch (error) {
            console.error('[TiendaSection] Error cargando historial:', error);
            showToast('Error al cargar el historial', 'error', 'Error');
        }
    };

    const handleAddLote = (postre: Postre) => {
        const handleSave = async () => {
            const stockN = parseInt((document.getElementById('newLoteStock') as HTMLInputElement)?.value);
            const diasN = parseInt((document.getElementById('newLoteDias') as HTMLInputElement)?.value);

            if (!stockN || stockN <= 0 || !diasN || diasN <= 0) {
                showToast("Complete campos válidos (stock > 0, días > 0)", "error", "Error");
                return;
            }

            const userId = user?.id;
            const empresaId = getSelectedCompanyId();
            if (!userId || !empresaId) {
                showToast('No se pudo identificar al usuario o empresa', 'error', 'Error de autenticación');
                return;
            }

            setIsSubmitting(true);
            try {
                const fechaVencimiento = calcularFechaVencimiento(diasN);
                const nuevoLote = await loteApi.create({
                    postre_id: postre.id,
                    stock: stockN,
                    fechaVencimiento: fechaVencimiento,
                    diasDuracion: diasN,
                    fechaRegistro: getTodayLocal(),
                    usuario_id: userId,
                    id_empresa: empresaId
                });

                const updatedPostres = postresItems.map(p =>
                    p.id === postre.id ? { ...p, lotes: [...p.lotes, nuevoLote] } : p
                );
                setPostresItems(updatedPostres);

                await addActivity('MODIFICAR', 'tienda', `Postre "${postre.nombre}": nuevo lote +${stockN} und, ${diasN} días de duración`);
                await addToHistory(nuevoLote, postre.nombre, 'CREACIÓN', `Lote agregado: +${stockN} und`);

                showToast(`Nuevo lote agregado a "${postre.nombre}"`, "success", "Lote creado");
                setModalOpen(false);
                setModalContent(null);
            } catch (error) {
                console.error('[TiendaSection] Error al agregar lote:', error);
                showToast('Error al agregar el lote', 'error', 'Error');
            } finally {
                setIsSubmitting(false);
            }
        };

        setModalContent({
            title: `Agregar lote - ${postre.nombre}`,
            icon: 'fa-plus-circle',
            children: (
                <>
                    <div className="stock-info" style={{ background: '#feeef2', padding: '0.8rem', borderRadius: '1rem', marginBottom: '1rem' }}>
                        <strong>Nuevo lote para {postre.nombre}</strong><br />
                        Los valores actuales se mantienen. Este nuevo lote se sumará al inventario.
                    </div>
                    <div className="dc-modal-field">
                        <label><i className="fas fa-boxes"></i> Stock a agregar (nuevo lote)</label>
                        <input type="number" id="newLoteStock" min="1" required />
                    </div>
                    <div className="dc-modal-field">
                        <label><i className="fas fa-calendar-day"></i> Días hasta vencimiento (nuevo lote)</label>
                        <input type="number" id="newLoteDias" min="1" required placeholder="Ej: 7" />
                    </div>
                </>
            ),
            footer: (
                <>
                    <button className="dc-btn success" onClick={handleSave} disabled={isSubmitting}>
                        {isSubmitting ? 'Creando...' : <><i className="fas fa-save"></i> Crear lote</>}
                    </button>
                </>
            )
        });
        setModalOpen(true);
    };

    const handleDelete = (postre: Postre) => {
        const handleConfirm = async () => {
            const empresaId = getSelectedCompanyId();
            if (!empresaId) {
                showToast('No se pudo identificar la empresa', 'error', 'Error de autenticación');
                return;
            }

            setIsSubmitting(true);
            try {
                await postreApi.delete(postre.id, empresaId);
                setPostresItems(postresItems.filter(p => p.id !== postre.id));
                await addActivity('ELIMINAR', 'tienda', `Eliminado "${postre.nombre}"`);
                showToast(`"${postre.nombre}" ha sido eliminado correctamente`, "success", "Eliminado");
                setModalOpen(false);
                setModalContent(null);
            } catch (error) {
                console.error('[TiendaSection] Error al eliminar postre:', error);
                showToast('Error al eliminar el postre', 'error', 'Error');
            } finally {
                setIsSubmitting(false);
            }
        };

        setModalContent({
            title: `Eliminar ${postre.nombre}`,
            icon: 'fa-trash-alt',
            children: (
                <>
                    <div className="dc-warning-box">
                        <i className="fas fa-exclamation-triangle"></i>
                        <p><strong>¡Atención!</strong> Estás a punto de eliminar "{postre.nombre}"</p>
                    </div>
                    <p>Esta acción es <strong>irreversible</strong>. Se perderán todos los datos asociados a este registro.</p>
                    <p>¿Confirmas que deseas proceder con la eliminación?</p>
                </>
            ),
            footer: (
                <>
                    <button className="dc-btn danger" onClick={handleConfirm} disabled={isSubmitting}>
                        {isSubmitting ? 'Eliminando...' : <><i className="fas fa-trash"></i> Sí, Eliminar</>}
                    </button>
                </>
            )
        });
        setModalOpen(true);
    };

    const tiendaActivityLogs = activityLogs.filter(log => log.modulo === 'tienda').slice(0, 6);

    return (
        <div data-tab="tienda">
            <div>
                <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button className="dc-btn" onClick={() => setIsCreateModalOpen(true)}>
                        <i className="fas fa-plus-circle"></i> Nuevo Postre
                    </button>
                    <button className="dc-btn info" onClick={() => setBulkModalOpen(true)}>
                        <i className="fas fa-upload"></i> Carga Masiva
                    </button>
                </div>

                <FilterSection
                    title="Filtrar postres"
                    filters={postreFiltersConfig}
                    values={filterValues}
                    onChange={handleFilterChange}
                    onClear={handleClearFilters}
                />

                <div className="dc-results-count">
                    <i className="fas fa-list-ul"></i> Mostrando {filteredData.length} de {postresItems.length} postres
                </div>

                <DataTable
                    columns={columns}
                    data={filteredData}
                    emptyMessage="🍰 No se encontraron postres"
                    actions={(item) => (
                        <>
                            <i className="fas fa-eye" onClick={() => handleView(item)} title="Ver lotes"></i>
                            <i className="fas fa-edit" onClick={() => handleAddLote(item)} title="Agregar nuevo lote"></i>
                            <i className="fas fa-trash-alt" onClick={() => handleDelete(item)} title="Eliminar postre"></i>
                        </>
                    )}
                />

                <ActivityLog logs={tiendaActivityLogs} title="Actividad reciente · Postres" />

                <Modal
                    isOpen={isCreateModalOpen}
                    onClose={() => {
                        setIsCreateModalOpen(false);
                        setCreateFormValues({ nombre: '', precio: '', stock: '', diasVenc: '' });
                    }}
                    title="Nuevo Postre + Lote Inicial"
                    icon="fa-plus-circle"
                    footer={
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', width: '100%' }}>
                            <button className="dc-btn success" onClick={handleCreatePostre} disabled={isSubmitting}>
                                {isSubmitting ? 'Creando...' : <><i className="fas fa-save"></i> Crear</>}
                            </button>
                        </div>
                    }
                >
                    <div className="dc-form-grid">
                        <div className="dc-input-group">
                            <label>Nombre postre *</label>
                            <input
                                type="text"
                                value={createFormValues.nombre}
                                onChange={(e) => setCreateFormValues(prev => ({ ...prev, nombre: e.target.value }))}
                                placeholder="Ej: Tarta de fresa"
                                required
                            />
                        </div>
                        <div className="dc-input-group">
                            <label>Precio unitario *</label>
                            <input
                                type="number"
                                step="0.01"
                                value={createFormValues.precio}
                                onChange={(e) => setCreateFormValues(prev => ({ ...prev, precio: e.target.value }))}
                                placeholder="0.00"
                                required
                            />
                        </div>
                        <div className="dc-input-group">
                            <label>Stock (unidades) *</label>
                            <input
                                type="number"
                                value={createFormValues.stock}
                                onChange={(e) => setCreateFormValues(prev => ({ ...prev, stock: e.target.value }))}
                                placeholder="0"
                                min="0"
                                required
                            />
                        </div>
                        <div className="dc-input-group">
                            <label>Días hasta vencimiento *</label>
                            <input
                                type="number"
                                value={createFormValues.diasVenc}
                                onChange={(e) => setCreateFormValues(prev => ({ ...prev, diasVenc: e.target.value }))}
                                placeholder="Ej: 7"
                                min="1"
                                required
                            />
                        </div>
                    </div>
                </Modal>

                <Modal
                    isOpen={bulkModalOpen}
                    onClose={() => {
                        setBulkModalOpen(false);
                        setBulkRows([{ id: crypto.randomUUID(), nombre: '', stock: '', precio: '', dias_duracion: '' }]);
                    }}
                    title="Carga Masiva de Postres"
                    icon="fa-upload"
                    footer={
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', width: '100%' }}>
                            <button className="dc-btn success" onClick={handleBulkAdd} disabled={bulkSubmitting}>
                                {bulkSubmitting ? 'Registrando...' : <><i className="fas fa-save"></i> Registrar todos</>}
                            </button>
                        </div>
                    }
                >
                    <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '0.5rem' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                            <thead style={{ background: '#f5f5f5', position: 'sticky', top: 0, zIndex: 1 }}>
                                <tr>
                                    <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Nombre *</th>
                                    <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Stock *</th>
                                    <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Precio *</th>
                                    <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Días duración *</th>
                                    <th style={{ padding: '0.5rem', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {bulkRows.map((row, index) => (
                                    <tr key={row.id} style={{ borderBottom: '1px solid #eee' }}>
                                        <td style={{ padding: '0.3rem' }}>
                                            <input
                                                type="text"
                                                value={row.nombre}
                                                onChange={(e) => handleBulkRowChange(row.id, 'nombre', e.target.value)}
                                                placeholder="Nombre"
                                                style={{ width: '100%', padding: '0.3rem' }}
                                            />
                                        </td>
                                        <td style={{ padding: '0.3rem' }}>
                                            <input
                                                type="number"
                                                value={row.stock}
                                                onChange={(e) => handleBulkRowChange(row.id, 'stock', e.target.value)}
                                                placeholder="0"
                                                min="0"
                                                style={{ width: '100%', padding: '0.3rem' }}
                                            />
                                        </td>
                                        <td style={{ padding: '0.3rem' }}>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={row.precio}
                                                onChange={(e) => handleBulkRowChange(row.id, 'precio', e.target.value)}
                                                placeholder="0.00"
                                                style={{ width: '100%', padding: '0.3rem' }}
                                            />
                                        </td>
                                        <td style={{ padding: '0.3rem' }}>
                                            <input
                                                type="number"
                                                value={row.dias_duracion}
                                                onChange={(e) => handleBulkRowChange(row.id, 'dias_duracion', e.target.value)}
                                                placeholder="Días"
                                                min="1"
                                                style={{ width: '100%', padding: '0.3rem' }}
                                            />
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <button
                                                onClick={() => handleRemoveBulkRow(row.id)}
                                                disabled={bulkRows.length <= 1}
                                                style={{ background: 'transparent', border: 'none' }}
                                            >
                                                <i className="fas fa-trash dc-eliminar"></i>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <button className="dc-btn info" onClick={handleAddBulkRow} style={{ fontSize: '0.9rem' }}>
                            <i className="fas fa-plus"></i> Agregar fila
                        </button>
                        <label className="dc-btn info" style={{ cursor: 'pointer', fontSize: '0.9rem' }}>
                            <i className="fas fa-file-excel"></i> Subir Excel
                            <input
                                type="file"
                                accept=".xlsx, .xls"
                                onChange={handleFileUpload}
                                style={{ display: 'none' }}
                                disabled={bulkSubmitting}
                            />
                        </label>
                    </div>
                </Modal>

                <Modal
                    isOpen={isCreateModalOpen}
                    onClose={() => {
                        setIsCreateModalOpen(false);
                        setCreateFormValues({ nombre: '', precio: '0', stock: '0', diasVenc: '7' });
                    }}
                    title="Nuevo Postre + Lote Inicial"
                    icon="fa-plus-circle"
                    footer={
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', width: '100%' }}>
                            <button className="dc-btn success" onClick={handleCreatePostre} disabled={isSubmitting}>
                                {isSubmitting ? 'Creando...' : <><i className="fas fa-save"></i> Crear</>}
                            </button>
                        </div>
                    }
                >
                    <div className="dc-form-grid">
                        <div className="dc-input-group">
                            <label>Nombre postre *</label>
                            <input
                                type="text"
                                value={createFormValues.nombre}
                                onChange={(e) => setCreateFormValues(prev => ({ ...prev, nombre: e.target.value }))}
                                placeholder="Ej: Tarta de fresa"
                                required
                            />
                        </div>
                        <div className="dc-input-group">
                            <label>Precio unitario *</label>
                            <input
                                type="number"
                                step="0.01"
                                value={createFormValues.precio}
                                onChange={(e) => setCreateFormValues(prev => ({ ...prev, precio: e.target.value }))}
                                placeholder="0.00"
                                required
                            />
                        </div>
                        <div className="dc-input-group">
                            <label>Stock (unidades) *</label>
                            <input
                                type="number"
                                value={createFormValues.stock}
                                onChange={(e) => setCreateFormValues(prev => ({ ...prev, stock: e.target.value }))}
                                placeholder="0"
                                min="0"
                                required
                            />
                        </div>
                        <div className="dc-input-group">
                            <label>Días hasta vencimiento *</label>
                            <input
                                type="number"
                                value={createFormValues.diasVenc}
                                onChange={(e) => setCreateFormValues(prev => ({ ...prev, diasVenc: e.target.value }))}
                                placeholder="Ej: 7"
                                min="1"
                                required
                            />
                        </div>
                    </div>
                </Modal>

                <Modal
                    isOpen={modalOpen}
                    onClose={() => {
                        setModalOpen(false);
                        setModalContent(null);
                    }}
                    title={modalContent?.title || ''}
                    icon={modalContent?.icon}
                    footer={modalContent?.footer}
                >
                    {modalContent?.children}
                </Modal>
            </div>

            <div className="dc-toast-container">
                {toasts.map(toast => (
                    <Toast key={toast.id} toast={toast} onClose={removeToast} />
                ))}
            </div>
        </div>
    );
};