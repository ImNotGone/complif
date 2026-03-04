'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth-store';
import { authApi } from '@/lib/api/services';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { access_token, refresh_token, expires_in } = await authApi.login({ email, password });

      localStorage.setItem('access_token', access_token);

      const user = await authApi.getCurrentUser();

      login(access_token, refresh_token, expires_in, user);

      router.replace('/dashboard');
    } catch (err: unknown) {
      const status = err && typeof err === 'object' && 'response' in err 
        ? (err.response as { status?: number })?.status 
        : 0;
      const data = err && typeof err === 'object' && 'response' in err 
        ? err.response as { data?: { message?: string; retryAfter?: number } }
        : null;

      if (status === 429) {
        const minutes = Math.ceil((data?.data?.retryAfter || 300) / 60);
        setError(`Too many login attempts. Please try again in ${minutes} minute(s).`);
      } else if (status === 401) {
        setError('Invalid email or password.');
        setPassword('')
      } else {
        setError(data?.data?.message || 'An error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Onboarding Portal</CardTitle>
          <CardDescription>Sign in to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@complif.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
          
          <div className="mt-4 text-sm text-slate-600">
            <p className="font-semibold">Test credentials:</p>
            <p>Admin: admin@complif.com / complif_admin</p>
            <p>Viewer: viewer@complif.com / complif_viewer</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
