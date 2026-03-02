import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/lib/store/auth-store';
import { type StatusChangedEvent } from '@/lib/types/events';

interface UseBusinessEventsOptions {
  onStatusChanged?: (event: StatusChangedEvent) => void;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const RECONNECT_DELAY_MS = 3000;

export function useBusinessEvents({ onStatusChanged }: UseBusinessEventsOptions) {
  const token = useAuthStore((state) => state.token);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const callbacksRef = useRef({ onStatusChanged });
  callbacksRef.current = { onStatusChanged };

  useEffect(() => {
    if (!isAuthenticated || !token) return;

    let es: EventSource;
    let reconnectTimer: ReturnType<typeof setTimeout>;
    let destroyed = false;

    const connect = () => {
      if (destroyed) return;

      const url = `${API_BASE_URL}/events/stream?token=${token}`;
      es = new EventSource(url);

      es.addEventListener('connected', () => {
        console.debug('[SSE] Connection established');
      });

      es.addEventListener('business.status_changed', (e: MessageEvent) => {
        try {
          const event: StatusChangedEvent = JSON.parse(e.data);
          callbacksRef.current.onStatusChanged?.(event);
        } catch {
          console.error('[SSE] Failed to parse status_changed event', e.data);
        }
      });

      es.onerror = () => {
        es.close();
        if (destroyed) return;

        // Do NOT attempt a token refresh here. The SSE hook has no way to
        // coordinate with the Axios interceptor, so issuing a refresh from
        // both places simultaneously would consume the one-time-use refresh
        // token and cause the interceptor's refresh to fail → logout.
        //
        // Instead, just reconnect after a short delay. Two cases:
        //  1. Token is still valid  → reconnect succeeds immediately.
        //  2. Token has expired     → the next regular API call triggers the
        //     interceptor refresh, setToken() updates the store, this effect
        //     re-runs with the new token, and a fresh SSE connection opens.
        console.debug(`[SSE] Connection failed, reconnecting in ${RECONNECT_DELAY_MS}ms`);
        reconnectTimer = setTimeout(connect, RECONNECT_DELAY_MS);
      };
    };

    connect();

    return () => {
      destroyed = true;
      clearTimeout(reconnectTimer);
      es?.close();
    };
  }, [isAuthenticated, token]);
}