import React, { useEffect } from 'react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    icon?: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, icon = 'fa-info-circle', children, footer }) => {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="dc-modal" style={{ display: 'flex' }} onClick={onClose}>
            <div className="dc-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="dc-modal-header">
                    <h3>
                        <i className={`fas ${icon}`}></i>
                        <span>{title}</span>
                    </h3>
                    <span className="dc-close-modal" onClick={onClose}>&times;</span>
                </div>
                <div className="dc-modal-body">
                    {children}
                </div>
                {footer && (
                    <div className="dc-modal-footer">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};