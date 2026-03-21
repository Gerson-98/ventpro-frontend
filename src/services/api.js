import axios from "axios";
import { toast } from 'sonner';

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

// ✨ INTERCEPTOR: Refresh silencioso de access_token con cola de requests
// Si el access_token expiró (401), intenta renovarlo con el refresh_token (httpOnly cookie).
// Si el refresh también falla → logout y redirect a /login.

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Si es 401, no es el endpoint de refresh ni de login, y no hemos reintentado ya
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes('/auth/refresh') &&
      !originalRequest.url.includes('/auth/login')
    ) {
      if (isRefreshing) {
        // Ya hay un refresh en curso: encola este request y espera el nuevo token
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await api.post(
          '/auth/refresh',
          { refresh_token: refreshToken },
          { withCredentials: false },
        );
        const newToken = data.access_token;

        localStorage.setItem('authToken', newToken);
        // Rotar el refresh token si el backend devuelve uno nuevo
        if (data.refresh_token) {
          localStorage.setItem('refreshToken', data.refresh_token);
        }
        api.defaults.headers.common.Authorization = `Bearer ${newToken}`;
        originalRequest.headers.Authorization = `Bearer ${newToken}`;

        processQueue(null, newToken);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
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