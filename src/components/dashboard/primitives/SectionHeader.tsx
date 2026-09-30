import React from 'react';

export type PeriodoType = 'hoy' | '7d' | '30d' | 'mes';

interface PeriodoOption {
    key: PeriodoType;
    label: string;
}

interface SectionHeaderProps {
    userName: string;
    fecha?: Date;
    periodos?: PeriodoOption[];
    periodoActivo?: PeriodoType;
    onPeriodoChange?: (periodo: PeriodoType) => void;
}

const DEFAULT_PERIODOS: PeriodoOption[] = [
    { key: 'hoy', label: 'Hoy' },
    { key: '7d', label: '7 días' },
    { key: '30d', label: '30 días' },
    { key: 'mes', label: 'Este mes' },
];

const getSaludo = (date: Date): string => {
    const hora = date.getHours();
    if (hora < 12) return 'Buenos días';
    if (hora < 19) return 'Buenas tardes';
    return 'Buenas noches';
};

const formatFecha = (date: Date): string => {
    const opciones: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    };
    const str = date.toLocaleDateString('es-PE', opciones);
    return str.charAt(0).toUpperCase() + str.slice(1);
};

const formatHora = (date: Date): string => {
    return date.toLocaleTimeString('es-PE', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    });
};

const SectionHeader: React.FC<SectionHeaderProps> = ({
    userName,
    fecha = new Date(),
    periodos = DEFAULT_PERIODOS,
    periodoActivo,
    onPeriodoChange,
}) => {
    const mostrarSelector = periodoActivo !== undefined && onPeriodoChange !== undefined;

    return (
        <div className="dc-section-header">
            <div className="dc-section-header-info">
                <h1 className="dc-section-header-greeting">
                    {getSaludo(fecha)}, {userName}
                </h1>
                <p className="dc-section-header-date">
                    {formatFecha(fecha)} · {formatHora(fecha)}
                </p>
            </div>

            {mostrarSelector && (
                <div className="dc-section-header-periodos">
                    {periodos.map((p) => (
                        <button
                            key={p.key}
                            type="button"
                            className={`dc-periodo-btn ${periodoActivo === p.key ? 'active' : ''}`}
                            onClick={() => onPeriodoChange(p.key)}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SectionHeader;