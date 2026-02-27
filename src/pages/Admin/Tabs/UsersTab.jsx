// RUTA: src/pages/Admin/Tabs/UsersTab.jsx

import { useState, useEffect } from 'react';
import api from '@/services/api';
import { Button } from '@/components/ui/button';
import { FaUserPlus, FaTrashAlt } from 'react-icons/fa';
import AddUserModal from '@/components/AddUserModal'; // Importa el modal que acabamos de crear

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

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleDelete = async (userId) => {
        if (!window.confirm('¿Estás seguro de que quieres eliminar este usuario? No se podrá recuperar.')) {
            return;
        }
        try {
            await api.delete(`/users/${userId}`);
            fetchUsers(); // Recarga la lista de usuarios
        } catch (err) {
            alert('Error al eliminar el usuario.');
            console.error("Error deleting user:", err);
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-800">Gestionar Usuarios del Sistema</h2>
                <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
                    <FaUserPlus />
                    Crear Usuario
                </Button>
            </div>

            {loading && <p>Cargando usuarios...</p>}
            {error && <p className="text-red-500">{error}</p>}

            {!loading && !error && (
                <div className="overflow-x-auto rounded-lg border">
                    <table className="min-w-full bg-white">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="text-left py-3 px-4 font-semibold text-gray-600">Nombre</th>
                                <th className="text-left py-3 px-4 font-semibold text-gray-600">Correo Electrónico</th>
                                <th className="text-left py-3 px-4 font-semibold text-gray-600">Rol</th>
                                <th className="text-left py-3 px-4 font-semibold text-gray-600">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {users.map((user) => (
                                <tr key={user.id}>
                                    <td className="py-3 px-4">{user.name}</td>
                                    <td className="py-3 px-4">{user.email}</td>
                                    <td className="py-3 px-4">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${user.role === 'ADMINISTRADOR'
                                                ? 'bg-red-100 text-red-800'
                                                : 'bg-blue-100 text-blue-800'
                                            }`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4">
                                        <div className="flex gap-4">
                                            {/* En el futuro, aquí irá el botón de editar */}
                                            <button onClick={() => handleDelete(user.id)} className="text-red-500 hover:text-red-700" title="Eliminar Usuario">
                                                <FaTrashAlt />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
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