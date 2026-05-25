// RUTA: src/context/AuthContext.jsx

import { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import api, { refreshAccessToken } from '@/services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
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
                        localStorage.removeItem('authToken');
                    } catch {
                        localStorage.removeItem('authToken');
                    }
                }

                try {
                    const newToken = await refreshAccessToken();
                    setUser(jwtDecode(newToken));
                } catch {
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
