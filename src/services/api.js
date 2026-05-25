import axios from "axios";
import { toast } from 'sonner';

const BASE_URL =
  import.meta.env.VITE_API_URL?.replace(/\/+$/, "") ||
  "https://api.ventprofesional.com";

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  // withCredentials: true envía la httpOnly cookie del refresh_token en cada petición cross-origin.
  // El backend ya tiene CORS configurado con credentials: true y origins específicos.
  withCredentials: true,
  timeout: 15000,
});

// ✨ INTERCEPTOR: Adjunta el token JWT a cada request automáticamente
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ✨ INTERCEPTOR: Refresh silencioso de access_token con cola de requests
// Si el access_token expiró (401), renueva usando la httpOnly cookie del refresh_token.
// La cookie se envía automáticamente gracias a withCredentials: true.
// Si el refresh también falla → logout y redirect a /login.

let refreshPromise = null;

// Refresh compartido: serializa todas las llamadas a /auth/refresh — sean del
// interceptor (401) o del AuthContext en boot — bajo una única promesa.
// Sin esto, dos refreshes en paralelo enviarían la misma cookie; el primero
// rotaba el token y el segundo viajaba con el ya-revocado → 401 → logout.
export const refreshAccessToken = () => {
  if (!refreshPromise) {
    refreshPromise = api
      .post('/auth/refresh')
      .then((res) => {
        const token = res.data?.access_token;
        if (!token) throw new Error('No access_token en respuesta de refresh');
        localStorage.setItem('authToken', token);
        api.defaults.headers.common.Authorization = `Bearer ${token}`;
        return token;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/refresh') &&
      !originalRequest.url?.includes('/auth/login')
    ) {
      originalRequest._retry = true;
      try {
        const newToken = await refreshAccessToken();
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('authToken');
        // Solo redirigir si no estamos ya en /login para evitar loops.
        if (!window.location.pathname.startsWith('/login')) {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    if (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK') {
      error.userMessage = 'El servidor tardó demasiado en responder. Intenta de nuevo.';
    }

    // Mostrar toast solo para errores que no son 401
    // (los 401 ya los maneja el refresh silencioso)
    if (error.response?.status === 403) {
      toast.error('No tienes permiso para realizar esta acción.');
    } else if (error.response?.status === 409) {
      toast.warning(
        error.response?.data?.message || 'Conflicto al guardar. Intenta de nuevo.'
      );
    } else if (error.response?.status >= 500) {
      toast.error('Error del servidor. Por favor intenta de nuevo.');
    } else if (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK') {
      toast.error('Sin conexión. Verifica tu red e intenta de nuevo.');
    }

    return Promise.reject(error);
  }
);

export const getJSON = (path) => api.get(path).then((r) => r.data);
export const postJSON = (path, data) => api.post(path, data).then((r) => r.data);
export const patchJSON = (path, data) => api.patch(path, data).then((r) => r.data);
export const del = (path) => api.delete(path).then((r) => r.data);

export default api;
