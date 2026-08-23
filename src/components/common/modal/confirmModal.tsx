import React from 'react';
import { Modal } from './Modal';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    confirmVariant?: 'primary' | 'success' | 'danger' | 'warning';
    icon?: string;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    confirmVariant = 'primary',
    icon = 'fa-question-circle'
}) => {
    const handleConfirm = () => {
        onConfirm();
        onClose();
    };

    const getVariantClass = () => {
        switch (confirmVariant) {
            case 'success': return 'success';
            case 'danger': return 'danger';
            case 'warning': return 'warning';
            default: return 'primary';
        }
    };

    const footer = (
        <>
            <button className="dc-btn secondary" onClick={onClose}>
                <i className="fas fa-times"></i> {cancelText}
            </button>
            <button className={`dc-btn ${getVariantClass()}`} onClick={handleConfirm}>
                <i className="fas fa-check"></i> {confirmText}
            </button>
        </>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            icon={icon}
            footer={footer}
            size="sm"
        >
            <div style={{
                padding: '20px 0',
                textAlign: 'center',
                fontSize: '1rem',
                lineHeight: '1.6'
            }}>
                <p>{message}</p>
            </div>
        </Modal>
    );
};