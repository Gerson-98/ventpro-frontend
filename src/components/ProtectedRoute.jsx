// RUTA: src/components/ProtectedRoute.jsx

import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ children }) {
    // 1. Buscamos el token en el almacenamiento local del navegador.
    const token = localStorage.getItem('authToken');

    // 2. Si NO hay token, redirigimos al usuario a la página de login.
    // El prop 'replace' evita que el usuario pueda volver a la página anterior con el botón de "atrás".
    if (!token) {
        return <Navigate to="/login" replace />;
    }

    // 3. Si hay un token, simplemente mostramos el contenido que debería estar protegido (los children).
    return children;
}