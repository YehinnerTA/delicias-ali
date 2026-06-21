import React from 'react';
import { useHeader } from '../hooks/useHeader';
import { Modal } from '../../../components/common/modal/Modal';
import '../../../theme/partials/header.css';

const Header: React.FC = () => {
    const {
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
        navLinks,
        mobileMenuScrollRef,
        hamburgerBtnRef,
        closeMenuBtnRef,
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
    } = useHeader();

    return (
        <>
            <header className="delicias-main-header">
                <div className="delicias-header-container">
                    <div className="delicias-logo-area">
                        <a aria-label="Inicio" className="delicias-logo-link"
                            onClick={(e) => {
                                e.preventDefault();
                                handleLogoClick();
                            }}
                        >
                            <img src="https://deliciasali.com/wp-content/uploads/2023/08/logo-h.png" alt="Delicias Ali Catering" />
                        </a>
                    </div>

                    {/* Navegación desktop */}
                    <nav className="delicias-nav-center" aria-label="Navegación principal">
                        <ul className="delicias-nav-links">
                            {navLinks.map((link) => (
                                <li key={link.name}>
                                    <a
                                        href={link.path}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            handleNavigation(link.path);
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
                            <select id="companySelect" className="company-select" value={selectedCompany ?? ''}
                                onChange={handleCompanyChange} aria-label="Seleccionar empresa"
                            >
                                {companyOptions.map(option => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <button className="delicias-notification-bell btn-reset" id="deliciasNotifDesktopBtn" aria-label="Notificaciones" onClick={openNotificationModal} >
                            <i className="fas fa-bell"></i>
                            {notificationCount > 0 && (
                                <span className="badge" id="deliciasNotifBadge">{notificationCount}</span>
                            )}
                        </button>

                        <div className="delicias-profile-menu" id="deliciasProfileMenuDesktop" role="button" tabIndex={0}
                            onClick={(e) => {
                                if ((e.target as HTMLElement).closest(".delicias-logout-icon")) return;
                                openProfileModal();
                            }}
                        >
                            <div className="avatar" aria-hidden="true">{nombreUsuario.charAt(0).toUpperCase()}</div>
                            <span className="delicias-profile-text">{nombreUsuario}</span>
                            <button className="delicias-logout-icon btn-reset" id="deliciasLogoutDesktopBtn" aria-label="Cerrar sesión"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    openLogoutModal();
                                }}
                            >
                                <i className="fas fa-sign-out-alt"></i>
                            </button>
                        </div>
                    </div>

                    {/* Hamburguesa */}
                    <button className="delicias-hamburger btn-reset" id="deliciasHamburgerBtn" ref={hamburgerBtnRef} aria-label="Abrir menú" aria-expanded={isMenuOpen} onClick={openMobileMenu} >
                        <span></span><span></span><span></span>
                    </button>
                </div>
            </header>

            {/* Overlay */}
            <div className={`overlay ${isMenuOpen ? 'active' : ''}`} id="deliciasMenuOverlay" aria-hidden={!isMenuOpen} onClick={closeMobileMenu} />

            {/* Menú lateral móvil */}
            <div className={`delicias-mobile-menu ${isMenuOpen ? 'active' : ''}`} id="deliciasMobileMenu" aria-hidden={!isMenuOpen} >
                <div className="delicias-mobile-menu-header">
                    <span className="delicias-menu-title">Menú</span>
                    <button className="delicias-close-menu btn-reset" id="deliciasCloseMenuBtn" ref={closeMenuBtnRef} aria-label="Cerrar menú" onClick={closeMobileMenu} >
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
                            id="companySelect"
                            className="company-select"
                            value={selectedCompany ?? ''}
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

                    <nav aria-label="Navegación móvil">
                        <ul className="delicias-mobile-nav-links">
                            {navLinks.map((link) => (
                                <li key={link.name}>
                                    <a
                                        href={link.path}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            handleNavigation(link.path);
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
                                setTimeout(openNotificationModal, 180);
                            }}
                        >
                            <i className="fas fa-bell"></i>
                            <span>Notificaciones</span>
                            {notificationCount > 0 && (
                                <span className="badge-mobile">{notificationCount}</span>
                            )}
                        </button>

                        <button className="delicias-mobile-profile btn-reset" id="deliciasMobileProfileBtn"
                            onClick={() => {
                                closeMobileMenu();
                                setTimeout(openProfileModal, 180);
                            }}
                        >
                            <span className="avatar-sm" aria-hidden="true">{nombreUsuario.charAt(0).toUpperCase()}</span>
                            <span>Mi Perfil</span>
                        </button>

                        <button className="delicias-mobile-logout btn-reset" id="deliciasMobileLogoutBtn"
                            onClick={() => {
                                closeMobileMenu();
                                setTimeout(openLogoutModal, 180);
                            }}
                        >
                            <i className="fas fa-sign-out-alt"></i>
                            <span>Cerrar sesión</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* ============================================================ */}
            {/* MODAL DE PERFIL */}
            {/* ============================================================ */}
            <Modal
                isOpen={isProfileModalOpen}
                onClose={() => setIsProfileModalOpen(false)}
                title="Mi Perfil"
                icon="fa-user-circle"
                footer={
                    <button className="dc-btn danger"
                        onClick={() => {
                            openLogoutModal();
                            setIsProfileModalOpen(false);
                        }}
                    >
                        <i className="fas fa-sign-out-alt"></i> Cerrar sesión
                    </button>
                }
            >
                <div className="dc-info-card">
                    <h4><i className="fas fa-user-circle"></i> Información del Usuario</h4>
                    <div className="dc-info-grid">
                        <div className="dc-info-item">
                            <span className="dc-info-label">Nombre</span>
                            <span className="dc-info-value">{nombreUsuario}</span>
                        </div>
                        <div className="dc-info-item">
                            <span className="dc-info-label">Email</span>
                            <span className="dc-info-value">{user?.email || 'No disponible'}</span>
                        </div>
                        <div className="dc-info-item">
                            <span className="dc-info-label">Empresas asignadas</span>
                            <span className="dc-info-value">{empresas.length}</span>
                        </div>
                        <div className="dc-info-item">
                            <span className="dc-info-label">Empresa activa</span>
                            <span className="dc-info-value">
                                {empresas.find(e => e.ruc === selectedCompany)?.nombre || selectedCompany}
                            </span>
                        </div>
                    </div>
                </div>
                {empresas.length > 1 && (
                    <div className="dc-info-card">
                        <h4><i className="fas fa-building"></i> Todas tus empresas</h4>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                            {empresas.map(e => (
                                <li key={e.ruc} style={{
                                    padding: '0.5rem 0',
                                    borderBottom: '1px solid #f0e2e6',
                                    display: 'flex',
                                    justifyContent: 'space-between'
                                }}>
                                    <span>{e.nombre}</span>
                                    <span className="dc-badge" style={{ fontSize: '0.7rem' }}>
                                        {e.ruc} {e.es_predeterminada && '⭐'}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </Modal>

            {/* ============================================================ */}
            {/* MODAL DE NOTIFICACIONES (agrupadas por área) */}
            {/* ============================================================ */}
            <Modal
                isOpen={isNotificationModalOpen}
                onClose={() => setIsNotificationModalOpen(false)}
                title="Notificaciones"
                icon="fa-bell"
                footer={
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', width: '100%' }}>
                        <button
                            className="dc-btn info"
                            onClick={marcarTodasComoLeidas}
                            disabled={notificaciones.every(n => n.leido)}
                        >
                            <i className="fas fa-check-double"></i> Marcar todas como leídas
                        </button>
                        <button
                            className="dc-btn secondary"
                            onClick={() => setIsNotificationModalOpen(false)}
                        >
                            <i className="fas fa-times"></i> Cerrar
                        </button>
                    </div>
                }
            >
                {notificaciones.length === 0 ? (
                    <div className="dc-info-card" style={{ textAlign: 'center', padding: '2rem' }}>
                        <i className="fas fa-check-circle" style={{ fontSize: '2.5rem', color: 'var(--color-exito)' }}></i>
                        <p style={{ marginTop: '0.5rem', fontSize: '1rem', fontWeight: '500' }}>No tienes notificaciones pendientes</p>
                    </div>
                ) : (
                    areasOrdenadas.map(area => (
                        <div key={area} className="dc-info-card" style={{ marginBottom: '1rem' }}>
                            <h4>
                                <i className="fas fa-tag" style={{ marginRight: '0.5rem' }}></i>
                                {area}
                                <span className="dc-badge" style={{ marginLeft: '0.5rem', fontSize: '0.65rem' }}>
                                    {notificacionesPorArea[area].filter(n => !n.leido).length} pendiente(s)
                                </span>
                            </h4>
                            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                {notificacionesPorArea[area]
                                    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
                                    .map(notif => (
                                        <div
                                            key={notif.id}
                                            style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                padding: '0.5rem 0',
                                                borderBottom: '1px solid #f0e2e6',
                                                opacity: notif.leido ? 0.6 : 1,
                                                cursor: notif.leido ? 'default' : 'pointer',
                                            }}
                                            onClick={() => !notif.leido && marcarComoLeida(notif.id)}
                                        >
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: notif.leido ? '400' : '600' }}>
                                                    {notif.mensaje}
                                                </div>
                                                <div style={{ fontSize: '0.7rem', color: '#6c757d', marginTop: '0.2rem' }}>
                                                    <i className="far fa-clock"></i> {notif.fecha}
                                                </div>
                                            </div>
                                            {!notif.leido && (
                                                <span className="dc-badge dc-badge-active" style={{ fontSize: '0.6rem', marginLeft: '0.5rem' }}>
                                                    Nuevo
                                                </span>
                                            )}
                                        </div>
                                    ))}
                            </div>
                        </div>
                    ))
                )}
            </Modal>

            {/* ============================================================ */}
            {/* MODAL DE CERRAR SESIÓN */}
            {/* ============================================================ */}
            <Modal
                isOpen={isLogoutModalOpen}
                onClose={() => setIsLogoutModalOpen(false)}
                title="Cerrar sesión"
                icon="fa-sign-out-alt"
                footer={
                    <>
                        <button className="dc-btn secondary" onClick={() => setIsLogoutModalOpen(false)}>
                            <i className="fas fa-times"></i> Cancelar
                        </button>
                        <button className="dc-btn danger" onClick={confirmLogout}>
                            <i className="fas fa-sign-out-alt"></i> Sí, cerrar sesión
                        </button>
                    </>
                }
            >
                <div className="dc-warning-box">
                    <i className="fas fa-exclamation-triangle"></i>
                    <p><strong>¿Estás seguro de que deseas cerrar sesión?</strong></p>
                </div>
                <p style={{ marginTop: '1rem' }}>
                    Se cerrará tu sesión actual y deberás volver a iniciar sesión para acceder al sistema.
                </p>
            </Modal>
        </>
    );
};

export default Header;