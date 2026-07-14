// RUTA: src/pages/Admin/Tabs/PermissionsTab.jsx
//
// Tabla de permisos configurables por rol. ADMIN no aparece como columna:
// siempre tiene acceso total (bypass hardcodeado en el backend), así que no
// tiene sentido —ni es seguro— poder restringirlo desde aquí.

import { Fragment, useState, useEffect } from 'react';
import api from '@/services/api';
import { toast } from 'sonner';

const ROLE_COLUMNS = [
    { key: 'VENDEDOR', label: 'Vendedor' },
    { key: 'SUPERVISOR', label: 'Supervisor' },
];

function Toggle({ checked, onChange, disabled }) {
    return (
        <button
            type="button"
            onClick={() => !disabled && onChange(!checked)}
            disabled={disabled}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${checked ? 'bg-blue-600' : 'bg-gray-300'}`}
        >
            <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`}
            />
        </button>
    );
}

export default function PermissionsTab() {
    const [matrix, setMatrix] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [pendingKey, setPendingKey] = useState(null); // `${role}:${permissionKey}` en vuelo

    const fetchMatrix = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await api.get('/permissions');
            setMatrix(res.data || []);
        } catch (err) {
            setError('No se pudo cargar la matriz de permisos.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchMatrix(); }, []);

    const handleToggle = async (permissionKey, role, nextValue) => {
        const pendingId = `${role}:${permissionKey}`;
        setPendingKey(pendingId);
        // Optimistic update
        setMatrix(prev => prev.map(p =>
            p.key === permissionKey ? { ...p, roles: { ...p.roles, [role]: nextValue } } : p
        ));
        try {
            const res = await api.patch('/permissions', { role, permissionKey, allowed: nextValue });
            setMatrix(res.data || []);
            toast.success('Permiso actualizado');
        } catch (err) {
            toast.error('No se pudo actualizar el permiso.');
            // Revertir en caso de error
            fetchMatrix();
        } finally {
            setPendingKey(null);
        }
    };

    if (loading) {
        return <p className="text-gray-600 text-sm py-4">Cargando permisos...</p>;
    }
    if (error) {
        return <p className="text-red-500 text-sm py-4">{error}</p>;
    }

    const categories = [...new Set(matrix.map(p => p.category))];

    return (
        <div>
            <div className="mb-4">
                <h2 className="text-xl sm:text-2xl font-semibold text-gray-800">Permisos por Rol</h2>
                <p className="text-sm text-gray-500 mt-1">
                    Activa o desactiva capacidades para Vendedor y Supervisor. Los cambios surten efecto de inmediato — el usuario los verá al navegar entre pantallas.
                    Administrador siempre tiene acceso total y no se puede restringir desde aquí.
                </p>
            </div>

            <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full bg-white text-sm">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="text-left py-3 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wide">Permiso</th>
                            {ROLE_COLUMNS.map(col => (
                                <th key={col.key} className="text-center py-3 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wide w-32">
                                    {col.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {categories.map(category => (
                            <Fragment key={category}>
                                <tr className="bg-gray-50/60">
                                    <td colSpan={1 + ROLE_COLUMNS.length} className="py-2 px-4 text-xs font-bold text-gray-500 uppercase tracking-widest">
                                        {category}
                                    </td>
                                </tr>
                                {matrix.filter(p => p.category === category).map(p => (
                                    <tr key={p.key} className="hover:bg-gray-50 transition-colors">
                                        <td className="py-3 px-4 text-gray-700">{p.label}</td>
                                        {ROLE_COLUMNS.map(col => (
                                            <td key={col.key} className="py-3 px-4 text-center">
                                                <div className="flex justify-center">
                                                    <Toggle
                                                        checked={!!p.roles[col.key]}
                                                        disabled={pendingKey === `${col.key}:${p.key}`}
                                                        onChange={(next) => handleToggle(p.key, col.key, next)}
                                                    />
                                                </div>
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
