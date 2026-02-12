'use client';

import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth-store';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

export default function NotFound() {
  const router = useRouter();
  const handleRedirect = () => {
    router.push('/dashboard');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="text-center space-y-6 max-w-md">

        <h1 className="text-4xl font-bold text-slate-900">
          404
        </h1>

        <p className="text-slate-600">
          The page you’re looking for doesn’t exist.
        </p>

        <Button onClick={handleRedirect}>
          {'Go to Dashboard'}
        </Button>
      </div>
    </div>
  );
}
