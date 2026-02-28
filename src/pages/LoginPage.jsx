// RUTA: src/pages/LoginPage.jsx

import { useState, useEffect } from 'react';
import api from '@/services/api';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [ready, setReady] = useState(false);

    useEffect(() => { setReady(true); }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const { data } = await api.post('/auth/login', { email, password });
            localStorage.setItem('authToken', data.access_token);
            window.location.href = '/';
        } catch {
            setError('Credenciales incorrectas.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600&family=Geist+Mono:wght@400;500&display=swap');

                .lp-wrap {
                    font-family: 'Geist', system-ui, sans-serif;
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: #09090b;
                    padding: 24px;
                }

                /* Glow de fondo */
                .lp-wrap::before {
                    content: '';
                    position: fixed;
                    inset: 0;
                    background:
                        radial-gradient(ellipse 60% 50% at 50% 0%, rgba(59,130,246,0.07) 0%, transparent 100%);
                    pointer-events: none;
                }

                .lp-card {
                    width: 100%;
                    max-width: 380px;
                    background: rgba(255,255,255,0.03);
                    border: 1px solid rgba(255,255,255,0.08);
                    border-radius: 16px;
                    padding: 40px 36px;
                    backdrop-filter: blur(12px);
                    opacity: 0;
                    transform: translateY(16px);
                    transition: opacity 0.5s ease, transform 0.5s ease;
                    position: relative;
                    z-index: 1;
                }
                .lp-card.in { opacity: 1; transform: translateY(0); }

                /* Línea de acento superior */
                .lp-card::before {
                    content: '';
                    position: absolute;
                    top: -1px;
                    left: 20%;
                    right: 20%;
                    height: 2px;
                    background: linear-gradient(90deg, transparent, #3b82f6, transparent);
                    border-radius: 2px;
                }

                .lp-brand {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin-bottom: 32px;
                }

                .lp-icon {
                    width: 32px;
                    height: 32px;
                    background: #3b82f6;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }

                .lp-icon svg { display: block; }

                .lp-name {
                    font-family: 'Geist Mono', monospace;
                    font-size: 15px;
                    font-weight: 500;
                    color: #f4f4f5;
                    letter-spacing: 0.02em;
                }

                .lp-title {
                    font-size: 22px;
                    font-weight: 600;
                    color: #f4f4f5;
                    letter-spacing: -0.02em;
                    margin-bottom: 6px;
                }

                .lp-sub {
                    font-size: 13px;
                    color: #52525b;
                    margin-bottom: 28px;
                    font-weight: 300;
                }

                .lp-field { margin-bottom: 14px; }

                .lp-label {
                    display: block;
                    font-size: 12px;
                    font-weight: 500;
                    color: #71717a;
                    margin-bottom: 6px;
                    letter-spacing: 0.02em;
                }

                .lp-input {
                    width: 100%;
                    height: 42px;
                    background: rgba(255,255,255,0.04);
                    border: 1px solid rgba(255,255,255,0.09);
                    border-radius: 8px;
                    padding: 0 14px;
                    font-family: 'Geist', system-ui, sans-serif;
                    font-size: 14px;
                    color: #f4f4f5;
                    outline: none;
                    transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
                    -webkit-appearance: none;
                    box-sizing: border-box;
                }
                .lp-input::placeholder { color: #3f3f46; }
                .lp-input:focus {
                    border-color: rgba(59,130,246,0.6);
                    background: rgba(59,130,246,0.04);
                    box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
                }
                .lp-input:disabled { opacity: 0.45; cursor: not-allowed; }

                .lp-error {
                    font-size: 12px;
                    color: #f87171;
                    background: rgba(248,113,113,0.08);
                    border: 1px solid rgba(248,113,113,0.15);
                    border-radius: 7px;
                    padding: 9px 12px;
                    margin-bottom: 14px;
                    display: flex;
                    align-items: center;
                    gap: 7px;
                    animation: shake .25s ease;
                }
                @keyframes shake {
                    0%,100%{transform:translateX(0)}
                    33%{transform:translateX(-4px)}
                    66%{transform:translateX(4px)}
                }

                .lp-btn {
                    width: 100%;
                    height: 42px;
                    background: #3b82f6;
                    border: none;
                    border-radius: 8px;
                    font-family: 'Geist', system-ui, sans-serif;
                    font-size: 14px;
                    font-weight: 500;
                    color: #fff;
                    cursor: pointer;
                    margin-top: 6px;
                    transition: background 0.15s, transform 0.1s, box-shadow 0.15s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    letter-spacing: 0.01em;
                }
                .lp-btn:hover:not(:disabled) {
                    background: #2563eb;
                    box-shadow: 0 4px 16px rgba(59,130,246,0.3);
                    transform: translateY(-1px);
                }
                .lp-btn:active:not(:disabled) { transform: translateY(0); box-shadow: none; }
                .lp-btn:disabled { opacity: 0.5; cursor: not-allowed; }

                .lp-spinner {
                    width: 14px; height: 14px;
                    border: 2px solid rgba(255,255,255,0.25);
                    border-top-color: #fff;
                    border-radius: 50%;
                    animation: spin .65s linear infinite;
                    flex-shrink: 0;
                }
                @keyframes spin { to { transform: rotate(360deg); } }

                .lp-footer {
                    margin-top: 24px;
                    padding-top: 20px;
                    border-top: 1px solid rgba(255,255,255,0.05);
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }
                .lp-footer-text {
                    font-size: 11px;
                    color: #3f3f46;
                    font-family: 'Geist Mono', monospace;
                }
                .lp-online {
                    display: flex;
                    align-items: center;
                    gap: 5px;
                    font-size: 11px;
                    color: #3f3f46;
                }
                .lp-dot {
                    width: 5px; height: 5px;
                    border-radius: 50%;
                    background: #22c55e;
                    box-shadow: 0 0 5px rgba(34,197,94,0.7);
                    animation: blink 2s ease infinite;
                }
                @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.3} }
            `}</style>

            <div className="lp-wrap">
                <div className={`lp-card ${ready ? 'in' : ''}`}>

                    {/* Brand */}
                    <div className="lp-brand">
                        <div className="lp-icon">
                            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                                <rect x="1" y="1" width="7" height="7" rx="1.5" fill="white" fillOpacity=".9" />
                                <rect x="10" y="1" width="7" height="7" rx="1.5" fill="white" fillOpacity=".5" />
                                <rect x="1" y="10" width="7" height="7" rx="1.5" fill="white" fillOpacity=".5" />
                                <rect x="10" y="10" width="7" height="7" rx="1.5" fill="white" fillOpacity=".9" />
                            </svg>
                        </div>
                        <span className="lp-name">VentPro</span>
                    </div>

                    <h1 className="lp-title">Bienvenido</h1>
                    <p className="lp-sub">Ingresa tus credenciales para continuar.</p>

                    <form onSubmit={handleSubmit}>
                        <div className="lp-field">
                            <label className="lp-label" htmlFor="email">Correo</label>
                            <input
                                id="email"
                                className="lp-input"
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="usuario@empresa.com"
                                required
                                disabled={loading}
                                autoComplete="email"
                            />
                        </div>

                        <div className="lp-field">
                            <label className="lp-label" htmlFor="password">Contraseña</label>
                            <input
                                id="password"
                                className="lp-input"
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                disabled={loading}
                                autoComplete="current-password"
                            />
                        </div>

                        {error && (
                            <div className="lp-error">
                                <svg width="13" height="13" viewBox="0 0 13 13" fill="currentColor">
                                    <path d="M6.5 1a5.5 5.5 0 100 11A5.5 5.5 0 006.5 1zm0 3a.6.6 0 01.6.6v2.8a.6.6 0 01-1.2 0V4.6A.6.6 0 016.5 4zm0 5.5a.75.75 0 110-1.5.75.75 0 010 1.5z" />
                                </svg>
                                {error}
                            </div>
                        )}

                        <button type="submit" className="lp-btn" disabled={loading}>
                            {loading && <span className="lp-spinner" />}
                            {loading ? 'Verificando...' : 'Iniciar sesión'}
                        </button>
                    </form>

                    <div className="lp-footer">
                        <span className="lp-footer-text">v1.0.0</span>
                        <div className="lp-online">
                            <span className="lp-dot" />
                            En línea
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}