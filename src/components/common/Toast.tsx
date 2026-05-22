import React from 'react';
import { ToastMessage } from '../../hooks/base/useToast';

interface ToastProps {
    toast: ToastMessage;
    onClose: (id: number) => void;
}

const icons = {
    success: 'fa-check-circle',
    error: 'fa-times-circle',
    info: 'fa-info-circle',
    warning: 'fa-exclamation-triangle'
};

export const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
    return (
        <div className={`dc-toast ${toast.type}`}>
            <i className={`fas ${icons[toast.type]}`}></i>
            <div className="dc-toast-content">
                <div className="dc-toast-title">{toast.title}</div>
                <div className="dc-toast-message">{toast.message}</div>
            </div>
            <i className="fas fa-times dc-toast-close" onClick={() => onClose(toast.id)}></i>
        </div>
    );
};