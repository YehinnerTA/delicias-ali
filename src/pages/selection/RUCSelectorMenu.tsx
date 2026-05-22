import React, { useState } from 'react';
import '../../theme/selection/RUCSelectorMenu.css';

interface RUCSelectorMenuProps {
    onRUCSelect?: (rucType: string | null) => void;
}

export const RUCSelectorMenu: React.FC<RUCSelectorMenuProps> = ({ onRUCSelect }) => {
    const [currentSelection, setCurrentSelection] = useState<string | null>(null);

    const updateSelection = (rucType: string) => {
        setCurrentSelection(rucType);
        if (onRUCSelect) {
            onRUCSelect(rucType);
        }
    };

    return (
        <div className="ruc-selector-page">
            <div className="ruc-selector-card">
                <div className="ruc-selector-grid">
                    <div
                        className={`ruc-selector-option ${currentSelection === 'RUC 10' ? 'active' : ''}`}
                        onClick={() => updateSelection('RUC 10')}
                    >
                        <div className="ruc-selector-option-icon">
                            <i className="fas fa-user-check"></i>
                        </div>
                        <div className="ruc-selector-option-code">RUC 10</div>
                        <div className="ruc-selector-option-label">Persona Natural</div>
                    </div>

                    <div
                        className={`ruc-selector-option ${currentSelection === 'RUC 20' ? 'active' : ''}`}
                        onClick={() => updateSelection('RUC 20')}
                    >
                        <div className="ruc-selector-option-icon">
                            <i className="fas fa-building"></i>
                        </div>
                        <div className="ruc-selector-option-code">RUC 20</div>
                        <div className="ruc-selector-option-label">Persona Jurídica</div>
                    </div>
                </div>

                <div className="ruc-selector-status">
                    <div className="ruc-selector-status-left">
                        <i className="fas fa-info-circle"></i>
                        <span>
                            <strong>Vista activa:</strong>
                            <span className="ruc-selector-status-value">
                                {currentSelection || 'Ninguna'}
                            </span>
                        </span>
                    </div>

                    <span className={`ruc-selector-badge ${currentSelection ? 'selected' : ''}`}>
                        {currentSelection ? (
                            <><i className="fas fa-check-circle"></i> {currentSelection}</>
                        ) : (
                            <><i className="fas fa-compass"></i> Inicial</>
                        )}
                    </span>
                </div>
            </div>
        </div>
    );
};