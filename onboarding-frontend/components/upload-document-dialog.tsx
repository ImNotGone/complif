'use client';

import { useState } from 'react';
import { documentsApi } from '@/lib/api/services';
import { DocumentType } from '@/lib/types/api';
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
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Upload } from 'lucide-react';
import { toast } from 'sonner';

interface UploadDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
  onSuccess: () => void;
}

export function UploadDocumentDialog({
  open,
  onOpenChange,
  businessId,
  onSuccess,
}: UploadDocumentDialogProps) {
  const [type, setType] = useState<DocumentType>(DocumentType.TAX_CERTIFICATE);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate PDF
      if (selectedFile.type !== 'application/pdf') {
        toast.error('Only PDF files are allowed');
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      toast.error('Please select a file');
      return;
    }

    setLoading(true);
    try {
      await documentsApi.upload(businessId, type, file);
      setFile(null);
      onSuccess();
    } catch (error: any) {
      console.error('Upload failed:', error);
      toast.error(error.response?.data?.message || 'Failed to upload document');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>
            Upload a PDF document for this business (max 10MB)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="type">Document Type</Label>
            <Select
              value={type}
              onValueChange={(value) => setType(value as DocumentType)}
            >
              <SelectTrigger id="type">
                <SelectValue placeholder="Select document type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={DocumentType.TAX_CERTIFICATE}>
                  Tax Certificate
                </SelectItem>
                <SelectItem value={DocumentType.REGISTRATION}>
                  Registration Certificate
                </SelectItem>
                <SelectItem value={DocumentType.INSURANCE_POLICY}>
                  Insurance Policy
                </SelectItem>
                <SelectItem value={DocumentType.OTHER}>Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="file">PDF File</Label>
            <Input
              id="file"
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
            />
            {file && (
              <p className="text-sm text-slate-600">
                Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
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
          <Button onClick={handleSubmit} disabled={loading || !file}>
            {loading ? (
              'Uploading...'
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}