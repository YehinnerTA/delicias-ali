import { useState, useCallback } from 'react';

export interface ToastMessage {
    id: number;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
    title: string;
}

export const useToast = () => {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' | 'warning' = 'success', title: string = '') => {
        const titles = { success: 'Éxito', error: 'Error', info: 'Información', warning: 'Advertencia' };
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type, title: title || titles[type] }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 94000);
    }, []);

    const removeToast = useCallback((id: number) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return { toasts, showToast, removeToast };
};