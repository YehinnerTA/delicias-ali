import React, { useState, useEffect, useRef, useCallback } from 'react';
import '../theme/partials/header.css';

const Header: React.FC = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [scrollPosition, setScrollPosition] = useState(0);
    const [notificationCount] = useState(3);
    const [selectedCompany, setSelectedCompany] = useState('10xxxxxxxxx');
    const mobileMenuScrollRef = useRef<HTMLDivElement>(null);
    const hamburgerBtnRef = useRef<HTMLButtonElement>(null);
    const closeMenuBtnRef = useRef<HTMLButtonElement>(null);

    // Funciones de demo
    const showNotificationMsg = useCallback(() => {
        alert("Notificaciones: tiene 3 alertas nuevas.\n- Pedido pendiente en cocina\n- Actualización en almacén\n- Recepción: nuevo evento");
    }, []);

    const showProfileMsg = useCallback(() => {
        alert("Perfil de administrador:\nUsuario: admin@catering.com\nRol: Super Administrador CRUD");
    }, []);

    const showLogoutMsg = useCallback(() => {
        if (confirm("¿Cerrar sesión? Se finalizará la sesión activa.")) {
            alert("Sesión cerrada. Redirigiendo al login... (simulación)");
        }
    }, []);

    const handleCompanyChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
        const newCompany = e.target.value;
        setSelectedCompany(newCompany);
        alert(`[Demo] Cambiando a empresa con RUC: ${newCompany}\nEsta acción cambiaría el contexto de toda la aplicación.`);
    }, []);

    const handleNavigation = useCallback((moduleName: string) => {
        alert(`[Demo] Navegación a módulo: ${moduleName} - Empresa actual: ${selectedCompany}`);
        if (isMenuOpen) closeMobileMenu();
    }, [isMenuOpen, selectedCompany]);

    const handleLogoClick = useCallback(() => {
        alert(`Logo principal - Dashboard de Catering. Empresa: ${selectedCompany}`);
    }, [selectedCompany]);

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

    // Manejar wheel event para el scroll del menú móvil
    const handleWheel = useCallback((e: WheelEvent) => {
        const element = mobileMenuScrollRef.current;
        if (!element) return;

        const atTop = element.scrollTop === 0;
        const atBottom = (element.scrollTop + element.clientHeight) >= element.scrollHeight - 1;

        if ((atTop && e.deltaY < 0) || (atBottom && e.deltaY > 0)) {
            e.preventDefault();
        }
    }, []);

    // Manejar tecla Escape
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === "Escape" && isMenuOpen) closeMobileMenu();
    }, [isMenuOpen, closeMobileMenu]);

    // Efectos para event listeners
    useEffect(() => {
        let resizeTimer: number;

        const handleResize = () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(handleResponsiveClose, 200);
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
            // Limpiar estilos del body al desmontar
            document.body.style.overflow = '';
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.width = '';
        };
    }, [handleResponsiveClose, handleKeyDown, handleWheel]);

    const navLinks = [
        { name: "Ventas", href: "#" },
        { name: "Logística", href: "#" },
        { name: "Cocina", href: "#" },
        { name: "Almacén", href: "#" },
        { name: "Recepción", href: "#" },
        { name: "CRUD General", href: "#" }
    ];

    const companyOptions = [
        { value: "10xxxxxxxxx", label: "RUC 10: 10xxxxxxxxx" },
        { value: "20xxxxxxxxx", label: "RUC 20: 20xxxxxxxxx" }
    ];

    return (
        <>
            <header className="delicias-main-header">
                <div className="delicias-header-container">
                    {/* Logo */}
                    <div className="delicias-logo-area">
                        <a
                            href="#"
                            aria-label="Inicio"
                            className="delicias-logo-link"
                            onClick={(e) => {
                                e.preventDefault();
                                handleLogoClick();
                            }}
                        >
                            <img
                                src="https://deliciasali.com/wp-content/uploads/2023/08/logo-h.png"
                                alt="Delicias Ali Catering"
                            />
                        </a>
                    </div>

                    {/* Navegación desktop */}
                    <nav className="delicias-nav-center" aria-label="Navegación principal">
                        <ul className="delicias-nav-links">
                            {navLinks.map((link) => (
                                <li key={link.name}>
                                    <a
                                        href={link.href}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            handleNavigation(link.name);
                                        }}
                                    >
                                        {link.name}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </nav>

                    {/* Acciones derecha */}
                    <div className="delicias-right-actions">
                        {/* Company Selector Desktop */}
                        <div className="delicias-company-selector">
                            <label htmlFor="companySelect" className="company-selector-label">
                                <i className="fas fa-building"></i>
                                <span>Empresa</span>
                            </label>
                            <select
                                id="companySelect"
                                className="company-select"
                                value={selectedCompany}
                                onChange={handleCompanyChange}
                                aria-label="Seleccionar empresa"
                            >
                                {companyOptions.map(option => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <button
                            className="delicias-notification-bell btn-reset"
                            id="deliciasNotifDesktopBtn"
                            aria-label="Notificaciones"
                            onClick={showNotificationMsg}
                        >
                            <i className="fas fa-bell"></i>
                            <span className="badge" id="deliciasNotifBadge">{notificationCount}</span>
                        </button>

                        <div
                            className="delicias-profile-menu"
                            id="deliciasProfileMenuDesktop"
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                                if ((e.target as HTMLElement).closest(".delicias-logout-icon")) return;
                                showProfileMsg();
                            }}
                        >
                            <div className="avatar" aria-hidden="true">A</div>
                            <span className="delicias-profile-text">Admin</span>
                            <button
                                className="delicias-logout-icon btn-reset"
                                id="deliciasLogoutDesktopBtn"
                                aria-label="Cerrar sesión"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    showLogoutMsg();
                                }}
                            >
                                <i className="fas fa-sign-out-alt"></i>
                            </button>
                        </div>
                    </div>

                    {/* Hamburguesa */}
                    <button
                        className="delicias-hamburger btn-reset"
                        id="deliciasHamburgerBtn"
                        ref={hamburgerBtnRef}
                        aria-label="Abrir menú"
                        aria-expanded={isMenuOpen}
                        onClick={openMobileMenu}
                    >
                        <span></span><span></span><span></span>
                    </button>
                </div>
            </header>

            {/* Overlay */}
            <div
                className={`overlay ${isMenuOpen ? 'active' : ''}`}
                id="deliciasMenuOverlay"
                aria-hidden={!isMenuOpen}
                onClick={closeMobileMenu}
            />

            {/* Menú lateral móvil */}
            <div
                className={`delicias-mobile-menu ${isMenuOpen ? 'active' : ''}`}
                id="deliciasMobileMenu"
                aria-hidden={!isMenuOpen}
            >
                <div className="delicias-mobile-menu-header">
                    <span className="delicias-menu-title">Menú</span>
                    <button
                        className="delicias-close-menu btn-reset"
                        id="deliciasCloseMenuBtn"
                        ref={closeMenuBtnRef}
                        aria-label="Cerrar menú"
                        onClick={closeMobileMenu}
                    >
                        &times;
                    </button>
                </div>

                <div className="delicias-mobile-menu-scroll" ref={mobileMenuScrollRef}>
                    {/* Company Selector Mobile */}
                    <div className="delicias-mobile-company-selector">
                        <div className="mobile-selector-header">
                            <i className="fas fa-building"></i>
                            <span>Seleccionar Empresa</span>
                        </div>
                        <select
                            className="mobile-company-select"
                            value={selectedCompany}
                            onChange={(e) => {
                                handleCompanyChange(e);
                                if (window.innerWidth <= 860) {
                                    // No cerramos el menú para que pueda seguir seleccionando
                                }
                            }}
                            aria-label="Seleccionar empresa en móvil"
                        >
                            {companyOptions.map(option => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <nav aria-label="Navegación móvil">
                        <ul className="delicias-mobile-nav-links">
                            {navLinks.map((link) => (
                                <li key={link.name}>
                                    <a
                                        href={link.href}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            handleNavigation(link.name);
                                        }}
                                    >
                                        {link.name}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </nav>

                    <div className="delicias-mobile-actions">
                        <button
                            className="delicias-mobile-notif btn-reset"
                            id="deliciasMobileNotifBtn"
                            onClick={() => {
                                closeMobileMenu();
                                setTimeout(showNotificationMsg, 180);
                            }}
                        >
                            <i className="fas fa-bell"></i>
                            <span>Notificaciones</span>
                            <span className="badge-mobile">{notificationCount}</span>
                        </button>

                        <button
                            className="delicias-mobile-profile btn-reset"
                            id="deliciasMobileProfileBtn"
                            onClick={() => {
                                closeMobileMenu();
                                setTimeout(showProfileMsg, 180);
                            }}
                        >
                            <span className="avatar-sm" aria-hidden="true">A</span>
                            <span>Mi Perfil</span>
                        </button>

                        <button
                            className="delicias-mobile-logout btn-reset"
                            id="deliciasMobileLogoutBtn"
                            onClick={() => {
                                closeMobileMenu();
                                setTimeout(showLogoutMsg, 180);
                            }}
                        >
                            <i className="fas fa-sign-out-alt"></i>
                            <span>Cerrar sesión</span>
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Header;