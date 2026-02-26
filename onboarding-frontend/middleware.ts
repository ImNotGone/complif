import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // `session` is a long-lived cookie (7 days) set at login and cleared at logout.
  // It contains no sensitive data — its only job is telling the middleware
  // "a session exists". We deliberately do NOT check `access_token` here
  // because that cookie expires every 15 minutes. Checking it would redirect
  // valid users to /login whenever their access token naturally expires, before
  // the axios interceptor on the client has had any chance to silently refresh it.
  const hasSession = request.cookies.has('session');
  const isLoginPage = request.nextUrl.pathname === '/login';
  const isPublicPage = request.nextUrl.pathname === '/';

  // No session — redirect to login
  if (!hasSession && !isLoginPage && !isPublicPage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Has session — don't let them sit on the login page
  if (hasSession && isLoginPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};