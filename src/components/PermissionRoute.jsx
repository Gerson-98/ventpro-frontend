// RUTA: src/components/PermissionRoute.jsx
//
// Reemplaza a AdminRoute/RoleRoute para rutas cuyo acceso depende de un
// permiso configurable en vez de un rol fijo. ADMIN siempre pasa porque
// PermissionsContext ya le resuelve el catálogo completo.

import { Navigate } from 'react-router-dom';
import { usePermissions } from '@/context/PermissionsContext';

export default function PermissionRoute({ permission, children }) {
    const { hasPermission, loading } = usePermissions();

    if (loading) return null;

    if (!hasPermission(permission)) {
        return <Navigate to="/quotations" replace />;
    }

    return children;
}
