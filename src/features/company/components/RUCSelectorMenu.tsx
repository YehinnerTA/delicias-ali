import React from 'react';
import { useHistory } from 'react-router';
import { useCompany } from '../context/CompanyContext';
import { RUCSelectorMenuProps } from '../types/index.company';
import '../../../theme/selection/RUCSelectorMenu.css';

export const RUCSelectorMenu: React.FC<RUCSelectorMenuProps> = ({
    onSelect,
    redirectTo = '/home',
}) => {
    const history = useHistory();
    const { selectedCompany, setSelectedCompany, empresas, isLoading } = useCompany();

    const handleSelect = (ruc: string) => {
        setSelectedCompany(ruc);
        if (onSelect) onSelect(ruc);
        if (redirectTo) {
            history.push(redirectTo);
        }
    };

    if (isLoading) {
        return (
            <div className="ruc-selector-page">
                <div className="ruc-selector-card" style={{ textAlign: 'center', padding: '2rem' }}>
                    <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem' }}></i>
                    <p>Cargando empresas...</p>
                </div>
            </div>
        );
    }

    if (empresas.length === 0) {
        return (
            <div className="ruc-selector-page">
                <div className="ruc-selector-card" style={{ textAlign: 'center', padding: '2rem' }}>
                    <i className="fas fa-exclamation-triangle" style={{ fontSize: '2rem', color: 'var(--color-advertencia)' }}></i>
                    <p>No tienes empresas asignadas. Contacta al administrador.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="ruc-selector-page">
            <div className="ruc-selector-card">
                <h2 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                    <i className="fas fa-building" style={{ marginRight: '0.5rem', color: 'var(--color-secundario)' }}></i>
                    Selecciona tu empresa
                </h2>
                <p style={{ textAlign: 'center', color: 'var(--color-gray)', marginBottom: '1.5rem' }}>
                    Elige la empresa con la que deseas trabajar
                </p>

                <div className="ruc-selector-grid">
                    {empresas.map((empresa) => (
                        <div
                            key={empresa.ruc}
                            className={`ruc-selector-option ${selectedCompany === empresa.ruc ? 'active' : ''}`}
                            onClick={() => handleSelect(empresa.ruc)}
                        >
                            <div className="ruc-selector-option-icon">
                                <i className="fas fa-building"></i>
                            </div>
                            <div className="ruc-selector-option-code">{empresa.ruc}</div>
                            <div className="ruc-selector-option-label">{empresa.nombre}</div>
                            {empresa.es_predeterminada && (
                                <span className="ruc-selector-badge" style={{ marginTop: '0.5rem', background: 'var(--color-exito)', color: 'white' }}>
                                    <i className="fas fa-star"></i> Predeterminada
                                </span>
                            )}
                            {selectedCompany === empresa.ruc && (
                                <span className="ruc-selector-badge selected" style={{ marginTop: '0.5rem' }}>
                                    <i className="fas fa-check-circle"></i> Seleccionada
                                </span>
                            )}
                        </div>
                    ))}
                </div>

                <div className="ruc-selector-status">
                    <div className="ruc-selector-status-left">
                        <i className="fas fa-info-circle"></i>
                        <span>
                            <strong>Empresa activa:</strong>
                            <span className="ruc-selector-status-value">
                                {selectedCompany
                                    ? empresas.find(e => e.ruc === selectedCompany)?.nombre || selectedCompany
                                    : 'Ninguna'}
                            </span>
                        </span>
                    </div>
                    <span className={`ruc-selector-badge ${selectedCompany ? 'selected' : ''}`}>
                        {selectedCompany ? (
                            <><i className="fas fa-check-circle"></i> {selectedCompany}</>
                        ) : (
                            <><i className="fas fa-compass"></i> Selecciona</>
                        )}
                    </span>
                </div>

                <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                    <button
                        className="dc-btn success"
                        onClick={() => {
                            if (selectedCompany) {
                                history.push(redirectTo);
                            } else {
                                alert('Por favor, selecciona una empresa primero.');
                            }
                        }}
                        disabled={!selectedCompany}
                    >
                        <i className="fas fa-arrow-right"></i> Continuar
                    </button>
                </div>
            </div>
        </div>
    );
};