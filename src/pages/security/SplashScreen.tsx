import React, { useEffect, useRef, useState } from 'react';
import '../../theme/security/SplashScreen.css';

interface SplashLoaderProps {
    onComplete?: () => void;
    duration?: number;
}

export const SplashLoader: React.FC<SplashLoaderProps> = ({
    onComplete,
    duration = 4200
}) => {
    const [progreso, setProgreso] = useState(0);
    const [estaCompleto, setEstaCompleto] = useState(false);
    const imgRef = useRef<HTMLImageElement>(null);
    const maskRef = useRef<HTMLDivElement>(null);
    const progressFillRef = useRef<HTMLDivElement>(null);
    const porcentajeSpanRef = useRef<HTMLSpanElement>(null);

    const DURACION_TOTAL = duration;
    const INTERVALO_MS = 45;
    const PASOS = Math.ceil(DURACION_TOTAL / INTERVALO_MS);
    let pasoActual = 0;

    useEffect(() => {
        const img = imgRef.current;
        const mask = maskRef.current;
        const progressFill = progressFillRef.current;
        const porcentajeSpan = porcentajeSpanRef.current;

        if (!img || !mask || !progressFill || !porcentajeSpan) return;

        const actualizarCarga = () => {
            const t = pasoActual / PASOS;
            const eased = 1 - Math.pow(1 - t, 1.5);
            const nuevoProgreso = Math.min(100, Math.round(eased * 100));

            setProgreso(nuevoProgreso);
            progressFill.style.width = nuevoProgreso + '%';
            porcentajeSpan.textContent = nuevoProgreso + '%';

            const maskHeight = 100 - nuevoProgreso;
            mask.style.height = maskHeight + '%';

            const grayScale = Math.max(0, 100 - nuevoProgreso * 0.92);
            img.style.filter = `grayscale(${grayScale}%) brightness(1.02)`;

            pasoActual++;
            if (pasoActual <= PASOS) {
                const delay = INTERVALO_MS + (Math.random() * 6 - 3);
                setTimeout(actualizarCarga, Math.max(20, delay));
            } else {
                finalizarCarga();
            }
        };

        const finalizarCarga = () => {
            setProgreso(100);
            setEstaCompleto(true);
            progressFill.style.width = '100%';
            porcentajeSpan.textContent = '100%';
            mask.style.height = '0%';
            img.style.filter = 'grayscale(0%) brightness(1.02)';
            pasoActual = PASOS + 1;
            if (onComplete) {
                setTimeout(onComplete, 300);
            }
        };

        const iniciarCarga = () => {
            img.style.filter = 'grayscale(100%) brightness(1.02)';
            mask.style.height = '100%';
            progressFill.style.width = '0%';
            porcentajeSpan.textContent = '0%';
            pasoActual = 0;
            setTimeout(actualizarCarga, 400);
        };

        if (img.complete) {
            iniciarCarga();
        } else {
            img.addEventListener('load', iniciarCarga);
            const timeout = setTimeout(() => {
                if (pasoActual === 0) iniciarCarga();
            }, 2500);
            return () => clearTimeout(timeout);
        }

        return () => { };
    }, [onComplete, DURACION_TOTAL, PASOS]);

    return (
        <div className="splash-wrapper">
            <div className="splash-loader" role="status" aria-live="polite">
                <div className="image-wrapper">
                    <div className="logo-container" id="logoContainer">
                        <img
                            ref={imgRef}
                            id="logoImg"
                            src="https://deliciasali.com/wp-content/uploads/2023/08/logo.png"
                            alt="Delicias Ali"
                            className="logo-carga"
                            width="400"
                            height="400"
                            loading="eager"
                            decoding="async"
                        />

                        <div ref={maskRef} id="revealMask" className="reveal-mask" style={{ height: '100%' }}></div>

                        <div className="xray-scanner">
                            <div className="scan-line-horizontal"></div>
                            <div className="scan-line-vertical"></div>
                            <div className="xray-grid"></div>
                        </div>

                        <div className="neon-particles">
                            <div className="neon-particle"></div>
                            <div className="neon-particle"></div>
                            <div className="neon-particle"></div>
                            <div className="neon-particle"></div>
                            <div className="neon-particle"></div>
                            <div className="neon-particle"></div>
                            <div className="neon-particle"></div>
                            <div className="neon-particle"></div>
                        </div>
                    </div>
                </div>

                <div className="progress-track">
                    <div ref={progressFillRef} id="progressFill" className="progress-fill" style={{ width: '0%' }}></div>
                </div>

                <div className="carga-info">
                    <span className="estado-carga">
                        <span className="dots">Cargando</span>
                        <span ref={porcentajeSpanRef} id="porcentajeTexto" className="porcentaje">0%</span>
                    </span>
                </div>
            </div>
        </div>
    );
};