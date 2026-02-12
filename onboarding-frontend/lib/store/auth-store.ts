import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User } from '../types/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: (token: string, user: User) => {
        // Store in both localStorage and cookie
        if (typeof window !== 'undefined') {
          localStorage.setItem('access_token', token);
          document.cookie = `access_token=${token}; path=/; max-age=3600; SameSite=Lax`;
        }
        set({ token, user, isAuthenticated: true });
      },

      logout: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('access_token');
          document.cookie = 'access_token=; path=/; max-age=0';
        }
        set({ token: null, user: null, isAuthenticated: false });
      },

      setUser: (user: User) => {
        set({ user });
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
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);