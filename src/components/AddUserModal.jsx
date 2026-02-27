// RUTA: src/components/AddUserModal.jsx

import { useState } from 'react';
import api from '@/services/api';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export default function AddUserModal({ open, onClose, onSave }) {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'VENDEDOR', // Por seguridad, el rol por defecto es el de menos privilegios
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.password || formData.password.length < 8) {
            setError('La contraseña debe tener al menos 8 caracteres.');
            return;
        }
        setLoading(true);
        setError('');
        try {
            await api.post('/users', formData);
            onSave(); // Llama a la función onSave para cerrar y recargar
        } catch (err) {
            setError(err.response?.data?.message || 'Error al crear el usuario.');
            console.error("Error creating user:", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Crear Nuevo Usuario</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div>
                        <Label htmlFor="name">Nombre Completo</Label>
                        <Input id="name" name="name" value={formData.name} onChange={handleChange} required disabled={loading} />
                    </div>
                    <div>
                        <Label htmlFor="email">Correo Electrónico</Label>
                        <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} required disabled={loading} />
                    </div>
                    <div>
                        <Label htmlFor="password">Contraseña (mín. 8 caracteres)</Label>
                        <Input id="password" name="password" type="password" value={formData.password} onChange={handleChange} required disabled={loading} />
                    </div>
                    <div>
                        <Label htmlFor="role">Rol</Label>
                        <select
                            id="role"
                            name="role"
                            value={formData.role}
                            onChange={handleChange}
                            disabled={loading}
                            className="w-full h-10 border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 border rounded-md"
                        >
                            <option value="VENDEDOR">Vendedor</option>
                            <option value="ADMINISTRADOR">Administrador</option>
                        </select>
                    </div>
                    {error && <p className="text-sm text-center text-red-500">{error}</p>}
                    <DialogFooter>
                        <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Creando...' : 'Crear Usuario'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}