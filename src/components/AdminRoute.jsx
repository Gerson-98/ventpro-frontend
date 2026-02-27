// RUTA: src/components/AdminRoute.jsx

import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AdminRoute({ children }) {
    const { user } = useAuth();

    if (user?.role !== 'ADMIN') {
        return <Navigate to="/quotations" replace />;
    }

    return children;
}