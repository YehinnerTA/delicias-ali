import React, { useState, useEffect } from 'react';
import { EtapaEvento } from '../../../../../services/api/cateringEventoApi';
import { VentaCatering } from '../../../../../features/types/catering';
import { cateringCalculoService, ProductoCalculado, IngredienteCalculado, MaterialCalculado } from '../../../../../services/api/calculo/CateringCalculoService';
import { useCompany } from '../../../../../features/company/context/CompanyContext';

interface EtapaProps {
    etapa: EtapaEvento;
    venta: VentaCatering | null;
    verificaciones: Record<string, boolean>;
    puedeActuar: boolean;
    onVerificar: (nombreItem: string, verificado: boolean) => void;
    onConfirmar: (observaciones?: string) => void;
    onReportarIncidencia: () => void;
    isSubmitting: boolean;
}

// =====================================================
// 1. ALMACÉN - Lista de compras
// =====================================================
export const EtapaAlmacen: React.FC<EtapaProps> = ({ venta, verificaciones, puedeActuar, onVerificar, onConfirmar, onReportarIncidencia, isSubmitting }) => {
    const { getSelectedCompanyId } = useCompany();
    const id_empresa = getSelectedCompanyId() ?? 0;

    const [obs, setObs] = useState('');
    const [ingredientes, setIngredientes] = useState<IngredienteCalculado[]>([]);
    const [materiales, setMateriales] = useState<MaterialCalculado[]>([]);
    const [isLoading, setIsLoading] = useState(true);

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

    const totalItems = ingredientes.length + materiales.length;
    const verificados = [...ingredientes, ...materiales].filter(i => verificaciones[i.nombre]).length;

    if (isLoading) {
        return <div style={{ textAlign: 'center', padding: '2rem' }}><i className="fas fa-spinner fa-spin"></i> Calculando lista...</div>;
    }

    return (
        <>
            <div className="dc-etapa-header">
                <div className="dc-etapa-title"><i className="fas fa-boxes"></i> Verificación de Almacén</div>
                <span className="dc-estado-badge compra_pendiente">{verificados}/{totalItems} comprados</span>
            </div>
            <div className="dc-etapa-body">
                <div className="dc-etapa-subtitle"><i className="fas fa-shopping-basket"></i> Lista de compras</div>

                <div className="dc-checklist-container">
                    {/* Ingredientes */}
                    {ingredientes.map((ing, idx) => {
                        const verificado = verificaciones[ing.nombre] || false;
                        return (
                            <div key={`ing-${idx}`} className={`dc-checklist-item ${verificado ? 'verificado' : ''}`}>
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
                                            <div className="dc-checklist-item-nombre">{ing.nombre}</div>
                                        </div>
                                    </div>
                                    <div className="dc-checklist-item-cantidad">
                                        <strong>{ing.cantidad.toFixed(2)}</strong> {ing.unidad}
                                    </div>
                                </div>
                                {ing.proveedores.length > 0 && (
                                    <div className="dc-checklist-item-proveedores">
                                        {ing.proveedores.map((prov, i) => (
                                            <React.Fragment key={i}>
                                                {prov.telefono && (
                                                    <a href={`tel:${prov.telefono}`} className="dc-checklist-btn-proveedor dc-btn-llamar">
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

                    {/* Materiales */}
                    {materiales.map((mat, idx) => {
                        const verificado = verificaciones[mat.nombre] || false;
                        return (
                            <div key={`mat-${idx}`} className={`dc-checklist-item ${verificado ? 'verificado' : ''}`}>
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

                {puedeActuar && (
                    <div className="dc-input-group" style={{ marginTop: '1rem' }}>
                        <label>Observaciones (opcional)</label>
                        <textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={2} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }} />
                    </div>
                )}
            </div>
            <div className="dc-etapa-footer">
                <button className="dc-btn-incidencia" onClick={onReportarIncidencia} disabled={!puedeActuar}>
                    <i className="fas fa-exclamation-triangle"></i> Reportar Incidencia
                </button>
                <button className="dc-btn-confirmar" onClick={() => onConfirmar(obs)} disabled={isSubmitting || verificados < totalItems || !puedeActuar}>
                    {isSubmitting ? <><i className="fas fa-spinner fa-spin"></i> Confirmando...</> : <><i className="fas fa-paper-plane"></i> Enviar a Cocina</>}
                </button>
            </div>
        </>
    );
};

// =====================================================
// 2. COCINA - Productos a preparar
// =====================================================
export const EtapaCocina: React.FC<EtapaProps> = ({ venta, verificaciones, puedeActuar, onVerificar, onConfirmar, onReportarIncidencia, isSubmitting }) => {
    const { getSelectedCompanyId } = useCompany();
    const id_empresa = getSelectedCompanyId() ?? 0;

    const [obs, setObs] = useState('');
    const [productos, setProductos] = useState<ProductoCalculado[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        (async () => {
            setIsLoading(true);
            try {
                const prods = await cateringCalculoService.calcularProductos(venta, id_empresa);
                setProductos(prods);
            } finally {
                setIsLoading(false);
            }
        })();
    }, [venta, id_empresa]);

    const verificados = productos.filter(p => verificaciones[`${p.nombre} x${p.cantidad}`]).length;

    if (isLoading) {
        return <div style={{ textAlign: 'center', padding: '2rem' }}><i className="fas fa-spinner fa-spin"></i> Calculando productos...</div>;
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

    return (
        <>
            <div className="dc-etapa-header">
                <div className="dc-etapa-title"><i className="fas fa-utensils"></i> Preparación en Cocina</div>
                <span className="dc-estado-badge en_preparacion">{verificados}/{productos.length} preparados</span>
            </div>

            <div className="dc-etapa-body">
                <div className="dc-etapa-subtitle"><i className="fas fa-clipboard-check"></i> Órdenes de preparación</div>

                <div className="dc-cocina-grid">
                    {productos.map((prod, idx) => {
                        const key = `${prod.nombre} x${prod.cantidad}`;
                        const verificado = verificaciones[key] || false;

                        return (
                            <div key={idx} className={`dc-cocina-card ${verificado ? 'verificado' : ''}`}>
                                <div className="dc-cocina-card-header">
                                    <div className="dc-cocina-card-left">
                                        <input
                                            type="checkbox"
                                            className="dc-cocina-checkbox"
                                            checked={verificado}
                                            onChange={() => onVerificar(key, !verificado)}
                                            disabled={!puedeActuar || verificado}
                                        />
                                        <div>
                                            <div className="dc-cocina-card-titulo">{prod.nombre}</div>
                                            <div className="dc-cocina-card-cantidad">
                                                <i className="fas fa-hashtag"></i> Cantidad: <strong>{prod.cantidad}</strong>
                                            </div>
                                        </div>
                                    </div>
                                    {verificado && (
                                        <div className="dc-cocina-card-verificado">
                                            <i className="fas fa-check-circle"></i> Preparado
                                        </div>
                                    )}
                                </div>

                                <div className="dc-cocina-info-row">
                                    <span className="dc-cocina-info-label">Cálculo:</span>
                                    <span>{prod.descripcionCalculo}</span>
                                </div>

                                <div className="dc-cocina-insumos">
                                    <div className="dc-cocina-insumos-titulo">
                                        <i className="fas fa-boxes"></i> Insumos necesarios:
                                    </div>
                                    {prod.ingredientes.map((ing, i) => (
                                        <div key={i} className="dc-cocina-insumo-item">
                                            • <strong>{ing.nombre}</strong> — {ing.cantidad.toFixed(2)} {ing.unidad}
                                            {ing.proveedores.length > 0 && (
                                                <span style={{ marginLeft: '0.5rem', color: '#666', fontSize: '0.8rem' }}>
                                                    ({ing.proveedores[0].nombre})
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {!verificado && puedeActuar && (
                                    <div className="dc-cocina-card-footer">
                                        <button
                                            className="dc-btn success"
                                            style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                                            onClick={() => onVerificar(key, true)}
                                        >
                                            <i className="fas fa-check"></i> Marcar como preparado
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {puedeActuar && (
                    <div className="dc-input-group" style={{ marginTop: '1rem' }}>
                        <label>Observaciones (opcional)</label>
                        <textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={2} placeholder="Notas..." style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }} />
                    </div>
                )}
            </div>

            <div className="dc-etapa-footer">
                <button className="dc-btn-incidencia" onClick={onReportarIncidencia} disabled={!puedeActuar}>
                    <i className="fas fa-exclamation-triangle"></i> Reportar Incidencia
                </button>
                <button className="dc-btn-confirmar" onClick={() => onConfirmar(obs)} disabled={isSubmitting || verificados < productos.length || !puedeActuar}>
                    {isSubmitting ? <><i className="fas fa-spinner fa-spin"></i> Confirmando...</> : <><i className="fas fa-paper-plane"></i> Enviar a Despacho</>}
                </button>
            </div>
        </>
    );
};

// =====================================================
// 3. DESPACHO - Productos + Materiales
// =====================================================
export const EtapaDespacho: React.FC<EtapaProps> = ({ venta, verificaciones, puedeActuar, onVerificar, onConfirmar, onReportarIncidencia, isSubmitting }) => {
    const { getSelectedCompanyId } = useCompany();
    const id_empresa = getSelectedCompanyId() ?? 0;

    const [obs, setObs] = useState('');
    const [productos, setProductos] = useState<ProductoCalculado[]>([]);
    const [materiales, setMateriales] = useState<MaterialCalculado[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        (async () => {
            setIsLoading(true);
            try {
                const prods = await cateringCalculoService.calcularProductos(venta, id_empresa);
                const mats = cateringCalculoService.calcularMateriales(venta);
                setProductos(prods);
                setMateriales(mats);
            } finally {
                setIsLoading(false);
            }
        })();
    }, [venta, id_empresa]);

    const totalItems = productos.length + materiales.length;
    const verificados = [
        ...productos.filter(p => verificaciones[`carga:${p.nombre} x${p.cantidad}`]),
        ...materiales.filter(m => verificaciones[`carga:${m.nombre}`])
    ].length;

    if (isLoading) {
        return <div style={{ textAlign: 'center', padding: '2rem' }}><i className="fas fa-spinner fa-spin"></i> Calculando carga...</div>;
    }

    return (
        <>
            <div className="dc-etapa-header">
                <div className="dc-etapa-title"><i className="fas fa-truck-loading"></i> Carga y Transporte</div>
                <span className="dc-estado-badge listo_para_envio">{verificados}/{totalItems} cargados</span>
            </div>
            <div className="dc-etapa-body">
                <div className="dc-etapa-subtitle"><i className="fas fa-clipboard-list"></i> Checklist de carga</div>

                {/* Productos */}
                {productos.length > 0 && (
                    <>
                        <h5 style={{ marginTop: '0.5rem', marginBottom: '0.5rem', color: '#007bff' }}>
                            <i className="fas fa-utensils"></i> Productos preparados
                        </h5>
                        <div className="dc-checklist-container">
                            {productos.map((prod, idx) => {
                                const key = `carga:${prod.nombre} x${prod.cantidad}`;
                                const verificado = verificaciones[key] || false;
                                return (
                                    <div key={idx} className={`dc-checklist-item ${verificado ? 'verificado' : ''}`}>
                                        <div className="dc-checklist-item-header">
                                            <div className="dc-checklist-item-left">
                                                <input type="checkbox" className="dc-checklist-item-checkbox" checked={verificado} onChange={() => onVerificar(key, !verificado)} disabled={!puedeActuar || verificado} />
                                                <div className="dc-checklist-item-info">
                                                    <div className="dc-checklist-item-nombre">{prod.nombre}</div>
                                                </div>
                                            </div>
                                            <div className="dc-checklist-item-cantidad"><strong>{prod.cantidad}</strong> und</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}

                {/* Materiales */}
                {materiales.length > 0 && (
                    <>
                        <h5 style={{ marginTop: '1rem', marginBottom: '0.5rem', color: '#007bff' }}>
                            <i className="fas fa-chair"></i> Materiales
                        </h5>
                        <div className="dc-checklist-container">
                            {materiales.map((mat, idx) => {
                                const key = `carga:${mat.nombre}`;
                                const verificado = verificaciones[key] || false;
                                return (
                                    <div key={idx} className={`dc-checklist-item ${verificado ? 'verificado' : ''}`}>
                                        <div className="dc-checklist-item-header">
                                            <div className="dc-checklist-item-left">
                                                <input type="checkbox" className="dc-checklist-item-checkbox" checked={verificado} onChange={() => onVerificar(key, !verificado)} disabled={!puedeActuar || verificado} />
                                                <div className="dc-checklist-item-info">
                                                    <div className="dc-checklist-item-nombre">{mat.nombre}</div>
                                                </div>
                                            </div>
                                            <div className="dc-checklist-item-cantidad"><strong>{mat.cantidad}</strong> und</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}

                {puedeActuar && (
                    <div className="dc-input-group" style={{ marginTop: '1rem' }}>
                        <label>Observaciones (opcional)</label>
                        <textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={2} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }} />
                    </div>
                )}
            </div>
            <div className="dc-etapa-footer">
                <button className="dc-btn-incidencia" onClick={onReportarIncidencia} disabled={!puedeActuar}>
                    <i className="fas fa-exclamation-triangle"></i> Reportar Incidencia
                </button>
                <button className="dc-btn-confirmar" onClick={() => onConfirmar(obs)} disabled={isSubmitting || verificados < totalItems || !puedeActuar}>
                    {isSubmitting ? <><i className="fas fa-spinner fa-spin"></i> Confirmando...</> : <><i className="fas fa-truck"></i> Confirmar Salida</>}
                </button>
            </div>
        </>
    );
};

// =====================================================
// 4. MONTAJE - Checklist fijo
// =====================================================
const ITEMS_MONTAJE = [
    'Llegar al evento a tiempo',
    'Montar mesas y sillas',
    'Colocar productos según pedido',
    'Verificar con el cliente',
    'Tomar foto de conformidad'
];

export const EtapaMontaje: React.FC<EtapaProps> = ({ verificaciones, puedeActuar, onVerificar, onConfirmar, onReportarIncidencia, isSubmitting }) => {
    const [obs, setObs] = useState('');
    const verificados = ITEMS_MONTAJE.filter(i => verificaciones[i]).length;

    return (
        <>
            <div className="dc-etapa-header">
                <div className="dc-etapa-title"><i className="fas fa-glass-cheers"></i> Montaje en Evento</div>
                <span className="dc-estado-badge en_evento">{verificados}/{ITEMS_MONTAJE.length} montados</span>
            </div>
            <div className="dc-etapa-body">
                <div className="dc-etapa-subtitle"><i className="fas fa-tools"></i> Checklist de montaje</div>
                <div className="dc-checklist-container">
                    {ITEMS_MONTAJE.map((item, idx) => {
                        const verificado = verificaciones[item] || false;
                        return (
                            <div key={idx} className={`dc-checklist-item ${verificado ? 'verificado' : ''}`}>
                                <div className="dc-checklist-item-header">
                                    <div className="dc-checklist-item-left">
                                        <input type="checkbox" className="dc-checklist-item-checkbox" checked={verificado} onChange={() => onVerificar(item, !verificado)} disabled={!puedeActuar || verificado} />
                                        <div className="dc-checklist-item-info">
                                            <div className="dc-checklist-item-nombre">{item}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
                {puedeActuar && (
                    <div className="dc-input-group" style={{ marginTop: '1rem' }}>
                        <label>Observaciones (opcional)</label>
                        <textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={2} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }} />
                    </div>
                )}
            </div>
            <div className="dc-etapa-footer">
                <button className="dc-btn-incidencia" onClick={onReportarIncidencia} disabled={!puedeActuar}><i className="fas fa-exclamation-triangle"></i> Reportar Incidencia</button>
                <button className="dc-btn-confirmar" onClick={() => onConfirmar(obs)} disabled={isSubmitting || verificados < ITEMS_MONTAJE.length || !puedeActuar}>
                    {isSubmitting ? <><i className="fas fa-spinner fa-spin"></i> Confirmando...</> : <><i className="fas fa-check-circle"></i> Montaje Terminado</>}
                </button>
            </div>
        </>
    );
};

// =====================================================
// 5. RECOJO - Checklist fijo
// =====================================================
const ITEMS_RECOJO = [
    'Recoger todos los materiales',
    'Recoger productos sobrantes',
    'Desmontar mesas y sillas',
    'Confirmar con el cliente'
];

export const EtapaRecojo: React.FC<EtapaProps> = ({ verificaciones, puedeActuar, onVerificar, onConfirmar, onReportarIncidencia, isSubmitting }) => {
    const [obs, setObs] = useState('');
    const verificados = ITEMS_RECOJO.filter(i => verificaciones[i]).length;

    return (
        <>
            <div className="dc-etapa-header">
                <div className="dc-etapa-title"><i className="fas fa-undo"></i> Recojo del Evento</div>
                <span className="dc-estado-badge en_retorno">{verificados}/{ITEMS_RECOJO.length} recogidos</span>
            </div>
            <div className="dc-etapa-body">
                <div className="dc-etapa-subtitle"><i className="fas fa-box-open"></i> Checklist de recojo</div>
                <div className="dc-checklist-container">
                    {ITEMS_RECOJO.map((item, idx) => {
                        const verificado = verificaciones[item] || false;
                        return (
                            <div key={idx} className={`dc-checklist-item ${verificado ? 'verificado' : ''}`}>
                                <div className="dc-checklist-item-header">
                                    <div className="dc-checklist-item-left">
                                        <input type="checkbox" className="dc-checklist-item-checkbox" checked={verificado} onChange={() => onVerificar(item, !verificado)} disabled={!puedeActuar || verificado} />
                                        <div className="dc-checklist-item-info">
                                            <div className="dc-checklist-item-nombre">{item}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
                {puedeActuar && (
                    <div className="dc-input-group" style={{ marginTop: '1rem' }}>
                        <label>Observaciones (opcional)</label>
                        <textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={2} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }} />
                    </div>
                )}
            </div>
            <div className="dc-etapa-footer">
                <button className="dc-btn-incidencia" onClick={onReportarIncidencia} disabled={!puedeActuar}><i className="fas fa-exclamation-triangle"></i> Reportar Incidencia</button>
                <button className="dc-btn-confirmar" onClick={() => onConfirmar(obs)} disabled={isSubmitting || verificados < ITEMS_RECOJO.length || !puedeActuar}>
                    {isSubmitting ? <><i className="fas fa-spinner fa-spin"></i> Confirmando...</> : <><i className="fas fa-home"></i> Confirmar Retorno</>}
                </button>
            </div>
        </>
    );
};

// =====================================================
// 6. RETORNO - Checklist fijo
// =====================================================
const ITEMS_RETORNO = [
    'Contar todo lo que regresó',
    'Verificar estado de materiales',
    'Registrar pérdidas si hay'
];

export const EtapaRetorno: React.FC<EtapaProps> = ({ verificaciones, puedeActuar, onVerificar, onConfirmar, onReportarIncidencia, isSubmitting }) => {
    const [obs, setObs] = useState('');
    const verificados = ITEMS_RETORNO.filter(i => verificaciones[i]).length;

    return (
        <>
            <div className="dc-etapa-header">
                <div className="dc-etapa-title"><i className="fas fa-home"></i> Retorno a Empresa</div>
                <span className="dc-estado-badge retornado">{verificados}/{ITEMS_RETORNO.length} verificados</span>
            </div>
            <div className="dc-etapa-body">
                <div className="dc-etapa-subtitle"><i className="fas fa-clipboard-check"></i> Verificación de retorno</div>
                <div className="dc-checklist-container">
                    {ITEMS_RETORNO.map((item, idx) => {
                        const verificado = verificaciones[item] || false;
                        return (
                            <div key={idx} className={`dc-checklist-item ${verificado ? 'verificado' : ''}`}>
                                <div className="dc-checklist-item-header">
                                    <div className="dc-checklist-item-left">
                                        <input type="checkbox" className="dc-checklist-item-checkbox" checked={verificado} onChange={() => onVerificar(item, !verificado)} disabled={!puedeActuar || verificado} />
                                        <div className="dc-checklist-item-info">
                                            <div className="dc-checklist-item-nombre">{item}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
                {puedeActuar && (
                    <div className="dc-input-group" style={{ marginTop: '1rem' }}>
                        <label>Observaciones (opcional)</label>
                        <textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={2} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }} />
                    </div>
                )}
            </div>
            <div className="dc-etapa-footer">
                <button className="dc-btn-incidencia" onClick={onReportarIncidencia} disabled={!puedeActuar}><i className="fas fa-exclamation-triangle"></i> Reportar Incidencia</button>
                <button className="dc-btn-confirmar" onClick={() => onConfirmar(obs)} disabled={isSubmitting || verificados < ITEMS_RETORNO.length || !puedeActuar}>
                    {isSubmitting ? <><i className="fas fa-spinner fa-spin"></i> Confirmando...</> : <><i className="fas fa-flag-checkered"></i> Cerrar Operación</>}
                </button>
            </div>
        </>
    );
};

// =====================================================
// 7. CIERRE - Checklist fijo
// =====================================================
const ITEMS_CIERRE = [
    'Confirmar pago del cliente',
    'Verificar totales vs entregado',
    'Cerrar evento'
];

export const EtapaCierre: React.FC<EtapaProps> = ({ verificaciones, puedeActuar, onVerificar, onConfirmar, onReportarIncidencia, isSubmitting }) => {
    const [obs, setObs] = useState('');
    const verificados = ITEMS_CIERRE.filter(i => verificaciones[i]).length;

    return (
        <>
            <div className="dc-etapa-header">
                <div className="dc-etapa-title"><i className="fas fa-check-double"></i> Cierre Administrativo</div>
                <span className="dc-estado-badge cerrado">{verificados}/{ITEMS_CIERRE.length} verificados</span>
            </div>
            <div className="dc-etapa-body">
                <div className="dc-etapa-subtitle"><i className="fas fa-file-signature"></i> Checklist de cierre</div>
                <div className="dc-checklist-container">
                    {ITEMS_CIERRE.map((item, idx) => {
                        const verificado = verificaciones[item] || false;
                        return (
                            <div key={idx} className={`dc-checklist-item ${verificado ? 'verificado' : ''}`}>
                                <div className="dc-checklist-item-header">
                                    <div className="dc-checklist-item-left">
                                        <input type="checkbox" className="dc-checklist-item-checkbox" checked={verificado} onChange={() => onVerificar(item, !verificado)} disabled={!puedeActuar || verificado} />
                                        <div className="dc-checklist-item-info">
                                            <div className="dc-checklist-item-nombre">{item}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
                {puedeActuar && (
                    <div className="dc-input-group" style={{ marginTop: '1rem' }}>
                        <label>Observaciones (opcional)</label>
                        <textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={2} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }} />
                    </div>
                )}
            </div>
            <div className="dc-etapa-footer">
                <button className="dc-btn-incidencia" onClick={onReportarIncidencia} disabled={!puedeActuar}><i className="fas fa-exclamation-triangle"></i> Reportar Incidencia</button>
                <button className="dc-btn-confirmar" onClick={() => onConfirmar(obs)} disabled={isSubmitting || !puedeActuar}>
                    {isSubmitting ? <><i className="fas fa-spinner fa-spin"></i> Cerrando...</> : <><i className="fas fa-check-circle"></i> Cerrar Evento</>}
                </button>
            </div>
        </>
    );
};

// =====================================================
// MAPA ETAPA → COMPONENTE
// =====================================================
export const ETAPA_COMPONENTES: Record<string, React.FC<EtapaProps>> = {
    'verificacion_almacen': EtapaAlmacen,
    'preparacion_cocina': EtapaCocina,
    'carga_transporte': EtapaDespacho,
    'montaje_evento': EtapaMontaje,
    'recojo_evento': EtapaRecojo,
    'retorno_empresa': EtapaRetorno,
    'cierre': EtapaCierre
};