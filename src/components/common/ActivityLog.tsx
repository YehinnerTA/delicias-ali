import React from 'react';
import { ActivityLog as ActivityLogType } from '../../features/types/person';

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
                            <span className="dc-history-date">[{log.timestamp}]</span>
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