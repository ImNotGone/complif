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
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token!)));
  failedQueue = [];
};

// Clears all local auth state and redirects to login.
// Does NOT call authApi.logout() — we end up here precisely when tokens are
// dead, so hitting the network again would just fail and slow things down.
// Clears both cookies so the middleware doesn't see a stale session.
const clearSessionAndRedirect = () => {
  // Persist auth logs to sessionStorage before page unload so they survive
  // the redirect and can be read on the login page for debugging.
  try {
    const logs = (window as any).__authLogs__ || [];
    sessionStorage.setItem('__authLogs__', JSON.stringify(logs));
  } catch {}

  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  document.cookie = 'access_token=; path=/; max-age=0';
  document.cookie = 'session=; path=/; max-age=0';
  useAuthStore.setState({
    token: null,
    refreshToken: null,
    user: null,
    isAuthenticated: false,
  });
  window.location.href = '/login';
};

// Request interceptor — reads token fresh from localStorage on every request
// so retries after a refresh automatically pick up the new token.
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

// Response interceptor — silent token refresh on 401.
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const url = originalRequest?.url;

    // Don't try to refresh or redirect on auth endpoints when not authenticated
    // These should return the error as-is so the caller can handle it
    const isAuthEndpoint = url === '/auth/login' || url === '/auth/refresh';

    if (status !== 401 || originalRequest._retry || isAuthEndpoint) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        // Same explicit header stamp as the primary retry path.
        originalRequest.headers['Authorization'] = `Bearer ${token}`;
        return apiClient(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    const refreshToken = localStorage.getItem('refresh_token');

    if (!refreshToken) {
      isRefreshing = false;
      processQueue(error);
      clearSessionAndRedirect();
      return Promise.reject(error);
    }

    try {
      const { data } = await axios.post(
        `${API_BASE_URL}/auth/refresh`,
        {},
        { headers: { Authorization: `Bearer ${refreshToken}` } },
      );

      const { access_token, expires_in } = data;

      localStorage.setItem('access_token', access_token);
      document.cookie = `access_token=${access_token}; path=/; max-age=${expires_in}; SameSite=Lax`;
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;

      useAuthStore.getState().setToken(access_token, expires_in);
      processQueue(null, access_token);

      if (typeof originalRequest.data === 'string') {
        try {
          originalRequest.data = JSON.parse(originalRequest.data);
        } catch {
          // Not JSON (e.g. FormData) — leave as-is
        }
      }

      // Explicitly stamp the new token on the config so it's never stale,
      // regardless of how Axios merges headers on retry.
      originalRequest.headers['Authorization'] = `Bearer ${access_token}`;

      const retryResponse = await apiClient(originalRequest);
      isRefreshing = false;
      return retryResponse;
    } catch (refreshError: any) {
      processQueue(refreshError);
      isRefreshing = false;
      clearSessionAndRedirect();
      return Promise.reject(refreshError);
    }
  },
);
