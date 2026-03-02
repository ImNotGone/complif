'use client';

import { useRouter, usePathname } from 'next/navigation';
import { toast } from 'sonner';
import { useBusinessEvents } from '@/lib/hooks/useBusinessEvents';
import { useBusinessStore } from '@/lib/store/business-store';
import { type StatusChangedEvent } from '@/lib/types/events';
import { BusinessStatus } from '@/lib/types/api';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'PENDING',
  IN_REVIEW: 'IN_REVIEW',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
};

export function BusinessEventsListener() {
  const router = useRouter();
  const pathname = usePathname();
  const applyStatusChange = useBusinessStore((s) => s.applyStatusChange);
  const businesses = useBusinessStore((s) => s.businesses);
  const pendingLocalChange = useBusinessStore((s) => s.pendingLocalChange);
  const setPendingLocalChange = useBusinessStore((s) => s.setPendingLocalChange);

  const handleStatusChanged = (event: StatusChangedEvent) => {
    // Check if this SSE event is the echo of a change the current user just
    // made themselves. If so, patch the store silently (UI still updates) but
    // skip the toast — they already got one from the API response handler.
    const isOwnChange =
      pendingLocalChange?.businessId === event.businessId &&
      pendingLocalChange?.newStatus === event.newStatus;

    if (isOwnChange) {
      applyStatusChange(event.businessId, event.previousStatus as BusinessStatus, event.newStatus as BusinessStatus);
      setPendingLocalChange(null);
      return;
    }

    // Someone else changed this business — update the store and notify.
    applyStatusChange(event.businessId, event.previousStatus as BusinessStatus, event.newStatus as BusinessStatus);

    const isOnDetailPage = pathname === `/dashboard/businesses/${event.businessId}`;
    const isInList = businesses.some((b) => b.id === event.businessId);
    const statusLabel = STATUS_LABELS[event.newStatus] ?? event.newStatus;

    if (isOnDetailPage) {
      toast.success(`Status updated to ${statusLabel}`, {
        description: `${event.reason} by ${event.changedBy}`,
        duration: 4000,
      });
    } else {
      toast.info(`${event.businessName} -> ${statusLabel}`, {
        description: `${event.reason} by ${event.changedBy}`,
        duration: isInList ? 5000 : 6000,
        action: {
          label: 'View',
          onClick: () => router.push(`/dashboard/businesses/${event.businessId}`),
        },
      });
    }
  };

  useBusinessEvents({ onStatusChanged: handleStatusChanged });

  return null;
}