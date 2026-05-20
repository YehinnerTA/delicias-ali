import React from 'react';
import Header from '../../layout/Header';

interface MainLayoutProps {
    children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
    return (
        <>
            <Header />
            <main style={{ flex: 1 }}>
                {children}
            </main>
        </>
    );
};

export default MainLayout;