import React from 'react';
import { ActivityLog as ActivityLogType } from '../../features/types/hist_act';

const formatLocalDateTime = (isoString: string): string => {
    if (!isoString) return '-';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    const dia = String(date.getDate()).padStart(2, '0');
    const mes = String(date.getMonth() + 1).padStart(2, '0');
    const año = date.getFullYear();
    const horas = String(date.getHours()).padStart(2, '0');
    const minutos = String(date.getMinutes()).padStart(2, '0');
    return `${dia}/${mes}/${año} || ${horas}:${minutos}`;
};

interface ActivityLogProps {
    logs: ActivityLogType[];
    title: string;
    icon?: string;
}

export const ActivityLog: React.FC<ActivityLogProps> = ({ logs, title, icon = 'fa-waveform' }) => {
    return (
        <div className="dc-activity-panel">
            <div className="dc-activity-title">
                <i className={`fas ${icon}`}></i> {title}
            </div>
            <div className="dc-compact-log">
                {logs.length === 0 ? (
                    <div>Sin actividad</div>
                ) : (
                    logs.map((log, idx) => (
                        <div key={idx} className="dc-history-entry">
                            <span className="dc-history-date">[{formatLocalDateTime(log.timestamp)}]</span>
                            <span className="dc-history-user">
                                <i className="fas fa-user"></i> {log.usuario}
                            </span>
                            <div className="dc-history-action">{log.accion}:</div>
                            <div className="dc-history-desc">{log.detalle}</div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};