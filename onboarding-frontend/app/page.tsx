'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth-store';

export default function HomePage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // Zustand's persist middleware rehydrates from localStorage asynchronously.
  // On the very first render, isAuthenticated is always false (the store's
  // initial value) regardless of what's in localStorage — the persisted data
  // hasn't loaded yet. If we redirect on that first render, a valid session
  // gets sent to /login.
  //
  // The fix: don't act until after the first render (i.e. after hydration).
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    if (isAuthenticated) {
      router.replace('/dashboard');
    } else {
      router.replace('/login');
    }
  }, [hydrated, isAuthenticated, router]);

  // Show spinner while waiting for hydration
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
    </div>
  );
}