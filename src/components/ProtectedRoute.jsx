// RUTA: src/components/ProtectedRoute.jsx

import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

// ─────────────────────────────────────────────────────────────
// NOTA: antes este componente leía `authToken` de localStorage y
// lo decodificaba con jwtDecode para redirigir a /login si el
// access_token había expirado. Eso causaba un "auto-logout" en
// cuanto el token de 15 min caducaba (p. ej. tras cambiar de
// pestaña), aun cuando el refresh_token httpOnly (7 días) seguía
// siendo válido.
//
// Ahora dependemos del estado `user` expuesto por AuthContext,
// que ya intenta un refresh silencioso al inicializar. Mientras
// exista sesión válida (access_token vigente o refresh_token que
// renueve) el usuario permanece autenticado. Los 401 que ocurran
// durante la sesión los maneja de forma silenciosa el interceptor
// de axios en services/api.js.
// ─────────────────────────────────────────────────────────────

export default function ProtectedRoute({ children }) {
    const { user, loading } = useAuth();

    // AuthProvider ya muestra un spinner durante la inicialización
    // antes de renderizar a sus hijos, pero por robustez cubrimos el caso.
    if (loading) return null;

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return children;
}
