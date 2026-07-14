// RUTA: src/context/PermissionsContext.jsx
//
// Expone el set de permisos resuelto para el usuario logueado
// (GET /permissions/me). Ningún componente debe volver a preguntar
// "¿es ADMIN/SUPERVISOR/VENDEDOR?" — todo pasa por hasPermission(key).
// ADMIN recibe el catálogo completo desde el backend (bypass), así que
// hasPermission siempre es true para admin sin necesidad de caso especial aquí.
//
// Se refresca cada vez que cambia la ruta (además de al iniciar sesión), para
// que un cambio de permisos hecho por un admin surta efecto en la próxima
// navegación del usuario afectado, sin necesitar recargar la página entera.

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import api from '@/services/api';
import { useAuth } from './AuthContext';

const PermissionsContext = createContext(null);

export function PermissionsProvider({ children }) {
    const { user } = useAuth();
    const location = useLocation();
    const [permissions, setPermissions] = useState(new Set());
    const [loading, setLoading] = useState(true);

    const fetchPermissions = useCallback(async () => {
        if (!user) {
            setPermissions(new Set());
            setLoading(false);
            return;
        }
        try {
            const res = await api.get('/permissions/me');
            setPermissions(new Set(res.data?.permissions || []));
        } catch {
            setPermissions(new Set());
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchPermissions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.sub, user?.role]);

    // Refresca en cada navegación — así un toggle del admin surte efecto
    // la próxima vez que el usuario afectado cambia de pantalla.
    useEffect(() => {
        if (user) fetchPermissions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.pathname]);

    const hasPermission = (key) => permissions.has(key);

    return (
        <PermissionsContext.Provider value={{ permissions, hasPermission, loading, refetch: fetchPermissions }}>
            {children}
        </PermissionsContext.Provider>
    );
}

export function usePermissions() {
    return useContext(PermissionsContext);
}
