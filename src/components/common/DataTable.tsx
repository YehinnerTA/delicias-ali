import React from 'react';

export interface Column<T = any> {
    key: string;
    header: string;
    render?: (item: T) => React.ReactNode;
}

interface DataTableProps<T> {
    columns: Column<T>[];
    data: T[];
    emptyMessage?: string;
    actions?: (item: T) => React.ReactNode;
}

export function DataTable<T extends { [key: string]: any }>({ columns, data, emptyMessage = 'No hay datos', actions }: DataTableProps<T>) {
    if (data.length === 0) {
        return (
            <div className="dc-table-wrapper">
                <table className="dc-table">
                    <tbody>
                        <tr>
                            <td colSpan={columns.length + (actions ? 1 : 0)} style={{ textAlign: 'center' }}>
                                {emptyMessage}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        );
    }

    return (
        <div className="dc-table-wrapper">
            <table className="dc-table">
                <thead>
                    <tr>
                        {columns.map(col => (
                            <th key={col.key}>{col.header}</th>
                        ))}
                        {actions && <th>Acciones</th>}
                    </tr>
                </thead>
                <tbody>
                    {data.map((item, idx) => (
                        <tr key={idx}>
                            {columns.map(col => (
                                <td key={col.key}>
                                    {col.render ? col.render(item) : item[col.key]}
                                </td>
                            ))}
                            {actions && <td className="dc-actions">{actions(item)}</td>}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}