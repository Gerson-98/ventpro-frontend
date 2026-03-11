import axios from "axios";

const BASE_URL =
  import.meta.env.VITE_API_URL?.replace(/\/+$/, "") ||
  "https://api.ventprofesional.com";

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  withCredentials: false,
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

// ✨ INTERCEPTOR: Si el token expiró, redirige al login automáticamente
// También transforma errores de timeout en mensajes legibles para el usuario
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    if (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK') {
      error.userMessage = 'El servidor tardó demasiado en responder. Intenta de nuevo.';
    }
    return Promise.reject(error);
  }
);

export const getJSON = (path) => api.get(path).then((r) => r.data);
export const postJSON = (path, data) => api.post(path, data).then((r) => r.data);
export const patchJSON = (path, data) => api.patch(path, data).then((r) => r.data);
export const del = (path) => api.delete(path).then((r) => r.data);

export default api;