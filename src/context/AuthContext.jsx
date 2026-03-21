// RUTA: src/context/AuthContext.jsx

import { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import api from '@/services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Esta función se ejecuta solo una vez, cuando la aplicación carga por primera vez.
        const initializeAuth = () => {
            try {
                const token = localStorage.getItem('authToken');
                if (token) {
                    // Si encontramos un token, lo decodificamos para obtener los datos del usuario.
                    const decodedUser = jwtDecode(token);
                    const isExpired = decodedUser.exp * 1000 < Date.now();
                    if (isExpired) {
                        localStorage.removeItem('authToken');
                    } else {
                        setUser(decodedUser);
                    }
                }
            } catch (error) {
                console.error("Token inválido o expirado:", error);
                // Si el token es inválido, lo borramos para evitar problemas.
                localStorage.removeItem('authToken');
            } finally {
                setLoading(false);
            }
        };

        initializeAuth();
    }, []);

    const logout = async () => {
        try {
            const refreshToken = localStorage.getItem('refreshToken');
            await api.post('/auth/logout', { refresh_token: refreshToken });
        } catch {
            // Si falla el logout del servidor, igual limpiamos local
        } finally {
            setUser(null);
            localStorage.removeItem('authToken');
            localStorage.removeItem('refreshToken');
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