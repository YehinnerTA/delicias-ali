import React from 'react';

export interface FilterField {
    id: string;
    label: string;
    type: 'text' | 'select' | 'number';
    placeholder?: string;
    options?: { value: string; label: string }[];
}

interface FilterSectionProps {
    title: string;
    icon?: string;
    filters: FilterField[];
    values: Record<string, string>;
    onChange: (id: string, value: string) => void;
    onClear: () => void;
}

export const FilterSection: React.FC<FilterSectionProps> = ({
    title,
    icon = 'fa-search',
    filters,
    values,
    onChange,
    onClear
}) => {
    return (
        <div className="dc-filters-section">
            <div className="dc-filters-title">
                <i className={`fas ${icon}`}></i> {title}
            </div>
            <div className="dc-filters-grid">
                {filters.map(filter => (
                    <div key={filter.id} className="dc-filter-group">
                        <label>{filter.label}</label>
                        {filter.type === 'text' ? (
                            <input
                                type="text"
                                value={values[filter.id] || ''}
                                placeholder={filter.placeholder}
                                onChange={(e) => onChange(filter.id, e.target.value)}
                            />
                        ) : filter.type === 'number' ? (
                            <input
                                type="number"
                                value={values[filter.id] || ''}
                                placeholder={filter.placeholder}
                                onChange={(e) => onChange(filter.id, e.target.value)}
                            />
                        ) : (
                            <select
                                value={values[filter.id] || ''}
                                onChange={(e) => onChange(filter.id, e.target.value)}
                            >
                                {filter.options?.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        )}
                    </div>
                ))}
                <button className="dc-btn dc-clear-filters" onClick={onClear}>
                    <i className="fas fa-eraser"></i> Limpiar
                </button>
            </div>
        </div>
    );
};