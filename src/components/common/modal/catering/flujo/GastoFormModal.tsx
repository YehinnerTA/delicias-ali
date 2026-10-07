import React, { useState, useEffect } from 'react';
import { Modal } from '../../Modal';
import { NuevoProveedorModal } from './NuevoProveedorModal';
import { cateringGastoApi } from '../../../../../services/api/cateringGastoApi';
import { personaApi } from '../../../../../services/api/personaApi';
import { Persona } from '../../../../../features/types/person';
import {
    CategoriaGasto,
    GastoEvento
} from '../../../../../features/types/catering';
import { useToast } from '../../../../../hooks/base/useToast';

interface GastoFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    idEmpresa: number;
    idEvento: number;
    usuarioId: number;
    idChecklistItem?: number | null;
    descripcion: string;
    cantidadRequerida: number;
    unidad: string | null;
    categoria: CategoriaGasto;
    etapa: string;
    gastoExistente?: GastoEvento | null;
    onGastoGuardado: (gasto: GastoEvento) => void;
    onGastoEliminado?: (idGasto: number) => void;
}

export const GastoFormModal: React.FC<GastoFormModalProps> = ({
    isOpen,
    onClose,
    idEmpresa,
    idEvento,
    usuarioId,
    idChecklistItem,
    descripcion,
    cantidadRequerida,
    unidad,
    categoria,
    etapa,
    gastoExistente,
    onGastoGuardado,
    onGastoEliminado
}) => {
    const { showToast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingProveedores, setIsLoadingProveedores] = useState(false);
    const [nuevoProveedorAbierto, setNuevoProveedorAbierto] = useState(false);

    const [cantidad, setCantidad] = useState<number>(cantidadRequerida);
    const [precioUnitario, setPrecioUnitario] = useState<number>(0);
    const [tieneFactura, setTieneFactura] = useState<boolean>(false);
    const [numeroFactura, setNumeroFactura] = useState<string>('');
    const [idProveedor, setIdProveedor] = useState<number | null>(null);
    const [observaciones, setObservaciones] = useState<string>('');

    const [proveedores, setProveedores] = useState<Persona[]>([]);

    const subtotal = cantidad > 0 && precioUnitario > 0
        ? parseFloat((cantidad * precioUnitario).toFixed(2))
        : 0;

    useEffect(() => {
        if (!isOpen) return;

        if (gastoExistente) {
            setCantidad(gastoExistente.cantidad);
            setPrecioUnitario(gastoExistente.precio_unitario);
            setTieneFactura(gastoExistente.tiene_factura);
            setNumeroFactura(gastoExistente.numero_factura || '');
            setIdProveedor(gastoExistente.id_proveedor);
            setObservaciones(gastoExistente.observaciones || '');
        } else {
            setCantidad(cantidadRequerida);
            setPrecioUnitario(0);
            setTieneFactura(false);
            setNumeroFactura('');
            setIdProveedor(null);
            setObservaciones('');
        }
    }, [isOpen, gastoExistente, cantidadRequerida]);

    useEffect(() => {
        if (!isOpen) return;

        const cargarProveedores = async () => {
            setIsLoadingProveedores(true);
            try {
                const todas = await personaApi.getAll(idEmpresa);
                const soloProveedores = todas.filter(p => p.tipo_persona === 'proveedor' && p.estado);
                setProveedores(soloProveedores);
            } catch (error) {
                console.error('[GastoFormModal] Error al cargar proveedores:', error);
            } finally {
                setIsLoadingProveedores(false);
            }
        };

        cargarProveedores();
    }, [isOpen, idEmpresa]);

    const handleGuardar = async () => {
        if (cantidad <= 0) {
            showToast('La cantidad debe ser mayor a 0', 'warning', 'Validación');
            return;
        }
        if (precioUnitario <= 0) {
            showToast('El precio unitario debe ser mayor a 0', 'warning', 'Validación');
            return;
        }

        setIsSubmitting(true);
        try {
            if (gastoExistente) {
                const actualizado = await cateringGastoApi.update(gastoExistente.id, {
                    id_empresa: idEmpresa,
                    cantidad,
                    precio_unitario: precioUnitario,
                    id_proveedor: idProveedor,
                    tiene_factura: tieneFactura,
                    numero_factura: numeroFactura || null,
                    observaciones: observaciones || null
                });
                showToast('Gasto actualizado', 'success', 'Guardado');
                onGastoGuardado(actualizado);
            } else {
                const nuevo = await cateringGastoApi.create({
                    id_empresa: idEmpresa,
                    id_evento: idEvento,
                    id_checklist_item: idChecklistItem || null,
                    categoria,
                    etapa,
                    descripcion,
                    cantidad,
                    unidad,
                    precio_unitario: precioUnitario,
                    id_proveedor: idProveedor,
                    tiene_factura: tieneFactura,
                    numero_factura: numeroFactura || null,
                    fecha_gasto: new Date().toISOString().split('T')[0],
                    observaciones: observaciones || null,
                    registrado_por: usuarioId
                });
                showToast(`Gasto registrado: S/ ${nuevo.subtotal.toFixed(2)}`, 'success', 'Guardado');
                onGastoGuardado(nuevo);
            }
            onClose();
        } catch (error: any) {
            console.error('[GastoFormModal] Error:', error);
            showToast(error.message || 'Error al guardar el gasto', 'error', 'Error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEliminar = async () => {
        if (!gastoExistente) return;
        if (!window.confirm('¿Eliminar este gasto? Se perderá el registro.')) return;

        setIsSubmitting(true);
        try {
            await cateringGastoApi.delete(gastoExistente.id, idEmpresa);
            showToast('Gasto eliminado', 'info', 'Eliminado');
            if (onGastoEliminado) onGastoEliminado(gastoExistente.id);
            onClose();
        } catch (error: any) {
            console.error('[GastoFormModal] Error al eliminar:', error);
            showToast(error.message || 'Error al eliminar', 'error', 'Error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleProveedorCreado = (nuevo: Persona) => {
        setProveedores(prev => [...prev, nuevo]);
        setIdProveedor(nuevo.id_persona);
        showToast(`Proveedor "${nuevo.razon_social || nuevo.nombre}" seleccionado`, 'info', 'Proveedor');
    };

    const handleClose = () => {
        if (isSubmitting) return;
        onClose();
    };

    const modalFooter = (
        <>
            {gastoExistente && (
                <button
                    className="dc-btn danger"
                    onClick={handleEliminar}
                    disabled={isSubmitting}
                    style={{ marginRight: 'auto' }}
                >
                    <i className="fas fa-trash"></i> Eliminar
                </button>
            )}
            <button className="dc-btn secondary" onClick={handleClose} disabled={isSubmitting}>
                <i className="fas fa-times"></i> Cancelar
            </button>
            <button className="dc-btn success" onClick={handleGuardar} disabled={isSubmitting}>
                {isSubmitting ? (
                    <><i className="fas fa-spinner fa-spin"></i> Guardando...</>
                ) : (
                    <><i className="fas fa-save"></i> {gastoExistente ? 'Actualizar' : 'Guardar'} Costo</>
                )}
            </button>
        </>
    );

    return (
        <>
            <Modal
                isOpen={isOpen}
                onClose={handleClose}
                title={`${gastoExistente ? 'Editar' : 'Registrar'} Gasto — ${descripcion}`}
                icon="fa-money-bill-wave"
                footer={modalFooter}
                size="md"
            >
                <div className="dc-form-grid">
                    {/* Cantidad */}
                    <div className="dc-input-group">
                        <label>Cantidad:</label>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={cantidad}
                            onChange={(e) => setCantidad(parseFloat(e.target.value) || 0)}
                            disabled={isSubmitting}
                        />
                        {unidad && (
                            <small style={{ color: '#666', fontSize: '0.75rem' }}>
                                Unidad: {unidad}
                            </small>
                        )}
                    </div>

                    {/* Precio unitario */}
                    <div className="dc-input-group">
                        <label>Precio unitario (S/):</label>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={precioUnitario}
                            onChange={(e) => setPrecioUnitario(parseFloat(e.target.value) || 0)}
                            disabled={isSubmitting}
                            autoFocus={!gastoExistente}
                        />
                    </div>

                    {/* Subtotal (readonly, calculado) */}
                    <div className="dc-input-group" style={{ gridColumn: 'span 2' }}>
                        <label>Subtotal:</label>
                        <div style={{
                            padding: '10px 12px',
                            background: '#f5f5f5',
                            borderRadius: '6px',
                            fontSize: '1.1rem',
                            fontWeight: 'bold',
                            color: '#d90a46',
                            textAlign: 'right'
                        }}>
                            S/ {subtotal.toFixed(2)}
                        </div>
                    </div>

                    {/* Separador */}
                    <div style={{ gridColumn: 'span 2', borderTop: '1px solid #eee', margin: '8px 0' }} />

                    {/* ¿Tiene factura? */}
                    <div className="dc-input-group">
                        <label>¿Tiene factura?</label>
                        <select
                            value={tieneFactura ? 'si' : 'no'}
                            onChange={(e) => setTieneFactura(e.target.value === 'si')}
                            disabled={isSubmitting}
                        >
                            <option value="no">No</option>
                            <option value="si">Sí</option>
                        </select>
                    </div>

                    {/* N° factura (condicional) */}
                    {tieneFactura && (
                        <div className="dc-input-group">
                            <label>N° Factura:</label>
                            <input
                                type="text"
                                placeholder="Ej: F001-2345"
                                value={numeroFactura}
                                onChange={(e) => setNumeroFactura(e.target.value)}
                                disabled={isSubmitting}
                            />
                        </div>
                    )}

                    {/* Separador */}
                    <div style={{ gridColumn: 'span 2', borderTop: '1px solid #eee', margin: '8px 0' }} />

                    {/* Proveedor */}
                    <div className="dc-input-group" style={{ gridColumn: 'span 2' }}>
                        <label>Proveedor:</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <select
                                value={idProveedor ?? ''}
                                onChange={(e) => setIdProveedor(e.target.value ? parseInt(e.target.value) : null)}
                                disabled={isSubmitting || isLoadingProveedores}
                                style={{ flex: 1 }}
                            >
                                <option value="">
                                    {isLoadingProveedores ? 'Cargando...' : 'Seleccionar proveedor...'}
                                </option>
                                {proveedores.map((p) => (
                                    <option key={p.id_persona} value={p.id_persona}>
                                        {p.razon_social || `${p.nombre || ''} ${p.apellido || ''}`.trim()}
                                        {p.numero_documento ? ` (${p.numero_documento})` : ''}
                                    </option>
                                ))}
                            </select>
                            <button
                                className="dc-btn info"
                                onClick={() => setNuevoProveedorAbierto(true)}
                                disabled={isSubmitting}
                                title="Agregar nuevo proveedor"
                            >
                                <i className="fas fa-plus"></i> Nuevo
                            </button>
                        </div>
                    </div>

                    {/* Observaciones */}
                    <div className="dc-input-group" style={{ gridColumn: 'span 2' }}>
                        <label>Observaciones (opcional):</label>
                        <textarea
                            rows={2}
                            placeholder="Ej: Compra urgente, precio especial..."
                            value={observaciones}
                            onChange={(e) => setObservaciones(e.target.value)}
                            disabled={isSubmitting}
                            style={{
                                width: '100%',
                                padding: '8px',
                                borderRadius: '4px',
                                border: '1px solid #ccc',
                                fontFamily: 'inherit'
                            }}
                        />
                    </div>
                </div>
            </Modal>

            {/* Modal anidado para crear proveedor */}
            <NuevoProveedorModal
                isOpen={nuevoProveedorAbierto}
                onClose={() => setNuevoProveedorAbierto(false)}
                idEmpresa={idEmpresa}
                onProveedorCreado={handleProveedorCreado}
            />
        </>
    );
};