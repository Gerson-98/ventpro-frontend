// RUTA: src/components/ProtectedRoute.jsx

import { Navigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

export default function ProtectedRoute({ children }) {
    // 1. Buscamos el token en el almacenamiento local del navegador.
    const token = localStorage.getItem('authToken');

    // 2. Si NO hay token, redirigimos al usuario a la página de login.
    if (!token) {
        return <Navigate to="/login" replace />;
    }

    // 3. Verificamos que el token no esté expirado.
    try {
        const decoded = jwtDecode(token);
        const isExpired = decoded.exp * 1000 < Date.now();
        if (isExpired) {
            localStorage.removeItem('authToken');
            return <Navigate to="/login" replace />;
        }
    } catch {
        // Si el token es inválido o no se puede decodificar, lo eliminamos.
        localStorage.removeItem('authToken');
        return <Navigate to="/login" replace />;
    }

    // 4. Token válido y vigente — mostramos el contenido protegido.
    return children;
}