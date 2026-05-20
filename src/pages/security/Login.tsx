import React, { useState, useRef, FormEvent, useEffect } from 'react';
import '../../theme/security/login.css';

export const Login: React.FC = () => {
    // Estados para los campos
    const [email, setEmail] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [rememberMe, setRememberMe] = useState<boolean>(false);

    // Estados de validación
    const [emailValid, setEmailValid] = useState<boolean>(false);
    const [passwordValid, setPasswordValid] = useState<boolean>(false);
    const [emailErrorMessage, setEmailErrorMessage] = useState<string>('');
    const [passwordErrorMessage, setPasswordErrorMessage] = useState<string>('');
    const [generalMessage, setGeneralMessage] = useState<string>('');
    const [generalType, setGeneralType] = useState<'error' | 'success'>('error');

    // Estados de estilo visual
    const [emailStatus, setEmailStatus] = useState<'default' | 'success' | 'error' | 'warning'>('default');
    const [passwordStatus, setPasswordStatus] = useState<'default' | 'success' | 'error' | 'warning'>('default');

    // Refs para los elementos del DOM
    const emailInputRef = useRef<HTMLInputElement>(null);
    const passwordInputRef = useRef<HTMLInputElement>(null);
    const alertRef = useRef<HTMLDivElement>(null);

    // Validar Email
    const validateEmailField = (showError: boolean = false): boolean => {
        const emailTrimmed = email.trim();

        // Reset estados visuales
        setEmailStatus('default');
        setEmailErrorMessage('');

        if (emailTrimmed === '') {
            if (showError) {
                setEmailErrorMessage('El correo electrónico es requerido');
                setEmailStatus('error');
                setEmailValid(false);
            } else {
                setEmailValid(false);
            }
            return false;
        }

        // Validar formato de email
        const emailRegex: RegExp = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailTrimmed)) {
            if (showError) {
                setEmailErrorMessage('Ingresa un correo electrónico válido');
                setEmailStatus('error');
                setEmailValid(false);
            } else {
                setEmailValid(false);
            }
            return false;
        }

        // Validar dominios comunes
        const domain: string = emailTrimmed.split('@')[1];
        const validDomains: string[] = ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'deliciasali.com', 'live.com', 'icloud.com'];
        if (!validDomains.some(d => domain.toLowerCase().endsWith(d)) && showError) {
            setEmailErrorMessage('Verifica que el dominio sea correcto');
            setEmailStatus('warning');
            setEmailValid(true);
            return true;
        }

        // Email válido
        setEmailStatus('success');
        setEmailValid(true);
        return true;
    };

    // Validar Contraseña
    const validatePasswordField = (showError: boolean = false): boolean => {
        // Reset estados visuales
        setPasswordStatus('default');
        setPasswordErrorMessage('');

        if (password === '') {
            if (showError) {
                setPasswordErrorMessage('La contraseña es requerida');
                setPasswordStatus('error');
                setPasswordValid(false);
            } else {
                setPasswordValid(false);
            }
            return false;
        }

        if (password.length < 6) {
            if (showError) {
                setPasswordErrorMessage('La contraseña debe tener al menos 6 caracteres');
                setPasswordStatus('error');
                setPasswordValid(false);
            } else {
                setPasswordValid(false);
            }
            return false;
        }

        // Contraseña válida
        setPasswordStatus('success');
        setPasswordValid(true);
        return true;
    };

    // Manejadores de cambio en tiempo real
    const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
        setEmail(e.target.value);
        validateEmailField(false);
    };

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
        setPassword(e.target.value);
        validatePasswordField(false);
    };

    const handleEmailBlur = (): void => {
        validateEmailField(true);
    };

    const handlePasswordBlur = (): void => {
        validatePasswordField(true);
    };

    const handleRememberMeChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
        setRememberMe(e.target.checked);
    };

    // Mostrar error/success general
    const showGeneralMessage = (message: string, type: 'error' | 'success'): void => {
        setGeneralMessage(message);
        setGeneralType(type);

        // Scroll al mensaje
        alertRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Ocultar después de 5 segundos
        setTimeout(() => {
            setGeneralMessage('');
        }, 5000);
    };

    const hideGeneralError = (): void => {
        setGeneralMessage('');
    };

    // Envío del formulario
    const handleSubmit = (e: FormEvent<HTMLFormElement>): void => {
        e.preventDefault();
        hideGeneralError();

        // Validar todos los campos antes de enviar
        const isEmailValid = validateEmailField(true);
        const isPasswordValid = validatePasswordField(true);

        // Verificar si hay errores
        if (!isEmailValid || !isPasswordValid) {
            showGeneralMessage('Por favor, corrige los errores antes de continuar', 'error');

            // Enfocar el primer campo con error
            if (!isEmailValid) {
                emailInputRef.current?.focus();
            } else if (!isPasswordValid) {
                passwordInputRef.current?.focus();
            }
            return;
        }

        // Aquí iría la lógica de autenticación
        console.log('Formulario válido - Enviando datos...', { email, password, rememberMe });

        // Simulación de envío exitoso
        showGeneralMessage('Iniciando sesión...', 'success');

        // Aquí puedes agregar tu llamada a API
        // loginApi({ email, password, rememberMe });
    };

    // Prevenir envío con Enter si hay errores
    const handleKeyPress = (e: React.KeyboardEvent<HTMLFormElement>): void => {
        if (e.key === 'Enter') {
            if (!emailValid || !passwordValid) {
                e.preventDefault();
                validateEmailField(true);
                validatePasswordField(true);
            }
        }
    };

    // Renderizar ícono de validación
    const renderValidationIcon = (status: 'default' | 'success' | 'error' | 'warning'): React.ReactNode => {
        switch (status) {
            case 'success':
                return <i className="fa-solid fa-circle-check"></i>;
            case 'error':
                return <i className="fa-solid fa-circle-xmark"></i>;
            case 'warning':
                return <i className="fa-solid fa-triangle-exclamation"></i>;
            default:
                return null;
        }
    };

    // Clases para el input según el estado
    const getInputClass = (status: 'default' | 'success' | 'error' | 'warning'): string => {
        let classes = 'login-input';
        if (status === 'error') classes += ' login-input-error';
        if (status === 'success') classes += ' login-input-success';
        return classes;
    };

    // Clase para el mensaje de error
    const getErrorClass = (status: 'default' | 'success' | 'error' | 'warning'): string => {
        let classes = 'login-error-message';
        if (status === 'error') classes += ' login-error-visible';
        if (status === 'warning') classes += ' login-warning-visible';
        return classes;
    };

    return (
        <div className="login-page-body">
            <div className="login-container">
                {/* Panel Izquierdo - Decorativo (visible solo en desktop) */}
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

                {/* Panel Derecho - Formulario de Login */}
                <div className="login-form-panel">
                    <div className="login-form-wrapper">
                        {/* Logo móvil (visible solo en responsive) */}
                        <div className="login-logo-mobile">
                            <img src="https://deliciasali.com/wp-content/uploads/2023/08/logo.png" alt="Delicias Ali" className="login-logo-mobile-img" />
                        </div>

                        <div className="login-header">
                            <h1 className="login-title">Bienvenido</h1>
                            <p className="login-subtitle">Ingresa a tu cuenta para continuar</p>
                        </div>

                        {/* Alerta de error/success general */}
                        {generalMessage && (
                            <div
                                ref={alertRef}
                                className={`login-alert ${generalType === 'error' ? 'login-alert-error' : 'login-alert-success'}`}
                                style={{ display: 'flex' }}
                            >
                                <i className={`fa-solid ${generalType === 'error' ? 'fa-circle-exclamation' : 'fa-circle-check'}`}></i>
                                <span>{generalMessage}</span>
                            </div>
                        )}

                        <form
                            className="login-form"
                            onSubmit={handleSubmit}
                            onKeyPress={handleKeyPress}
                            noValidate
                        >
                            {/* Campo Email */}
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
                                        className={getInputClass(emailStatus)}
                                        placeholder="ejemplo@deliciasali.com"
                                        autoComplete="email"
                                        required
                                        value={email}
                                        onChange={handleEmailChange}
                                        onBlur={handleEmailBlur}
                                    />
                                    <span className={`login-validation-icon ${emailStatus === 'success' ? 'login-validation-success' :
                                            emailStatus === 'error' ? 'login-validation-error' :
                                                emailStatus === 'warning' ? 'login-validation-warning' : ''
                                        }`}>
                                        {renderValidationIcon(emailStatus)}
                                    </span>
                                </div>
                                <div className={getErrorClass(emailStatus)}>
                                    {emailErrorMessage}
                                </div>
                            </div>

                            {/* Campo Contraseña */}
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
                                        ref={passwordInputRef}
                                        className={getInputClass(passwordStatus)}
                                        placeholder="••••••••"
                                        autoComplete="current-password"
                                        required
                                        minLength={6}
                                        value={password}
                                        onChange={handlePasswordChange}
                                        onBlur={handlePasswordBlur}
                                    />
                                    <span className={`login-validation-icon ${passwordStatus === 'success' ? 'login-validation-success' :
                                            passwordStatus === 'error' ? 'login-validation-error' :
                                                passwordStatus === 'warning' ? 'login-validation-warning' : ''
                                        }`}>
                                        {renderValidationIcon(passwordStatus)}
                                    </span>
                                </div>
                                <div className={getErrorClass(passwordStatus)}>
                                    {passwordErrorMessage}
                                </div>
                            </div>

                            {/* Opciones adicionales */}
                            <div className="login-options">
                                <label className="login-remember">
                                    <input
                                        type="checkbox"
                                        className="login-checkbox"
                                        checked={rememberMe}
                                        onChange={handleRememberMeChange}
                                    />
                                    <span className="login-checkmark"></span>
                                    <span className="login-remember-text">Recordarme</span>
                                </label>
                                <a href="#" className="login-forgot">¿Olvidaste tu contraseña?</a>
                            </div>

                            {/* Botón de ingreso */}
                            <button type="submit" className="login-submit btn-reset">
                                <span className="login-submit-text">Iniciar Sesión</span>
                                <i className="fa-solid fa-arrow-right"></i>
                            </button>
                        </form>

                        {/* Separador visual solo móvil */}
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