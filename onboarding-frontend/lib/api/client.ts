import axios from 'axios';

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

const clearSessionAndRedirect = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  document.cookie = 'access_token=; path=/; max-age=0';
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
      clearSessionAndRedirect();
      return Promise.reject(error);
    }

    try {
      const response = await axios.post(
        `${API_BASE_URL}/auth/refresh`,
        {},
        { headers: { Authorization: `Bearer ${refreshToken}` } },
      );

      const { access_token, expires_in } = response.data;

      // Keep localStorage and cookie in sync (cookie is used by Next.js middleware)
      localStorage.setItem('access_token', access_token);
      document.cookie = `access_token=${access_token}; path=/; max-age=${expires_in}; SameSite=Lax`;

      apiClient.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      originalRequest.headers.Authorization = `Bearer ${access_token}`;

      processQueue(null, access_token);
      return apiClient(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      clearSessionAndRedirect();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);