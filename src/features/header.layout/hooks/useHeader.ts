import { useState, useEffect, useRef, useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../../auth/context/AuthContext';
import { Notificacion } from '../types/index.header';
import { useCompany } from '../../company/context/CompanyContext';

// Notificaciones de ejemplo
const NOTIFICACIONES_EJEMPLO: Notificacion[] = [
    { id: 1, area: 'Cocina', mensaje: 'Pedido #123 pendiente de preparación', fecha: '2024-01-15 10:30', leido: false },
    { id: 2, area: 'Cocina', mensaje: 'Se agotó el ingrediente "Harina de trigo"', fecha: '2024-01-15 09:15', leido: false },
    { id: 3, area: 'Cocina', mensaje: 'Nueva receta aprobada para el menú ejecutivo', fecha: '2024-01-14 17:45', leido: true },
    { id: 4, area: 'Almacén', mensaje: 'Llegó nuevo pedido de suministros (10 cajas)', fecha: '2024-01-14 16:45', leido: true },
    { id: 5, area: 'Almacén', mensaje: 'Stock crítico: solo quedan 5 unidades de "Vasos de vidrio"', fecha: '2024-01-13 08:30', leido: false },
    { id: 6, area: 'Recepción', mensaje: 'Nuevo evento confirmado para el viernes 20', fecha: '2024-01-14 14:20', leido: false },
    { id: 7, area: 'Recepción', mensaje: 'Cliente solicitó cambio de menú para evento del sábado', fecha: '2024-01-13 11:00', leido: true },
    { id: 8, area: 'Logística', mensaje: 'Proveedor: confirmado envío para el lunes', fecha: '2024-01-15 08:00', leido: false },
    { id: 9, area: 'Ventas', mensaje: 'Nueva cotización generada para cliente corporativo', fecha: '2024-01-14 15:20', leido: false },
];

const NAV_LINKS = [
    { name: "Ventas", path: "/sales-management" },
    { name: "Logística", path: "/inventory-management" },
    { name: "Cocina", path: "/catering-management" },
    { name: "Recepción", path: "/home" },
];

export const useHeader = () => {
    const history = useHistory();
    const { user, logout, isAuthenticated } = useAuth();

    // Estados de modales
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
    const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);

    // Estados de UI
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [scrollPosition, setScrollPosition] = useState(0);
    const { selectedCompany, setSelectedCompany, empresas } = useCompany();
    const [notificaciones, setNotificaciones] = useState<Notificacion[]>(NOTIFICACIONES_EJEMPLO);

    // Refs
    const mobileMenuScrollRef = useRef<HTMLDivElement>(null);
    const hamburgerBtnRef = useRef<HTMLButtonElement>(null);
    const closeMenuBtnRef = useRef<HTMLButtonElement>(null);

    // Datos del usuario
    const nombreUsuario = user?.nombre_completo || user?.usuario || 'Usuario';

    // Contador de notificaciones no leídas
    const notificationCount = notificaciones.filter(n => !n.leido).length;

    // Inicializar empresa predeterminada
    useEffect(() => {
        if (empresas.length > 0 && !selectedCompany) {
            const defaultEmpresa = empresas.find(e => e.es_predeterminada);
            setSelectedCompany(defaultEmpresa?.ruc || empresas[0]?.ruc || '');
        }
    }, [empresas, selectedCompany]);

    // Navegación
    const navigateTo = useCallback((path: string) => {
        history.push(path);
        if (isMenuOpen) closeMobileMenu();
    }, [history, isMenuOpen]);

    // Cambio de empresa
    const handleCompanyChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedCompany(e.target.value);
    }, [setSelectedCompany]);

    // Notificaciones
    const openNotificationModal = useCallback(() => {
        setIsNotificationModalOpen(true);
        if (isMenuOpen) closeMobileMenu();
    }, [isMenuOpen]);

    const marcarComoLeida = useCallback((id: number) => {
        setNotificaciones(prev =>
            prev.map(n => n.id === id ? { ...n, leido: true } : n)
        );
    }, []);

    const marcarTodasComoLeidas = useCallback(() => {
        setNotificaciones(prev =>
            prev.map(n => ({ ...n, leido: true }))
        );
    }, []);

    // Perfil
    const openProfileModal = useCallback(() => {
        setIsProfileModalOpen(true);
        if (isMenuOpen) closeMobileMenu();
    }, [isMenuOpen]);

    // Logout
    const openLogoutModal = useCallback(() => {
        setIsLogoutModalOpen(true);
        if (isMenuOpen) closeMobileMenu();
    }, [isMenuOpen]);

    const confirmLogout = useCallback(() => {
        setIsLogoutModalOpen(false);
        logout();
        history.push('/login');
    }, [logout, history]);

    // Navegación
    const handleNavigation = useCallback((path: string) => {
        navigateTo(path);
        if (isMenuOpen) closeMobileMenu();
    }, [navigateTo, isMenuOpen]);

    const handleLogoClick = useCallback(() => {
        navigateTo('/home');
    }, [navigateTo]);

    // Menú móvil
    const openMobileMenu = useCallback(() => {
        const scrollPos = window.pageYOffset;
        setScrollPosition(scrollPos);
        setIsMenuOpen(true);

        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.top = `-${scrollPos}px`;
        document.body.style.width = '100%';

        if (mobileMenuScrollRef.current) {
            mobileMenuScrollRef.current.scrollTop = 0;
        }

        setTimeout(() => {
            if (closeMenuBtnRef.current) closeMenuBtnRef.current.focus();
        }, 100);
    }, []);

    const closeMobileMenu = useCallback(() => {
        if (!isMenuOpen) return;
        setIsMenuOpen(false);

        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';

        window.scrollTo(0, scrollPosition);
        setTimeout(() => {
            if (hamburgerBtnRef.current) hamburgerBtnRef.current.focus();
        }, 0);
    }, [isMenuOpen, scrollPosition]);

    const handleResponsiveClose = useCallback(() => {
        const isDesktop = window.innerWidth > 860;
        if (isDesktop && isMenuOpen) {
            closeMobileMenu();
        }
    }, [isMenuOpen, closeMobileMenu]);

    const handleWheel = useCallback((e: WheelEvent) => {
        const element = mobileMenuScrollRef.current;
        if (!element) return;

        const atTop = element.scrollTop === 0;
        const atBottom = (element.scrollTop + element.clientHeight) >= element.scrollHeight - 1;

        if ((atTop && e.deltaY < 0) || (atBottom && e.deltaY > 0)) {
            e.preventDefault();
        }
    }, []);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === "Escape" && isMenuOpen) closeMobileMenu();
    }, [isMenuOpen, closeMobileMenu]);

    // Efectos de eventos
    useEffect(() => {
        let resizeTimer: number | undefined;

        const handleResize = () => {
            if (resizeTimer) clearTimeout(resizeTimer);
            resizeTimer = window.setTimeout(handleResponsiveClose, 200);
        };

        window.addEventListener('resize', handleResize);
        document.addEventListener('keydown', handleKeyDown);

        const scrollElement = mobileMenuScrollRef.current;
        if (scrollElement) {
            scrollElement.addEventListener('wheel', handleWheel, { passive: false });
        }

        return () => {
            window.removeEventListener('resize', handleResize);
            document.removeEventListener('keydown', handleKeyDown);
            if (scrollElement) {
                scrollElement.removeEventListener('wheel', handleWheel);
            }
            clearTimeout(resizeTimer);
            document.body.style.overflow = '';
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.width = '';
        };
    }, [handleResponsiveClose, handleKeyDown, handleWheel]);

    // Datos para el componente
    const notificacionesPorArea = notificaciones.reduce((acc, notif) => {
        if (!acc[notif.area]) acc[notif.area] = [];
        acc[notif.area].push(notif);
        return acc;
    }, {} as Record<string, Notificacion[]>);

    const areasOrdenadas = ['Cocina', 'Almacén', 'Recepción', 'Logística', 'Ventas'].filter(
        area => notificacionesPorArea[area]?.length > 0
    );

    const companyOptions = empresas.map(e => ({
        value: e.ruc,
        label: `${e.ruc}`
    }));

    return {
        // Estados
        isMenuOpen,
        isProfileModalOpen,
        isLogoutModalOpen,
        isNotificationModalOpen,
        notificationCount,
        selectedCompany,
        notificaciones,
        notificacionesPorArea,
        areasOrdenadas,
        nombreUsuario,
        user,
        empresas,
        companyOptions,
        navLinks: NAV_LINKS,
        // Refs
        mobileMenuScrollRef,
        hamburgerBtnRef,
        closeMenuBtnRef,
        // Funciones
        handleCompanyChange,
        openNotificationModal,
        marcarComoLeida,
        marcarTodasComoLeidas,
        openProfileModal,
        openLogoutModal,
        confirmLogout,
        handleNavigation,
        handleLogoClick,
        openMobileMenu,
        closeMobileMenu,
        setIsProfileModalOpen,
        setIsLogoutModalOpen,
        setIsNotificationModalOpen,
    };
};