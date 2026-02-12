'use client';

import { useState } from 'react';
import { BusinessStatus } from '@/lib/types/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ChangeStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentStatus: BusinessStatus;
  onSubmit: (status: BusinessStatus, reason?: string) => Promise<void>;
}

export function ChangeStatusDialog({
  open,
  onOpenChange,
  currentStatus,
  onSubmit,
}: ChangeStatusDialogProps) {
  const [status, setStatus] = useState<BusinessStatus>(currentStatus);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await onSubmit(status, reason || undefined);
      setReason('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change Business Status</DialogTitle>
          <DialogDescription>
            Update the status of this business application
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="status">New Status</Label>
            <Select
              value={status}
              onValueChange={(value) => setStatus(value as BusinessStatus)}
            >
              <SelectTrigger id="status">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="IN_REVIEW">In Review</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason (optional)</Label>
            <Textarea
              id="reason"
              placeholder="Why is this status being changed?"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Updating...' : 'Update Status'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}