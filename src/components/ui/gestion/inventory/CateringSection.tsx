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
import * as XLSX from 'xlsx';

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

const getTodayLocal = (): string => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

const sumarDiasAFecha = (fechaStr: string, dias: number): string => {
    const partes = fechaStr.split('-');
    const año = parseInt(partes[0]);
    const mes = parseInt(partes[1]) - 1;
    const dia = parseInt(partes[2]);
    const fecha = new Date(año, mes, dia);
    fecha.setDate(fecha.getDate() + dias);
    const y = fecha.getFullYear();
    const m = String(fecha.getMonth() + 1).padStart(2, '0');
    const d = String(fecha.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

const getDiasRestantes = (fechaVencimiento: string): number => {
    const hoyStr = getTodayLocal();
    const venc = new Date(fechaVencimiento);
    const vencStr = venc.toISOString().split('T')[0];
    const diff = Math.ceil((new Date(vencStr).getTime() - new Date(hoyStr).getTime()) / (1000 * 60 * 60 * 24));
    return diff;
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

const parseExcelDate = (value: any): string | undefined => {
    if (!value) return undefined;

    if (typeof value === 'number' && value > 0 && value < 50000) {
        const excelEpoch = new Date(1899, 11, 30);
        const date = new Date(excelEpoch.getTime() + value * 86400000);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    if (typeof value === 'string') {
        if (value.includes('/')) {
            const partes = value.split('/');
            if (partes.length === 3 && partes[2].length === 4) {
                return `${partes[2]}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`;
            }
        }

        if (value.includes('-') && value.length === 10) {
            return value;
        }

        const date = new Date(value);
        if (!isNaN(date.getTime())) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }
    }

    return undefined;
};

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

    const [bulkModalOpen, setBulkModalOpen] = useState(false);
    const [bulkTipo, setBulkTipo] = useState<'materia prima' | 'utensilio'>('materia prima');
    const [bulkUnidadMedida, setBulkUnidadMedida] = useState('unidad');
    const [bulkProveedor, setBulkProveedor] = useState<string>('');
    const [bulkRows, setBulkRows] = useState<Array<{
        id: string;
        nombre: string;
        stock: string;
        precio_compra: string;
        fecha_vencimiento: string;
        tipo?: 'materia prima' | 'utensilio';
        id_proveedor?: string;
        unidad_medida?: string;
        dias_vida_util: string;
    }>>([{ id: crypto.randomUUID(), nombre: '', stock: '', precio_compra: '', fecha_vencimiento: '', dias_vida_util: '' }]);
    const [bulkSubmitting, setBulkSubmitting] = useState(false);

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

    const getFechaVencimientoMasProxima = (item: CateringItem): string | null => {
        if (item.tipo === 'utensilio') return null;
        if (!item.lotes || item.lotes.length === 0) return null;

        const fechasValidas = item.lotes
            .filter(l => l.descartado !== true && l.descartado !== 1)
            .map(l => l.fechaVencimiento)
            .filter(f => f !== null && f !== undefined) as string[];

        if (fechasValidas.length === 0) return null;

        return fechasValidas.sort()[0];
    };

    const columns: Column<CateringItem>[] = [
        { key: 'nombre', header: 'Nombre', render: (item) => <strong>{item.nombre}</strong> },
        {
            key: 'stock', header: 'Stock', render: (item) => {
                if (item.tipo === 'utensilio') return item.stock;
                const total = item.lotes?.filter(l => l.descartado !== true && l.descartado !== 1).reduce((s, l) => s + l.stock, 0) || 0;
                return total;
            }
        },
        { key: 'tipo', header: 'Tipo', render: (item) => <span className="dc-badge">{item.tipo}</span> },
        {
            key: 'lotes',
            header: 'Lotes (stock por vencimiento)',
            render: (item) => {
                if (item.tipo === 'utensilio') return <span style={{ color: '#888' }}>Sin lotes</span>;
                if (!item.lotes || item.lotes.length === 0) return <span style={{ color: '#888' }}>Sin lotes</span>;

                return (
                    <>
                        {item.lotes.map((l, idx) => {
                            const esDescartado = l.descartado === true || l.descartado === 1;
                            const diasRestantes = getDiasRestantes(l.fechaVencimiento as string);
                            const estado = esDescartado ? 'DESCARTADO' : (diasRestantes < 0 ? 'VENCIDO' : (diasRestantes <= 2 ? '¡PRÓXIMO!' : 'Vigente'));
                            const badgeColor = esDescartado ? '#888' : (diasRestantes < 0 ? '#d32f2f' : (diasRestantes <= 2 ? '#ff9800' : '#4caf50'));
                            return (
                                <div key={idx} style={{ fontSize: '0.7rem', margin: '3px 0' }}>
                                    <span className="dc-badge" style={{
                                        background: badgeColor,
                                        color: '#221c1e',
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
        }
    ];

    const getUnidadesOptions = (tipo: string) => {
        if (tipo === 'materia prima') {
            return UNIDADES_MATERIA_PRIMA;
        } else if (tipo === 'utensilio') {
            return UNIDADES_UTENSILIO;
        }
        return [];
    };

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

            if (formValues.tipo === 'materia prima') {
                let fechaVencLote = null;
                if (formValues.tiene_vencimiento && formValues.fecha_vencimiento) {
                    fechaVencLote = formValues.fecha_vencimiento;
                } else if (formValues.dias_vida_util) {
                    const hoy = new Date().toISOString().split('T')[0];
                    fechaVencLote = sumarDiasAFecha(hoy, parseInt(formValues.dias_vida_util));
                }

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

    const handleAddBulkRow = () => {
        setBulkRows(prev => [...prev, {
            id: crypto.randomUUID(),
            nombre: '',
            stock: '',
            precio_compra: '',
            fecha_vencimiento: '',
            dias_vida_util: '',
            tipo: undefined,
            id_proveedor: undefined,
            unidad_medida: undefined
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

                    const firstRow = jsonData[0] as any;
                    const hasFechaVencimiento = 'fecha_vencimiento' in firstRow || 'fechaVencimiento' in firstRow;
                    const hasDiasVidaUtil = 'dias_vida_util' in firstRow || 'diasVidaUtil' in firstRow;
                    const tipoDetectado = (hasFechaVencimiento || hasDiasVidaUtil) ? 'materia prima' : 'utensilio';

                    const items = jsonData.map((row: any) => ({
                        nombre: row['nombre'] || row['Nombre'] || '',
                        stock: parseInt(row['stock'] || row['Stock'] || 0, 10),
                        precio_compra: parseFloat(row['precio_compra'] || row['Precio compra'] || row['precio'] || 0),
                        fecha_vencimiento: parseExcelDate(row['fecha_vencimiento'] || row['fechaVencimiento'] || row['Fecha vencimiento']),
                        dias_vida_util: parseInt(row['dias_vida_util'] || row['diasVidaUtil'] || row['Días vida útil'] || 0, 10) || undefined,
                        id_proveedor: (() => {
                            const ruc = row['id_proveedor'] || row['ruc_proveedor'] || row['RUC'] || row['Proveedor RUC'] || '';
                            if (!ruc) return undefined;
                            const rucStr = ruc.toString().trim();
                            const proveedor = proveedores.find(p => p.numero_documento === rucStr && p.tipo_documento === 'RUC');
                            return proveedor ? proveedor.id_persona : undefined;
                        })(),
                        unidad_medida: row['unidad_medida'] || row['unidadMedida'] || row['Unidad'] || 'unidad'
                    }));

                    const invalidRows = items.filter(item => !item.nombre || !item.stock);
                    if (invalidRows.length > 0) {
                        showToast(`Hay ${invalidRows.length} filas sin nombre o stock`, 'warning', '');
                        return;
                    }

                    if (tipoDetectado === 'materia prima') {
                        const rowsWithoutExpiry = items.filter(item => !item.fecha_vencimiento && !item.dias_vida_util);
                        if (rowsWithoutExpiry.length > 0) {
                            showToast(`Hay ${rowsWithoutExpiry.length} filas de materia prima sin fecha_vencimiento o dias_vida_util`, 'warning', '');
                            return;
                        }
                    }

                    const proveedoresSet = new Set(items.map(item => item.id_proveedor));
                    const allSameProveedor = proveedoresSet.size === 1;
                    const proveedorUnico = allSameProveedor ? items[0].id_proveedor : null;

                    if (allSameProveedor) {
                        const bulkPayload = {
                            items: items.map(item => ({
                                nombre: item.nombre,
                                stock: item.stock,
                                precio_compra: item.precio_compra || undefined,
                                fecha_vencimiento: item.fecha_vencimiento || undefined,
                                dias_vida_util: item.dias_vida_util || undefined
                            })),
                            tipo: tipoDetectado as 'materia prima' | 'utensilio',
                            id_proveedor: proveedorUnico || null,
                            usuario_id: userId,
                            id_empresa: empresaId,
                            unidad_medida: items[0].unidad_medida || 'unidad'
                        };

                        const result = await cateringItemApi.createBulk(bulkPayload);

                        if (tipoDetectado === 'materia prima' && result.success.length > 0) {
                            for (const item of result.success) {
                                const originalRow = items.find(row => row.nombre.trim() === item.nombre);
                                if (!originalRow) continue;

                                let fechaVencLote = null;
                                let diasVidaUtilLote = null;

                                if (originalRow.fecha_vencimiento) {
                                    fechaVencLote = originalRow.fecha_vencimiento;
                                } else if (originalRow.dias_vida_util) {
                                    const dias = originalRow.dias_vida_util;
                                    diasVidaUtilLote = dias;
                                    const hoy = new Date().toISOString().split('T')[0];
                                    fechaVencLote = sumarDiasAFecha(hoy, dias);
                                }

                                if (fechaVencLote) {
                                    await cateringLoteApi.create({
                                        id_item: item.id,
                                        stock: originalRow.stock,
                                        fechaVencimiento: fechaVencLote,
                                        diasVidaUtil: diasVidaUtilLote,
                                        fechaRegistro: new Date().toISOString().split('T')[0],
                                        usuario_id: userId,
                                        id_empresa: empresaId
                                    });
                                }
                            }
                            await cargarDatos(empresaId);
                        }

                        if (result.successCount > 0) {
                            showToast(`${result.successCount} registros creados exitosamente`, 'success', 'Carga completada');
                        }
                        if (result.errorCount > 0) {
                            const errorMessages = result.errors.map(e => `Fila ${e.index + 1}: ${e.message}`).join('\n');
                            showToast(`Fallaron ${result.errorCount} registros. Ver detalles en consola.`, 'error', 'Errores');
                            console.error('Errores:', result.errors);
                        }
                        await addActivity('INSERT', 'catering', `Carga Excel: ${result.successCount} ${tipoDetectado}(s) registrados`);

                    } else {
                        let successCount = 0;
                        let errorCount = 0;
                        const errorsList: string[] = [];

                        for (let i = 0; i < items.length; i++) {
                            const row = items[i];
                            try {
                                const tipoFila = (row as any).tipo || tipoDetectado;
                                const proveedorFila = row.id_proveedor || null;
                                const unidadFila = row.unidad_medida || 'unidad';

                                const itemPayload = {
                                    nombre: row.nombre,
                                    stock: row.stock,
                                    tipo: tipoFila,
                                    usuario_id: userId,
                                    id_empresa: empresaId,
                                    unidad_medida: unidadFila,
                                    tiene_vencimiento: row.fecha_vencimiento ? true : false,
                                    fecha_vencimiento: row.fecha_vencimiento || null,
                                    dias_vida_util: row.dias_vida_util || null,
                                    precio_compra: row.precio_compra || null,
                                    id_proveedor: proveedorFila
                                };

                                const newItem = await cateringItemApi.create(itemPayload as any);

                                if (tipoFila === 'materia prima') {
                                    let fechaVencLote = null;
                                    let diasVidaUtilLote = null;
                                    if (row.fecha_vencimiento) {
                                        fechaVencLote = row.fecha_vencimiento;
                                    } else if (row.dias_vida_util) {
                                        const dias = row.dias_vida_util;
                                        diasVidaUtilLote = dias;
                                        const hoy = new Date().toISOString().split('T')[0];
                                        fechaVencLote = sumarDiasAFecha(hoy, dias);
                                    }
                                    if (fechaVencLote) {
                                        await cateringLoteApi.create({
                                            id_item: newItem.id,
                                            stock: row.stock,
                                            fechaVencimiento: fechaVencLote,
                                            diasVidaUtil: diasVidaUtilLote,
                                            fechaRegistro: new Date().toISOString().split('T')[0],
                                            usuario_id: userId,
                                            id_empresa: empresaId
                                        });
                                    }
                                }

                                successCount++;
                            } catch (err) {
                                const msg = err instanceof Error ? err.message : String(err);
                                errorsList.push(`Fila ${i + 1}: ${msg}`);
                                errorCount++;
                            }
                        }

                        if (successCount > 0) {
                            await cargarDatos(empresaId);
                        }

                        if (successCount > 0) {
                            showToast(`${successCount} registros creados exitosamente`, 'success', 'Carga completada');
                        }
                        if (errorCount > 0) {
                            showToast(`Fallaron ${errorCount} registros. Revisa la consola.`, 'error', 'Errores');
                            console.error('Errores:', errorsList);
                        }
                        await addActivity('INSERT', 'catering', `Carga Excel: ${successCount} registros creados`);
                    }

                    setBulkModalOpen(false);
                    e.target.value = '';

                } catch (error) {
                    console.error('[CateringSection] Error al leer Excel:', error);
                    showToast('Error al leer el archivo Excel', 'error', '');
                } finally {
                    setBulkSubmitting(false);
                }
            };
            reader.readAsArrayBuffer(file);
        } catch (error) {
            console.error('[CateringSection] Error al procesar Excel:', error);
            showToast('Error al procesar el archivo', 'error', '');
            setBulkSubmitting(false);
        }
    };

    const handleBulkAdd = async () => {
        const invalidRows = bulkRows.filter(row => !row.nombre.trim() || !row.stock.trim());
        if (invalidRows.length > 0) {
            showToast('Todos los registros deben tener nombre y stock', 'warning', 'Campos incompletos');
            return;
        }

        const userId = user?.id;
        const empresaId = getSelectedCompanyId();
        if (!userId || !empresaId) {
            showToast('No se pudo identificar al usuario o empresa', 'error', 'Error de autenticación');
            return;
        }

        const rowsWithMP = bulkRows.filter(row => {
            const tipoRow = row.tipo || bulkTipo;
            return tipoRow === 'materia prima';
        });
        if (rowsWithMP.length > 0) {
            const rowsWithoutExpiry = rowsWithMP.filter(row => !row.fecha_vencimiento && !row.dias_vida_util);
            if (rowsWithoutExpiry.length > 0) {
                showToast('Para materia prima, cada fila debe tener fecha de vencimiento o días de vida útil', 'warning', 'Campos incompletos');
                return;
            }
        }

        const tipos = bulkRows.map(row => (row.tipo || bulkTipo) as 'materia prima' | 'utensilio');
        const proveedores = bulkRows.map(row => row.id_proveedor || bulkProveedor);
        const allSameTipo = new Set(tipos).size === 1;
        const allSameProveedor = new Set(proveedores).size === 1;

        setBulkSubmitting(true);
        let successCount = 0;
        let errorCount = 0;
        const errorsList: string[] = [];

        try {
            if (allSameTipo && allSameProveedor) {
                const tipoGlobal = tipos[0];
                const proveedorGlobal = proveedores[0];
                const unidadGlobal = bulkRows.every(row => !row.unidad_medida) ? bulkUnidadMedida : bulkUnidadMedida;

                const bulkItems = bulkRows.map(row => ({
                    nombre: row.nombre.trim(),
                    stock: parseInt(row.stock, 10) || 0,
                    precio_compra: row.precio_compra ? parseFloat(row.precio_compra) : undefined,
                    fecha_vencimiento: row.fecha_vencimiento || undefined,
                    dias_vida_util: row.dias_vida_util ? parseInt(row.dias_vida_util, 10) : undefined
                }));

                const bulkPayload = {
                    items: bulkItems,
                    tipo: tipoGlobal as 'materia prima' | 'utensilio',
                    id_proveedor: proveedorGlobal ? parseInt(proveedorGlobal, 10) : null,
                    usuario_id: userId,
                    id_empresa: empresaId,
                    unidad_medida: bulkUnidadMedida || 'unidad'
                };

                const result = await cateringItemApi.createBulk(bulkPayload);

                if (tipoGlobal === 'materia prima' && result.success.length > 0) {
                    for (const item of result.success) {
                        const originalRow = bulkRows.find(row => row.nombre.trim() === item.nombre);
                        if (!originalRow) continue;

                        let fechaVencLote = null;
                        let diasVidaUtilLote = null;
                        if (originalRow.fecha_vencimiento) {
                            fechaVencLote = originalRow.fecha_vencimiento;
                        } else if (originalRow.dias_vida_util) {
                            const dias = parseInt(originalRow.dias_vida_util, 10);
                            diasVidaUtilLote = dias;
                            const hoy = new Date().toISOString().split('T')[0];
                            fechaVencLote = sumarDiasAFecha(hoy, dias);
                        }

                        if (fechaVencLote) {
                            await cateringLoteApi.create({
                                id_item: item.id,
                                stock: parseInt(originalRow.stock, 10) || 0,
                                fechaVencimiento: fechaVencLote,
                                diasVidaUtil: diasVidaUtilLote,
                                fechaRegistro: new Date().toISOString().split('T')[0],
                                usuario_id: userId,
                                id_empresa: empresaId
                            });
                        }
                    }
                }

                await cargarDatos(empresaId);

                successCount = result.successCount;
                errorCount = result.errorCount;
                if (result.errors.length > 0) {
                    result.errors.forEach(e => errorsList.push(`Fila ${e.index + 1}: ${e.message}`));
                }
            } else {
                for (let i = 0; i < bulkRows.length; i++) {
                    const row = bulkRows[i];
                    try {
                        const tipoRow = row.tipo || bulkTipo;
                        const proveedorRow = row.id_proveedor || bulkProveedor;
                        const unidadRow = row.unidad_medida || bulkUnidadMedida || 'unidad';

                        if (tipoRow === 'materia prima') {
                            if (!row.fecha_vencimiento && !row.dias_vida_util) {
                                errorsList.push(`Fila ${i + 1}: materia prima requiere fecha_vencimiento o dias_vida_util`);
                                errorCount++;
                                continue;
                            }
                        }

                        const itemPayload = {
                            nombre: row.nombre.trim(),
                            stock: parseInt(row.stock, 10) || 0,
                            tipo: tipoRow,
                            usuario_id: userId,
                            id_empresa: empresaId,
                            unidad_medida: unidadRow,
                            tiene_vencimiento: row.fecha_vencimiento ? true : false,
                            fecha_vencimiento: row.fecha_vencimiento || null,
                            dias_vida_util: row.dias_vida_util ? parseInt(row.dias_vida_util, 10) : null,
                            precio_compra: row.precio_compra ? parseFloat(row.precio_compra) : null,
                            id_proveedor: proveedorRow ? parseInt(proveedorRow, 10) : null
                        };

                        const newItem = await cateringItemApi.create(itemPayload as any);

                        if (tipoRow === 'materia prima') {
                            let fechaVencLote = null;
                            let diasVidaUtilLote = null;
                            if (row.fecha_vencimiento) {
                                fechaVencLote = row.fecha_vencimiento;
                            } else if (row.dias_vida_util) {
                                const dias = parseInt(row.dias_vida_util, 10);
                                diasVidaUtilLote = dias;
                                const hoy = new Date().toISOString().split('T')[0];
                                fechaVencLote = sumarDiasAFecha(hoy, dias);
                            }
                            if (fechaVencLote) {
                                await cateringLoteApi.create({
                                    id_item: newItem.id,
                                    stock: parseInt(row.stock, 10) || 0,
                                    fechaVencimiento: fechaVencLote,
                                    diasVidaUtil: diasVidaUtilLote,
                                    fechaRegistro: new Date().toISOString().split('T')[0],
                                    usuario_id: userId,
                                    id_empresa: empresaId
                                });
                            }
                        }

                        successCount++;
                    } catch (err) {
                        const msg = err instanceof Error ? err.message : String(err);
                        errorsList.push(`Fila ${i + 1}: ${msg}`);
                        errorCount++;
                    }
                }
                if (successCount > 0) {
                    await cargarDatos(empresaId);
                }
            }

            if (successCount > 0) {
                showToast(`${successCount} registros creados exitosamente`, 'success', 'Carga completada');
            }
            if (errorCount > 0) {
                showToast(`Fallaron ${errorCount} registros. Revisa la consola.`, 'error', 'Errores');
                console.error('Errores en carga:', errorsList);
            }

            await addActivity('INSERT', 'catering', `Carga masiva: ${successCount} registros creados`);

            setBulkModalOpen(false);
            setBulkRows([{ id: crypto.randomUUID(), nombre: '', stock: '', precio_compra: '', fecha_vencimiento: '', dias_vida_util: '' }]);
            setBulkProveedor('');
            setBulkTipo('materia prima');
            setBulkUnidadMedida('unidad');

        } catch (error) {
            console.error('[CateringSection] Error en carga:', error);
            showToast('Error al procesar la carga', 'error', 'Error');
        } finally {
            setBulkSubmitting(false);
        }
    };

    const handleDescartarLote = (lote: CateringLote, item: CateringItem) => {
        if (lote.descartado === true || lote.descartado === 1) {
            showToast('Este lote ya fue descartado', 'info', 'Sin cambios');
            return;
        }

        setModalContent({
            title: `Descartar lote de "${item.nombre}"`,
            icon: 'fa-trash-alt',
            children: (
                <>
                    <div className="dc-warning-box">
                        <i className="fas fa-exclamation-triangle"></i>
                        <p><strong>¡Atención!</strong> Estás a punto de descartar un lote de "{item.nombre}"</p>
                    </div>
                    <div style={{ marginBottom: '1rem' }}>
                        <p><strong>Detalles del lote:</strong></p>
                        <ul style={{ listStyle: 'none', padding: 0 }}>
                            <li>📦 <strong>Stock:</strong> {lote.stock} unidades</li>
                            <li>📅 <strong>Vence:</strong> {formatearFecha(lote.fechaVencimiento as string)}</li>
                            <li>📋 <strong>Registro:</strong> {formatearFecha(lote.fechaRegistro)}</li>
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
                                await cateringLoteApi.descartar(lote.id, empresaId);
                                await cargarDatos(empresaId);
                                await addActivity('MODIFICAR', 'catering', `Lote descartado: "${item.nombre}" (${lote.stock} und)`);
                                await addToHistory(lote, item.nombre, 'DESCARTE', `Lote descartado - stock: ${lote.stock}`);
                                showToast(`Lote de "${item.nombre}" descartado correctamente`, 'success', 'Lote descartado');
                                setModalOpen(false);
                                setModalContent(null);
                            } catch (error) {
                                console.error('[CateringSection] Error al descartar lote:', error);
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

    const handleView = async (item: CateringItem) => {
        try {
            const historialItem = await historialApi.getByEntity('catering_items', item.id);

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
                : (item.lotes?.filter(l => l.descartado !== true && l.descartado !== 1).reduce((s, l) => s + l.stock, 0) || 0);

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
                                    const esDescartado = l.descartado === true || l.descartado === 1;
                                    const diasRestantes = getDiasRestantes(l.fechaVencimiento as string);
                                    const estado = esDescartado ? 'DESCARTADO' : (diasRestantes < 0 ? 'VENCIDO' : (diasRestantes <= 2 ? 'PRÓXIMO' : 'Vigente'));
                                    const badgeColor = esDescartado ? '#888' : (diasRestantes < 0 ? '#d32f2f' : (diasRestantes <= 2 ? '#ff9800' : '#003802'));
                                    return (
                                        <div key={idx} className="batch-group" style={{
                                            border: '1px solid #f0d6db',
                                            borderRadius: '1rem',
                                            marginBottom: '1rem',
                                            padding: '1rem',
                                        }}>
                                            <strong>Lote {idx + 1}</strong> | Vence: {formatearFecha(l.fechaVencimiento as string)}
                                            <span className="dc-badge" style={{
                                                background: badgeColor,
                                                color: '#1f1c1c',
                                                marginLeft: '0.5rem'
                                            }}>
                                                {estado} {!esDescartado && l.stock > 0 && `(${Math.abs(diasRestantes)} días ${diasRestantes < 0 ? 'vencidos' : 'restantes'})`}
                                            </span><br />
                                            📦 Stock: {l.stock}<br />
                                            📅 Registro: {formatearFecha(l.fechaRegistro)}
                                            {!esDescartado && l.stock > 0 && (
                                                <button
                                                    className="dc-btn danger"
                                                    style={{ marginTop: '0.5rem', padding: '0.2rem 0.8rem', fontSize: '0.7rem' }}
                                                    onClick={() => handleDescartarLote(l, item)}
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
                )
            });
            setModalOpen(true);
        } catch (error) {
            console.error('[CateringSection] Error cargando historial:', error);
            showToast('Error al cargar el historial', 'error', 'Error');
        }
    };

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

            let fechaVencimiento = null;
            if (fechaDirecta) {
                fechaVencimiento = fechaDirecta;
            } else if (diasN && diasN > 0) {
                const hoy = new Date().toISOString().split('T')[0];
                fechaVencimiento = sumarDiasAFecha(hoy, diasN);
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
                </>
            )
        });
        setModalOpen(true);
    };

    const handleEdit = (item: CateringItem) => {
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
                </>
            )
        });
        setModalOpen(true);
    };

    const cateringActivityLogs = activityLogs.filter(log => log.modulo === 'catering').slice(0, 6);

    return (
        <div data-tab="catering">
            <div>
                <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button className="dc-btn" onClick={() => setModalOpen(true)}>
                        <i className="fas fa-plus-circle"></i> Nuevo Insumo
                    </button>
                    <button className="dc-btn info" onClick={() => setBulkModalOpen(true)}>
                        <i className="fas fa-upload"></i> Carga Masiva
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
                            <button className="dc-btn success" onClick={handleAddItem} disabled={isSubmitting}>
                                {isSubmitting ? 'Registrando...' : <><i className="fas fa-save"></i> Registrar</>}
                            </button>
                        </div>
                    }
                >
                    <div className="dc-form-grid">
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

                        <div className="dc-input-group">
                            <label>Stock inicial *</label>
                            <input
                                type="number"
                                value={formValues.stock}
                                onChange={(e) => setFormValues(prev => ({ ...prev, stock: e.target.value }))}
                                min="0"
                            />
                        </div>

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
                    isOpen={bulkModalOpen}
                    onClose={() => {
                        setBulkModalOpen(false);
                        setBulkRows([{ id: crypto.randomUUID(), nombre: '', stock: '', precio_compra: '', fecha_vencimiento: '', dias_vida_util: '' }]);
                    }}
                    title="Carga Masiva de Insumos"
                    icon="fa-upload"
                    footer={
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', width: '100%' }}>
                            <button className="dc-btn success" onClick={handleBulkAdd} disabled={bulkSubmitting}>
                                {bulkSubmitting ? 'Registrando...' : <><i className="fas fa-save"></i> Registrar todos</>}
                            </button>
                        </div>
                    }
                >
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                        <div className="dc-input-group">
                            <label>Tipo *</label>
                            <select
                                value={bulkTipo}
                                onChange={(e) => setBulkTipo(e.target.value as 'materia prima' | 'utensilio')}
                            >
                                <option value="materia prima">Materia Prima</option>
                                <option value="utensilio">Utensilio</option>
                            </select>
                        </div>
                        <div className="dc-input-group">
                            <label>Unidad de medida</label>
                            <select
                                value={bulkUnidadMedida}
                                onChange={(e) => setBulkUnidadMedida(e.target.value)}
                            >
                                {getUnidadesOptions(bulkTipo).map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="dc-input-group">
                            <label>Proveedor</label>
                            <select
                                value={bulkProveedor}
                                onChange={(e) => setBulkProveedor(e.target.value)}
                            >
                                <option value="">Seleccione un proveedor</option>
                                {proveedores.map(p => (
                                    <option key={p.id_persona} value={p.id_persona}>
                                        {getNombrePersonaLocal(p)}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '0.5rem' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                            <thead style={{ background: '#f5f5f5', position: 'sticky', top: 0, zIndex: 1 }}>
                                <tr>
                                    <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Nombre *</th>
                                    <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Stock *</th>
                                    <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Precio compra</th>
                                    {bulkTipo === 'materia prima' && (
                                        <>
                                            <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Fecha Venc.</th>
                                            <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Días vida útil</th>
                                        </>
                                    )}
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
                                                value={row.precio_compra}
                                                onChange={(e) => handleBulkRowChange(row.id, 'precio_compra', e.target.value)}
                                                placeholder="0.00"
                                                style={{ width: '100%', padding: '0.3rem' }}
                                            />
                                        </td>
                                        {bulkTipo === 'materia prima' && (
                                            <>
                                                <td style={{ padding: '0.3rem' }}>
                                                    <input
                                                        type="date"
                                                        value={row.fecha_vencimiento}
                                                        onChange={(e) => handleBulkRowChange(row.id, 'fecha_vencimiento', e.target.value)}
                                                        style={{ width: '100%', padding: '0.3rem' }}
                                                    />
                                                </td>
                                                <td style={{ padding: '0.3rem' }}>
                                                    <input
                                                        type="number"
                                                        value={row.dias_vida_util}
                                                        onChange={(e) => handleBulkRowChange(row.id, 'dias_vida_util', e.target.value)}
                                                        placeholder="Días"
                                                        min="1"
                                                        style={{ width: '100%', padding: '0.3rem' }}
                                                    />
                                                </td>
                                            </>
                                        )}
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
        </div >
    );
};