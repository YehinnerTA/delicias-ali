import React, { useState } from 'react';

export interface InlineIncidenciaData {
    motivo: string;
    severidad: 'baja' | 'media' | 'critica';
    descripcion: string;
    impacto: string;
}

interface InlineIncidenciaFormProps {
    itemNombre: string;
    unidad: string;
    onGuardar: (data: InlineIncidenciaData) => Promise<void>;
    onCancelar: () => void;
    isSubmitting?: boolean;
}

const MOTIVOS = [
    { value: 'perdida', label: 'Pérdida', icon: 'fa-question-circle' },
    { value: 'dano', label: 'Daño', icon: 'fa-broken-heart' },
    { value: 'robo', label: 'Robo', icon: 'fa-user-secret' },
    { value: 'error_conteo', label: 'Error de conteo', icon: 'fa-calculator' },
    { value: 'otro', label: 'Otro', icon: 'fa-ellipsis-h' }
];

const SEVERIDADES = [
    { value: 'baja' as const, label: 'Baja', color: '#28a745', descripcion: 'Impacto menor' },
    { value: 'media' as const, label: 'Media', color: '#ffc107', descripcion: 'Requiere atención' },
    { value: 'critica' as const, label: 'Crítica', color: '#dc3545', descripcion: 'Urgente' }
];

export const InlineIncidenciaForm: React.FC<InlineIncidenciaFormProps> = ({
    itemNombre,
    unidad,
    onGuardar,
    onCancelar,
    isSubmitting = false
}) => {
    const [motivo, setMotivo] = useState<string>('perdida');
    const [severidad, setSeveridad] = useState<'baja' | 'media' | 'critica'>('media');
    const [descripcion, setDescripcion] = useState<string>('');
    const [impacto, setImpacto] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);

    const handleGuardar = async () => {
        if (!descripcion.trim()) {
            return;
        }
        setIsSaving(true);
        try {
            await onGuardar({
                motivo,
                severidad,
                descripcion: descripcion.trim(),
                impacto: impacto.trim()
            });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="dc-inline-incidencia">
            <div className="dc-inline-incidencia-header">
                <i className="fas fa-exclamation-triangle"></i>
                <span>Reportar incidencia · {itemNombre}</span>
            </div>

            <div className="dc-inline-incidencia-body">
                <div className="dc-inline-incidencia-row">
                    <label>Motivo:</label>
                    <div className="dc-inline-incidencia-motivos">
                        {MOTIVOS.map(m => (
                            <button
                                key={m.value}
                                type="button"
                                className={`dc-inline-incidencia-chip ${motivo === m.value ? 'active' : ''}`}
                                onClick={() => setMotivo(m.value)}
                            >
                                <i className={`fas ${m.icon}`}></i> {m.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="dc-inline-incidencia-row">
                    <label>Severidad:</label>
                    <div className="dc-inline-incidencia-severidades">
                        {SEVERIDADES.map(s => (
                            <button
                                key={s.value}
                                type="button"
                                className={`dc-inline-incidencia-severidad ${severidad === s.value ? 'active' : ''}`}
                                style={{
                                    borderColor: severidad === s.value ? s.color : undefined,
                                    background: severidad === s.value ? `${s.color}15` : undefined
                                }}
                                onClick={() => setSeveridad(s.value)}
                            >
                                <span
                                    className="dc-inline-incidencia-dot"
                                    style={{ background: s.color }}
                                ></span>
                                <div>
                                    <div className="dc-inline-incidencia-severidad-label">{s.label}</div>
                                    <div className="dc-inline-incidencia-severidad-desc">{s.descripcion}</div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="dc-inline-incidencia-row">
                    <label>Descripción *</label>
                    <textarea
                        value={descripcion}
                        onChange={(e) => setDescripcion(e.target.value)}
                        rows={2}
                        placeholder="Describe qué pasó con este item..."
                        autoFocus
                    />
                </div>

                <div className="dc-inline-incidencia-row">
                    <label>Impacto estimado (opcional)</label>
                    <input
                        type="text"
                        value={impacto}
                        onChange={(e) => setImpacto(e.target.value)}
                        placeholder="Ej: Pérdida S/60, retraso 10 min, etc."
                    />
                </div>
            </div>

            <div className="dc-inline-incidencia-footer">
                <button
                    type="button"
                    className="dc-btn secondary"
                    onClick={onCancelar}
                    disabled={isSaving || isSubmitting}
                >
                    Cancelar
                </button>
                <button
                    type="button"
                    className="dc-btn warning"
                    onClick={handleGuardar}
                    disabled={!descripcion.trim() || isSaving || isSubmitting}
                >
                    {isSaving || isSubmitting ? (
                        <><i className="fas fa-spinner fa-spin"></i> Registrando...</>
                    ) : (
                        <><i className="fas fa-paper-plane"></i> Registrar Incidencia</>
                    )}
                </button>
            </div>
        </div>
    );
};