// RUTA: src/components/AddUserModal.jsx

import { useState, useEffect } from 'react';
import api from '@/services/api';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export default function AddUserModal({ open, onClose, onSave, user = null }) {
    const isEditing = !!user;

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'VENDEDOR',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isEditing) {
            setFormData({
                name: user.name || '',
                email: user.email || '',
                password: '',
                role: user.role || 'VENDEDOR',
            });
        } else {
            setFormData({ name: '', email: '', password: '', role: 'VENDEDOR' });
        }
        setError('');
    }, [user, open]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!isEditing && (!formData.password || formData.password.length < 8)) {
            setError('La contraseña debe tener al menos 8 caracteres.');
            return;
        }
        if (isEditing && formData.password && formData.password.length < 8) {
            setError('La nueva contraseña debe tener al menos 8 caracteres.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            if (isEditing) {
                const payload = {
                    name: formData.name,
                    email: formData.email,
                    role: formData.role,
                    ...(formData.password && { password: formData.password }),
                };
                await api.patch(`/users/${user.id}`, payload);
            } else {
                await api.post('/users', formData);
            }
            onSave();
        } catch (err) {
            const raw = err.response?.data?.message;
            const msg = Array.isArray(raw)
                ? raw.join(', ')
                : typeof raw === 'string'
                    ? raw
                    : err.message || 'Ocurrió un error.';
            setError(msg);
            console.error('Error saving user:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="w-[calc(100%-2rem)] sm:max-w-md max-h-[92dvh] overflow-y-auto rounded-2xl sm:rounded-xl p-5 sm:p-6">
                <DialogHeader>
                    <DialogTitle className="text-base sm:text-lg">
                        {isEditing ? 'Editar Usuario' : 'Crear Nuevo Usuario'}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                    <div>
                        <Label htmlFor="name">Nombre Completo</Label>
                        <Input
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            disabled={loading}
                        />
                    </div>
                    <div>
                        <Label htmlFor="email">Correo Electrónico</Label>
                        <Input
                            id="email"
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            disabled={loading}
                        />
                    </div>
                    <div>
                        <Label htmlFor="password">
                            {isEditing
                                ? 'Nueva Contraseña (dejar vacío para no cambiar)'
                                : 'Contraseña (mín. 8 caracteres)'}
                        </Label>
                        <Input
                            id="password"
                            name="password"
                            type="password"
                            value={formData.password}
                            onChange={handleChange}
                            required={!isEditing}
                            disabled={loading}
                            placeholder={isEditing ? 'Dejar vacío para no cambiar' : ''}
                        />
                    </div>
                    <div>
                        <Label htmlFor="role">Rol</Label>
                        <select
                            id="role"
                            name="role"
                            value={formData.role}
                            onChange={handleChange}
                            disabled={loading}
                            className="w-full h-10 border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 border rounded-md"
                        >
                            <option value="VENDEDOR">Vendedor</option>
                            <option value="ADMIN">Administrador</option>
                        </select>
                    </div>

                    {error && <p className="text-sm text-center text-red-500">{error}</p>}

                    <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-2 pt-2">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={onClose}
                            disabled={loading}
                            className="w-full sm:w-auto"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full sm:w-auto"
                        >
                            {loading
                                ? isEditing ? 'Guardando...' : 'Creando...'
                                : isEditing ? 'Guardar Cambios' : 'Crear Usuario'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}