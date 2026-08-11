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
import { CateringItem, CateringLote } from '../../../../features/types/inventory';
import { cateringItemApi } from '../../../../services/api/cateringApi';
import { cateringLoteApi } from '../../../../services/api/cateringLoteApi';
import { personaApi } from '../../../../services/api/personaApi';
import { historialApi } from '../../../../services/api/historialApi';
import { Persona } from '../../../../features/types/person';

// Lista de unidades para Materia Prima
const UNIDADES_MATERIA_PRIMA = [
    { value: 'unidad', label: 'Unidad' },
    { value: 'kg', label: 'Kilogramo (kg)' },
    { value: 'g', label: 'Gramo (g)' },
    { value: 'litro', label: 'Litro' },
    { value: 'ml', label: 'Mililitro (ml)' },
    { value: 'docena', label: 'Docena' },
    { value: 'paquete', label: 'Paquete' },
    { value: 'lata', label: 'Lata' },
    { value: 'frasco', label: 'Frasco' },
];

// Lista de unidades para Utensilios
const UNIDADES_UTENSILIO = [
    { value: 'unidad', label: 'Unidad' },
    { value: 'docena', label: 'Docena' },
    { value: 'caja', label: 'Caja' },
    { value: 'bolsa', label: 'Bolsa' },
    { value: 'juego', label: 'Juego' },
    { value: 'metro', label: 'Metro' },
    { value: 'rollo', label: 'Rollo' },
];

const getNombrePersonaLocal = (persona: Persona): string => {
    if (persona.razon_social) return persona.razon_social;
    return `${persona.nombre || ''} ${persona.apellido || ''}`.trim() || 'Sin nombre';
};

const cateringFiltersConfig: FilterField[] = [
    { id: 'nombre', label: 'Buscar por nombre', type: 'text', placeholder: 'Ej: Harina, Batidora...' },
    {
        id: 'tipo', label: 'Tipo', type: 'select', options: [
            { value: '', label: 'Todos' },
            { value: 'materia prima', label: 'Materia Prima' },
            { value: 'utensilio', label: 'Utensilio' }
        ]
    },
    { id: 'stockMin', label: 'Stock mínimo', type: 'number', placeholder: '0' }
];

const filtersToRecord = (filters: { nombre: string; tipo: string; stockMin: string }): Record<string, string> => ({
    nombre: filters.nombre,
    tipo: filters.tipo,
    stockMin: filters.stockMin
});

const recordToFilters = (record: Record<string, string>): { nombre: string; tipo: string; stockMin: string } => ({
    nombre: record.nombre || '',
    tipo: record.tipo || '',
    stockMin: record.stockMin || ''
});

// ============================================================
// FUNCIONES DE FECHAS
// ============================================================

const sumarDiasAFecha = (fechaStr: string, dias: number): string => {
    const partes = fechaStr.split('-');
    const año = parseInt(partes[0]);
    const mes = parseInt(partes[1]) - 1;
    const dia = parseInt(partes[2]);

    const fecha = new Date(Date.UTC(año, mes, dia));
    fecha.setUTCDate(fecha.getUTCDate() + dias);

    const y = fecha.getUTCFullYear();
    const m = String(fecha.getUTCMonth() + 1).padStart(2, '0');
    const d = String(fecha.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

const getFechaVencimientoItem = (item: CateringItem): string | null => {
    if (item.tipo === 'utensilio') return null;

    if (item.tiene_vencimiento && item.fecha_vencimiento) {
        const fechaStr = item.fecha_vencimiento.includes('T')
            ? item.fecha_vencimiento.split('T')[0]
            : item.fecha_vencimiento;
        return fechaStr;
    }

    if (item.dias_vida_util && item.createdAt) {
        const fechaBase = item.createdAt.includes('T')
            ? item.createdAt.split('T')[0]
            : item.createdAt;
        return sumarDiasAFecha(fechaBase, item.dias_vida_util - 1);
    }

    return null;
};

const getDiasRestantes = (fechaVencimiento: string): number => {
    const hoy = new Date();
    const hoyStr = hoy.toISOString().split('T')[0];
    const venc = new Date(fechaVencimiento);
    const vencStr = venc.toISOString().split('T')[0];
    const diff = Math.ceil((new Date(vencStr).getTime() - new Date(hoyStr).getTime()) / (1000 * 60 * 60 * 24));
    return diff;
};

const isVencido = (fechaVencimiento: string | null): boolean => {
    if (!fechaVencimiento) return false;
    const hoy = new Date();
    const hoyStr = hoy.toISOString().split('T')[0];
    return fechaVencimiento < hoyStr;
};

const formatearFecha = (fecha: string): string => {
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

// ============================================================

export const CateringSection: React.FC = () => {
    const {
        cateringItems,
        setCateringItems,
        cateringFilters,
        setCateringFilters,
        addActivity,
        addToHistory,
        activityLogs
    } = useInventory();
    const { user } = useAuth();
    const { getSelectedCompanyId } = useCompany();
    const { toasts, showToast, removeToast } = useToast();

    // Estado del formulario de creación
    const [formValues, setFormValues] = useState({
        nombre: '',
        stock: '0',
        tipo: 'materia prima' as 'materia prima' | 'utensilio',
        unidad_medida: 'unidad',
        tiene_vencimiento: false,
        fecha_vencimiento: '',
        dias_vida_util: '',
        precio_compra: '',
        id_proveedor: ''
    });

    // Estado para lotes
    const [lotesItems, setLotesItems] = useState<CateringLote[]>([]);
    const [proveedores, setProveedores] = useState<Persona[]>([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [modalContent, setModalContent] = useState<{ title: string; icon: string; children: React.ReactNode; footer?: React.ReactNode } | null>(null);
    const [filteredData, setFilteredData] = useState<CateringItem[]>(cateringItems);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [filterValues, setFilterValues] = useState<Record<string, string>>(filtersToRecord(cateringFilters));

    const empresaId = getSelectedCompanyId();

    useEffect(() => {
        if (empresaId) {
            cargarDatos(empresaId);
            cargarProveedores(empresaId);
        }
    }, [empresaId]);

    const cargarDatos = async (id_empresa: number) => {
        try {
            const items = await cateringItemApi.getAll(id_empresa);
            // Para materia prima, cargar lotes
            const itemsConLotes = await Promise.all(
                items.map(async (item) => {
                    if (item.tipo === 'materia prima') {
                        const lotes = await cateringLoteApi.getByItem(item.id, id_empresa);
                        return { ...item, lotes };
                    }
                    return { ...item, lotes: [] };
                })
            );
            setCateringItems(itemsConLotes);
        } catch (error) {
            console.error('[CateringSection] Error cargando datos:', error);
            showToast('Error al cargar insumos', 'error', 'Error');
        }
    };

    const cargarProveedores = async (id_empresa: number) => {
        try {
            const allPersonas = await personaApi.getAll(id_empresa);
            const proveedoresFiltrados = allPersonas.filter(p => p.tipo_persona === 'proveedor');
            setProveedores(proveedoresFiltrados);
        } catch (error) {
            console.error('[CateringSection] Error cargando proveedores:', error);
            showToast('Error al cargar proveedores', 'error', 'Error');
        }
    };

    useEffect(() => {
        setFilterValues(filtersToRecord(cateringFilters));
    }, [cateringFilters]);

    useEffect(() => {
        const filtered = cateringItems.filter(item => {
            const matchNombre = !filterValues.nombre ||
                item.nombre.toLowerCase().includes(filterValues.nombre.toLowerCase());
            const matchTipo = !filterValues.tipo || item.tipo === filterValues.tipo;
            const matchStockMin = !filterValues.stockMin ||
                item.stock >= parseInt(filterValues.stockMin);
            return matchNombre && matchTipo && matchStockMin;
        });
        setFilteredData(filtered);
    }, [cateringItems, filterValues]);

    const handleFilterChange = (id: string, value: string) => {
        const newFilters = { ...filterValues, [id]: value };
        setFilterValues(newFilters);
        setCateringFilters(recordToFilters(newFilters));
    };

    const handleClearFilters = () => {
        setFilterValues({ nombre: '', tipo: '', stockMin: '' });
        setCateringFilters({ nombre: '', tipo: '', stockMin: '' });
        showToast('Filtros de insumos limpiados', 'info', 'Filtros reseteados');
    };

    // ============================================================
    // OBTENER FECHA DE VENCIMIENTO MÁS PRÓXIMA DE LOS LOTES
    // ============================================================
    const getFechaVencimientoMasProxima = (item: CateringItem): string | null => {
        if (item.tipo === 'utensilio') return null;
        if (!item.lotes || item.lotes.length === 0) return null;

        const fechasValidas = item.lotes
            .map(l => l.fechaVencimiento)
            .filter(f => f !== null && f !== undefined) as string[];

        if (fechasValidas.length === 0) return null;

        // Ordenar y devolver la más próxima
        return fechasValidas.sort()[0];
    };

    // ============================================================
    // COLUMNAS DE LA TABLA
    // ============================================================
    const columns: Column<CateringItem>[] = [
        { key: 'nombre', header: 'Nombre', render: (item) => <strong>{item.nombre}</strong> },
        {
            key: 'stock', header: 'Stock', render: (item) => {
                if (item.tipo === 'utensilio') return item.stock;
                const total = item.lotes?.reduce((s, l) => s + l.stock, 0) || 0;
                return total;
            }
        },
        { key: 'tipo', header: 'Tipo', render: (item) => <span className="dc-badge">{item.tipo}</span> },
        { key: 'unidad_medida', header: 'Unidad', render: (item) => item.unidad_medida || '-' },
        {
            key: 'lotes',
            header: 'Lotes (stock por vencimiento)',
            render: (item) => {
                if (item.tipo === 'utensilio') return <span style={{ color: '#888' }}>Sin lotes</span>;
                if (!item.lotes || item.lotes.length === 0) return <span style={{ color: '#888' }}>Sin lotes</span>;

                return (
                    <>
                        {item.lotes.map((l, idx) => {
                            const diasRestantes = getDiasRestantes(l.fechaVencimiento as string);
                            const estado = diasRestantes < 0 ? 'VENCIDO' : (diasRestantes <= 2 ? '¡PRÓXIMO!' : 'Vigente');
                            return (
                                <div key={idx} style={{ fontSize: '0.7rem', margin: '3px 0' }}>
                                    <span className="dc-badge" style={{
                                        background: diasRestantes < 0 ? '#d32f2f' : (diasRestantes <= 2 ? '#ff9800' : '#17cc1a'),
                                        color: '#000000'
                                    }}>
                                        {formatearFecha(l.fechaVencimiento as string)} - {estado}
                                    </span>
                                    · {l.stock} und
                                </div>
                            );
                        })}
                    </>
                );
            }
        },
        {
            key: 'fechaVencimiento',
            header: 'Fecha Vencimiento (próximo)',
            render: (item) => {
                if (item.tipo === 'utensilio') {
                    return <span style={{ color: '#888' }}>No Requiere</span>;
                }
                const fecha = getFechaVencimientoMasProxima(item);
                if (!fecha) {
                    return <span style={{ color: '#888' }}>Sin lotes</span>;
                }
                const vencido = isVencido(fecha);
                const fechaFormateada = formatearFecha(fecha);
                return (
                    <span style={{
                        color: vencido ? '#d32f2f' : 'inherit',
                        fontWeight: vencido ? 'bold' : 'normal',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}>
                        {fechaFormateada}
                        {vencido && (
                            <span className="dc-badge" style={{ background: '#d32f2f', color: '#fff' }}>
                                VENCIDO
                            </span>
                        )}
                    </span>
                );
            }
        },
    ];

    const getUnidadesOptions = (tipo: string) => {
        if (tipo === 'materia prima') {
            return UNIDADES_MATERIA_PRIMA;
        } else if (tipo === 'utensilio') {
            return UNIDADES_UTENSILIO;
        }
        return [];
    };

    // ============================================================
    // CREAR NUEVO PRODUCTO (con lote inicial para materia prima)
    // ============================================================
    const handleAddItem = async () => {
        if (!formValues.nombre) {
            showToast('Nombre requerido', 'warning', 'Campos incompletos');
            return;
        }

        const userId = user?.id;
        const empresaId = getSelectedCompanyId();
        if (!userId || !empresaId) {
            showToast('No se pudo identificar al usuario o empresa', 'error', 'Error de autenticación');
            return;
        }

        // Validaciones para materia prima
        if (formValues.tipo === 'materia prima') {
            if (formValues.tiene_vencimiento && !formValues.fecha_vencimiento) {
                showToast('La fecha de vencimiento es obligatoria', 'warning', 'Campos incompletos');
                return;
            }
            if (!formValues.tiene_vencimiento && !formValues.dias_vida_util) {
                showToast('Los días de vida útil son obligatorios', 'warning', 'Campos incompletos');
                return;
            }
        }

        setIsSubmitting(true);
        try {
            // Crear el item
            const payload = {
                nombre: formValues.nombre,
                stock: parseInt(formValues.stock) || 0,
                tipo: formValues.tipo,
                usuario_id: userId,
                id_empresa: empresaId,
                unidad_medida: formValues.unidad_medida,
                tiene_vencimiento: formValues.tiene_vencimiento,
                fecha_vencimiento: formValues.tiene_vencimiento ? formValues.fecha_vencimiento : null,
                dias_vida_util: !formValues.tiene_vencimiento ? parseInt(formValues.dias_vida_util) || null : null,
                precio_compra: formValues.precio_compra ? parseFloat(formValues.precio_compra) : null,
                id_proveedor: formValues.id_proveedor ? parseInt(formValues.id_proveedor) : null
            };

            const newItem = await cateringItemApi.create(payload as any);

            // Si es materia prima, crear lote inicial
            if (formValues.tipo === 'materia prima') {
                // Calcular fecha de vencimiento para el lote
                let fechaVencLote = null;
                if (formValues.tiene_vencimiento && formValues.fecha_vencimiento) {
                    fechaVencLote = formValues.fecha_vencimiento;
                } else if (formValues.dias_vida_util) {
                    // Calcular desde la fecha de creación
                    const hoy = new Date().toISOString().split('T')[0];
                    fechaVencLote = sumarDiasAFecha(hoy, parseInt(formValues.dias_vida_util) - 1);
                }

                // Si no hay fecha, no crear lote
                if (fechaVencLote) {
                    await cateringLoteApi.create({
                        id_item: newItem.id,
                        stock: parseInt(formValues.stock) || 0,
                        fechaVencimiento: fechaVencLote,
                        diasVidaUtil: formValues.tiene_vencimiento ? null : parseInt(formValues.dias_vida_util) || null,
                        fechaRegistro: new Date().toISOString().split('T')[0],
                        usuario_id: userId,
                        id_empresa: empresaId
                    });
                }
            }

            await cargarDatos(empresaId);

            await addActivity('INSERT', 'catering', `Nuevo ${formValues.tipo}: "${formValues.nombre}"`);
            await addToHistory(newItem, formValues.nombre, 'CREACIÓN', `Creado con stock ${formValues.stock}`);

            showToast(`Insumo "${formValues.nombre}" creado exitosamente`, 'success', 'Insumo registrado');
            setFormValues({
                nombre: '',
                stock: '0',
                tipo: 'materia prima',
                unidad_medida: 'unidad',
                tiene_vencimiento: false,
                fecha_vencimiento: '',
                dias_vida_util: '',
                precio_compra: '',
                id_proveedor: ''
            });
            setModalOpen(false);
        } catch (error) {
            console.error('[CateringSection] Error al crear insumo:', error);
            showToast('Error al crear el insumo', 'error', 'Error');
        } finally {
            setIsSubmitting(false);
        }
    };

    // ============================================================
    // VER DETALLE CON LOTES
    // ============================================================
    const handleView = async (item: CateringItem) => {
        try {
            const historialItem = await historialApi.getByEntity('catering_items', item.id);

            // Obtener historial de lotes
            let historialesLotes: any[] = [];
            if (item.lotes && item.lotes.length > 0) {
                const histLotes = await Promise.all(
                    item.lotes.map(async (lote) => {
                        const hist = await historialApi.getByEntity('catering_lotes', lote.id);
                        return hist.map((entry: any) => ({
                            ...entry,
                            _loteId: lote.id,
                            _loteInfo: `Lote ${lote.id} (vence ${formatearFecha(lote.fechaVencimiento as string)})`
                        }));
                    })
                );
                historialesLotes = histLotes.flat();
            }

            const historialCombinado = [
                ...historialItem.map((h: any) => ({ ...h, _tipo: 'Insumo' })),
                ...historialesLotes.map((h: any) => ({ ...h, _tipo: 'Lote' }))
            ];

            historialCombinado.sort((a, b) => {
                return new Date(b.fecha).getTime() - new Date(a.fecha).getTime();
            });

            const itemConHistorial = {
                ...item,
                historial: historialCombinado
            };

            let nombreProveedor = '-';
            if (item.id_proveedor) {
                const proveedor = proveedores.find(p => p.id_persona === item.id_proveedor);
                if (proveedor) nombreProveedor = getNombrePersonaLocal(proveedor);
            }

            const stockTotal = item.tipo === 'utensilio'
                ? item.stock
                : (item.lotes?.reduce((s, l) => s + l.stock, 0) || 0);

            setModalContent({
                title: `Detalle de ${itemConHistorial.nombre}`,
                icon: 'fa-eye',
                children: (
                    <>
                        <div className="dc-info-card">
                            <h4><i className="fas fa-info-circle"></i> Información del Insumo</h4>
                            <div className="dc-info-grid">
                                <div className="dc-info-item">
                                    <span className="dc-info-label">NOMBRE</span>
                                    <span className="dc-info-value">{itemConHistorial.nombre}</span>
                                </div>
                                <div className="dc-info-item">
                                    <span className="dc-info-label">STOCK TOTAL</span>
                                    <span className="dc-info-value">{stockTotal} unidades</span>
                                </div>
                                <div className="dc-info-item">
                                    <span className="dc-info-label">TIPO</span>
                                    <span className="dc-info-value">{itemConHistorial.tipo}</span>
                                </div>
                                <div className="dc-info-item">
                                    <span className="dc-info-label">UNIDAD DE MEDIDA</span>
                                    <span className="dc-info-value">{itemConHistorial.unidad_medida || '-'}</span>
                                </div>
                                <div className="dc-info-item">
                                    <span className="dc-info-label">PRECIO DE COMPRA</span>
                                    <span className="dc-info-value">{itemConHistorial.precio_compra ? `S/ ${itemConHistorial.precio_compra.toFixed(2)}` : '-'}</span>
                                </div>
                                <div className="dc-info-item">
                                    <span className="dc-info-label">PROVEEDOR</span>
                                    <span className="dc-info-value">{nombreProveedor}</span>
                                </div>
                                <div className="dc-info-item">
                                    <span className="dc-info-label">CANTIDAD DE LOTES</span>
                                    <span className="dc-info-value">{itemConHistorial.lotes?.length || 0}</span>
                                </div>
                                <div className="dc-info-item">
                                    <span className="dc-info-label">REGISTRADO POR</span>
                                    <span className="dc-info-value">{itemConHistorial.registradoPor}</span>
                                </div>
                                <div className="dc-info-item">
                                    <span className="dc-info-label">ÚLTIMA EDICIÓN</span>
                                    <span className="dc-info-value">{formatLocalDateTime(itemConHistorial.ultimaEdicion)}</span>
                                </div>
                            </div>
                        </div>

                        {item.tipo === 'materia prima' && item.lotes && item.lotes.length > 0 && (
                            <div className="dc-info-card">
                                <h4><i className="fas fa-boxes"></i> Detalle de Lotes</h4>
                                {item.lotes.map((l, idx) => {
                                    const diasRestantes = getDiasRestantes(l.fechaVencimiento as string);
                                    const estado = diasRestantes < 0 ? 'VENCIDO' : (diasRestantes <= 2 ? 'PRÓXIMO' : 'Vigente');
                                    return (
                                        <div key={idx} className="batch-group" style={{
                                            border: '1px solid #f0d6db',
                                            borderRadius: '1rem',
                                            marginBottom: '1rem',
                                            padding: '1rem',
                                            background: '#fffbfc'
                                        }}>
                                            <strong>Lote {idx + 1}</strong> | Vence: {formatearFecha(l.fechaVencimiento as string)}
                                            <span className={`dc-badge ${diasRestantes < 0 ? 'badge-expired' : (diasRestantes <= 2 ? 'badge-near-expiry' : '')}`}
                                                style={{
                                                    background: diasRestantes < 0 ? '#d32f2f' : (diasRestantes <= 2 ? '#ff9800' : '#4caf50'),
                                                    color: '#fff',
                                                    marginLeft: '0.5rem'
                                                }}>
                                                {estado} ({Math.abs(diasRestantes)} días {diasRestantes < 0 ? 'vencidos' : 'restantes'})
                                            </span><br />
                                            📦 Stock: {l.stock}<br />
                                            📅 Registro: {formatearFecha(l.fechaRegistro)}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        <div className="dc-history-card">
                            <h4><i className="fas fa-history"></i> Historial de Cambios</h4>
                            <div className="dc-history-log">
                                {itemConHistorial.historial && itemConHistorial.historial.length > 0 ? (
                                    itemConHistorial.historial.map((h, idx) => (
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
                ),
                footer: (
                    <button className="dc-btn secondary" onClick={() => {
                        setModalOpen(false);
                        setModalContent(null);
                    }}>
                        <i className="fas fa-times"></i> Cerrar
                    </button>
                )
            });
            setModalOpen(true);
        } catch (error) {
            console.error('[CateringSection] Error cargando historial:', error);
            showToast('Error al cargar el historial', 'error', 'Error');
        }
    };

    // ============================================================
    // AGREGAR LOTE A UN PRODUCTO EXISTENTE
    // ============================================================
    const handleAddLote = (item: CateringItem) => {
        if (item.tipo === 'utensilio') {
            showToast('Los utensilios no tienen lotes', 'warning', 'No aplica');
            return;
        }

        const handleSave = async () => {
            const stockN = parseInt((document.getElementById('newLoteStock') as HTMLInputElement)?.value);
            const diasN = parseInt((document.getElementById('newLoteDias') as HTMLInputElement)?.value);
            const fechaDirecta = (document.getElementById('newLoteFecha') as HTMLInputElement)?.value;

            if (!stockN || stockN <= 0) {
                showToast("Stock debe ser mayor a 0", "error", "Error");
                return;
            }

            // Validar fecha: si no hay fecha directa, debe haber días
            let fechaVencimiento = null;
            if (fechaDirecta) {
                fechaVencimiento = fechaDirecta;
            } else if (diasN && diasN > 0) {
                const hoy = new Date().toISOString().split('T')[0];
                fechaVencimiento = sumarDiasAFecha(hoy, diasN - 1);
            } else {
                showToast("Debe especificar fecha de vencimiento o días de vida útil", "warning", "Campos incompletos");
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
                const nuevoLote = await cateringLoteApi.create({
                    id_item: item.id,
                    stock: stockN,
                    fechaVencimiento: fechaVencimiento,
                    diasVidaUtil: diasN || null,
                    fechaRegistro: new Date().toISOString().split('T')[0],
                    usuario_id: userId,
                    id_empresa: empresaId
                });

                // Actualizar el item en el estado
                const updatedItems = cateringItems.map(p =>
                    p.id === item.id ? { ...p, lotes: [...(p.lotes || []), nuevoLote] } : p
                );
                setCateringItems(updatedItems);

                await addActivity('MODIFICAR', 'catering', `Item "${item.nombre}": nuevo lote +${stockN} und, vence ${fechaVencimiento}`);
                await addToHistory(nuevoLote, item.nombre, 'CREACIÓN', `Lote agregado: +${stockN} und`);

                showToast(`Nuevo lote agregado a "${item.nombre}"`, "success", "Lote creado");
                setModalOpen(false);
                setModalContent(null);
            } catch (error) {
                console.error('[CateringSection] Error al agregar lote:', error);
                showToast('Error al agregar el lote', 'error', 'Error');
            } finally {
                setIsSubmitting(false);
            }
        };

        setModalContent({
            title: `Agregar lote - ${item.nombre}`,
            icon: 'fa-plus-circle',
            children: (
                <>
                    <div className="stock-info" style={{ background: '#feeef2', padding: '0.8rem', borderRadius: '1rem', marginBottom: '1rem' }}>
                        <strong>Nuevo lote para {item.nombre}</strong><br />
                        Este nuevo lote se sumará al inventario.
                    </div>
                    <div className="dc-modal-field">
                        <label><i className="fas fa-boxes"></i> Stock a agregar (nuevo lote) *</label>
                        <input type="number" id="newLoteStock" min="1" required />
                    </div>
                    <div className="dc-modal-field">
                        <label><i className="fas fa-calendar-alt"></i> Fecha de vencimiento (opcional)</label>
                        <input type="date" id="newLoteFecha" />
                    </div>
                    <div className="dc-modal-field">
                        <label><i className="fas fa-calendar-day"></i> Días de vida útil (si no usas fecha)</label>
                        <input type="number" id="newLoteDias" min="1" placeholder="Ej: 7" />
                    </div>
                    <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.5rem' }}>
                        * Debes especificar una fecha de vencimiento o días de vida útil.
                    </p>
                </>
            ),
            footer: (
                <>
                    <button className="dc-btn success" onClick={handleSave} disabled={isSubmitting}>
                        {isSubmitting ? 'Creando...' : <><i className="fas fa-save"></i> Crear lote</>}
                    </button>
                    <button className="dc-btn secondary" onClick={() => {
                        setModalOpen(false);
                        setModalContent(null);
                    }}>
                        <i className="fas fa-times"></i> Cancelar
                    </button>
                </>
            )
        });
        setModalOpen(true);
    };

    // ============================================================
    // EDITAR STOCK (solo para utensilios o ajuste general)
    // ============================================================
    const handleEdit = (item: CateringItem) => {
        // Si es materia prima, mostrar opción para agregar lote en lugar de editar stock directo
        if (item.tipo === 'materia prima') {
            handleAddLote(item);
            return;
        }

        const oldStock = item.stock;

        const handleSave = async () => {
            const inc = parseInt((document.getElementById('incStock') as HTMLInputElement)?.value) || 0;
            if (inc < 0) {
                showToast('Valor inválido', 'error', 'Error');
                return;
            }
            const nuevoStock = item.stock + inc;

            setIsSubmitting(true);
            try {
                const updatedItem = await cateringItemApi.update(item.id, { stock: nuevoStock });

                setCateringItems(
                    cateringItems.map((i: CateringItem) =>
                        i.id === updatedItem.id ? updatedItem : i
                    )
                );

                const desc = `Stock: ${oldStock} → ${nuevoStock} (+${inc})`;
                await addToHistory(updatedItem, item.nombre, 'MODIFICACIÓN', desc);
                await addActivity('MODIFICAR', 'catering', `${item.nombre}: ${desc}`);

                showToast(`Stock actualizado a ${nuevoStock} unidades`, 'success', 'Stock actualizado');
                setModalOpen(false);
                setModalContent(null);
            } catch (error) {
                console.error('[CateringSection] Error al actualizar stock:', error);
                showToast('Error al actualizar el stock', 'error', 'Error');
            } finally {
                setIsSubmitting(false);
            }
        };

        setModalContent({
            title: `Editar ${item.nombre}`,
            icon: 'fa-edit',
            children: (
                <>
                    <div className="stock-info" style={{ background: '#feeef2', padding: '0.8rem', borderRadius: '1rem', marginBottom: '1rem' }}>
                        📦 Stock actual: {item.stock} unidades
                    </div>
                    <div className="dc-modal-field">
                        <label><i className="fas fa-plus-circle"></i> Agregar stock (cantidad)</label>
                        <input type="number" id="incStock" defaultValue="0" min="0" />
                    </div>
                </>
            ),
            footer: (
                <>
                    <button className="dc-btn success" onClick={handleSave} disabled={isSubmitting}>
                        {isSubmitting ? 'Guardando...' : <><i className="fas fa-save"></i> Guardar Cambios</>}
                    </button>
                    <button className="dc-btn secondary" onClick={() => {
                        setModalOpen(false);
                        setModalContent(null);
                    }}>
                        <i className="fas fa-times"></i> Cancelar
                    </button>
                </>
            )
        });
        setModalOpen(true);
    };

    const handleDelete = (item: CateringItem) => {
        const handleConfirm = async () => {
            const empresaId = getSelectedCompanyId();
            if (!empresaId) {
                showToast('No se pudo identificar la empresa', 'error', 'Error de autenticación');
                return;
            }

            setIsSubmitting(true);
            try {
                await cateringItemApi.delete(item.id, empresaId);
                setCateringItems(cateringItems.filter((i: CateringItem) => i.id !== item.id));
                await addActivity('ELIMINAR', 'catering', `Eliminado "${item.nombre}"`);
                showToast(`"${item.nombre}" ha sido eliminado correctamente`, 'success', 'Eliminado');
                setModalOpen(false);
                setModalContent(null);
            } catch (error) {
                console.error('[CateringSection] Error al eliminar insumo:', error);
                showToast('Error al eliminar el insumo', 'error', 'Error');
            } finally {
                setIsSubmitting(false);
            }
        };

        setModalContent({
            title: `Eliminar ${item.nombre}`,
            icon: 'fa-trash-alt',
            children: (
                <>
                    <div className="dc-warning-box">
                        <i className="fas fa-exclamation-triangle"></i>
                        <p><strong>¡Atención!</strong> Estás a punto de eliminar "{item.nombre}"</p>
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
                    <button className="dc-btn secondary" onClick={() => {
                        setModalOpen(false);
                        setModalContent(null);
                    }}>
                        <i className="fas fa-ban"></i> Cancelar
                    </button>
                </>
            )
        });
        setModalOpen(true);
    };

    const cateringActivityLogs = activityLogs.filter(log => log.modulo === 'catering').slice(0, 6);

    return (
        <div data-tab="catering">
            <div>
                <div style={{ marginBottom: '1.5rem' }}>
                    <button className="dc-btn" onClick={() => setModalOpen(true)}>
                        <i className="fas fa-plus-circle"></i> Nuevo Insumo
                    </button>
                </div>

                <FilterSection
                    title="Filtrar insumos"
                    filters={cateringFiltersConfig}
                    values={filterValues}
                    onChange={handleFilterChange}
                    onClear={handleClearFilters}
                />

                <div className="dc-results-count">
                    <i className="fas fa-list-ul"></i> Mostrando {filteredData.length} de {cateringItems.length} insumos
                </div>

                <DataTable
                    columns={columns}
                    data={filteredData}
                    emptyMessage="📭 No se encontraron insumos"
                    actions={(item) => (
                        <>
                            <i className="fas fa-eye" onClick={() => handleView(item)} title="Ver detalle"></i>
                            <i className="fas fa-edit" onClick={() => handleEdit(item)} title={item.tipo === 'materia prima' ? 'Agregar lote' : 'Editar stock'}></i>
                            <i className="fas fa-trash-alt" onClick={() => handleDelete(item)} title="Eliminar"></i>
                        </>
                    )}
                />

                <ActivityLog logs={cateringActivityLogs} title="Actividad reciente · Catering" />

                <Modal
                    isOpen={modalOpen && !modalContent}
                    onClose={() => {
                        setModalOpen(false);
                        setFormValues({
                            nombre: '',
                            stock: '0',
                            tipo: 'materia prima',
                            unidad_medida: 'unidad',
                            tiene_vencimiento: false,
                            fecha_vencimiento: '',
                            dias_vida_util: '',
                            precio_compra: '',
                            id_proveedor: ''
                        });
                    }}
                    title="Nuevo Insumo"
                    icon="fa-box-open"
                    footer={
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', width: '100%' }}>
                            <button className="dc-btn secondary" onClick={() => {
                                setModalOpen(false);
                                setFormValues({
                                    nombre: '',
                                    stock: '0',
                                    tipo: 'materia prima',
                                    unidad_medida: 'unidad',
                                    tiene_vencimiento: false,
                                    fecha_vencimiento: '',
                                    dias_vida_util: '',
                                    precio_compra: '',
                                    id_proveedor: ''
                                });
                            }}>
                                <i className="fas fa-times"></i> Cancelar
                            </button>
                            <button className="dc-btn success" onClick={handleAddItem} disabled={isSubmitting}>
                                {isSubmitting ? 'Registrando...' : <><i className="fas fa-save"></i> Registrar</>}
                            </button>
                        </div>
                    }
                >
                    <div className="dc-form-grid">
                        {/* Nombre */}
                        <div className="dc-input-group" style={{ flex: '1 1 100%' }}>
                            <label>Nombre *</label>
                            <input
                                type="text"
                                value={formValues.nombre}
                                onChange={(e) => setFormValues(prev => ({ ...prev, nombre: e.target.value }))}
                                placeholder="Ej: Harina orgánica"
                                required
                            />
                        </div>

                        {/* Stock */}
                        <div className="dc-input-group">
                            <label>Stock inicial *</label>
                            <input
                                type="number"
                                value={formValues.stock}
                                onChange={(e) => setFormValues(prev => ({ ...prev, stock: e.target.value }))}
                                min="0"
                            />
                        </div>

                        {/* Tipo */}
                        <div className="dc-input-group">
                            <label>Tipo *</label>
                            <select
                                value={formValues.tipo}
                                onChange={(e) => {
                                    const newTipo = e.target.value as 'materia prima' | 'utensilio';
                                    setFormValues(prev => ({
                                        ...prev,
                                        tipo: newTipo,
                                        unidad_medida: 'unidad'
                                    }));
                                }}
                            >
                                <option value="materia prima">Materia Prima</option>
                                <option value="utensilio">Utensilio</option>
                            </select>
                        </div>

                        {/* Unidad de medida */}
                        <div className="dc-input-group">
                            <label>Unidad de medida</label>
                            <select
                                value={formValues.unidad_medida}
                                onChange={(e) => setFormValues(prev => ({
                                    ...prev,
                                    unidad_medida: e.target.value
                                }))}
                            >
                                {getUnidadesOptions(formValues.tipo).map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Precio de compra */}
                        <div className="dc-input-group">
                            <label>Precio de compra (S/)</label>
                            <input
                                type="number"
                                step="0.01"
                                value={formValues.precio_compra}
                                onChange={(e) => setFormValues(prev => ({ ...prev, precio_compra: e.target.value }))}
                                placeholder="0.00"
                            />
                        </div>

                        {/* Proveedor */}
                        <div className="dc-input-group">
                            <label>Proveedor</label>
                            <select
                                value={formValues.id_proveedor}
                                onChange={(e) => setFormValues(prev => ({ ...prev, id_proveedor: e.target.value }))}
                            >
                                <option value="">Seleccione un proveedor</option>
                                {proveedores.map(p => (
                                    <option key={p.id_persona} value={p.id_persona}>
                                        {getNombrePersonaLocal(p)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {formValues.tipo === 'materia prima' && (
                            <>
                                <div className="dc-input-group" style={{ flex: '1 1 100%' }}>
                                    <label>
                                        <input
                                            type="checkbox"
                                            checked={formValues.tiene_vencimiento}
                                            onChange={(e) => setFormValues(prev => ({
                                                ...prev,
                                                tiene_vencimiento: e.target.checked,
                                                fecha_vencimiento: '',
                                                dias_vida_util: ''
                                            }))}
                                        />
                                        {' '}Tiene fecha de vencimiento
                                    </label>
                                </div>

                                {formValues.tiene_vencimiento ? (
                                    <div className="dc-input-group" style={{ flex: '1 1 100%' }}>
                                        <label>Fecha de vencimiento</label>
                                        <input
                                            type="date"
                                            value={formValues.fecha_vencimiento}
                                            onChange={(e) => setFormValues(prev => ({
                                                ...prev,
                                                fecha_vencimiento: e.target.value
                                            }))}
                                        />
                                    </div>
                                ) : (
                                    <div className="dc-input-group" style={{ flex: '1 1 100%' }}>
                                        <label>Días de vida útil</label>
                                        <input
                                            type="number"
                                            value={formValues.dias_vida_util}
                                            onChange={(e) => setFormValues(prev => ({
                                                ...prev,
                                                dias_vida_util: e.target.value
                                            }))}
                                            placeholder="Ej: 30"
                                            min="1"
                                        />
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </Modal>

                <Modal
                    isOpen={!!modalContent}
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