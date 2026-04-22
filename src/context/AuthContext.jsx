// RUTA: src/context/AuthContext.jsx

import { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import api from '@/services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // ─────────────────────────────────────────────────────────────
        // CAUSA RAÍZ del cierre de sesión automático (bug "~1 minuto"):
        //
        // La versión anterior leía `authToken` de localStorage y si el
        // access_token estaba expirado simplemente lo borraba y dejaba al
        // usuario sin sesión. Lo mismo hacía `ProtectedRoute` en cada
        // render: decodificaba el JWT y redirigía a /login si `exp < now`,
        // sin intentar usar el refresh_token (httpOnly cookie, 7 días).
        //
        // Resultado: cada vez que el usuario cambiaba de pestaña o dejaba
        // la app inactiva lo suficiente para que el access_token (15 min)
        // expirara, el siguiente re-render disparaba logout aunque el
        // refresh_token siguiera siendo válido.
        //
        // Solución: en la inicialización, si el access_token falta o está
        // expirado, intentar un refresh silencioso con POST /auth/refresh
        // (la cookie httpOnly viaja automáticamente con withCredentials).
        // Solo si el refresh falla se deja al usuario sin sesión.
        // `ProtectedRoute` ya no revisa la expiración — depende de `user`.
        // ─────────────────────────────────────────────────────────────
        const initializeAuth = async () => {
            try {
                const token = localStorage.getItem('authToken');
                if (token) {
                    try {
                        const decoded = jwtDecode(token);
                        const isExpired = decoded.exp * 1000 < Date.now();
                        if (!isExpired) {
                            setUser(decoded);
                            return;
                        }
                        // Expirado: limpiamos y caemos al intento de refresh
                        localStorage.removeItem('authToken');
                    } catch {
                        localStorage.removeItem('authToken');
                    }
                }

                // Sin token válido. Intentamos refresh silencioso:
                // el refresh_token viaja en la httpOnly cookie.
                try {
                    const { data } = await api.post('/auth/refresh');
                    if (data?.access_token) {
                        localStorage.setItem('authToken', data.access_token);
                        const decoded = jwtDecode(data.access_token);
                        setUser(decoded);
                    }
                } catch {
                    // No hay refresh token válido: permanece sin sesión.
                    localStorage.removeItem('authToken');
                    setUser(null);
                }
            } finally {
                setLoading(false);
            }
        };

        initializeAuth();
    }, []);

    const logout = async () => {
        try {
            // withCredentials: true envía la cookie automáticamente; el backend la revoca
            await api.post('/auth/logout');
        } catch {
            // Si falla el logout del servidor, igual limpiamos local
        } finally {
            setUser(null);
            localStorage.removeItem('authToken');
            window.location.href = '/login';
        }
    };

    const value = { user, logout, loading };

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', background: '#09090b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 24, height: 24, border: '2px solid rgba(255,255,255,0.15)', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.65s linear infinite' }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Este es un "hook" personalizado que nos facilitará usar el contexto en otros componentes.
export function useAuth() {
    return useContext(AuthContext);
}
