import { BusinessStatus } from './api';

export interface StatusChangedEvent {
  type: 'business.status_changed';
  businessId: string;
  businessName: string;
  previousStatus: BusinessStatus;
  newStatus: BusinessStatus;
  reason: string;
  changedBy: string;
  timestamp: string;
}

export type AppEvent = StatusChangedEvent;