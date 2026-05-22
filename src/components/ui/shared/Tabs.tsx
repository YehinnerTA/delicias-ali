import React from 'react';
import { TabConfig } from '../../../features/types/person';

interface TabsProps {
    tabs: TabConfig[];
    activeTab: string;
    onTabChange: (tabId: string) => void;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onTabChange }) => {
    return (
        <div className="dc-tabs">
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    className={`dc-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                    onClick={() => onTabChange(tab.id)}
                >
                    <i className={`fas ${tab.icon}`}></i> {tab.label}
                </button>
            ))}
        </div>
    );
};