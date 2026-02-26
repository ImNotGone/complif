import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User } from '../types/api';
import { authApi } from '../api/services';

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  login: (token: string, refreshToken: string, expiresIn: number, user: User) => void;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
  setToken: (token: string, expiresIn: number) => void;
}

const SEVEN_DAYS = 7 * 24 * 60 * 60;

const setAccessTokenCookie = (token: string, expiresIn: number) => {
  document.cookie = `access_token=${token}; path=/; max-age=${expiresIn}; SameSite=Lax`;
};

// The session cookie has the same lifetime as the refresh token (7 days).
// It carries no sensitive data — it exists purely so the middleware can
// distinguish "no session at all" from "session exists but access token
// has expired and needs a silent refresh".
const setSessionCookie = () => {
  document.cookie = `session=1; path=/; max-age=${SEVEN_DAYS}; SameSite=Lax`;
};

const clearLocalTokens = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  document.cookie = 'access_token=; path=/; max-age=0';
  document.cookie = 'session=; path=/; max-age=0';
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,

      login: (token: string, refreshToken: string, expiresIn: number, user: User) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('access_token', token);
          localStorage.setItem('refresh_token', refreshToken);
          setAccessTokenCookie(token, expiresIn);
          setSessionCookie();
        }
        set({ token, refreshToken, user, isAuthenticated: true });
      },

      logout: async () => {
        const { refreshToken } = get();

        if (refreshToken) {
          try {
            await authApi.logout(refreshToken);
          } catch {
            // Token may already be expired or revoked — still clear locally
          }
        }

        clearLocalTokens();
        set({ token: null, refreshToken: null, user: null, isAuthenticated: false });
      },

      setUser: (user: User) => {
        set({ user });
      },

      setToken: (token: string, expiresIn: number) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('access_token', token);
          setAccessTokenCookie(token, expiresIn);
          // session cookie is already set — no need to refresh it here
        }
        set({ token });
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => {
        if (typeof window === 'undefined') {
          return {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          };
        }
        return localStorage;
      }),
      partialize: (state) => ({
        token: state.token,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);