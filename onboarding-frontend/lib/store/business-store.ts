import { create } from 'zustand';
import type { Business, BusinessStats } from '../types/api';
import { BusinessStatus } from '../types/api';

interface PendingLocalChange {
  businessId: string;
  newStatus: BusinessStatus;
}

interface BusinessStoreState {
  businesses: Business[];
  activeBusiness: Business | null;
  stats: BusinessStats;
  // Stamped just before the current user fires a status change so the SSE
  // listener can recognise the echo of their own action and skip the toast.
  pendingLocalChange: PendingLocalChange | null;

  setBusinesses: (businesses: Business[]) => void;
  setActiveBusiness: (business: Business | null) => void;
  setStats: (stats: BusinessStats) => void;
  setPendingLocalChange: (change: PendingLocalChange | null) => void;
  applyStatusChange: (businessId: string, previousStatus: BusinessStatus, newStatus: BusinessStatus) => void;
}

const STATUS_STAT_KEY: Record<BusinessStatus, keyof BusinessStats> = {
  PENDING: 'pending',
  IN_REVIEW: 'inReview',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

export const useBusinessStore = create<BusinessStoreState>((set) => ({
  businesses: [],
  activeBusiness: null,
  stats: { pending: 0, inReview: 0, approved: 0, rejected: 0 },
  pendingLocalChange: null,

  setBusinesses: (businesses) => set({ businesses }),
  setActiveBusiness: (activeBusiness) => set({ activeBusiness }),
  setStats: (stats) => set({ stats }),
  setPendingLocalChange: (pendingLocalChange) => set({ pendingLocalChange }),

  applyStatusChange: (businessId, previousStatus, newStatus) =>
    set((state) => {
      const businesses = state.businesses.map((b) =>
        b.id === businessId ? { ...b, status: newStatus } : b,
      );

      const activeBusiness =
        state.activeBusiness?.id === businessId
          ? { ...state.activeBusiness, status: newStatus }
          : state.activeBusiness;

      // Always update global stats regardless of whether the business is on
      // the current page — SSE events can arrive for any business.
      const stats = {
        ...state.stats,
        [STATUS_STAT_KEY[previousStatus]]: Math.max(0, state.stats[STATUS_STAT_KEY[previousStatus]] - 1),
        [STATUS_STAT_KEY[newStatus]]: state.stats[STATUS_STAT_KEY[newStatus]] + 1,
      };

      return { businesses, activeBusiness, stats };
    }),
}));