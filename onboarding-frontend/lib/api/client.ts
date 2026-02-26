import axios from 'axios';
import { useAuthStore } from '@/lib/store/auth-store';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

/**
 * Clears all auth state and redirects to login.
 *
 * Imported lazily to avoid a circular dependency:
 *   auth-store → authApi (services) → apiClient (client) → auth-store
 *
 * Calling logout() on the store is the single source of truth for clearing
 * tokens — it handles localStorage, the cookie, and setting isAuthenticated:false
 * in Zustand all at once. Without this, the root page.tsx reads a stale
 * isAuthenticated:true from the persisted store and immediately redirects back
 * to /dashboard, creating a redirect loop.
 */
const clearSessionAndRedirect = async () => {
  const { useAuthStore } = await import('@/lib/store/auth-store');
  await useAuthStore.getState().logout();
  window.location.href = '/login';
};

// Request interceptor — attach access token from localStorage
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor — handle 401s with silent token refresh.
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    const refreshToken = localStorage.getItem('refresh_token');

    if (!refreshToken) {
      isRefreshing = false;
      processQueue(error, null);
      await clearSessionAndRedirect();
      return Promise.reject(error);
    }

    try {
      const response = await axios.post(
        `${API_BASE_URL}/auth/refresh`,
        {},
        { headers: { Authorization: `Bearer ${refreshToken}` } },
      );

      const { access_token, expires_in } = response.data;

      // Keep localStorage, cookie, and Zustand store all in sync
      localStorage.setItem('access_token', access_token);
      document.cookie = `access_token=${access_token}; path=/; max-age=${expires_in}; SameSite=Lax`;
      useAuthStore.getState().setToken(access_token, expires_in);

      apiClient.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      originalRequest.headers.Authorization = `Bearer ${access_token}`;

      processQueue(null, access_token);
      return apiClient(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      await clearSessionAndRedirect();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);