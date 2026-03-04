// RUTA: src/pages/Admin/Tabs/UsersTab.jsx

import { useState, useEffect } from 'react';
import api from '@/services/api';
import { Button } from '@/components/ui/button';
import { FaUserPlus, FaTrashAlt } from 'react-icons/fa';
import AddUserModal from '@/components/AddUserModal';

export default function UsersTab() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await api.get('/users');
            setUsers(response.data);
        } catch (err) {
            setError('No se pudieron cargar los usuarios.');
            console.error("Error fetching users:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchUsers(); }, []);

    const handleDelete = async (userId) => {
        if (!window.confirm('¿Estás seguro de que quieres eliminar este usuario? No se podrá recuperar.')) return;
        try {
            await api.delete(`/users/${userId}`);
            fetchUsers();
        } catch (err) {
            alert('Error al eliminar el usuario.');
            console.error("Error deleting user:", err);
        }
    };

    return (
        <div>
            {/* Encabezado */}
            <div className="flex items-start justify-between gap-3 mb-4 sm:mb-6">
                <h2 className="text-xl sm:text-2xl font-semibold text-gray-800">
                    Gestionar Usuarios del Sistema
                </h2>
                <Button
                    onClick={() => setIsModalOpen(true)}
                    className="flex-shrink-0 flex items-center gap-2 text-sm"
                >
                    <FaUserPlus />
                    <span className="hidden sm:inline">Crear Usuario</span>
                    <span className="sm:hidden">Crear</span>
                </Button>
            </div>

            {loading && <p className="text-gray-600 text-sm py-4">Cargando usuarios...</p>}
            {error && <p className="text-red-500 text-sm">{error}</p>}

            {!loading && !error && (
                <>
                    {/* ── Tabla desktop (md+) ── */}
                    <div className="hidden md:block overflow-x-auto rounded-lg border border-gray-200">
                        <table className="min-w-full bg-white text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="text-left py-3 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wide">Nombre</th>
                                    <th className="text-left py-3 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wide">Correo Electrónico</th>
                                    <th className="text-left py-3 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wide">Rol</th>
                                    <th className="text-left py-3 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wide">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {users.map((user) => (
                                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="py-3 px-4 font-medium text-gray-900">{user.name}</td>
                                        <td className="py-3 px-4 text-gray-500">{user.email}</td>
                                        <td className="py-3 px-4">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${user.role === 'ADMINISTRADOR'
                                                    ? 'bg-red-100 text-red-800'
                                                    : 'bg-blue-100 text-blue-800'
                                                }`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4">
                                            <button
                                                onClick={() => handleDelete(user.id)}
                                                className="text-red-500 hover:text-red-700 transition-colors"
                                                title="Eliminar Usuario"
                                            >
                                                <FaTrashAlt size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* ── Cards móvil (< md) ── */}
                    <div className="md:hidden border border-gray-200 rounded-lg overflow-hidden divide-y divide-gray-100">
                        {users.length === 0 ? (
                            <p className="text-center py-8 text-gray-500 text-sm">No hay usuarios registrados.</p>
                        ) : (
                            users.map((user) => (
                                <div key={user.id} className="p-4">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="font-semibold text-sm text-gray-900">{user.name}</p>
                                            <p className="text-xs text-gray-500 mt-0.5 truncate">{user.email}</p>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${user.role === 'ADMINISTRADOR'
                                                    ? 'bg-red-100 text-red-800'
                                                    : 'bg-blue-100 text-blue-800'
                                                }`}>
                                                {user.role}
                                            </span>
                                            <button
                                                onClick={() => handleDelete(user.id)}
                                                className="text-red-400 p-1.5 rounded-lg border border-red-100 active:bg-red-50"
                                                title="Eliminar Usuario"
                                            >
                                                <FaTrashAlt size={12} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </>
            )}

            {isModalOpen && (
                <AddUserModal
                    open={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSave={() => {
                        setIsModalOpen(false);
                        fetchUsers();
                    }}
                />
            )}
        </div>
    );
}