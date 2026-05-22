import React from 'react';

export interface FormField {
    id: string;
    label: string;
    type: 'text' | 'email' | 'password' | 'select';
    placeholder?: string;
    options?: { value: string; label: string }[];
    required?: boolean;
}

interface FormCardProps {
    title: string;
    icon?: string;
    fields: FormField[];
    values: Record<string, string>;
    onChange: (id: string, value: string) => void;
    onSubmit: () => void;
    submitText?: string;
    submitIcon?: string;
}

export const FormCard: React.FC<FormCardProps> = ({
    title,
    icon = 'fa-plus-circle',
    fields,
    values,
    onChange,
    onSubmit,
    submitText = 'Registrar',
    submitIcon = 'fa-save'
}) => {
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit();
    };

    return (
        <div className="dc-form-card">
            <h3><i className={`fas ${icon}`}></i> {title}</h3>
            <form onSubmit={handleSubmit}>
                <div className="dc-form-grid">
                    {fields.map(field => (
                        <div key={field.id} className="dc-input-group">
                            <label>{field.label}</label>
                            {field.type === 'select' ? (
                                <select
                                    value={values[field.id] || ''}
                                    onChange={(e) => onChange(field.id, e.target.value)}
                                    required={field.required}
                                >
                                    {field.options?.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            ) : (
                                <input
                                    type={field.type}
                                    value={values[field.id] || ''}
                                    placeholder={field.placeholder}
                                    onChange={(e) => onChange(field.id, e.target.value)}
                                    required={field.required}
                                />
                            )}
                        </div>
                    ))}
                    <button type="submit" className="dc-btn">
                        <i className={`fas ${submitIcon}`}></i> {submitText}
                    </button>
                </div>
            </form>
        </div>
    );
};