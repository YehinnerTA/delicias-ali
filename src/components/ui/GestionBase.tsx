import React, { useState } from 'react';
import { Tabs } from './shared/Tabs';
import { ActivityLog as ActivityLogType } from '../../features/types/hist_act';
import { TabConfig } from '../../features/types/config';

interface GestionBaseProps {
    tabs: TabConfig[];
    children: React.ReactNode;
    activityLogs?: ActivityLogType[];
    onTabChange?: (tabId: string) => void;
}

interface TabChildProps {
    'data-tab'?: string;
}

export const GestionBase: React.FC<GestionBaseProps> = ({
    tabs,
    children,
    onTabChange
}) => {
    const [activeTab, setActiveTab] = useState<string>(tabs[0]?.id || '');

    const handleTabChange = (tabId: string) => {
        setActiveTab(tabId);
        onTabChange?.(tabId);
    };

    const childrenArray = React.Children.toArray(children);
    const activeChild = childrenArray.find((child) => {
        if (React.isValidElement(child)) {
            const childProps = child.props as TabChildProps;
            return childProps['data-tab'] === activeTab;
        }
        return false;
    });

    return (
        <>
            <Tabs tabs={tabs} activeTab={activeTab} onTabChange={handleTabChange} />
            {activeChild}
        </>
    );
};