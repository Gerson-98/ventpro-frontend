// RUTA: src/pages/LoginPage.jsx

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api'; // Usamos nuestro cliente de Axios
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault(); // Evita que la página se recargue
        setLoading(true);
        setError('');

        try {
            // 1. Hacemos la llamada al endpoint de login que creamos en el backend
            const response = await api.post('/auth/login', {
                email,
                password,
            });

            // 2. Si el login es exitoso, el backend nos devuelve un 'access_token'
            const { access_token } = response.data;

            // 3. Guardamos el token en el almacenamiento local del navegador.
            // Esto es como guardar el "pase VIP" para usarlo en el futuro.
            localStorage.setItem('authToken', access_token);

            // 4. Forzamos una recarga completa y redirigimos al inicio.
            // Esto asegura que toda la aplicación se actualice con el nuevo estado de "autenticado".
            window.location.href = '/';

        } catch (err) {
            // Si el backend devuelve un error (ej. 401 Unauthorized), lo mostramos.
            console.error("❌ Error de inicio de sesión:", err);
            setError('Correo electrónico o contraseña incorrectos.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-100">
            <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-xl shadow-md border">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-gray-800">VentPro</h1>
                    <p className="text-gray-600">Bienvenido de nuevo</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Label htmlFor="email">Correo Electrónico</Label>
                        <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="tu@correo.com"
                            disabled={loading}
                        />
                    </div>
                    <div>
                        <Label htmlFor="password">Contraseña</Label>
                        <Input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="••••••••"
                            disabled={loading}
                        />
                    </div>

                    {error && <p className="text-sm text-center text-red-600">{error}</p>}

                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? 'Ingresando...' : 'Iniciar Sesión'}
                    </Button>
                </form>
            </div>
        </div>
    );
}