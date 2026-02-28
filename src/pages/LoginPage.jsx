// RUTA: src/pages/LoginPage.jsx

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [mounted, setMounted] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const response = await api.post('/auth/login', { email, password });
            const { access_token } = response.data;
            localStorage.setItem('authToken', access_token);
            window.location.href = '/';
        } catch (err) {
            console.error('❌ Error de inicio de sesión:', err);
            setError('Correo electrónico o contraseña incorrectos.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');

                *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

                .vp-root {
                    font-family: 'DM Sans', sans-serif;
                    min-height: 100vh;
                    display: flex;
                    background: #0a0c0f;
                    overflow: hidden;
                    position: relative;
                }

                /* ── Grid de fondo ── */
                .vp-grid {
                    position: absolute;
                    inset: 0;
                    background-image:
                        linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
                    background-size: 48px 48px;
                    mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%);
                }

                /* ── Panel izquierdo: branding ── */
                .vp-left {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    padding: 56px 64px;
                    position: relative;
                    z-index: 1;
                }

                .vp-left-top {
                    opacity: 0;
                    transform: translateY(20px);
                    transition: opacity 0.8s ease, transform 0.8s ease;
                }
                .vp-left-top.visible { opacity: 1; transform: translateY(0); }

                .vp-logo-mark {
                    width: 44px;
                    height: 44px;
                    background: #1e6fff;
                    clip-path: polygon(0 0, 75% 0, 100% 25%, 100% 100%, 25% 100%, 0 75%);
                    margin-bottom: 48px;
                }

                .vp-brand {
                    font-family: 'Syne', sans-serif;
                    font-size: 13px;
                    font-weight: 600;
                    letter-spacing: 0.2em;
                    text-transform: uppercase;
                    color: #1e6fff;
                    margin-bottom: 24px;
                }

                .vp-headline {
                    font-family: 'Syne', sans-serif;
                    font-size: clamp(36px, 4vw, 56px);
                    font-weight: 800;
                    line-height: 1.05;
                    color: #ffffff;
                    letter-spacing: -0.02em;
                }

                .vp-headline span {
                    color: #1e6fff;
                    position: relative;
                    display: inline-block;
                }

                .vp-headline span::after {
                    content: '';
                    position: absolute;
                    bottom: 4px;
                    left: 0;
                    width: 100%;
                    height: 3px;
                    background: #1e6fff;
                    opacity: 0.4;
                }

                .vp-sub {
                    margin-top: 20px;
                    font-size: 15px;
                    font-weight: 300;
                    color: #6b7280;
                    max-width: 380px;
                    line-height: 1.6;
                }

                .vp-features {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    margin-top: 40px;
                    opacity: 0;
                    transform: translateY(20px);
                    transition: opacity 0.8s ease 0.2s, transform 0.8s ease 0.2s;
                }
                .vp-features.visible { opacity: 1; transform: translateY(0); }

                .vp-feature {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    font-size: 13px;
                    color: #4b5563;
                    font-weight: 400;
                }

                .vp-feature-dot {
                    width: 6px;
                    height: 6px;
                    border-radius: 50%;
                    background: #1e6fff;
                    flex-shrink: 0;
                    opacity: 0.7;
                }

                .vp-left-bottom {
                    font-size: 12px;
                    color: #374151;
                    letter-spacing: 0.05em;
                }

                /* ── Separador vertical ── */
                .vp-divider {
                    width: 1px;
                    background: linear-gradient(
                        to bottom,
                        transparent,
                        rgba(255,255,255,0.08) 20%,
                        rgba(255,255,255,0.08) 80%,
                        transparent
                    );
                    flex-shrink: 0;
                }

                /* ── Panel derecho: formulario ── */
                .vp-right {
                    width: 480px;
                    flex-shrink: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 56px 64px;
                    position: relative;
                    z-index: 1;
                }

                .vp-card {
                    width: 100%;
                    opacity: 0;
                    transform: translateX(24px);
                    transition: opacity 0.9s ease 0.1s, transform 0.9s ease 0.1s;
                }
                .vp-card.visible { opacity: 1; transform: translateX(0); }

                .vp-card-label {
                    font-size: 11px;
                    font-weight: 600;
                    letter-spacing: 0.15em;
                    text-transform: uppercase;
                    color: #374151;
                    margin-bottom: 32px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                .vp-card-label::after {
                    content: '';
                    flex: 1;
                    height: 1px;
                    background: rgba(255,255,255,0.06);
                }

                .vp-card-title {
                    font-family: 'Syne', sans-serif;
                    font-size: 28px;
                    font-weight: 700;
                    color: #f9fafb;
                    letter-spacing: -0.02em;
                    margin-bottom: 8px;
                }

                .vp-card-sub {
                    font-size: 14px;
                    color: #6b7280;
                    margin-bottom: 40px;
                    font-weight: 300;
                }

                /* ── Campos ── */
                .vp-field {
                    margin-bottom: 20px;
                }

                .vp-label {
                    display: block;
                    font-size: 11px;
                    font-weight: 600;
                    letter-spacing: 0.1em;
                    text-transform: uppercase;
                    color: #9ca3af;
                    margin-bottom: 8px;
                }

                .vp-input-wrap {
                    position: relative;
                }

                .vp-input {
                    width: 100%;
                    height: 48px;
                    background: rgba(255,255,255,0.04);
                    border: 1px solid rgba(255,255,255,0.08);
                    border-radius: 8px;
                    padding: 0 16px;
                    font-family: 'DM Sans', sans-serif;
                    font-size: 14px;
                    color: #f9fafb;
                    outline: none;
                    transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
                    -webkit-appearance: none;
                }

                .vp-input::placeholder { color: #374151; }

                .vp-input:focus {
                    border-color: #1e6fff;
                    background: rgba(30, 111, 255, 0.05);
                    box-shadow: 0 0 0 3px rgba(30, 111, 255, 0.12);
                }

                .vp-input:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                /* ── Error ── */
                .vp-error {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 12px 14px;
                    background: rgba(239, 68, 68, 0.08);
                    border: 1px solid rgba(239, 68, 68, 0.2);
                    border-radius: 8px;
                    margin-bottom: 20px;
                    font-size: 13px;
                    color: #f87171;
                    animation: shake 0.3s ease;
                }

                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-4px); }
                    75% { transform: translateX(4px); }
                }

                .vp-error-icon {
                    width: 16px;
                    height: 16px;
                    flex-shrink: 0;
                    opacity: 0.8;
                }

                /* ── Botón ── */
                .vp-btn {
                    width: 100%;
                    height: 50px;
                    background: #1e6fff;
                    border: none;
                    border-radius: 8px;
                    font-family: 'Syne', sans-serif;
                    font-size: 14px;
                    font-weight: 700;
                    letter-spacing: 0.05em;
                    text-transform: uppercase;
                    color: #ffffff;
                    cursor: pointer;
                    transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
                    position: relative;
                    overflow: hidden;
                    margin-top: 8px;
                }

                .vp-btn:hover:not(:disabled) {
                    background: #1a5fe8;
                    transform: translateY(-1px);
                    box-shadow: 0 8px 24px rgba(30, 111, 255, 0.35);
                }

                .vp-btn:active:not(:disabled) {
                    transform: translateY(0);
                    box-shadow: none;
                }

                .vp-btn:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                /* Shimmer del botón al loading */
                .vp-btn::after {
                    content: '';
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
                    transform: translateX(-100%);
                }
                .vp-btn.loading::after {
                    animation: shimmer 1.4s infinite;
                }
                @keyframes shimmer {
                    to { transform: translateX(100%); }
                }

                /* ── Spinner ── */
                .vp-spinner {
                    display: inline-block;
                    width: 14px;
                    height: 14px;
                    border: 2px solid rgba(255,255,255,0.3);
                    border-top-color: #ffffff;
                    border-radius: 50%;
                    animation: spin 0.7s linear infinite;
                    margin-right: 8px;
                    vertical-align: middle;
                }
                @keyframes spin { to { transform: rotate(360deg); } }

                /* ── Footer del card ── */
                .vp-card-footer {
                    margin-top: 32px;
                    padding-top: 24px;
                    border-top: 1px solid rgba(255,255,255,0.05);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .vp-version {
                    font-size: 11px;
                    color: #374151;
                    letter-spacing: 0.05em;
                }

                .vp-status {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 11px;
                    color: #374151;
                }

                .vp-status-dot {
                    width: 6px;
                    height: 6px;
                    border-radius: 50%;
                    background: #10b981;
                    box-shadow: 0 0 6px rgba(16, 185, 129, 0.6);
                    animation: pulse-dot 2s infinite;
                }

                @keyframes pulse-dot {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.4; }
                }

                /* ── Glow de acento ── */
                .vp-glow {
                    position: absolute;
                    width: 400px;
                    height: 400px;
                    border-radius: 50%;
                    background: radial-gradient(circle, rgba(30, 111, 255, 0.08) 0%, transparent 70%);
                    bottom: -100px;
                    right: -100px;
                    pointer-events: none;
                }

                /* ── Responsive ── */
                @media (max-width: 768px) {
                    .vp-left { display: none; }
                    .vp-divider { display: none; }
                    .vp-right {
                        width: 100%;
                        padding: 40px 28px;
                    }
                }
            `}</style>

            <div className="vp-root">
                <div className="vp-grid" />

                {/* Panel izquierdo */}
                <div className="vp-left">
                    <div className={`vp-left-top ${mounted ? 'visible' : ''}`}>
                        <div className="vp-logo-mark" />
                        <div className="vp-brand">VentPro ERP</div>
                        <h1 className="vp-headline">
                            Gestión total<br />de tu empresa de<br /><span>ventanas PVC</span>
                        </h1>
                        <p className="vp-sub">
                            Control de cotizaciones, pedidos, materiales y cortes optimizados — todo en un solo lugar.
                        </p>
                        <div className={`vp-features ${mounted ? 'visible' : ''}`}>
                            {[
                                'Cotizaciones con cálculo automático de m²',
                                'Optimización de cortes por barra (FFD)',
                                'Control de pedidos e instalaciones',
                                'Dashboard financiero en tiempo real',
                            ].map((f) => (
                                <div className="vp-feature" key={f}>
                                    <span className="vp-feature-dot" />
                                    {f}
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="vp-left-bottom">
                        Guatemala · {new Date().getFullYear()}
                    </div>
                </div>

                {/* Separador */}
                <div className="vp-divider" />

                {/* Panel derecho: formulario */}
                <div className="vp-right">
                    <div className="vp-glow" />

                    <div className={`vp-card ${mounted ? 'visible' : ''}`}>
                        <div className="vp-card-label">Acceso al sistema</div>
                        <h2 className="vp-card-title">Iniciar sesión</h2>
                        <p className="vp-card-sub">Ingresa tus credenciales para continuar.</p>

                        <form onSubmit={handleSubmit}>
                            <div className="vp-field">
                                <label className="vp-label" htmlFor="email">Correo electrónico</label>
                                <div className="vp-input-wrap">
                                    <input
                                        id="email"
                                        className="vp-input"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        placeholder="usuario@empresa.com"
                                        disabled={loading}
                                        autoComplete="email"
                                    />
                                </div>
                            </div>

                            <div className="vp-field">
                                <label className="vp-label" htmlFor="password">Contraseña</label>
                                <div className="vp-input-wrap">
                                    <input
                                        id="password"
                                        className="vp-input"
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        placeholder="••••••••••"
                                        disabled={loading}
                                        autoComplete="current-password"
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="vp-error">
                                    <svg className="vp-error-icon" viewBox="0 0 16 16" fill="currentColor">
                                        <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 3a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 018 4zm0 8a1 1 0 110-2 1 1 0 010 2z" />
                                    </svg>
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                className={`vp-btn ${loading ? 'loading' : ''}`}
                                disabled={loading}
                            >
                                {loading && <span className="vp-spinner" />}
                                {loading ? 'Verificando...' : 'Ingresar al sistema'}
                            </button>
                        </form>

                        <div className="vp-card-footer">
                            <span className="vp-version">v1.0 · Build estable</span>
                            <div className="vp-status">
                                <span className="vp-status-dot" />
                                Sistema operativo
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}