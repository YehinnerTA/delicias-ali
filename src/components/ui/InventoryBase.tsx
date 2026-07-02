import React from 'react';
import { Tabs } from './shared/Tabs';
import { TabConfig } from '../../features/types/config';

interface InventoryBaseProps {
    tabs: TabConfig[];
    children: React.ReactNode;
    onTabChange?: (tabId: string) => void;
}

interface TabChildProps {
    'data-tab'?: string;
}

export const InventoryBase: React.FC<InventoryBaseProps> = ({
    tabs,
    children,
    onTabChange
}) => {
    const [activeTab, setActiveTab] = React.useState<string>(tabs[0]?.id || '');

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