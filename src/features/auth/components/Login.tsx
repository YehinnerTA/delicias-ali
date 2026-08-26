import React, { useState, useRef, FormEvent, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLoginValidation } from '../hooks/useLoginValidation';
import '../../../theme/security/login.css';

export const Login: React.FC = () => {
    const history = useHistory();
    const { login, isAuthenticated, isLoading: authLoading } = useAuth();
    const { state, updateEmail, updatePassword, validateAll } = useLoginValidation();

    const [rememberMe, setRememberMe] = useState<boolean>(false);
    const [generalMessage, setGeneralMessage] = useState<string>('');
    const [generalType, setGeneralType] = useState<'error' | 'success'>('error');
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    const emailInputRef = useRef<HTMLInputElement>(null);
    const alertRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isAuthenticated) {
            sessionStorage.setItem('showSplashOnLogin', 'true');
            history.push('/ruc-selector');
        }
    }, [isAuthenticated, history]);

    const showMessage = (message: string, type: 'error' | 'success') => {
        setGeneralMessage(message);
        setGeneralType(type);
        alertRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => setGeneralMessage(''), 5000);
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setGeneralMessage('');

        if (!validateAll()) {
            showMessage('Por favor, corrige los errores antes de continuar', 'error');
            if (!state.email.isValid) {
                emailInputRef.current?.focus();
            }
            return;
        }

        setIsSubmitting(true);

        try {
            const success = await login(state.email.value, state.password.value, rememberMe);

            if (success) {
                showMessage('Inicio de sesión exitoso', 'success');
            } else {
                showMessage('Credenciales incorrectas', 'error');
            }
        } catch (error) {
            showMessage('Error de conexión con el servidor', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const isLoading = isSubmitting || authLoading;

    return (
        <div className="login-page-body">
            <div className="login-container">
                <div className="login-decoration">
                    <div className="login-decoration-overlay"></div>
                    <div className="login-decoration-content">
                        <div className="login-logo-big">
                            <img src="https://deliciasali.com/wp-content/uploads/2023/08/logo.png" alt="Delicias Ali" className="login-logo-img" />
                        </div>
                        <div className="login-decoration-text">
                            <h2 className="login-decoration-title">Sistema de Catering & Eventos</h2>
                            <p className="login-decoration-subtitle">Gestión profesional para tu servicio de excelencia</p>
                        </div>
                        <div className="login-decoration-features">
                            <div className="login-feature-item">
                                <i className="fa-solid fa-calendar-check"></i>
                                <span>Gestión de Eventos</span>
                            </div>
                            <div className="login-feature-item">
                                <i className="fa-solid fa-utensils"></i>
                                <span>Control de Menús</span>
                            </div>
                            <div className="login-feature-item">
                                <i className="fa-solid fa-truck-fast"></i>
                                <span>Logística Integrada</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="login-form-panel">
                    <div className="login-form-wrapper">
                        <div className="login-logo-mobile">
                            <img src="https://deliciasali.com/wp-content/uploads/2023/08/logo.png" alt="Delicias Ali" className="login-logo-mobile-img" />
                        </div>

                        <div className="login-header">
                            <h1 className="login-title">Bienvenido</h1>
                            <p className="login-subtitle">Ingresa a tu cuenta para continuar</p>
                        </div>

                        {generalMessage && (
                            <div ref={alertRef} className={`login-alert ${generalType === 'error' ? 'login-alert-error' : 'login-alert-success'}`} style={{ display: 'flex' }}>
                                <i className={`fa-solid ${generalType === 'error' ? 'fa-circle-exclamation' : 'fa-circle-check'}`}></i>
                                <span>{generalMessage}</span>
                            </div>
                        )}

                        <form className="login-form" onSubmit={handleSubmit} noValidate>
                            <div className="login-input-group">
                                <label className="login-label" htmlFor="email">
                                    <i className="fa-solid fa-envelope login-label-icon"></i>
                                    Correo Electrónico
                                </label>
                                <div className="login-input-wrapper">
                                    <span className="login-input-icon">
                                        <i className="fa-solid fa-user"></i>
                                    </span>
                                    <input
                                        type="email"
                                        id="email"
                                        ref={emailInputRef}
                                        className={`login-input ${state.email.status === 'error' ? 'login-input-error' : ''} ${state.email.status === 'success' ? 'login-input-success' : ''}`}
                                        placeholder="ejemplo@deliciasali.com"
                                        autoComplete="email"
                                        required
                                        value={state.email.value}
                                        onChange={(e) => updateEmail(e.target.value)}
                                    />
                                    <span className={`login-validation-icon ${state.email.status === 'success' ? 'login-validation-success' : state.email.status === 'error' ? 'login-validation-error' : ''}`}>
                                        {state.email.status === 'success' && <i className="fa-solid fa-circle-check"></i>}
                                        {state.email.status === 'error' && <i className="fa-solid fa-circle-xmark"></i>}
                                    </span>
                                </div>
                                <div className={`login-error-message ${state.email.error ? 'login-error-visible' : ''}`}>
                                    {state.email.error}
                                </div>
                            </div>

                            <div className="login-input-group">
                                <label className="login-label" htmlFor="password">
                                    <i className="fa-solid fa-lock login-label-icon"></i>
                                    Contraseña
                                </label>
                                <div className="login-input-wrapper">
                                    <span className="login-input-icon">
                                        <i className="fa-solid fa-key"></i>
                                    </span>
                                    <input
                                        type="password"
                                        id="password"
                                        className={`login-input ${state.password.status === 'error' ? 'login-input-error' : ''} ${state.password.status === 'success' ? 'login-input-success' : ''}`}
                                        placeholder="123456"
                                        autoComplete="current-password"
                                        required
                                        minLength={6}
                                        value={state.password.value}
                                        onChange={(e) => updatePassword(e.target.value)}
                                    />
                                    <span className={`login-validation-icon ${state.password.status === 'success' ? 'login-validation-success' : state.password.status === 'error' ? 'login-validation-error' : ''}`}>
                                        {state.password.status === 'success' && <i className="fa-solid fa-circle-check"></i>}
                                        {state.password.status === 'error' && <i className="fa-solid fa-circle-xmark"></i>}
                                    </span>
                                </div>
                                <div className={`login-error-message ${state.password.error ? 'login-error-visible' : ''}`}>
                                    {state.password.error}
                                </div>
                            </div>

                            <div className="login-options">
                                <label className="login-remember">
                                    <input
                                        type="checkbox"
                                        className="login-checkbox"
                                        checked={rememberMe}
                                        onChange={(e) => setRememberMe(e.target.checked)}
                                    />
                                    <span className="login-checkmark"></span>
                                    <span className="login-remember-text">Recordarme</span>
                                </label>
                                <a href="#" className="login-forgot">¿Olvidaste tu contraseña?</a>
                            </div>

                            <button type="submit" className="login-submit" disabled={isLoading}>
                                <span className="login-submit-text">{isLoading ? 'Iniciando...' : 'Iniciar Sesión'}</span>
                                <i className={`fa-solid ${isLoading ? 'fa-spinner fa-spin' : 'fa-arrow-right'}`}></i>
                            </button>
                        </form>

                        <div className="login-mobile-info">
                            <i className="fa-solid fa-shield-halved"></i>
                            <span>Sistema seguro de gestión</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};