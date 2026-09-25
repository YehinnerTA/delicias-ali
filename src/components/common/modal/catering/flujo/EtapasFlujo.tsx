import React, { useState, useEffect } from 'react';
import { EtapaEvento, cateringEventoApi, MetricasEvento } from '../../../../../services/api/cateringEventoApi';
import { VentaCatering } from '../../../../../features/types/catering';
import { cateringCalculoService, ProductoCalculado, IngredienteCalculado, MaterialCalculado } from '../../../../../services/api/calculo/CateringCalculoService';
import { useCompany } from '../../../../../features/company/context/CompanyContext';
import { useAuth } from '../../../../../features/auth/context/AuthContext';
import { InlineIncidenciaForm, InlineIncidenciaData } from './InlineIncidenciaForm';

interface EtapaProps {
    etapa: EtapaEvento;
    venta: VentaCatering | null;
    verificaciones: Record<string, boolean>;
    puedeActuar: boolean;
    onVerificar: (nombreItem: string, verificado: boolean) => void;
    onVerificarMultiple?: (nombresItems: string[], verificado: boolean) => Promise<void>;
    onConfirmar: (observaciones?: string) => void;
    onReportarIncidencia: () => void;
    isSubmitting: boolean;
}

const formatFecha = (isoString: string | null): string => {
    if (!isoString) return '—';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '—';
    const dia = String(date.getDate()).padStart(2, '0');
    const mes = String(date.getMonth() + 1).padStart(2, '0');
    const año = date.getFullYear();
    return `${dia}/${mes}/${año}`;
};

const formatHora = (isoString: string | null): string => {
    if (!isoString) return '—';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '—';
    const dia = String(date.getDate()).padStart(2, '0');
    const mes = String(date.getMonth() + 1).padStart(2, '0');
    const horas = String(date.getHours()).padStart(2, '0');
    const minutos = String(date.getMinutes()).padStart(2, '0');
    return `${dia}/${mes} ${horas}:${minutos}`;
};

const formatMinutos = (min: number | null): string => {
    if (min == null) return '—';
    const h = Math.floor(min / 60);
    const m = min % 60;
    if (h > 0) return `${h}h ${m}min`;
    return `${m} min`;
};

const formatearNombreEtapa = (etapa: string): string => {
    const nombres: Record<string, string> = {
        verificacion_almacen: 'Verificación almacén',
        preparacion_cocina: 'Preparación cocina',
        carga_transporte: 'Carga y transporte',
        montaje_evento: 'Montaje evento',
        recojo_evento: 'Recojo',
        retorno_empresa: 'Retorno',
        cierre: 'Cierre'
    };
    return nombres[etapa] || etapa.replace(/_/g, ' ');
};

const getIconoEtapa = (etapa: string): string => {
    const iconos: Record<string, string> = {
        verificacion_almacen: 'fa-boxes',
        preparacion_cocina: 'fa-utensils',
        carga_transporte: 'fa-truck-loading',
        montaje_evento: 'fa-glass-cheers',
        recojo_evento: 'fa-undo',
        retorno_empresa: 'fa-home',
        cierre: 'fa-check-double'
    };
    return iconos[etapa] || 'fa-circle';
};

// =====================================================
// 1. ALMACÉN
// =====================================================
export const EtapaAlmacen: React.FC<EtapaProps> = ({
    venta,
    verificaciones,
    puedeActuar,
    onVerificar,
    onVerificarMultiple,
    onConfirmar,
    onReportarIncidencia,
    isSubmitting
}) => {
    const { getSelectedCompanyId } = useCompany();
    const id_empresa = getSelectedCompanyId() ?? 0;

    const [obs, setObs] = useState('');
    const [ingredientes, setIngredientes] = useState<IngredienteCalculado[]>([]);
    const [materiales, setMateriales] = useState<MaterialCalculado[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [busqueda, setBusqueda] = useState('');
    const [filtroEstado, setFiltroEstado] = useState<'todos' | 'pendientes' | 'comprados'>('todos');

    useEffect(() => {
        (async () => {
            setIsLoading(true);
            try {
                const ings = await cateringCalculoService.calcularIngredientesPlanos(venta, id_empresa);
                const mats = cateringCalculoService.calcularMateriales(venta);
                setIngredientes(ings);
                setMateriales(mats);
            } finally {
                setIsLoading(false);
            }
        })();
    }, [venta, id_empresa]);

    const filtrarItems = <T extends { nombre: string }>(items: T[]): T[] => {
        return items.filter(item => {
            if (busqueda) {
                const q = busqueda.toLowerCase();
                if (!item.nombre.toLowerCase().includes(q)) return false;
            }
            const verificado = verificaciones[item.nombre] || false;
            if (filtroEstado === 'pendientes' && verificado) return false;
            if (filtroEstado === 'comprados' && !verificado) return false;
            return true;
        });
    };

    const ingredientesFiltrados = filtrarItems(ingredientes);
    const gruposIngredientes = new Map<string, IngredienteCalculado[]>();
    for (const ing of ingredientesFiltrados) {
        const cat = ing.categoria || 'Sin categoría';
        if (!gruposIngredientes.has(cat)) gruposIngredientes.set(cat, []);
        gruposIngredientes.get(cat)!.push(ing);
    }

    const materialesFiltrados = filtrarItems(materiales);

    const totalIngredientes = ingredientes.length;
    const totalMateriales = materiales.length;
    const totalItems = totalIngredientes + totalMateriales;

    const verificadosIngredientes = ingredientes.filter(i => verificaciones[i.nombre]).length;
    const verificadosMateriales = materiales.filter(m => verificaciones[m.nombre]).length;
    const totalVerificados = verificadosIngredientes + verificadosMateriales;

    const pendientes = totalItems - totalVerificados;
    const porcentaje = totalItems > 0 ? Math.round((totalVerificados / totalItems) * 100) : 0;

    const handleMarcarGrupo = (nombresItems: string[]) => {
        if (!onVerificarMultiple) return;
        const pendientesGrupo = nombresItems.filter(nombre => !verificaciones[nombre]);
        if (pendientesGrupo.length === 0) return;

        onVerificarMultiple(pendientesGrupo, true);
    };

    if (isLoading) {
        return (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
                <i className="fas fa-spinner fa-spin"></i> Calculando lista de compras...
            </div>
        );
    }

    return (
        <>
            <div className="dc-etapa-header">
                <div className="dc-etapa-title">
                    <i className="fas fa-boxes"></i> Verificación de Almacén
                </div>
                <span className="dc-estado-badge compra_pendiente">
                    {totalVerificados}/{totalItems} comprados
                </span>
            </div>

            <div className="dc-etapa-body">
                <div className="dc-almacen-resumen">
                    <div className="dc-almacen-resumen-item">
                        <i className="fas fa-clipboard-list"></i>
                        <div>
                            <div className="dc-almacen-resumen-valor">{totalItems}</div>
                            <div className="dc-almacen-resumen-label">Total</div>
                        </div>
                    </div>
                    <div className="dc-almacen-resumen-item success">
                        <i className="fas fa-check-circle"></i>
                        <div>
                            <div className="dc-almacen-resumen-valor">{totalVerificados}</div>
                            <div className="dc-almacen-resumen-label">Comprados</div>
                        </div>
                    </div>
                    <div className="dc-almacen-resumen-item warning">
                        <i className="fas fa-hourglass-half"></i>
                        <div>
                            <div className="dc-almacen-resumen-valor">{pendientes}</div>
                            <div className="dc-almacen-resumen-label">Pendientes</div>
                        </div>
                    </div>
                </div>

                <div className="dc-almacen-progreso">
                    <div
                        className="dc-almacen-progreso-barra"
                        style={{ width: `${porcentaje}%` }}
                    />
                    <span className="dc-almacen-progreso-texto">{porcentaje}%</span>
                </div>

                <div className="dc-almacen-filtros">
                    <div className="dc-almacen-filtro-buscar">
                        <i className="fas fa-search"></i>
                        <input
                            type="text"
                            placeholder="Buscar ingrediente o material..."
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                        />
                        {busqueda && (
                            <button
                                className="dc-almacen-filtro-limpiar"
                                onClick={() => setBusqueda('')}
                            >
                                <i className="fas fa-times"></i>
                            </button>
                        )}
                    </div>
                    <select
                        className="dc-almacen-filtro-estado"
                        value={filtroEstado}
                        onChange={(e) => setFiltroEstado(e.target.value as any)}
                    >
                        <option value="todos">Todos ({totalItems})</option>
                        <option value="pendientes">Pendientes ({pendientes})</option>
                        <option value="comprados">Comprados ({totalVerificados})</option>
                    </select>
                </div>

                {(gruposIngredientes.size === 0 && materialesFiltrados.length === 0) && (
                    <div className="dc-almacen-vacio">
                        <i className="fas fa-search"></i>
                        <p>No hay items que coincidan con los filtros</p>
                    </div>
                )}

                {Array.from(gruposIngredientes.entries()).map(([categoria, items]) => {
                    const nombresGrupo = items.map(i => i.nombre);
                    const verificadosGrupo = items.filter(i => verificaciones[i.nombre]).length;
                    const hayPendientes = verificadosGrupo < items.length;

                    return (
                        <div key={categoria} className="dc-almacen-grupo">
                            <div className="dc-almacen-grupo-header">
                                <div className="dc-almacen-grupo-titulo">
                                    <i className="fas fa-tag"></i>
                                    <span>{categoria}</span>
                                    <span className="dc-almacen-grupo-contador">
                                        {verificadosGrupo}/{items.length}
                                    </span>
                                </div>
                                {puedeActuar && hayPendientes && onVerificarMultiple && (
                                    <button
                                        className="dc-almacen-grupo-btn-marcar"
                                        onClick={() => handleMarcarGrupo(nombresGrupo)}
                                        title="Marcar todos los pendientes de esta categoría como comprados"
                                    >
                                        <i className="fas fa-check-double"></i> Marcar todos
                                    </button>
                                )}
                            </div>
                            <div className="dc-almacen-grupo-body">
                                {items.map((ing, idx) => {
                                    const verificado = verificaciones[ing.nombre] || false;
                                    const sinProveedor = ing.proveedores.length === 0;
                                    return (
                                        <div
                                            key={`ing-${categoria}-${idx}`}
                                            className={`dc-checklist-item ${verificado ? 'verificado' : ''} ${sinProveedor ? 'sin-proveedor' : ''}`}
                                        >
                                            <div className="dc-checklist-item-header">
                                                <div className="dc-checklist-item-left">
                                                    <input
                                                        type="checkbox"
                                                        className="dc-checklist-item-checkbox"
                                                        checked={verificado}
                                                        onChange={() => onVerificar(ing.nombre, !verificado)}
                                                        disabled={!puedeActuar || verificado}
                                                    />
                                                    <div className="dc-checklist-item-info">
                                                        <div className="dc-checklist-item-nombre">
                                                            {ing.nombre}
                                                            {ing.es_opcional && (
                                                                <span className="dc-almacen-badge-opcional">opcional</span>
                                                            )}
                                                        </div>
                                                        {sinProveedor && (
                                                            <div className="dc-almacen-alerta-sin-proveedor">
                                                                <i className="fas fa-exclamation-triangle"></i>
                                                                Sin proveedor asignado
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="dc-checklist-item-cantidad">
                                                    <strong>{ing.cantidad.toFixed(2)}</strong> {ing.unidad}
                                                </div>
                                            </div>

                                            {!sinProveedor && (
                                                <div className="dc-checklist-item-proveedores">
                                                    {ing.proveedores.map((prov, i) => (
                                                        <React.Fragment key={i}>
                                                            {prov.telefono && (
                                                                <a
                                                                    href={`tel:${prov.telefono}`}
                                                                    className="dc-checklist-btn-proveedor dc-btn-llamar"
                                                                >
                                                                    <i className="fas fa-phone"></i> {prov.nombre}
                                                                </a>
                                                            )}
                                                            <button
                                                                className="dc-checklist-btn-proveedor"
                                                                onClick={() => {
                                                                    const msg = `Hola, necesito cotizar ${ing.cantidad.toFixed(2)} ${ing.unidad} de ${ing.nombre} para Delicias Catering.`;
                                                                    window.open(`https://wa.me/${prov.telefono}?text=${encodeURIComponent(msg)}`, '_blank');
                                                                }}
                                                            >
                                                                <i className="fab fa-whatsapp"></i> WhatsApp
                                                            </button>
                                                        </React.Fragment>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}

                {materialesFiltrados.length > 0 && (
                    <div className="dc-almacen-grupo">
                        <div className="dc-almacen-grupo-header">
                            <div className="dc-almacen-grupo-titulo">
                                <i className="fas fa-chair"></i>
                                <span>Materiales</span>
                                <span className="dc-almacen-grupo-contador">
                                    {materialesFiltrados.filter(m => verificaciones[m.nombre]).length}/{materialesFiltrados.length}
                                </span>
                            </div>
                            {puedeActuar && materialesFiltrados.some(m => !verificaciones[m.nombre]) && onVerificarMultiple && (
                                <button
                                    className="dc-almacen-grupo-btn-marcar"
                                    onClick={() => handleMarcarGrupo(materialesFiltrados.map(m => m.nombre))}
                                    title="Marcar todos los pendientes de materiales como comprados"
                                >
                                    <i className="fas fa-check-double"></i> Marcar todos
                                </button>
                            )}
                        </div>
                        <div className="dc-almacen-grupo-body">
                            {materialesFiltrados.map((mat, idx) => {
                                const verificado = verificaciones[mat.nombre] || false;
                                return (
                                    <div
                                        key={`mat-${idx}`}
                                        className={`dc-checklist-item ${verificado ? 'verificado' : ''}`}
                                    >
                                        <div className="dc-checklist-item-header">
                                            <div className="dc-checklist-item-left">
                                                <input
                                                    type="checkbox"
                                                    className="dc-checklist-item-checkbox"
                                                    checked={verificado}
                                                    onChange={() => onVerificar(mat.nombre, !verificado)}
                                                    disabled={!puedeActuar || verificado}
                                                />
                                                <div className="dc-checklist-item-info">
                                                    <div className="dc-checklist-item-nombre">{mat.nombre}</div>
                                                </div>
                                            </div>
                                            <div className="dc-checklist-item-cantidad">
                                                <strong>{mat.cantidad}</strong> und
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {puedeActuar && (
                    <div className="dc-input-group" style={{ marginTop: '1rem' }}>
                        <label>Observaciones (opcional)</label>
                        <textarea
                            value={obs}
                            onChange={(e) => setObs(e.target.value)}
                            rows={2}
                            placeholder="Notas sobre la compra..."
                            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
                        />
                    </div>
                )}
            </div>

            <div className="dc-etapa-footer">
                <button
                    className="dc-btn-incidencia"
                    onClick={onReportarIncidencia}
                    disabled={!puedeActuar}
                >
                    <i className="fas fa-exclamation-triangle"></i> Reportar Incidencia
                </button>
                <button
                    className="dc-btn-confirmar"
                    onClick={() => onConfirmar(obs)}
                    disabled={isSubmitting || totalVerificados < totalItems || !puedeActuar}
                >
                    {isSubmitting ? (
                        <><i className="fas fa-spinner fa-spin"></i> Confirmando...</>
                    ) : (
                        <><i className="fas fa-paper-plane"></i> Enviar a Cocina ({totalVerificados}/{totalItems})</>
                    )}
                </button>
            </div>
        </>
    );
};

// =====================================================
// 2. COCINA
// =====================================================
export const EtapaCocina: React.FC<EtapaProps> = ({
    etapa,
    venta,
    verificaciones,
    puedeActuar,
    onVerificar,
    onConfirmar,
    onReportarIncidencia,
    isSubmitting
}) => {
    const { getSelectedCompanyId } = useCompany();
    const { user } = useAuth();
    const id_empresa = getSelectedCompanyId() ?? 0;

    const [obs, setObs] = useState('');
    const [productos, setProductos] = useState<ProductoCalculado[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [preparaciones, setPreparaciones] = useState<Record<string, any>>({});
    const [itemActual, setItemActual] = useState<string | null>(null);
    const [tiempoActual, setTiempoActual] = useState(0);

    const autoIniciadoRef = React.useRef(false);

    useEffect(() => {
        if (autoIniciadoRef.current) return;

        (async () => {
            setIsLoading(true);
            try {
                const prods = await cateringCalculoService.calcularProductos(venta, id_empresa);
                setProductos(prods);

                const preps = await cateringEventoApi.getPreparaciones(etapa.id_evento, id_empresa);
                const mapa: Record<string, any> = {};
                for (const p of preps) mapa[p.item] = p;
                setPreparaciones(mapa);

                const enProgreso = prods.find(p => {
                    const key = `${p.nombre} x${p.cantidad}`;
                    return mapa[key]?.estado === 'en_progreso';
                });
                const primeroPendiente = prods.find(p => {
                    const key = `${p.nombre} x${p.cantidad}`;
                    return !mapa[key] || mapa[key].estado !== 'completado';
                });

                const itemInicial = enProgreso
                    ? `${enProgreso.nombre} x${enProgreso.cantidad}`
                    : primeroPendiente
                        ? `${primeroPendiente.nombre} x${primeroPendiente.cantidad}`
                        : null;

                setItemActual(itemInicial);

                if (itemInicial && puedeActuar && !mapa[itemInicial]) {
                    autoIniciadoRef.current = true;

                    await cateringEventoApi.iniciarPreparacion(
                        etapa.id_evento, itemInicial, id_empresa, user?.id || 0
                    );
                    const preps2 = await cateringEventoApi.getPreparaciones(etapa.id_evento, id_empresa);
                    const mapa2: Record<string, any> = {};
                    for (const p of preps2) mapa2[p.item] = p;
                    setPreparaciones(mapa2);
                } else {
                    autoIniciadoRef.current = true;
                }
            } finally {
                setIsLoading(false);
            }
        })();
    }, [venta, id_empresa, etapa.id_evento]);

    useEffect(() => {
        if (!itemActual) return;
        const prep = preparaciones[itemActual];
        if (!prep || prep.estado !== 'en_progreso' || !prep.hora_inicio) {
            setTiempoActual(0);
            return;
        }

        const calcular = () => {
            const inicio = new Date(prep.hora_inicio).getTime();
            setTiempoActual(Math.floor((Date.now() - inicio) / 1000));
        };
        calcular();
        const interval = setInterval(calcular, 1000);
        return () => clearInterval(interval);
    }, [itemActual, preparaciones]);

    const recargarPreparaciones = async () => {
        const preps = await cateringEventoApi.getPreparaciones(etapa.id_evento, id_empresa);
        const mapa: Record<string, any> = {};
        for (const p of preps) mapa[p.item] = p;
        setPreparaciones(mapa);
        return mapa;
    };

    const handleCambiarReceta = async (nuevoItem: string) => {
        if (!puedeActuar) return;
        if (itemActual === nuevoItem) return;

        try {
            if (itemActual) {
                const prepActual = preparaciones[itemActual];
                if (prepActual && prepActual.estado === 'en_progreso') {
                    await cateringEventoApi.pausarPreparacion(
                        etapa.id_evento, itemActual, id_empresa
                    );
                }
            }

            setItemActual(nuevoItem);

            const prepNueva = preparaciones[nuevoItem];
            if (!prepNueva) {
                await cateringEventoApi.iniciarPreparacion(
                    etapa.id_evento, nuevoItem, id_empresa, user?.id || 0
                );
            } else if (prepNueva.estado === 'pausado') {
                await cateringEventoApi.iniciarPreparacion(
                    etapa.id_evento, nuevoItem, id_empresa, user?.id || 0
                );
            }

            await recargarPreparaciones();
        } catch (error: any) {
            console.error('[EtapaCocina] Error al cambiar receta:', error);
        }
    };

    const handlePausar = async () => {
        if (!puedeActuar || !itemActual) return;
        try {
            await cateringEventoApi.pausarPreparacion(etapa.id_evento, itemActual, id_empresa);
            await recargarPreparaciones();
        } catch (error: any) {
            console.error('[EtapaCocina] Error al pausar:', error);
        }
    };

    const handleFinalizar = async () => {
        if (!puedeActuar || !itemActual) return;
        try {
            await cateringEventoApi.finalizarPreparacion(
                etapa.id_evento, itemActual, id_empresa, user?.id || 0, obs || undefined
            );
            await onVerificar(itemActual, true);

            const mapa = await recargarPreparaciones();

            const siguiente = productos.find(p => {
                const key = `${p.nombre} x${p.cantidad}`;
                return !mapa[key] || mapa[key].estado !== 'completado';
            });

            if (siguiente) {
                const sigItem = `${siguiente.nombre} x${siguiente.cantidad}`;
                setItemActual(sigItem);
                if (!mapa[sigItem]) {
                    await cateringEventoApi.iniciarPreparacion(
                        etapa.id_evento, sigItem, id_empresa, user?.id || 0
                    );
                    await recargarPreparaciones();
                } else if (mapa[sigItem].estado === 'pausado') {
                    await cateringEventoApi.iniciarPreparacion(
                        etapa.id_evento, sigItem, id_empresa, user?.id || 0
                    );
                    await recargarPreparaciones();
                }
            } else {
                setItemActual(null);
            }
            setObs('');
        } catch (error: any) {
            console.error('[EtapaCocina] Error al finalizar:', error);
        }
    };

    const totalProductos = productos.length;
    const completados = productos.filter(p => {
        const key = `${p.nombre} x${p.cantidad}`;
        return preparaciones[key]?.estado === 'completado' || verificaciones[key];
    }).length;
    const pendientes = totalProductos - completados;
    const porcentaje = totalProductos > 0 ? Math.round((completados / totalProductos) * 100) : 0;

    const formatTiempo = (seg: number): string => {
        const h = Math.floor(seg / 3600);
        const m = Math.floor((seg % 3600) / 60);
        const s = seg % 60;
        if (h > 0) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    if (isLoading) {
        return (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
                <i className="fas fa-spinner fa-spin"></i> Calculando recetas...
            </div>
        );
    }

    if (productos.length === 0) {
        return (
            <>
                <div className="dc-etapa-header">
                    <div className="dc-etapa-title"><i className="fas fa-utensils"></i> Preparación en Cocina</div>
                    <span className="dc-estado-badge en_preparacion">0/0 preparados</span>
                </div>
                <div className="dc-etapa-body">
                    <p style={{ textAlign: 'center', color: '#999', padding: '2rem' }}>No hay productos para preparar</p>
                </div>
                <div className="dc-etapa-footer">
                    <button className="dc-btn-incidencia" onClick={onReportarIncidencia} disabled={!puedeActuar}>
                        <i className="fas fa-exclamation-triangle"></i> Reportar Incidencia
                    </button>
                    <button className="dc-btn-confirmar" onClick={() => onConfirmar(obs)} disabled={isSubmitting || !puedeActuar}>
                        {isSubmitting ? <><i className="fas fa-spinner fa-spin"></i> Confirmando...</> : <><i className="fas fa-paper-plane"></i> Enviar a Despacho</>}
                    </button>
                </div>
            </>
        );
    }

    const productoActual = productos.find(p => `${p.nombre} x${p.cantidad}` === itemActual);

    return (
        <>
            <div className="dc-etapa-header">
                <div className="dc-etapa-title"><i className="fas fa-utensils"></i> Preparación en Cocina</div>
                <span className="dc-estado-badge en_preparacion">{completados}/{totalProductos} preparados</span>
            </div>

            <div className="dc-etapa-body">
                <div className="dc-cocina-resumen">
                    <div className="dc-cocina-resumen-item">
                        <i className="fas fa-utensils"></i>
                        <div>
                            <div className="dc-cocina-resumen-valor">{totalProductos}</div>
                            <div className="dc-cocina-resumen-label">Productos</div>
                        </div>
                    </div>
                    <div className="dc-cocina-resumen-item success">
                        <i className="fas fa-check-circle"></i>
                        <div>
                            <div className="dc-cocina-resumen-valor">{completados}</div>
                            <div className="dc-cocina-resumen-label">Preparados</div>
                        </div>
                    </div>
                    <div className="dc-cocina-resumen-item warning">
                        <i className="fas fa-hourglass-half"></i>
                        <div>
                            <div className="dc-cocina-resumen-valor">{pendientes}</div>
                            <div className="dc-cocina-resumen-label">Pendientes</div>
                        </div>
                    </div>
                </div>

                <div className="dc-cocina-progreso">
                    <div className="dc-cocina-progreso-barra" style={{ width: `${porcentaje}%` }} />
                    <span className="dc-cocina-progreso-texto">{porcentaje}%</span>
                </div>

                <div className="dc-cocina-lista">
                    <div className="dc-cocina-lista-titulo">
                        <i className="fas fa-list-ol"></i> Progreso de recetas
                    </div>
                    {productos.map((prod, idx) => {
                        const key = `${prod.nombre} x${prod.cantidad}`;
                        const prep = preparaciones[key];
                        const estaCompletado = prep?.estado === 'completado' || verificaciones[key];
                        const estaEnProgreso = prep?.estado === 'en_progreso';
                        const estaPausado = prep?.estado === 'pausado';
                        const esActual = itemActual === key;

                        let clase = 'dc-cocina-lista-item';
                        if (estaCompletado) clase += ' completado';
                        else if (estaEnProgreso) clase += ' en-progreso';
                        else if (estaPausado) clase += ' pausado';
                        if (esActual) clase += ' actual';

                        return (
                            <div
                                key={idx}
                                className={clase}
                                onClick={() => !estaCompletado && handleCambiarReceta(key)}
                            >
                                <div className="dc-cocina-lista-icon">
                                    {estaCompletado ? (
                                        <i className="fas fa-check-circle"></i>
                                    ) : estaEnProgreso ? (
                                        <i className="fas fa-spinner fa-spin"></i>
                                    ) : estaPausado ? (
                                        <i className="fas fa-pause-circle"></i>
                                    ) : (
                                        <i className="far fa-circle"></i>
                                    )}
                                </div>
                                <div className="dc-cocina-lista-info">
                                    <div className="dc-cocina-lista-nombre">{prod.nombre}</div>
                                    <div className="dc-cocina-lista-meta">
                                        <span>x {prod.cantidad}</span>
                                        {estaCompletado && prep?.duracion_real_min != null && (
                                            <span className="dc-cocina-lista-duracion">
                                                <i className="fas fa-clock"></i> {prep.duracion_real_min} min
                                            </span>
                                        )}
                                        {estaPausado && (
                                            <span className="dc-cocina-lista-pausa">En pausa</span>
                                        )}
                                        {estaEnProgreso && !esActual && (
                                            <span className="dc-cocina-lista-pausa" style={{ background: '#cfe2ff', color: '#084298' }}>
                                                En progreso
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {productoActual && (
                    <div className="dc-cocina-receta-actual">
                        <div className="dc-cocina-receta-header">
                            <div className="dc-cocina-receta-titulo">
                                <i className="fas fa-fire"></i>
                                {productoActual.nombre}
                            </div>
                            <div className="dc-cocina-receta-cantidad">
                                x <strong>{productoActual.cantidad}</strong>
                            </div>
                        </div>

                        {preparaciones[itemActual!]?.estado === 'en_progreso' && (
                            <div className="dc-cocina-receta-timer">
                                <i className="fas fa-stopwatch"></i>
                                <span className="dc-cocina-timer-valor">{formatTiempo(tiempoActual)}</span>
                                <span className="dc-cocina-timer-label">en progreso</span>
                            </div>
                        )}

                        {preparaciones[itemActual!]?.estado === 'completado' && (
                            <div className="dc-cocina-receta-completado">
                                <i className="fas fa-check-circle"></i>
                                Preparado en {preparaciones[itemActual!].duracion_real_min} min
                            </div>
                        )}

                        <div className="dc-cocina-receta-calculo">
                            <i className="fas fa-calculator"></i>
                            <strong>Cálculo:</strong> {productoActual.descripcionCalculo}
                        </div>

                        <div className="dc-cocina-receta-insumos">
                            <div className="dc-cocina-insumos-titulo">
                                <i className="fas fa-boxes"></i> Insumos necesarios
                            </div>
                            {productoActual.ingredientes.map((ing, i) => (
                                <div key={i} className="dc-cocina-insumo-item">
                                    <span className="dc-cocina-insumo-nombre">• {ing.nombre}</span>
                                    <span className="dc-cocina-insumo-puntos"></span>
                                    <span className="dc-cocina-insumo-cantidad">
                                        {ing.cantidad.toFixed(2)} {ing.unidad}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {puedeActuar && (
                            <div className="dc-cocina-receta-acciones">
                                {preparaciones[itemActual!]?.estado === 'en_progreso' ? (
                                    <>
                                        <button
                                            className="dc-btn secondary"
                                            onClick={handlePausar}
                                        >
                                            <i className="fas fa-pause"></i> Pausar
                                        </button>
                                        <button
                                            className="dc-btn success"
                                            onClick={handleFinalizar}
                                        >
                                            <i className="fas fa-check"></i> Marcar como preparado
                                        </button>
                                    </>
                                ) : preparaciones[itemActual!]?.estado === 'pausado' ? (
                                    <button
                                        className="dc-btn success"
                                        onClick={() => handleCambiarReceta(itemActual!)}
                                    >
                                        <i className="fas fa-play"></i> Reanudar
                                    </button>
                                ) : preparaciones[itemActual!]?.estado === 'completado' ? (
                                    <div className="dc-cocina-receta-completado-badge">
                                        <i className="fas fa-check-double"></i> Esta receta ya fue preparada
                                    </div>
                                ) : (
                                    <button
                                        className="dc-btn success"
                                        onClick={() => handleCambiarReceta(itemActual!)}
                                    >
                                        <i className="fas fa-play"></i> Iniciar esta receta
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {puedeActuar && (
                    <div className="dc-input-group" style={{ marginTop: '1rem' }}>
                        <label>Observaciones generales (opcional)</label>
                        <textarea
                            value={obs}
                            onChange={(e) => setObs(e.target.value)}
                            rows={2}
                            placeholder="Notas sobre la preparación..."
                            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
                        />
                    </div>
                )}
            </div>

            <div className="dc-etapa-footer">
                <button
                    className="dc-btn-incidencia"
                    onClick={onReportarIncidencia}
                    disabled={!puedeActuar}
                >
                    <i className="fas fa-exclamation-triangle"></i> Reportar Incidencia
                </button>
                <button
                    className="dc-btn-confirmar"
                    onClick={() => onConfirmar(obs)}
                    disabled={isSubmitting || completados < totalProductos || !puedeActuar}
                >
                    {isSubmitting ? (
                        <><i className="fas fa-spinner fa-spin"></i> Confirmando...</>
                    ) : (
                        <><i className="fas fa-paper-plane"></i> Enviar a Despacho ({completados}/{totalProductos})</>
                    )}
                </button>
            </div>
        </>
    );
};

// =====================================================
// 3. DESPACHO - Carga y Transporte
// =====================================================
export const EtapaDespacho: React.FC<EtapaProps> = ({
    etapa,
    venta,
    verificaciones,
    puedeActuar,
    onVerificar,
    onVerificarMultiple,
    onConfirmar,
    onReportarIncidencia,
    isSubmitting
}) => {
    const { getSelectedCompanyId } = useCompany();
    const id_empresa = getSelectedCompanyId() ?? 0;

    const [obs, setObs] = useState('');
    const [productos, setProductos] = useState<ProductoCalculado[]>([]);
    const [materiales, setMateriales] = useState<MaterialCalculado[]>([]);
    const [preparaciones, setPreparaciones] = useState<Record<string, any>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [busqueda, setBusqueda] = useState('');
    const [filtroEstado, setFiltroEstado] = useState<'todos' | 'pendientes' | 'cargados'>('todos');

    useEffect(() => {
        (async () => {
            setIsLoading(true);
            try {
                const prods = await cateringCalculoService.calcularProductos(venta, id_empresa);
                const mats = cateringCalculoService.calcularMateriales(venta);
                setProductos(prods);
                setMateriales(mats);

                const preps = await cateringEventoApi.getPreparaciones(etapa.id_evento, id_empresa);
                const mapa: Record<string, any> = {};
                for (const p of preps) mapa[p.item] = p;
                setPreparaciones(mapa);
            } finally {
                setIsLoading(false);
            }
        })();
    }, [venta, id_empresa, etapa.id_evento]);

    const filtrarItems = <T extends { nombre: string }>(items: T[], prefijoKey: string = ''): T[] => {
        return items.filter(item => {
            if (busqueda) {
                const q = busqueda.toLowerCase();
                if (!item.nombre.toLowerCase().includes(q)) return false;
            }
            const key = prefijoKey ? `${prefijoKey}${item.nombre}` : item.nombre;
            const verificado = verificaciones[key] || false;
            if (filtroEstado === 'pendientes' && verificado) return false;
            if (filtroEstado === 'cargados' && !verificado) return false;
            return true;
        });
    };

    const productosFiltrados = filtrarItems(productos);
    const materialesFiltrados = filtrarItems(materiales);

    const keyProducto = (p: ProductoCalculado) => `carga:${p.nombre} x${p.cantidad}`;
    const keyMaterial = (m: MaterialCalculado) => `carga:${m.nombre}`;

    const totalProductos = productos.length;
    const totalMateriales = materiales.length;
    const totalItems = totalProductos + totalMateriales;

    const productosCargados = productos.filter(p => verificaciones[keyProducto(p)]).length;
    const materialesCargados = materiales.filter(m => verificaciones[keyMaterial(m)]).length;
    const totalCargados = productosCargados + materialesCargados;

    const pendientes = totalItems - totalCargados;
    const porcentaje = totalItems > 0 ? Math.round((totalCargados / totalItems) * 100) : 0;

    const handleMarcarGrupo = (keys: string[]) => {
        if (!onVerificarMultiple) return;
        const pendientesGrupo = keys.filter(k => !verificaciones[k]);
        if (pendientesGrupo.length === 0) return;
        onVerificarMultiple(pendientesGrupo, true);
    };

    if (isLoading) {
        return (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
                <i className="fas fa-spinner fa-spin"></i> Calculando carga...
            </div>
        );
    }

    return (
        <>
            <div className="dc-etapa-header">
                <div className="dc-etapa-title">
                    <i className="fas fa-truck-loading"></i> Carga y Transporte
                </div>
                <span className="dc-estado-badge listo_para_envio">
                    {totalCargados}/{totalItems} cargados
                </span>
            </div>

            <div className="dc-etapa-body">
                <div className="dc-despacho-destino">
                    <div className="dc-despacho-destino-header">
                        <i className="fas fa-map-marker-alt"></i>
                        <span>Destino del Evento</span>
                    </div>
                    <div className="dc-despacho-destino-direccion">
                        {venta?.eventoData?.direccion || 'Sin dirección registrada'}
                    </div>
                    {venta?.eventoData?.referencia && (
                        <div className="dc-despacho-destino-referencia">
                            <i className="fas fa-info-circle"></i> {venta.eventoData.referencia}
                        </div>
                    )}
                    <div className="dc-despacho-destino-meta">
                        <span>
                            <i className="fas fa-calendar-alt"></i>
                            {formatFecha(venta?.eventoData?.fecha || null)} · {venta?.eventoData?.horario || ''}
                        </span>
                        <span>
                            <i className="fas fa-users"></i>
                            {venta?.eventoData?.personas || 0} personas
                        </span>
                    </div>
                </div>

                <div className="dc-despacho-resumen">
                    <div className="dc-despacho-resumen-item">
                        <i className="fas fa-boxes"></i>
                        <div>
                            <div className="dc-despacho-resumen-valor">{totalItems}</div>
                            <div className="dc-despacho-resumen-label">Total</div>
                        </div>
                    </div>
                    <div className="dc-despacho-resumen-item success">
                        <i className="fas fa-check-circle"></i>
                        <div>
                            <div className="dc-despacho-resumen-valor">{totalCargados}</div>
                            <div className="dc-despacho-resumen-label">Cargados</div>
                        </div>
                    </div>
                    <div className="dc-despacho-resumen-item warning">
                        <i className="fas fa-hourglass-half"></i>
                        <div>
                            <div className="dc-despacho-resumen-valor">{pendientes}</div>
                            <div className="dc-despacho-resumen-label">Pendientes</div>
                        </div>
                    </div>
                </div>

                <div className="dc-despacho-progreso">
                    <div className="dc-despacho-progreso-barra" style={{ width: `${porcentaje}%` }} />
                    <span className="dc-despacho-progreso-texto">{porcentaje}%</span>
                </div>

                <div className="dc-despacho-filtros">
                    <div className="dc-despacho-filtro-buscar">
                        <i className="fas fa-search"></i>
                        <input
                            type="text"
                            placeholder="Buscar item..."
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                        />
                        {busqueda && (
                            <button
                                className="dc-despacho-filtro-limpiar"
                                onClick={() => setBusqueda('')}
                            >
                                <i className="fas fa-times"></i>
                            </button>
                        )}
                    </div>
                    <select
                        className="dc-despacho-filtro-estado"
                        value={filtroEstado}
                        onChange={(e) => setFiltroEstado(e.target.value as any)}
                    >
                        <option value="todos">Todos ({totalItems})</option>
                        <option value="pendientes">Pendientes ({pendientes})</option>
                        <option value="cargados">Cargados ({totalCargados})</option>
                    </select>
                </div>

                {(productosFiltrados.length === 0 && materialesFiltrados.length === 0) && (
                    <div className="dc-despacho-vacio">
                        <i className="fas fa-search"></i>
                        <p>No hay items que coincidan con los filtros</p>
                    </div>
                )}

                {productosFiltrados.length > 0 && (
                    <div className="dc-despacho-grupo">
                        <div className="dc-despacho-grupo-header">
                            <div className="dc-despacho-grupo-titulo">
                                <i className="fas fa-utensils"></i>
                                <span>Productos preparados</span>
                                <span className="dc-despacho-grupo-contador">
                                    {productosCargados}/{totalProductos}
                                </span>
                            </div>
                            {puedeActuar && productosFiltrados.some(p => !verificaciones[keyProducto(p)]) && onVerificarMultiple && (
                                <button
                                    className="dc-despacho-grupo-btn-marcar"
                                    onClick={() => handleMarcarGrupo(productosFiltrados.map(keyProducto))}
                                    title="Marcar todos los productos pendientes como cargados"
                                >
                                    <i className="fas fa-check-double"></i> Marcar todos
                                </button>
                            )}
                        </div>
                        <div className="dc-despacho-grupo-body">
                            {productosFiltrados.map((prod, idx) => {
                                const key = keyProducto(prod);
                                const verificado = verificaciones[key] || false;
                                const prepKey = `${prod.nombre} x${prod.cantidad}`;
                                const prep = preparaciones[prepKey];
                                const tiempoPreparacion = prep?.duracion_real_min;

                                return (
                                    <div
                                        key={idx}
                                        className={`dc-checklist-item ${verificado ? 'verificado' : ''}`}
                                    >
                                        <div className="dc-checklist-item-header">
                                            <div className="dc-checklist-item-left">
                                                <input
                                                    type="checkbox"
                                                    className="dc-checklist-item-checkbox"
                                                    checked={verificado}
                                                    onChange={() => onVerificar(key, !verificado)}
                                                    disabled={!puedeActuar || verificado}
                                                />
                                                <div className="dc-checklist-item-info">
                                                    <div className="dc-checklist-item-nombre">
                                                        {prod.nombre}
                                                        {tiempoPreparacion != null && (
                                                            <span className="dc-despacho-badge-preparado">
                                                                <i className="fas fa-clock"></i> {tiempoPreparacion} min
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="dc-checklist-item-cantidad">
                                                x <strong>{prod.cantidad}</strong>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {materialesFiltrados.length > 0 && (
                    <div className="dc-despacho-grupo">
                        <div className="dc-despacho-grupo-header">
                            <div className="dc-despacho-grupo-titulo">
                                <i className="fas fa-chair"></i>
                                <span>Materiales</span>
                                <span className="dc-despacho-grupo-contador">
                                    {materialesCargados}/{totalMateriales}
                                </span>
                            </div>
                            {puedeActuar && materialesFiltrados.some(m => !verificaciones[keyMaterial(m)]) && onVerificarMultiple && (
                                <button
                                    className="dc-despacho-grupo-btn-marcar"
                                    onClick={() => handleMarcarGrupo(materialesFiltrados.map(keyMaterial))}
                                    title="Marcar todos los materiales pendientes como cargados"
                                >
                                    <i className="fas fa-check-double"></i> Marcar todos
                                </button>
                            )}
                        </div>
                        <div className="dc-despacho-grupo-body">
                            {materialesFiltrados.map((mat, idx) => {
                                const key = keyMaterial(mat);
                                const verificado = verificaciones[key] || false;

                                return (
                                    <div
                                        key={idx}
                                        className={`dc-checklist-item ${verificado ? 'verificado' : ''}`}
                                    >
                                        <div className="dc-checklist-item-header">
                                            <div className="dc-checklist-item-left">
                                                <input
                                                    type="checkbox"
                                                    className="dc-checklist-item-checkbox"
                                                    checked={verificado}
                                                    onChange={() => onVerificar(key, !verificado)}
                                                    disabled={!puedeActuar || verificado}
                                                />
                                                <div className="dc-checklist-item-info">
                                                    <div className="dc-checklist-item-nombre">{mat.nombre}</div>
                                                </div>
                                            </div>
                                            <div className="dc-checklist-item-cantidad">
                                                <strong>{mat.cantidad}</strong> und
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {puedeActuar && (
                    <div className="dc-input-group" style={{ marginTop: '1rem' }}>
                        <label>Observaciones (opcional)</label>
                        <textarea
                            value={obs}
                            onChange={(e) => setObs(e.target.value)}
                            rows={2}
                            placeholder="Notas sobre la carga..."
                            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
                        />
                    </div>
                )}

                {pendientes > 0 ? (
                    <div className="dc-despacho-alerta pendiente">
                        <i className="fas fa-exclamation-triangle"></i>
                        <span>Faltan <strong>{pendientes}</strong> {pendientes === 1 ? 'item' : 'items'} por cargar antes de salir</span>
                    </div>
                ) : (
                    <div className="dc-despacho-alerta listo">
                        <i className="fas fa-check-circle"></i>
                        <span>Todo listo para salir</span>
                    </div>
                )}
            </div>

            <div className="dc-etapa-footer">
                <button
                    className="dc-btn-incidencia"
                    onClick={onReportarIncidencia}
                    disabled={!puedeActuar}
                >
                    <i className="fas fa-exclamation-triangle"></i> Reportar Incidencia
                </button>
                <button
                    className="dc-btn-confirmar"
                    onClick={() => onConfirmar(obs)}
                    disabled={isSubmitting || totalCargados < totalItems || !puedeActuar}
                >
                    {isSubmitting ? (
                        <><i className="fas fa-spinner fa-spin"></i> Confirmando...</>
                    ) : (
                        <><i className="fas fa-truck"></i> Confirmar Salida al Evento ({totalCargados}/{totalItems})</>
                    )}
                </button>
            </div>
        </>
    );
};

// =====================================================
// 4. MONTAJE - Checklist fijo en evento
// =====================================================
const ITEMS_MONTAJE = [
    'Llegar al evento a tiempo',
    'Estacionar el vehículo en zona autorizada',
    'Montar mesas y sillas',
    'Colocar productos según el pedido',
    'Verificar con el cliente',
    'Tomar foto de conformidad'
];

export const EtapaMontaje: React.FC<EtapaProps> = ({
    venta,
    verificaciones,
    puedeActuar,
    onVerificar,
    onConfirmar,
    onReportarIncidencia,
    isSubmitting
}) => {
    const [obs, setObs] = useState('');

    const totalPasos = ITEMS_MONTAJE.length;
    const completados = ITEMS_MONTAJE.filter(i => verificaciones[i]).length;
    const pendientes = totalPasos - completados;
    const porcentaje = totalPasos > 0 ? Math.round((completados / totalPasos) * 100) : 0;

    const clienteNombre = venta?.cliente || 'Cliente';
    const clienteCelular = venta?.clienteDoc ? '' : '';

    return (
        <>
            <div className="dc-etapa-header">
                <div className="dc-etapa-title">
                    <i className="fas fa-glass-cheers"></i> Montaje en Evento
                </div>
                <span className="dc-estado-badge en_evento">
                    {completados}/{totalPasos} completados
                </span>
            </div>

            <div className="dc-etapa-body">
                <div className="dc-montaje-ubicacion">
                    <div className="dc-montaje-ubicacion-header">
                        <i className="fas fa-map-marker-alt"></i>
                        <span>Ubicación del Evento</span>
                    </div>
                    <div className="dc-montaje-ubicacion-direccion">
                        {venta?.eventoData?.direccion || 'Sin dirección registrada'}
                    </div>
                    {venta?.eventoData?.referencia && (
                        <div className="dc-montaje-ubicacion-referencia">
                            <i className="fas fa-info-circle"></i> {venta.eventoData.referencia}
                        </div>
                    )}
                    <div className="dc-montaje-ubicacion-meta">
                        <span>
                            <i className="fas fa-calendar-alt"></i>
                            {formatFecha(venta?.eventoData?.fecha || null)} · {venta?.eventoData?.horario || ''}
                        </span>
                        <span>
                            <i className="fas fa-users"></i>
                            {venta?.eventoData?.personas || 0} personas
                        </span>
                    </div>

                    <div className="dc-montaje-ubicacion-cliente">
                        <div className="dc-montaje-cliente-info">
                            <i className="fas fa-user-circle"></i>
                            <div>
                                <div className="dc-montaje-cliente-label">Cliente</div>
                                <div className="dc-montaje-cliente-nombre">{clienteNombre}</div>
                            </div>
                        </div>
                        {clienteCelular && (
                            <div className="dc-montaje-cliente-acciones">
                                <a href={`tel:${clienteCelular}`} className="dc-checklist-btn-proveedor dc-btn-llamar">
                                    <i className="fas fa-phone"></i> Llamar
                                </a>
                                <button
                                    className="dc-checklist-btn-proveedor"
                                    onClick={() => {
                                        const msg = `Hola ${clienteNombre}, estamos llegando al evento. Delicias Catering.`;
                                        window.open(`https://wa.me/${clienteCelular}?text=${encodeURIComponent(msg)}`, '_blank');
                                    }}
                                >
                                    <i className="fab fa-whatsapp"></i> WhatsApp
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="dc-montaje-resumen">
                    <div className="dc-montaje-resumen-item">
                        <i className="fas fa-clipboard-list"></i>
                        <div>
                            <div className="dc-montaje-resumen-valor">{totalPasos}</div>
                            <div className="dc-montaje-resumen-label">Pasos</div>
                        </div>
                    </div>
                    <div className="dc-montaje-resumen-item success">
                        <i className="fas fa-check-circle"></i>
                        <div>
                            <div className="dc-montaje-resumen-valor">{completados}</div>
                            <div className="dc-montaje-resumen-label">Completados</div>
                        </div>
                    </div>
                    <div className="dc-montaje-resumen-item warning">
                        <i className="fas fa-hourglass-half"></i>
                        <div>
                            <div className="dc-montaje-resumen-valor">{pendientes}</div>
                            <div className="dc-montaje-resumen-label">Pendientes</div>
                        </div>
                    </div>
                </div>

                <div className="dc-montaje-progreso">
                    <div className="dc-montaje-progreso-barra" style={{ width: `${porcentaje}%` }} />
                    <span className="dc-montaje-progreso-texto">{porcentaje}%</span>
                </div>

                <div className="dc-montaje-checklist">
                    <div className="dc-montaje-checklist-titulo">
                        <i className="fas fa-list-ol"></i> Pasos del montaje
                    </div>
                    {ITEMS_MONTAJE.map((item, idx) => {
                        const verificado = verificaciones[item] || false;
                        return (
                            <div
                                key={idx}
                                className={`dc-montaje-paso ${verificado ? 'completado' : ''}`}
                            >
                                <div className="dc-montaje-paso-numero">
                                    {verificado ? (
                                        <i className="fas fa-check"></i>
                                    ) : (
                                        <span>{idx + 1}</span>
                                    )}
                                </div>
                                <div className="dc-montaje-paso-contenido">
                                    <div className="dc-montaje-paso-nombre">{item}</div>
                                </div>
                                <div className="dc-montaje-paso-accion">
                                    <input
                                        type="checkbox"
                                        className="dc-checklist-item-checkbox"
                                        checked={verificado}
                                        onChange={() => onVerificar(item, !verificado)}
                                        disabled={!puedeActuar || verificado}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>

                {puedeActuar && (
                    <div className="dc-input-group" style={{ marginTop: '1rem' }}>
                        <label>Observaciones (opcional)</label>
                        <textarea
                            value={obs}
                            onChange={(e) => setObs(e.target.value)}
                            rows={2}
                            placeholder="Notas sobre el montaje..."
                            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
                        />
                    </div>
                )}

                {pendientes > 0 ? (
                    <div className="dc-montaje-alerta pendiente">
                        <i className="fas fa-exclamation-triangle"></i>
                        <span>Faltan <strong>{pendientes}</strong> {pendientes === 1 ? 'paso' : 'pasos'} por completar antes de continuar</span>
                    </div>
                ) : (
                    <div className="dc-montaje-alerta listo">
                        <i className="fas fa-check-circle"></i>
                        <span>Montaje completo. Listo para recojo</span>
                    </div>
                )}
            </div>

            <div className="dc-etapa-footer">
                <button
                    className="dc-btn-incidencia"
                    onClick={onReportarIncidencia}
                    disabled={!puedeActuar}
                >
                    <i className="fas fa-exclamation-triangle"></i> Reportar Incidencia
                </button>
                <button
                    className="dc-btn-confirmar"
                    onClick={() => onConfirmar(obs)}
                    disabled={isSubmitting || completados < totalPasos || !puedeActuar}
                >
                    {isSubmitting ? (
                        <><i className="fas fa-spinner fa-spin"></i> Confirmando...</>
                    ) : (
                        <><i className="fas fa-check-circle"></i> Confirmar Montaje ({completados}/{totalPasos})</>
                    )}
                </button>
            </div>
        </>
    );
};

// =====================================================
// 5. RECOJO - Verificación de cantidades con bloqueo por incidencia
// =====================================================
const ITEMS_ACCIONES_RECOJO = [
    'Desmontar mesas y sillas',
    'Limpiar la zona del evento',
    'Confirmar con el cliente',
    'Tomar foto del área recogida'
];

export const EtapaRecojo: React.FC<EtapaProps> = ({
    etapa,
    venta,
    verificaciones,
    puedeActuar,
    onVerificar,
    onConfirmar,
    onReportarIncidencia,
    isSubmitting
}) => {
    const { getSelectedCompanyId } = useCompany();
    const { user } = useAuth();
    const id_empresa = getSelectedCompanyId() ?? 0;

    const [obs, setObs] = useState('');
    const [materiales, setMateriales] = useState<MaterialCalculado[]>([]);
    const [productos, setProductos] = useState<ProductoCalculado[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [cantidadesReales, setCantidadesReales] = useState<Record<string, number>>({});

    const [formIncidenciaAbierto, setFormIncidenciaAbierto] = useState<{
        nombre: string;
        cantidadAfectada: number;
    } | null>(null);

    const [incidenciasPorItem, setIncidenciasPorItem] = useState<Record<string, any>>({});

    useEffect(() => {
        (async () => {
            setIsLoading(true);
            try {
                const mats = cateringCalculoService.calcularMateriales(venta);
                const prods = await cateringCalculoService.calcularProductos(venta, id_empresa);
                setMateriales(mats);
                setProductos(prods);

                const response = await fetch(
                    `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/catering/eventos/${etapa.id_evento}/checklist?etapa=recojo_evento&id_empresa=${id_empresa}`
                );
                if (response.ok) {
                    const data = await response.json();
                    const cantidades: Record<string, number> = {};
                    for (const row of data) {
                        if (row.cantidad_real != null) {
                            cantidades[row.item] = parseFloat(row.cantidad_real);
                        }
                    }
                    setCantidadesReales(cantidades);
                }

                const incidencias = await cateringEventoApi.getIncidencias(
                    etapa.id_evento, id_empresa, { etapa: 'recojo_evento' }
                );

                const mapaIncidencias: Record<string, any> = {};
                for (const inc of incidencias) {
                    const nombreItem = inc.checklist_item_nombre || (inc as any).nombre_item;
                    if (nombreItem) {
                        mapaIncidencias[nombreItem] = inc;
                    }
                }
                setIncidenciasPorItem(mapaIncidencias);
            } finally {
                setIsLoading(false);
            }
        })();
    }, [venta, id_empresa, etapa.id_evento]);

    const handleGuardarCantidad = async (
        item: string,
        cantidadRequerida: number,
        cantidadReal: number,
        unidad: string,
        categoria: string
    ) => {
        if (!puedeActuar) return;
        if (incidenciasPorItem[item]) return;

        setCantidadesReales(prev => ({ ...prev, [item]: cantidadReal }));

        try {
            await cateringEventoApi.registrarItemRecojo(
                etapa.id_evento,
                id_empresa,
                user?.id || 0,
                {
                    etapa: 'recojo_evento',
                    item,
                    cantidad_requerida: cantidadRequerida,
                    cantidad_real: cantidadReal,
                    categoria,
                    tipo_referencia: categoria === 'material' ? 'material' : 'producto_carta',
                    unidad
                }
            );
        } catch (error: any) {
            console.error('[EtapaRecojo] Error al guardar cantidad:', error);
            setCantidadesReales(prev => {
                const next = { ...prev };
                delete next[item];
                return next;
            });
        }
    };

    const abrirFormIncidencia = (it: any, cantidadAfectada: number) => {
        setFormIncidenciaAbierto({
            nombre: it.nombre,
            cantidadAfectada
        });
    };

    const handleReportarIncidenciaInline = async (
        itemNombre: string,
        data: InlineIncidenciaData
    ) => {
        if (!puedeActuar) return;
        if (!formIncidenciaAbierto) return;

        try {
            const result = await cateringEventoApi.reportarIncidencia(
                etapa.id_evento,
                id_empresa,
                user?.id || 0,
                {
                    etapa: etapa.etapa,
                    tipo: data.motivo,
                    cantidad_afectada: formIncidenciaAbierto.cantidadAfectada,
                    severidad: data.severidad,
                    descripcion: data.descripcion,
                    impacto: data.impacto || undefined,
                    nombre_item: itemNombre
                }
            );

            setIncidenciasPorItem(prev => ({
                ...prev,
                [itemNombre]: result
            }));

            setFormIncidenciaAbierto(null);
        } catch (error: any) {
            console.error('[EtapaRecojo] Error al reportar incidencia:', error);
        }
    };

    const itemsMateriales = materiales.map(m => ({
        nombre: m.nombre,
        cantidadRequerida: m.cantidad,
        unidad: 'und',
        categoria: 'material'
    }));

    const itemsProductos = productos.map(p => ({
        nombre: p.nombre,
        cantidadRequerida: p.cantidad,
        unidad: 'und',
        categoria: 'producto'
    }));

    const totalItems = itemsMateriales.length + itemsProductos.length;

    const itemsConCantidad = [...itemsMateriales, ...itemsProductos].filter(
        it => cantidadesReales[it.nombre] != null
    );

    const completados = itemsConCantidad.length;

    const incompletos = itemsConCantidad.filter(it => {
        const cantReal = cantidadesReales[it.nombre];
        if (it.categoria === 'material') {
            return cantReal < it.cantidadRequerida;
        } else {
            return cantReal > 0;
        }
    }).length;

    const pendientes = totalItems - completados;
    const porcentaje = totalItems > 0 ? Math.round((completados / totalItems) * 100) : 0;

    const accionesCompletadas = ITEMS_ACCIONES_RECOJO.filter(i => verificaciones[i]).length;
    const totalAcciones = ITEMS_ACCIONES_RECOJO.length;
    const puedeConfirmar = pendientes === 0 && accionesCompletadas === totalAcciones;

    if (isLoading) {
        return (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
                <i className="fas fa-spinner fa-spin"></i> Cargando checklist de recojo...
            </div>
        );
    }

    const renderItem = (it: any, idx: number) => {
        const cantReal = cantidadesReales[it.nombre];
        const ingreado = cantReal != null;

        let esOk = false;
        let estadoTexto = '';
        let estadoClase = '';
        let mostrarBotonIncidencia = false;
        let cantidadAfectada = 0;

        if (it.categoria === 'material') {
            esOk = ingreado && cantReal >= it.cantidadRequerida;
            cantidadAfectada = ingreado && cantReal < it.cantidadRequerida
                ? it.cantidadRequerida - cantReal : 0;

            if (!ingreado) {
                estadoTexto = 'Pendiente';
                estadoClase = 'pendiente';
            } else if (esOk) {
                estadoTexto = 'OK';
                estadoClase = 'ok';
            } else {
                estadoTexto = `Faltó ${cantidadAfectada}`;
                estadoClase = 'falta';
            }

            mostrarBotonIncidencia = ingreado && !esOk;

        } else {
            esOk = ingreado && cantReal === 0;
            cantidadAfectada = ingreado && cantReal > 0 ? cantReal : 0;

            if (!ingreado) {
                estadoTexto = 'Pendiente';
                estadoClase = 'pendiente';
            } else if (esOk) {
                estadoTexto = 'Consumido';
                estadoClase = 'ok';
            } else {
                estadoTexto = `Sobró ${cantidadAfectada}`;
                estadoClase = 'falta';
            }

            mostrarBotonIncidencia = ingreado && !esOk;
        }

        const tieneFormAbierto = formIncidenciaAbierto?.nombre === it.nombre;
        const incidencia = incidenciasPorItem[it.nombre];
        const tieneIncidencia = !!incidencia;

        const puedeReportar = mostrarBotonIncidencia && !tieneIncidencia && !tieneFormAbierto && puedeActuar;

        return (
            <div
                key={idx}
                className={`dc-recojo-item ${tieneIncidencia ? 'con-incidencia' : ''}`}
            >
                <div className="dc-recojo-item-nombre">
                    {it.nombre}
                    {tieneIncidencia && (
                        <span className="dc-recojo-item-lock">
                            <i className="fas fa-lock"></i> Bloqueado
                        </span>
                    )}
                </div>

                <div className="dc-recojo-item-cantidades">
                    <span className="dc-recojo-item-salio">
                        Salió: <strong>{it.cantidadRequerida}</strong>
                    </span>
                    <span className="dc-recojo-item-input">
                        <label>Regresa:</label>
                        <input
                            type="number"
                            min="0"
                            max={it.cantidadRequerida}
                            step="1"
                            value={cantReal ?? ''}
                            onChange={(e) => {
                                if (tieneIncidencia) return;
                                const v = e.target.value;
                                if (v === '') {
                                    setCantidadesReales(prev => {
                                        const next = { ...prev };
                                        delete next[it.nombre];
                                        return next;
                                    });
                                    return;
                                }
                                let num = parseFloat(v);
                                if (isNaN(num)) return;
                                if (num < 0) num = 0;
                                if (num > it.cantidadRequerida) num = it.cantidadRequerida;
                                setCantidadesReales(prev => ({ ...prev, [it.nombre]: num }));
                            }}
                            onBlur={(e) => {
                                if (tieneIncidencia) return;
                                let v = parseFloat(e.target.value);
                                if (isNaN(v)) return;
                                if (v < 0) v = 0;
                                if (v > it.cantidadRequerida) v = it.cantidadRequerida;
                                if (v !== parseFloat(e.target.value)) {
                                    setCantidadesReales(prev => ({ ...prev, [it.nombre]: v }));
                                }
                                handleGuardarCantidad(
                                    it.nombre,
                                    it.cantidadRequerida,
                                    v,
                                    it.unidad,
                                    it.categoria
                                );
                            }}
                            disabled={!puedeActuar || tieneIncidencia}
                            placeholder="0"
                        />
                    </span>
                    <span className={`dc-recojo-item-estado ${estadoClase}`}>
                        {!ingreado ? (
                            <span className="dc-recojo-item-pendiente">
                                <i className="far fa-circle"></i> {estadoTexto}
                            </span>
                        ) : esOk ? (
                            <span>
                                <i className="fas fa-check-circle"></i> {estadoTexto}
                            </span>
                        ) : (
                            <span>
                                <i className="fas fa-exclamation-triangle"></i> {estadoTexto}
                            </span>
                        )}
                    </span>
                </div>

                {puedeReportar && (
                    <button
                        className="dc-inline-incidencia-btn"
                        onClick={() => abrirFormIncidencia(it, cantidadAfectada)}
                    >
                        {it.categoria === 'material' ? (
                            <>
                                <i className="fas fa-exclamation-triangle"></i> Reportar incidencia por faltante ({cantidadAfectada})
                            </>
                        ) : (
                            <>
                                <i className="fas fa-exclamation-triangle"></i> Reportar incidencia por sobrante ({cantidadAfectada})
                            </>
                        )}
                    </button>
                )}

                {tieneIncidencia && (
                    <div className={`dc-incidencia-resumen severidad-${incidencia.severidad}`}>
                        <div className="dc-incidencia-resumen-header">
                            <span className={`dc-incidencia-severidad-badge ${incidencia.severidad}`}>
                                {incidencia.severidad === 'critica' ? '🔴' :
                                    incidencia.severidad === 'media' ? '🟡' : '🟢'}
                                {' '}{incidencia.severidad.toUpperCase()}
                            </span>
                            <span className="dc-incidencia-resumen-fecha">
                                <i className="fas fa-clock"></i>
                                {new Date(incidencia.created_at).toLocaleString('es-PE', {
                                    day: '2-digit', month: '2-digit',
                                    hour: '2-digit', minute: '2-digit'
                                })}
                            </span>
                        </div>
                        <div className="dc-incidencia-resumen-motivo">
                            <strong>Motivo:</strong> {incidencia.tipo}
                        </div>
                        <div className="dc-incidencia-resumen-descripcion">
                            {incidencia.descripcion}
                        </div>
                        {incidencia.cantidad_afectada != null && (
                            <div className="dc-incidencia-resumen-cantidad">
                                <i className="fas fa-cubes"></i> Cantidad afectada: <strong>{incidencia.cantidad_afectada}</strong>
                            </div>
                        )}
                        {incidencia.impacto && (
                            <div className="dc-incidencia-resumen-impacto">
                                <i className="fas fa-info-circle"></i> {incidencia.impacto}
                            </div>
                        )}
                        <div className="dc-incidencia-resumen-footer">
                            <i className="fas fa-user"></i> Reportado por: {incidencia.usuario_nombre || 'Usuario'}
                        </div>
                    </div>
                )}

                {tieneFormAbierto && !tieneIncidencia && (
                    <InlineIncidenciaForm
                        itemNombre={it.nombre}
                        unidad={it.unidad}
                        onGuardar={(data) => handleReportarIncidenciaInline(it.nombre, data)}
                        onCancelar={() => setFormIncidenciaAbierto(null)}
                    />
                )}
            </div>
        );
    };

    return (
        <>
            <div className="dc-etapa-header">
                <div className="dc-etapa-title">
                    <i className="fas fa-undo"></i> Recojo del Evento
                </div>
                <span className="dc-estado-badge en_retorno">
                    {completados}/{totalItems} verificados
                </span>
            </div>

            <div className="dc-etapa-body">
                <div className="dc-recojo-ubicacion">
                    <div className="dc-recojo-ubicacion-header">
                        <i className="fas fa-map-marker-alt"></i>
                        <span>Ubicación del Evento</span>
                    </div>
                    <div className="dc-recojo-ubicacion-direccion">
                        {venta?.eventoData?.direccion || 'Sin dirección registrada'}
                    </div>
                    <div className="dc-recojo-ubicacion-meta">
                        <span>
                            <i className="fas fa-calendar-alt"></i>
                            {formatFecha(venta?.eventoData?.fecha || null)} · {venta?.eventoData?.horario || ''}
                        </span>
                        <span>
                            <i className="fas fa-users"></i>
                            {venta?.eventoData?.personas || 0} personas
                        </span>
                    </div>
                </div>

                <div className="dc-recojo-resumen">
                    <div className="dc-recojo-resumen-item">
                        <i className="fas fa-boxes"></i>
                        <div>
                            <div className="dc-recojo-resumen-valor">{totalItems}</div>
                            <div className="dc-recojo-resumen-label">Items</div>
                        </div>
                    </div>
                    <div className="dc-recojo-resumen-item success">
                        <i className="fas fa-check-circle"></i>
                        <div>
                            <div className="dc-recojo-resumen-valor">{completados}</div>
                            <div className="dc-recojo-resumen-label">OK</div>
                        </div>
                    </div>
                    <div className="dc-recojo-resumen-item warning">
                        <i className="fas fa-exclamation-triangle"></i>
                        <div>
                            <div className="dc-recojo-resumen-valor">{incompletos}</div>
                            <div className="dc-recojo-resumen-label">Incompletos</div>
                        </div>
                    </div>
                </div>

                <div className="dc-recojo-progreso">
                    <div className="dc-recojo-progreso-barra" style={{ width: `${porcentaje}%` }} />
                    <span className="dc-recojo-progreso-texto">{porcentaje}%</span>
                </div>

                {itemsMateriales.length > 0 && (
                    <div className="dc-recojo-grupo">
                        <div className="dc-recojo-grupo-header">
                            <div className="dc-recojo-grupo-titulo">
                                <i className="fas fa-chair"></i>
                                <span>Materiales a recoger</span>
                                <span className="dc-recojo-grupo-contador">
                                    {itemsMateriales.filter(it => cantidadesReales[it.nombre] != null).length}/{itemsMateriales.length}
                                </span>
                            </div>
                        </div>
                        <div className="dc-recojo-grupo-body">
                            {itemsMateriales.map((it, idx) => renderItem(it, idx))}
                        </div>
                    </div>
                )}

                {itemsProductos.length > 0 && (
                    <div className="dc-recojo-grupo">
                        <div className="dc-recojo-grupo-header">
                            <div className="dc-recojo-grupo-titulo">
                                <i className="fas fa-utensils"></i>
                                <span>Productos (deben quedar en 0)</span>
                                <span className="dc-recojo-grupo-contador">
                                    {itemsProductos.filter(it => cantidadesReales[it.nombre] != null).length}/{itemsProductos.length}
                                </span>
                            </div>
                        </div>
                        <div className="dc-recojo-grupo-body">
                            {itemsProductos.map((it, idx) => renderItem(it, idx))}
                        </div>
                    </div>
                )}

                <div className="dc-recojo-grupo">
                    <div className="dc-recojo-grupo-header">
                        <div className="dc-recojo-grupo-titulo">
                            <i className="fas fa-clipboard-check"></i>
                            <span>Checklist de acciones</span>
                            <span className="dc-recojo-grupo-contador">
                                {accionesCompletadas}/{totalAcciones}
                            </span>
                        </div>
                    </div>
                    <div className="dc-recojo-grupo-body">
                        {ITEMS_ACCIONES_RECOJO.map((item, idx) => {
                            const verificado = verificaciones[item] || false;
                            return (
                                <div key={idx} className={`dc-checklist-item ${verificado ? 'verificado' : ''}`}>
                                    <div className="dc-checklist-item-header">
                                        <div className="dc-checklist-item-left">
                                            <input
                                                type="checkbox"
                                                className="dc-checklist-item-checkbox"
                                                checked={verificado}
                                                onChange={() => onVerificar(item, !verificado)}
                                                disabled={!puedeActuar || verificado}
                                            />
                                            <div className="dc-checklist-item-info">
                                                <div className="dc-checklist-item-nombre">{item}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {puedeActuar && (
                    <div className="dc-input-group" style={{ marginTop: '1rem' }}>
                        <label>Observaciones (opcional)</label>
                        <textarea
                            value={obs}
                            onChange={(e) => setObs(e.target.value)}
                            rows={2}
                            placeholder="Notas sobre el recojo..."
                            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
                        />
                    </div>
                )}

                {(pendientes > 0 || accionesCompletadas < totalAcciones) ? (
                    <div className="dc-recojo-alerta pendiente">
                        <i className="fas fa-exclamation-triangle"></i>
                        <span>
                            Faltan <strong>{pendientes}</strong> {pendientes === 1 ? 'item' : 'items'} por verificar
                            {accionesCompletadas < totalAcciones && (
                                <> y <strong>{totalAcciones - accionesCompletadas}</strong> {totalAcciones - accionesCompletadas === 1 ? 'acción' : 'acciones'}</>
                            )}
                            {' '}antes de continuar
                        </span>
                    </div>
                ) : (
                    <div className="dc-recojo-alerta listo">
                        <i className="fas fa-check-circle"></i>
                        <span>Todo verificado. Listo para regresar a la empresa</span>
                    </div>
                )}
            </div>

            <div className="dc-etapa-footer">
                <button
                    className="dc-btn-incidencia"
                    onClick={onReportarIncidencia}
                    disabled={!puedeActuar}
                >
                    <i className="fas fa-exclamation-triangle"></i> Reportar Incidencia
                </button>
                <button
                    className="dc-btn-confirmar"
                    onClick={() => onConfirmar(obs)}
                    disabled={isSubmitting || !puedeConfirmar || !puedeActuar}
                >
                    {isSubmitting ? (
                        <><i className="fas fa-spinner fa-spin"></i> Confirmando...</>
                    ) : (
                        <><i className="fas fa-home"></i> Confirmar Retorno ({completados}/{totalItems})</>
                    )}
                </button>
            </div>
        </>
    );
};

// =====================================================
// 6. RETORNO - Verificación de cantidades llegadas a empresa
// =====================================================
const ITEMS_RETORNO = [
    'Registrar sobrantes en inventario',
    'Registrar pérdidas si hay',
    'Reportar incidencias'
];

export const EtapaRetorno: React.FC<EtapaProps> = ({
    etapa,
    venta,
    verificaciones,
    puedeActuar,
    onVerificar,
    onConfirmar,
    onReportarIncidencia,
    isSubmitting
}) => {
    const { getSelectedCompanyId } = useCompany();
    const { user } = useAuth();
    const id_empresa = getSelectedCompanyId() ?? 0;

    const [obs, setObs] = useState('');
    const [materiales, setMateriales] = useState<MaterialCalculado[]>([]);
    const [productos, setProductos] = useState<ProductoCalculado[]>([]);
    const [incidenciasDeRecojo, setIncidenciasDeRecojo] = useState<Record<string, any[]>>({});
    const [isLoading, setIsLoading] = useState(true);

    const [cantidadesReales, setCantidadesReales] = useState<Record<string, number>>({});

    const [cantidadesRecojo, setCantidadesRecojo] = useState<Record<string, number>>({});

    const [formIncidenciaAbierto, setFormIncidenciaAbierto] = useState<string | null>(null);
    const [incidenciaGuardada, setIncidenciaGuardada] = useState<Record<string, boolean>>({});

    useEffect(() => {
        (async () => {
            setIsLoading(true);
            try {
                const mats = cateringCalculoService.calcularMateriales(venta);
                const prods = await cateringCalculoService.calcularProductos(venta, id_empresa);
                setMateriales(mats);
                setProductos(prods);

                const responseRecojo = await fetch(
                    `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/catering/eventos/${etapa.id_evento}/checklist?etapa=recojo_evento&id_empresa=${id_empresa}`
                );
                if (responseRecojo.ok) {
                    const dataRecojo = await responseRecojo.json();
                    const cantidadesRec: Record<string, number> = {};
                    for (const row of dataRecojo) {
                        if (row.cantidad_real != null) {
                            cantidadesRec[row.item] = parseFloat(row.cantidad_real);
                        }
                    }
                    setCantidadesRecojo(cantidadesRec);
                }

                const responseRetorno = await fetch(
                    `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/catering/eventos/${etapa.id_evento}/checklist?etapa=retorno_empresa&id_empresa=${id_empresa}`
                );
                if (responseRetorno.ok) {
                    const dataRetorno = await responseRetorno.json();
                    const cantidades: Record<string, number> = {};
                    for (const row of dataRetorno) {
                        if (row.cantidad_real != null) {
                            cantidades[row.item] = parseFloat(row.cantidad_real);
                        }
                    }
                    setCantidadesReales(cantidades);
                }

                const incidencias = await cateringEventoApi.getIncidencias(
                    etapa.id_evento, id_empresa, { etapa: 'recojo_evento' }
                );

                const incidenciasPorItem: Record<string, any[]> = {};
                for (const inc of incidencias) {
                    const nombre = inc.checklist_item_nombre;
                    if (!nombre) continue;
                    if (!incidenciasPorItem[nombre]) incidenciasPorItem[nombre] = [];
                    incidenciasPorItem[nombre].push(inc);
                }
                setIncidenciasDeRecojo(incidenciasPorItem);
            } finally {
                setIsLoading(false);
            }
        })();
    }, [venta, id_empresa, etapa.id_evento]);

    const handleGuardarCantidad = async (
        item: string,
        cantidadRequerida: number,
        cantidadReal: number,
        unidad: string,
        categoria: string
    ) => {
        if (!puedeActuar) return;

        setCantidadesReales(prev => ({ ...prev, [item]: cantidadReal }));

        try {
            await cateringEventoApi.registrarItemRecojo(
                etapa.id_evento,
                id_empresa,
                user?.id || 0,
                {
                    etapa: 'retorno_empresa',
                    item,
                    cantidad_requerida: cantidadRequerida,
                    cantidad_real: cantidadReal,
                    categoria,
                    tipo_referencia: categoria === 'material' ? 'material' : 'producto_carta',
                    unidad
                }
            );
        } catch (error: any) {
            console.error('[EtapaRetorno] Error al guardar cantidad:', error);
            setCantidadesReales(prev => {
                const next = { ...prev };
                delete next[item];
                return next;
            });
        }
    };

    const handleReportarIncidenciaInline = async (itemNombre: string, data: InlineIncidenciaData) => {
        if (!puedeActuar) return;
        try {
            await cateringEventoApi.reportarIncidencia(
                etapa.id_evento,
                id_empresa,
                user?.id || 0,
                {
                    etapa: etapa.etapa,
                    tipo: data.motivo,
                    severidad: data.severidad,
                    descripcion: data.descripcion,
                    impacto: data.impacto || undefined,
                    nombre_item: itemNombre
                }
            );
            setIncidenciaGuardada(prev => ({ ...prev, [itemNombre]: true }));
            setFormIncidenciaAbierto(null);
        } catch (error: any) {
            console.error('[EtapaRecojo] Error al reportar incidencia:', error);
        }
    };

    const itemsMateriales = materiales.map(m => ({
        nombre: m.nombre,
        cantidadDelEvento: cantidadesRecojo[m.nombre] ?? m.cantidad,
        unidad: 'und',
        categoria: 'material'
    }));

    const itemsProductos = productos
        .filter(p => cantidadesRecojo[p.nombre] != null && cantidadesRecojo[p.nombre] > 0)
        .map(p => ({
            nombre: p.nombre,
            cantidadDelEvento: cantidadesRecojo[p.nombre],
            unidad: 'und',
            categoria: 'producto'
        }));

    const totalItems = itemsMateriales.length + itemsProductos.length;

    const itemsConCantidad = [...itemsMateriales, ...itemsProductos].filter(
        it => cantidadesReales[it.nombre] != null
    );

    const completados = itemsConCantidad.length;

    const conDiferencia = itemsConCantidad.filter(
        it => cantidadesReales[it.nombre] < it.cantidadDelEvento
    ).length;

    const pendientes = totalItems - completados;
    const porcentaje = totalItems > 0 ? Math.round((completados / totalItems) * 100) : 0;

    const accionesCompletadas = ITEMS_RETORNO.filter(i => verificaciones[i]).length;
    const totalAcciones = ITEMS_RETORNO.length;
    const puedeConfirmar = pendientes === 0 && accionesCompletadas === totalAcciones;

    if (isLoading) {
        return (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
                <i className="fas fa-spinner fa-spin"></i> Cargando verificación de retorno...
            </div>
        );
    }

    return (
        <>
            <div className="dc-etapa-header">
                <div className="dc-etapa-title">
                    <i className="fas fa-home"></i> Retorno a Empresa
                </div>
                <span className="dc-estado-badge retornado">
                    {completados}/{totalItems} verificados
                </span>
            </div>

            <div className="dc-etapa-body">
                <div className="dc-retorno-contexto">
                    <div className="dc-retorno-contexto-header">
                        <i className="fas fa-truck"></i>
                        <span>Verificando el retorno del evento</span>
                    </div>
                    <div className="dc-retorno-contexto-info">
                        <div>
                            <span className="dc-retorno-contexto-label">Venta</span>
                            <span className="dc-retorno-contexto-valor">{venta?.numero}</span>
                        </div>
                        <div>
                            <span className="dc-retorno-contexto-label">Cliente</span>
                            <span className="dc-retorno-contexto-valor">{venta?.cliente}</span>
                        </div>
                        <div>
                            <span className="dc-retorno-contexto-label">Evento</span>
                            <span className="dc-retorno-contexto-valor">
                                {formatFecha(venta?.eventoData?.fecha || null)} · {venta?.eventoData?.horario || ''}
                            </span>
                        </div>
                        <div>
                            <span className="dc-retorno-contexto-label">Personas</span>
                            <span className="dc-retorno-contexto-valor">{venta?.eventoData?.personas || 0}</span>
                        </div>
                    </div>
                </div>

                <div className="dc-retorno-resumen">
                    <div className="dc-retorno-resumen-item">
                        <i className="fas fa-boxes"></i>
                        <div>
                            <div className="dc-retorno-resumen-valor">{totalItems}</div>
                            <div className="dc-retorno-resumen-label">Items</div>
                        </div>
                    </div>
                    <div className="dc-retorno-resumen-item success">
                        <i className="fas fa-check-circle"></i>
                        <div>
                            <div className="dc-retorno-resumen-valor">{completados - conDiferencia}</div>
                            <div className="dc-retorno-resumen-label">OK</div>
                        </div>
                    </div>
                    <div className="dc-retorno-resumen-item warning">
                        <i className="fas fa-exclamation-triangle"></i>
                        <div>
                            <div className="dc-retorno-resumen-valor">{conDiferencia}</div>
                            <div className="dc-retorno-resumen-label">Con diferencia</div>
                        </div>
                    </div>
                </div>

                <div className="dc-retorno-progreso">
                    <div className="dc-retorno-progreso-barra" style={{ width: `${porcentaje}%` }} />
                    <span className="dc-retorno-progreso-texto">{porcentaje}%</span>
                </div>

                {itemsMateriales.length > 0 && (
                    <div className="dc-retorno-grupo">
                        <div className="dc-retorno-grupo-header">
                            <div className="dc-retorno-grupo-titulo">
                                <i className="fas fa-chair"></i>
                                <span>Materiales</span>
                                <span className="dc-retorno-grupo-contador">
                                    {itemsMateriales.filter(it => cantidadesReales[it.nombre] != null).length}/{itemsMateriales.length}
                                </span>
                            </div>
                        </div>
                        <div className="dc-retorno-grupo-body">
                            {itemsMateriales.map((it, idx) => {
                                const cantReal = cantidadesReales[it.nombre];
                                const ingreado = cantReal != null;
                                const esOk = ingreado && cantReal >= it.cantidadDelEvento;
                                const falta = ingreado && cantReal < it.cantidadDelEvento
                                    ? it.cantidadDelEvento - cantReal : 0;
                                const tieneFormAbierto = formIncidenciaAbierto === it.nombre;
                                const yaReportada = incidenciaGuardada[it.nombre];

                                return (
                                    <div key={idx} className="dc-retorno-item">
                                        <div className="dc-retorno-item-nombre">
                                            {it.nombre}
                                        </div>
                                        <div className="dc-retorno-item-cantidades">
                                            <span className="dc-retorno-item-del-evento">
                                                Del evento: <strong>{it.cantidadDelEvento}</strong>
                                            </span>
                                            <span className="dc-retorno-item-input">
                                                <label>Llegó:</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max={it.cantidadDelEvento}
                                                    step="1"
                                                    value={cantReal ?? ''}
                                                    onChange={(e) => {
                                                        const v = e.target.value;
                                                        if (v === '') {
                                                            setCantidadesReales(prev => {
                                                                const next = { ...prev };
                                                                delete next[it.nombre];
                                                                return next;
                                                            });
                                                            return;
                                                        }
                                                        let num = parseFloat(v);
                                                        if (isNaN(num)) return;
                                                        if (num < 0) num = 0;
                                                        if (num > it.cantidadDelEvento) num = it.cantidadDelEvento;
                                                        setCantidadesReales(prev => ({
                                                            ...prev,
                                                            [it.nombre]: num
                                                        }));
                                                    }}
                                                    onBlur={(e) => {
                                                        let v = parseFloat(e.target.value);
                                                        if (isNaN(v)) return;
                                                        if (v < 0) v = 0;
                                                        if (v > it.cantidadDelEvento) v = it.cantidadDelEvento;
                                                        if (v !== parseFloat(e.target.value)) {
                                                            setCantidadesReales(prev => ({ ...prev, [it.nombre]: v }));
                                                        }
                                                        handleGuardarCantidad(
                                                            it.nombre,
                                                            it.cantidadDelEvento,
                                                            v,
                                                            it.unidad,
                                                            it.categoria
                                                        );
                                                    }}
                                                    disabled={!puedeActuar}
                                                    placeholder="0"
                                                />
                                            </span>
                                            <span className={`dc-retorno-item-estado ${!ingreado ? '' : esOk ? 'ok' : 'falta'}`}>
                                                {!ingreado ? (
                                                    <span className="dc-retorno-item-pendiente">
                                                        <i className="far fa-circle"></i> Pendiente
                                                    </span>
                                                ) : esOk ? (
                                                    <span>
                                                        <i className="fas fa-check-circle"></i> OK
                                                    </span>
                                                ) : (
                                                    <span>
                                                        <i className="fas fa-exclamation-triangle"></i> Faltó {falta}
                                                    </span>
                                                )}
                                            </span>
                                        </div>

                                        {incidenciasDeRecojo[it.nombre] && incidenciasDeRecojo[it.nombre].length > 0 && (
                                            <div className="dc-retorno-incidencias-previas">
                                                <div className="dc-retorno-incidencias-previas-header">
                                                    <i className="fas fa-history"></i>
                                                    <span>Incidencias reportadas en Recojo</span>
                                                </div>
                                                {incidenciasDeRecojo[it.nombre].map((inc: any, i: number) => (
                                                    <div key={i} className={`dc-incidencia-previa severidad-${inc.severidad}`}>
                                                        <div className="dc-incidencia-previa-header">
                                                            <span className={`dc-incidencia-severidad-badge ${inc.severidad}`}>
                                                                {inc.severidad === 'critica' ? '🔴' : inc.severidad === 'media' ? '🟡' : '🟢'}
                                                                {' '}{inc.severidad.toUpperCase()}
                                                            </span>
                                                            <span className="dc-incidencia-previa-fecha">
                                                                {formatFecha(inc.created_at)} · por {inc.usuario_nombre}
                                                            </span>
                                                        </div>
                                                        <div className="dc-incidencia-previa-motivo">
                                                            <strong>{inc.tipo}:</strong> {inc.descripcion}
                                                        </div>
                                                        {inc.cantidad_afectada != null && (
                                                            <div className="dc-incidencia-previa-cantidad">
                                                                <i className="fas fa-cubes"></i> Cantidad afectada: <strong>{inc.cantidad_afectada}</strong>
                                                            </div>
                                                        )}
                                                        {inc.impacto && (
                                                            <div className="dc-incidencia-previa-impacto">
                                                                <i className="fas fa-info-circle"></i> {inc.impacto}
                                                            </div>
                                                        )}
                                                        <div className="dc-incidencia-previa-estado">
                                                            <span className={`dc-incidencia-estado-badge ${inc.estado}`}>
                                                                {inc.estado === 'abierta' ? '⚠ ABIERTA' : inc.estado === 'resuelta' ? '✅ RESUELTA' : inc.estado.toUpperCase()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {ingreado && !esOk && !yaReportada && !tieneFormAbierto && puedeActuar && (
                                            <button
                                                className="dc-inline-incidencia-btn"
                                                onClick={() => setFormIncidenciaAbierto(it.nombre)}
                                            >
                                                <i className="fas fa-exclamation-triangle"></i> Reportar incidencia por esta diferencia
                                            </button>
                                        )}

                                        {yaReportada && (
                                            <div className="dc-inline-incidencia-reportada">
                                                <i className="fas fa-check-circle"></i> Incidencia reportada
                                            </div>
                                        )}

                                        {tieneFormAbierto && (
                                            <InlineIncidenciaForm
                                                itemNombre={it.nombre}
                                                unidad={it.unidad}
                                                onGuardar={(data) => handleReportarIncidenciaInline(it.nombre, data)}
                                                onCancelar={() => setFormIncidenciaAbierto(null)}
                                            />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {itemsProductos.length > 0 && (
                    <div className="dc-retorno-grupo">
                        <div className="dc-retorno-grupo-header">
                            <div className="dc-retorno-grupo-titulo">
                                <i className="fas fa-utensils"></i>
                                <span>Productos sobrantes</span>
                                <span className="dc-retorno-grupo-contador">
                                    {itemsProductos.filter(it => cantidadesReales[it.nombre] != null).length}/{itemsProductos.length}
                                </span>
                            </div>
                        </div>
                        <div className="dc-retorno-grupo-body">
                            {itemsProductos.map((it, idx) => {
                                const cantReal = cantidadesReales[it.nombre];
                                const ingreado = cantReal != null;
                                const esOk = ingreado && cantReal >= it.cantidadDelEvento;
                                const falta = ingreado && cantReal < it.cantidadDelEvento
                                    ? it.cantidadDelEvento - cantReal : 0;
                                const tieneFormAbierto = formIncidenciaAbierto === it.nombre;
                                const yaReportada = incidenciaGuardada[it.nombre];

                                return (
                                    <div key={idx} className="dc-retorno-item">
                                        <div className="dc-retorno-item-nombre">
                                            {it.nombre}
                                        </div>
                                        <div className="dc-retorno-item-cantidades">
                                            <span className="dc-retorno-item-del-evento">
                                                Del evento: <strong>{it.cantidadDelEvento}</strong>
                                            </span>
                                            <span className="dc-retorno-item-input">
                                                <label>Llegó:</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max={it.cantidadDelEvento}
                                                    step="1"
                                                    value={cantReal ?? ''}
                                                    onChange={(e) => {
                                                        const v = e.target.value;
                                                        if (v === '') {
                                                            setCantidadesReales(prev => {
                                                                const next = { ...prev };
                                                                delete next[it.nombre];
                                                                return next;
                                                            });
                                                            return;
                                                        }
                                                        let num = parseFloat(v);
                                                        if (isNaN(num)) return;
                                                        if (num < 0) num = 0;
                                                        if (num > it.cantidadDelEvento) num = it.cantidadDelEvento;
                                                        setCantidadesReales(prev => ({
                                                            ...prev,
                                                            [it.nombre]: num
                                                        }));
                                                    }}
                                                    onBlur={(e) => {
                                                        let v = parseFloat(e.target.value);
                                                        if (isNaN(v)) return;
                                                        if (v < 0) v = 0;
                                                        if (v > it.cantidadDelEvento) v = it.cantidadDelEvento;
                                                        if (v !== parseFloat(e.target.value)) {
                                                            setCantidadesReales(prev => ({ ...prev, [it.nombre]: v }));
                                                        }
                                                        handleGuardarCantidad(
                                                            it.nombre,
                                                            it.cantidadDelEvento,
                                                            v,
                                                            it.unidad,
                                                            it.categoria
                                                        );
                                                    }}
                                                    disabled={!puedeActuar}
                                                    placeholder="0"
                                                />
                                            </span>
                                            <span className={`dc-retorno-item-estado ${!ingreado ? '' : esOk ? 'ok' : 'falta'}`}>
                                                {!ingreado ? (
                                                    <span className="dc-retorno-item-pendiente">
                                                        <i className="far fa-circle"></i> Pendiente
                                                    </span>
                                                ) : esOk ? (
                                                    <span>
                                                        <i className="fas fa-check-circle"></i> OK
                                                    </span>
                                                ) : (
                                                    <span>
                                                        <i className="fas fa-exclamation-triangle"></i> Faltó {falta}
                                                    </span>
                                                )}
                                            </span>
                                        </div>

                                        {ingreado && !esOk && !yaReportada && !tieneFormAbierto && puedeActuar && (
                                            <button
                                                className="dc-inline-incidencia-btn"
                                                onClick={() => setFormIncidenciaAbierto(it.nombre)}
                                            >
                                                <i className="fas fa-exclamation-triangle"></i> Reportar incidencia por esta diferencia
                                            </button>
                                        )}

                                        {yaReportada && (
                                            <div className="dc-inline-incidencia-reportada">
                                                <i className="fas fa-check-circle"></i> Incidencia reportada
                                            </div>
                                        )}

                                        {tieneFormAbierto && (
                                            <InlineIncidenciaForm
                                                itemNombre={it.nombre}
                                                unidad={it.unidad}
                                                onGuardar={(data) => handleReportarIncidenciaInline(it.nombre, data)}
                                                onCancelar={() => setFormIncidenciaAbierto(null)}
                                            />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div className="dc-retorno-grupo">
                    <div className="dc-retorno-grupo-header">
                        <div className="dc-retorno-grupo-titulo">
                            <i className="fas fa-clipboard-check"></i>
                            <span>Confirmaciones finales</span>
                            <span className="dc-retorno-grupo-contador">
                                {accionesCompletadas}/{totalAcciones}
                            </span>
                        </div>
                    </div>
                    <div className="dc-retorno-grupo-body">
                        {ITEMS_RETORNO.map((item, idx) => {
                            const verificado = verificaciones[item] || false;
                            return (
                                <div key={idx} className={`dc-checklist-item ${verificado ? 'verificado' : ''}`}>
                                    <div className="dc-checklist-item-header">
                                        <div className="dc-checklist-item-left">
                                            <input
                                                type="checkbox"
                                                className="dc-checklist-item-checkbox"
                                                checked={verificado}
                                                onChange={() => onVerificar(item, !verificado)}
                                                disabled={!puedeActuar || verificado}
                                            />
                                            <div className="dc-checklist-item-info">
                                                <div className="dc-checklist-item-nombre">{item}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {puedeActuar && (
                    <div className="dc-input-group" style={{ marginTop: '1rem' }}>
                        <label>Observaciones (opcional)</label>
                        <textarea
                            value={obs}
                            onChange={(e) => setObs(e.target.value)}
                            rows={2}
                            placeholder="Notas sobre el retorno..."
                            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
                        />
                    </div>
                )}

                {(pendientes > 0 || accionesCompletadas < totalAcciones) ? (
                    <div className="dc-retorno-alerta pendiente">
                        <i className="fas fa-exclamation-triangle"></i>
                        <span>
                            Faltan <strong>{pendientes}</strong> {pendientes === 1 ? 'item' : 'items'} por verificar
                            {accionesCompletadas < totalAcciones && (
                                <> y <strong>{totalAcciones - accionesCompletadas}</strong> {totalAcciones - accionesCompletadas === 1 ? 'confirmación' : 'confirmaciones'}</>
                            )}
                            {' '}antes de cerrar
                        </span>
                    </div>
                ) : (
                    <div className="dc-retorno-alerta listo">
                        <i className="fas fa-check-circle"></i>
                        <span>Todo verificado. Listo para cierre administrativo</span>
                    </div>
                )}
            </div>

            <div className="dc-etapa-footer">
                <button
                    className="dc-btn-incidencia"
                    onClick={onReportarIncidencia}
                    disabled={!puedeActuar}
                >
                    <i className="fas fa-exclamation-triangle"></i> Reportar Incidencia
                </button>
                <button
                    className="dc-btn-confirmar"
                    onClick={() => onConfirmar(obs)}
                    disabled={isSubmitting || !puedeConfirmar || !puedeActuar}
                >
                    {isSubmitting ? (
                        <><i className="fas fa-spinner fa-spin"></i> Cerrando...</>
                    ) : (
                        <><i className="fas fa-flag-checkered"></i> Cerrar Operación ({completados}/{totalItems})</>
                    )}
                </button>
            </div>
        </>
    );
};

// =====================================================
// 7. CIERRE - Dashboard administrativo completo
// =====================================================
const ITEMS_CIERRE = [
    'Confirmar pago del cliente',
    'Verificar totales vs entregado',
    'Cerrar evento'
];

export const EtapaCierre: React.FC<EtapaProps> = ({
    etapa,
    venta,
    verificaciones,
    puedeActuar,
    onVerificar,
    onConfirmar,
    onReportarIncidencia,
    isSubmitting
}) => {
    const { getSelectedCompanyId } = useCompany();
    const { user } = useAuth();
    const id_empresa = getSelectedCompanyId() ?? 0;

    const [obs, setObs] = useState('');
    const [metricas, setMetricas] = useState<MetricasEvento | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [incidenciaResolviendo, setIncidenciaResolviendo] = useState<number | null>(null);
    const [resolucionTexto, setResolucionTexto] = useState('');
    const [incidenciasExpandidas, setIncidenciasExpandidas] = useState<Record<number, boolean>>({});
    const [timelineExpandido, setTimelineExpandido] = useState(false);

    useEffect(() => {
        (async () => {
            setIsLoading(true);
            try {
                const data = await cateringEventoApi.getMetricas(etapa.id_evento, id_empresa);
                setMetricas(data);
            } catch (error: any) {
                console.error('[EtapaCierre] Error al cargar métricas:', error);
            } finally {
                setIsLoading(false);
            }
        })();
    }, [etapa.id_evento, id_empresa]);

    const handleResolverIncidencia = async (idIncidencia: number) => {
        if (!resolucionTexto.trim()) return;
        try {
            await cateringEventoApi.resolverIncidencia(
                idIncidencia,
                id_empresa,
                user?.id || 0,
                resolucionTexto.trim(),
                'resuelta'
            );
            const data = await cateringEventoApi.getMetricas(etapa.id_evento, id_empresa);
            setMetricas(data);
            setIncidenciaResolviendo(null);
            setResolucionTexto('');
        } catch (error: any) {
            console.error('[EtapaCierre] Error al resolver incidencia:', error);
        }
    };

    const verificados = ITEMS_CIERRE.filter((i: string) => verificaciones[i]).length;
    const totalAcciones = ITEMS_CIERRE.length;
    const puedeConfirmar = verificados === totalAcciones;

    if (isLoading) {
        return (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
                <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', color: '#007bff' }}></i>
                <p style={{ marginTop: '1rem', color: '#666' }}>Cargando resumen del evento...</p>
            </div>
        );
    }

    if (!metricas) {
        return (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>
                No se pudieron cargar las métricas del evento
            </div>
        );
    }

    return (
        <>
            {/* HEADER */}
            <div className="dc-etapa-header">
                <div className="dc-etapa-title">
                    <i className="fas fa-check-double"></i> Cierre Administrativo
                </div>
                <span className="dc-estado-badge cierre">
                    {verificados}/{totalAcciones} verificados
                </span>
            </div>

            <div className="dc-etapa-body">

                {/* 1. CONTEXTO */}
                <div className="dc-cierre-contexto">
                    <div className="dc-cierre-contexto-header">
                        <i className="fas fa-clipboard-list"></i>
                        <span>Contexto del Evento</span>
                    </div>
                    <div className="dc-cierre-contexto-grid">
                        <div>
                            <span className="dc-cierre-label">Venta</span>
                            <span className="dc-cierre-valor">{venta?.numero || '—'}</span>
                        </div>
                        <div>
                            <span className="dc-cierre-label">Cliente</span>
                            <span className="dc-cierre-valor">{venta?.cliente || '—'}</span>
                        </div>
                        <div>
                            <span className="dc-cierre-label">Evento</span>
                            <span className="dc-cierre-valor">
                                {formatFecha(venta?.eventoData?.fecha || null)} · {venta?.eventoData?.horario || ''}
                            </span>
                        </div>
                        <div>
                            <span className="dc-cierre-label">Personas</span>
                            <span className="dc-cierre-valor">{venta?.eventoData?.personas || 0}</span>
                        </div>
                        <div className="dc-cierre-contexto-direccion">
                            <span className="dc-cierre-label">📍 Dirección</span>
                            <span className="dc-cierre-valor">{venta?.eventoData?.direccion || 'Sin dirección'}</span>
                        </div>
                        <div>
                            <span className="dc-cierre-label">💰 Total</span>
                            <span className="dc-cierre-valor dc-cierre-valor-money">
                                S/ {(venta?.total || 0).toFixed(2)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* 2. RESUMEN */}
                <div className="dc-cierre-resumen">
                    <div className="dc-cierre-resumen-item">
                        <i className="fas fa-clock"></i>
                        <div>
                            <div className="dc-cierre-resumen-valor">
                                {formatMinutos(metricas.resumen.total_real_min)}
                            </div>
                            <div className="dc-cierre-resumen-label">
                                vs {formatMinutos(metricas.resumen.total_estimado_min)}
                            </div>
                        </div>
                    </div>
                    <div className="dc-cierre-resumen-item success">
                        <i className="fas fa-chart-line"></i>
                        <div>
                            <div className="dc-cierre-resumen-valor">
                                {metricas.resumen.eficiencia_porcentaje}%
                            </div>
                            <div className="dc-cierre-resumen-label">
                                {metricas.resumen.diferencia_min <= 0 ? 'adelantado' : 'atrasado'}
                            </div>
                        </div>
                    </div>
                    <div className="dc-cierre-resumen-item warning">
                        <i className="fas fa-exclamation-triangle"></i>
                        <div>
                            <div className="dc-cierre-resumen-valor">
                                {metricas.resumen.incidencias_resueltas}/{metricas.resumen.total_incidencias}
                            </div>
                            <div className="dc-cierre-resumen-label">
                                resueltas
                            </div>
                        </div>
                    </div>
                    <div className="dc-cierre-resumen-item">
                        <i className="fas fa-users"></i>
                        <div>
                            <div className="dc-cierre-resumen-valor">
                                {venta?.eventoData?.personas || 0}
                            </div>
                            <div className="dc-cierre-resumen-label">
                                personas
                            </div>
                        </div>
                    </div>
                </div>

                {/* Personal (mozos) */}
                {venta?.eventoData?.incluir_mozo && (
                    <div className="dc-cierre-personal">
                        <div className="dc-cierre-personal-header">
                            <i className="fas fa-user-tie"></i>
                            <span>Personal Asignado</span>
                        </div>
                        <div className="dc-cierre-personal-grid">
                            <div>
                                <span className="dc-cierre-label">Mozos</span>
                                <span className="dc-cierre-valor">{venta.eventoData.cantidad_mozos || 0}</span>
                            </div>
                            <div>
                                <span className="dc-cierre-label">Costo mozos</span>
                                <span className="dc-cierre-valor">
                                    S/ {(venta.eventoData.subtotal_mozo || 0).toFixed(2)}
                                </span>
                            </div>
                            <div>
                                <span className="dc-cierre-label">Total facturado</span>
                                <span className="dc-cierre-valor dc-cierre-valor-money">
                                    S/ {(venta.total || 0).toFixed(2)}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* 3. MÉTRICAS POR ETAPA */}
                <div className="dc-cierre-section">
                    <div className="dc-cierre-section-title">
                        <i className="fas fa-hourglass-half"></i>
                        <span>Métricas por Etapa</span>
                    </div>
                    <div className="dc-cierre-tabla-wrapper">
                        <table className="dc-cierre-tabla">
                            <thead>
                                <tr>
                                    <th>Etapa</th>
                                    <th>Inicio</th>
                                    <th>Fin</th>
                                    <th>Estim.</th>
                                    <th>Real</th>
                                    <th>Diferencia</th>
                                </tr>
                            </thead>
                            <tbody>
                                {metricas.etapas.map((e: any, idx: number) => {
                                    const dif = e.diferencia_min;
                                    const claseDif = dif > 5 ? 'critica' : dif > 0 ? 'media' : 'ok';
                                    return (
                                        <tr key={idx}>
                                            <td>
                                                <i className={`fas ${getIconoEtapa(e.etapa)}`}></i>
                                                {' '}
                                                {formatearNombreEtapa(e.etapa)}
                                            </td>
                                            <td>{e.hora_inicio ? formatHora(e.hora_inicio).split(' ')[1] : '—'}</td>
                                            <td>{e.hora_fin ? formatHora(e.hora_fin).split(' ')[1] : '—'}</td>
                                            <td>{e.tiempo_estimado_min || 0} min</td>
                                            <td>{e.duracion_real_min || 0} min</td>
                                            <td>
                                                <span className={`dc-cierre-dif ${claseDif}`}>
                                                    {dif > 0 ? '+' : ''}{dif} min
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colSpan={3}>TOTAL</td>
                                    <td>{metricas.resumen.total_estimado_min} min</td>
                                    <td>{metricas.resumen.total_real_min} min</td>
                                    <td>
                                        <span className={`dc-cierre-dif ${metricas.resumen.diferencia_min > 5 ? 'critica' : metricas.resumen.diferencia_min > 0 ? 'media' : 'ok'}`}>
                                            {metricas.resumen.diferencia_min > 0 ? '+' : ''}{metricas.resumen.diferencia_min} min
                                        </span>
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>

                {/* 4. EQUIPO */}
                {metricas.equipo.length > 0 && (
                    <div className="dc-cierre-section">
                        <div className="dc-cierre-section-title">
                            <i className="fas fa-users"></i>
                            <span>Equipo Participante ({metricas.equipo.length})</span>
                        </div>
                        <div className="dc-cierre-equipo">
                            {metricas.equipo.map((miembro: any, idx: number) => (
                                <div key={idx} className="dc-cierre-equipo-card">
                                    <div className="dc-cierre-equipo-avatar">
                                        {miembro.nombre_completo.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="dc-cierre-equipo-info">
                                        <div className="dc-cierre-equipo-nombre">
                                            {miembro.nombre_completo}
                                        </div>
                                        <div className="dc-cierre-equipo-rol">
                                            <i className="fas fa-id-badge"></i> {miembro.rol}
                                        </div>
                                        <div className="dc-cierre-equipo-etapas">
                                            {miembro.etapas.map((et: string, i: number) => (
                                                <span key={i} className="dc-cierre-equipo-etapa">
                                                    <i className={`fas ${getIconoEtapa(et)}`}></i>
                                                    {' '}{formatearNombreEtapa(et)}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 5. PREPARACIONES */}
                {metricas.preparaciones.length > 0 && (
                    <div className="dc-cierre-section">
                        <div className="dc-cierre-section-title">
                            <i className="fas fa-utensils"></i>
                            <span>Tiempo de Preparación (Cocina)</span>
                        </div>
                        <div className="dc-cierre-tabla-wrapper">
                            <table className="dc-cierre-tabla">
                                <thead>
                                    <tr>
                                        <th>Receta</th>
                                        <th>Preparado en</th>
                                        <th>Por</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {metricas.preparaciones.map((p: any, idx: number) => (
                                        <tr key={idx}>
                                            <td>{p.item}</td>
                                            <td>
                                                <strong>{p.duracion_real_min || 0} min</strong>
                                            </td>
                                            <td>
                                                <i className="fas fa-user-circle"></i> {p.chef_nombre}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <td colSpan={2}>TIEMPO TOTAL</td>
                                        <td>
                                            <strong>
                                                {metricas.preparaciones.reduce((sum: number, p: any) => sum + (p.duracion_real_min || 0), 0)} min
                                            </strong>
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                )}

                {/* 6. ENTREGADOS */}
                {(metricas.productos_entregados.length > 0 || metricas.materiales_entregados.length > 0) && (
                    <div className="dc-cierre-section">
                        <div className="dc-cierre-section-title">
                            <i className="fas fa-clipboard-check"></i>
                            <span>Entregado vs Solicitado</span>
                        </div>

                        {metricas.productos_entregados.length > 0 && (
                            <div className="dc-cierre-entregados">
                                <div className="dc-cierre-entregados-subtitulo">
                                    <i className="fas fa-utensils"></i> Productos
                                </div>
                                {metricas.productos_entregados.map((p: any, idx: number) => {
                                    const completo = p.cantidad_entregada >= p.cantidad_solicitada;
                                    return (
                                        <div key={idx} className={`dc-cierre-entregado-item ${completo ? 'ok' : 'falta'}`}>
                                            <span className="dc-cierre-entregado-nombre">
                                                {completo ? '✅' : '⚠️'} {p.nombre}
                                            </span>
                                            <span className="dc-cierre-entregado-cantidad">
                                                {p.cantidad_entregada}/{p.cantidad_solicitada}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {metricas.materiales_entregados.length > 0 && (
                            <div className="dc-cierre-entregados">
                                <div className="dc-cierre-entregados-subtitulo">
                                    <i className="fas fa-chair"></i> Materiales
                                </div>
                                {metricas.materiales_entregados.map((m: any, idx: number) => {
                                    const completo = m.cantidad_entregada >= m.cantidad_solicitada;
                                    return (
                                        <div key={idx} className={`dc-cierre-entregado-item ${completo ? 'ok' : 'falta'}`}>
                                            <span className="dc-cierre-entregado-nombre">
                                                {completo ? '✅' : '⚠️'} {m.nombre}
                                            </span>
                                            <span className="dc-cierre-entregado-cantidad">
                                                {m.cantidad_entregada}/{m.cantidad_solicitada}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* 7. INCIDENCIAS */}
                <div className="dc-cierre-section">
                    <div className="dc-cierre-section-title">
                        <i className="fas fa-exclamation-triangle"></i>
                        <span>Incidencias Reportadas ({metricas.incidencias.length})</span>
                    </div>

                    {metricas.incidencias.length === 0 ? (
                        <div className="dc-cierre-sin-incidencias">
                            <i className="fas fa-check-circle"></i>
                            <span>Sin incidencias reportadas</span>
                        </div>
                    ) : (
                        <div className="dc-cierre-incidencias">
                            {metricas.incidencias.map((inc: any, idx: number) => {
                                const expandida = incidenciasExpandidas[inc.id] || false;
                                const resolviendo = incidenciaResolviendo === inc.id;

                                return (
                                    <div
                                        key={idx}
                                        className={`dc-cierre-incidencia-card severidad-${inc.severidad}`}
                                    >
                                        <div
                                            className="dc-cierre-incidencia-header"
                                            onClick={() => setIncidenciasExpandidas(prev => ({
                                                ...prev,
                                                [inc.id]: !prev[inc.id]
                                            }))}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <div className="dc-cierre-incidencia-header-left">
                                                <span className={`dc-cierre-severidad-badge ${inc.severidad}`}>
                                                    {inc.severidad === 'critica' ? '🔴' :
                                                        inc.severidad === 'media' ? '🟡' : '🟢'}
                                                    {' '}{inc.severidad.toUpperCase()}
                                                </span>
                                                <span className={`dc-cierre-area-badge area-${inc.etapa}`}>
                                                    <i className="fas fa-map-pin"></i>
                                                    <span>{formatearNombreEtapa(inc.etapa)}</span>
                                                </span>
                                                <span className="dc-cierre-incidencia-fecha">
                                                    {formatHora(inc.created_at)}
                                                </span>
                                            </div>

                                            <div className="dc-cierre-incidencia-header-right">
                                                <span className={`dc-cierre-estado-badge ${inc.estado}`}>
                                                    {inc.estado === 'abierta' ? '⚠ ABIERTA' :
                                                        inc.estado === 'resuelta' ? '✅ RESUELTA' :
                                                            inc.estado.toUpperCase()}
                                                </span>
                                                <i className={`fas fa-chevron-${expandida ? 'up' : 'down'}`}></i>
                                            </div>
                                        </div>

                                        {expandida && (
                                            <div className="dc-cierre-incidencia-body">
                                                {inc.checklist_item_nombre && (
                                                    <div className="dc-cierre-incidencia-item">
                                                        <i className="fas fa-cube"></i>
                                                        <strong>{inc.checklist_item_nombre}</strong>
                                                    </div>
                                                )}

                                                <div className="dc-cierre-incidencia-area-info">
                                                    <i className={`fas ${getIconoEtapa(inc.etapa)}`}></i>
                                                    <span>
                                                        Reportado durante la etapa de{' '}
                                                        <strong>{formatearNombreEtapa(inc.etapa)}</strong>
                                                    </span>
                                                </div>

                                                <div className="dc-cierre-incidencia-tipo">
                                                    <strong>Motivo:</strong> {inc.tipo}
                                                </div>
                                                <div className="dc-cierre-incidencia-descripcion">
                                                    "{inc.descripcion}"
                                                </div>
                                                <div className="dc-cierre-incidencia-meta">
                                                    {inc.cantidad_afectada != null && (
                                                        <span>
                                                            <i className="fas fa-cubes"></i>
                                                            Cantidad: <strong>{inc.cantidad_afectada}</strong>
                                                        </span>
                                                    )}
                                                    {inc.impacto && (
                                                        <span>
                                                            <i className="fas fa-info-circle"></i>
                                                            {inc.impacto}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="dc-cierre-incidencia-footer">
                                                    <i className="fas fa-user"></i>
                                                    Reportado por: {inc.usuario_completo || inc.usuario_nombre}
                                                </div>

                                                {inc.estado === 'resuelta' && inc.resolucion && (
                                                    <div className="dc-cierre-incidencia-resolucion">
                                                        <div className="dc-cierre-resolucion-titulo">
                                                            <i className="fas fa-check-circle"></i>
                                                            Resolución
                                                        </div>
                                                        <div>{inc.resolucion}</div>
                                                        {inc.resuelto_por_completo && (
                                                            <div className="dc-cierre-resolucion-meta">
                                                                <i className="fas fa-user-check"></i>
                                                                {inc.resuelto_por_completo}
                                                                {' · '}
                                                                {inc.resuelto_at ? formatHora(inc.resuelto_at) : ''}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {inc.estado === 'abierta' && puedeActuar && (
                                                    <>
                                                        {resolviendo ? (
                                                            <div className="dc-cierre-resolucion-form">
                                                                <textarea
                                                                    value={resolucionTexto}
                                                                    onChange={(e) => setResolucionTexto(e.target.value)}
                                                                    rows={2}
                                                                    placeholder="Describe cómo se resolvió..."
                                                                    autoFocus
                                                                />
                                                                <div className="dc-cierre-resolucion-botones">
                                                                    <button
                                                                        className="dc-btn secondary"
                                                                        onClick={() => {
                                                                            setIncidenciaResolviendo(null);
                                                                            setResolucionTexto('');
                                                                        }}
                                                                    >
                                                                        Cancelar
                                                                    </button>
                                                                    <button
                                                                        className="dc-btn success"
                                                                        onClick={() => handleResolverIncidencia(inc.id)}
                                                                        disabled={!resolucionTexto.trim()}
                                                                    >
                                                                        <i className="fas fa-check"></i> Marcar como resuelta
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                className="dc-cierre-btn-resolver"
                                                                onClick={() => setIncidenciaResolviendo(inc.id)}
                                                            >
                                                                <i className="fas fa-wrench"></i> Marcar como resuelta
                                                            </button>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* 8. TIMELINE */}
                {metricas.timeline.length > 0 && (
                    <div className="dc-cierre-section">
                        <div
                            className="dc-cierre-section-title"
                            onClick={() => setTimelineExpandido(!timelineExpandido)}
                            style={{ cursor: 'pointer' }}
                        >
                            <i className="fas fa-stream"></i>
                            <span>Timeline del Evento</span>
                            <i className={`fas fa-chevron-${timelineExpandido ? 'up' : 'down'}`} style={{ marginLeft: 'auto' }}></i>
                        </div>
                        {timelineExpandido && (
                            <div className="dc-cierre-timeline">
                                {metricas.timeline.map((item: any, idx: number) => (
                                    <div key={idx} className={`dc-cierre-timeline-item ${item.tipo}`}>
                                        <div className="dc-cierre-timeline-hora">
                                            {formatHora(item.hora).split(' ')[1]}
                                        </div>
                                        <div className="dc-cierre-timeline-icono">
                                            {item.tipo === 'etapa_inicio' && <i className="fas fa-play-circle"></i>}
                                            {item.tipo === 'etapa_fin' && <i className="fas fa-check-circle"></i>}
                                            {item.tipo === 'incidencia' && <i className="fas fa-exclamation-triangle"></i>}
                                        </div>
                                        <div className="dc-cierre-timeline-descripcion">
                                            <div>{item.descripcion}</div>
                                            <div className="dc-cierre-timeline-meta">
                                                {item.tipo === 'incidencia' && (
                                                    <span className={`dc-cierre-area-badge-mini area-${item.etapa}`}>
                                                        <i className="fas fa-map-pin"></i>
                                                        {formatearNombreEtapa(item.etapa)}
                                                    </span>
                                                )}
                                                <span className="dc-cierre-timeline-usuario">
                                                    <i className="fas fa-user"></i> {item.usuario}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* 9. CHECKLIST DE CIERRE */}
                <div className="dc-cierre-section">
                    <div className="dc-cierre-section-title">
                        <i className="fas fa-tasks"></i>
                        <span>Checklist de Cierre ({verificados}/{totalAcciones})</span>
                    </div>
                    <div className="dc-checklist-container">
                        {ITEMS_CIERRE.map((item: string, idx: number) => {
                            const verificado = verificaciones[item] || false;
                            return (
                                <div key={idx} className={`dc-checklist-item ${verificado ? 'verificado' : ''}`}>
                                    <div className="dc-checklist-item-header">
                                        <div className="dc-checklist-item-left">
                                            <input
                                                type="checkbox"
                                                className="dc-checklist-item-checkbox"
                                                checked={verificado}
                                                onChange={() => onVerificar(item, !verificado)}
                                                disabled={!puedeActuar || verificado}
                                            />
                                            <div className="dc-checklist-item-info">
                                                <div className="dc-checklist-item-nombre">{item}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* OBSERVACIONES */}
                {puedeActuar && (
                    <div className="dc-input-group" style={{ marginTop: '1rem' }}>
                        <label>Observaciones finales (opcional)</label>
                        <textarea
                            value={obs}
                            onChange={(e) => setObs(e.target.value)}
                            rows={2}
                            placeholder="Notas de cierre del evento..."
                            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
                        />
                    </div>
                )}

                {/* ALERTA */}
                {!puedeConfirmar ? (
                    <div className="dc-cierre-alerta pendiente">
                        <i className="fas fa-exclamation-triangle"></i>
                        <span>
                            Faltan <strong>{totalAcciones - verificados}</strong> verificaciones antes de cerrar
                        </span>
                    </div>
                ) : (
                    <div className="dc-cierre-alerta listo">
                        <i className="fas fa-check-circle"></i>
                        <span>Todo verificado. Listo para cerrar el evento</span>
                    </div>
                )}
            </div>

            {/* FOOTER */}
            <div className="dc-etapa-footer">
                <button
                    className="dc-btn-incidencia"
                    onClick={onReportarIncidencia}
                    disabled={!puedeActuar}
                >
                    <i className="fas fa-exclamation-triangle"></i> Reportar Incidencia
                </button>
                <button
                    className="dc-btn-confirmar"
                    onClick={() => onConfirmar(obs)}
                    disabled={isSubmitting || !puedeConfirmar || !puedeActuar}
                >
                    {isSubmitting ? (
                        <><i className="fas fa-spinner fa-spin"></i> Cerrando...</>
                    ) : (
                        <><i className="fas fa-check-circle"></i> Cerrar Evento ({verificados}/{totalAcciones})</>
                    )}
                </button>
            </div>
        </>
    );
};

export const ETAPA_COMPONENTES: Record<string, React.FC<EtapaProps>> = {
    'verificacion_almacen': EtapaAlmacen,
    'preparacion_cocina': EtapaCocina,
    'carga_transporte': EtapaDespacho,
    'montaje_evento': EtapaMontaje,
    'recojo_evento': EtapaRecojo,
    'retorno_empresa': EtapaRetorno,
    'cierre': EtapaCierre
};