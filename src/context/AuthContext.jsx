// RUTA: src/context/AuthContext.jsx

import { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode'; // Necesitaremos una nueva librería para decodificar el token

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
                    setUser(decodedUser);
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

    const logout = () => {
        setUser(null);
        localStorage.removeItem('authToken');
        window.location.href = '/login';
    };

    const value = { user, logout, loading };

    // Si aún estamos cargando, no mostramos nada para evitar parpadeos.
    if (loading) {
        return null;
    }

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Este es un "hook" personalizado que nos facilitará usar el contexto en otros componentes.
export function useAuth() {
    return useContext(AuthContext);
}