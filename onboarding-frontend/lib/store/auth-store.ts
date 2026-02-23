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

/**
 * Storage strategy:
 *
 * access_token — stored in BOTH localStorage and a cookie.
 *   - localStorage: read by the axios interceptor on every request.
 *   - Cookie:       read by Next.js middleware for SSR auth checks.
 *   Both are kept in sync. The cookie lifetime mirrors the token's
 *   expires_in value returned by the backend (currently 15 min / 900s).
 *
 * refresh_token — stored in localStorage ONLY, never in a cookie.
 *   Putting a refresh token in a cookie would expose it to automatic
 *   inclusion in cross-site requests (CSRF risk). It is only ever read
 *   explicitly by the logout and refresh flows.
 */

const setAccessTokenCookie = (token: string, expiresIn: number) => {
  document.cookie = `access_token=${token}; path=/; max-age=${expiresIn}; SameSite=Lax`;
};

const clearLocalTokens = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  document.cookie = 'access_token=; path=/; max-age=0';
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