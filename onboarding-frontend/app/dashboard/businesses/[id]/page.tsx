'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { businessesApi, documentsApi } from '@/lib/api/services';
import { useAuthStore } from '@/lib/store/auth-store';
import { type Business, type StatusHistory, type RiskCalculation, type Document, type BusinessStatus, DocumentType } from '@/lib/types/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  Clock,
  FileText,
  Upload,
  Download,
  Trash2,
  ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ChangeStatusDialog } from '@/components/change-status-dialog';
import { UploadDocumentDialog } from '@/components/upload-document-dialog';

const STATUS_COLORS = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  IN_REVIEW: 'bg-blue-100 text-blue-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
};

const STATUS_ICONS = {
  PENDING: Clock,
  IN_REVIEW: AlertCircle,
  APPROVED: CheckCircle,
  REJECTED: AlertCircle,
};

const REQUIRED_DOCUMENT_TYPES: DocumentType[] = [
  DocumentType.TAX_CERTIFICATE,
  DocumentType.REGISTRATION,
  DocumentType.INSURANCE_POLICY,
] as const;


export default function BusinessDetailPage() {
  const params = useParams();
  const router = useRouter();
  const businessId = params.id as string;
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === 'ADMIN';

  const [business, setBusiness] = useState<Business | null>(null);
  const [statusHistory, setStatusHistory] = useState<StatusHistory[]>([]);
  const [riskHistory, setRiskHistory] = useState<RiskCalculation[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  const fetchBusinessDetails = async () => {
    setLoading(true);
    try {
      const [businessData, statusData, riskData, docsData] = await Promise.all([
        businessesApi.getById(businessId),
        businessesApi.getStatusHistory(businessId),
        businessesApi.getRiskHistory(businessId),
        documentsApi.list(businessId),
      ]);

      setBusiness(businessData);
      setStatusHistory(statusData);
      setRiskHistory(riskData);
      setDocuments(docsData);
    } catch (error) {
      console.error('Failed to fetch business details:', error);
      toast.error('Failed to load business details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBusinessDetails();
  }, [businessId]);

  const handleStatusChange = async (status: BusinessStatus, reason?: string) => {
    try {
      await businessesApi.changeStatus(businessId, { status, reason });
      toast.success('Status updated successfully');
      fetchBusinessDetails();
      setStatusDialogOpen(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update status');
    }
  };

  const handleDocumentUpload = async () => {
    await fetchBusinessDetails();
    setUploadDialogOpen(false);
    toast.success('Document uploaded successfully');
  };

  const handleDocumentDelete = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      await documentsApi.delete(businessId, documentId);
      toast.success('Document deleted');
      fetchBusinessDetails();
    } catch (error) {
      toast.error('Failed to delete document');
    }
  };

  const getRiskLevel = (score: number) => {
    if (score > 70) return { label: 'High Risk', color: 'text-red-600' };
    if (score > 40) return { label: 'Medium Risk', color: 'text-yellow-600' };
    return { label: 'Low Risk', color: 'text-green-600' };
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600">Business not found</p>
        <Button onClick={() => router.push('/dashboard')} className="mt-4">
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const riskLevel = getRiskLevel(business.riskScore);

  const requiredDocsCount = documents.filter(
    (d) =>
      REQUIRED_DOCUMENT_TYPES.includes(d.type)
  ).length;

  const requiredDocsTotal = REQUIRED_DOCUMENT_TYPES.length;

  const toggleDocument = (id: string) => {
    setExpandedDocId((prev) => (prev === id ? null : id));
  };


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon-lg"
            onClick={() => router.push('/dashboard')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-3xl font-bold text-slate-900">{business.name}</h2>
            <p className="text-slate-600">Tax ID: {business.taxId}</p>
          </div>
        </div>

        {isAdmin && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setUploadDialogOpen(true)}
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload Document
            </Button>
            <Button onClick={() => setStatusDialogOpen(true)}>
              Change Status
            </Button>
          </div>
        )}
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">
              Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className={STATUS_COLORS[business.status]}>
              {business.status.replace('_', ' ')}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">
              Risk Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${riskLevel.color}`}>
              {business.riskScore}
            </div>
            <p className={`text-xs ${riskLevel.color}`}>{riskLevel.label}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">
              Required Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {requiredDocsCount} / {requiredDocsTotal}
            </div>
            <p className="text-xs text-slate-600">
              {((requiredDocsCount / requiredDocsTotal) * 100).toFixed(0)}% complete
            </p>

          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">
              Country / Industry
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">{business.country}</div>
            <p className="text-xs text-slate-600 capitalize">{business.industry}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="timeline">Status Timeline</TabsTrigger>
          <TabsTrigger value="risk">Risk History</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Business Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-600">Legal Name</p>
                  <p className="font-medium">{business.name}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Tax ID</p>
                  <p className="font-mono font-medium">{business.taxId}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Country</p>
                  <p className="font-medium">{business.country}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Industry</p>
                  <p className="font-medium capitalize">{business.industry}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Created By</p>
                  <p className="font-medium">{business.createdBy?.email}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Created At</p>
                  <p className="font-medium">
                    {format(new Date(business.createdAt), 'PPP')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Latest Risk Calculation */}
          {riskHistory.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Risk Breakdown</CardTitle>
                <CardDescription>Latest risk assessment</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Country Risk</span>
                    <span className="font-semibold">{riskHistory[0].countryRisk}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Industry Risk</span>
                    <span className="font-semibold">{riskHistory[0].industryRisk}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Document Risk</span>
                    <span className="font-semibold">{riskHistory[0].documentRisk}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Total Score</span>
                    <span className={`text-xl font-bold ${riskLevel.color}`}>
                      {riskHistory[0].totalScore}
                    </span>
                  </div>

                  {riskHistory[0].metadata && (
                    <div className="mt-4 space-y-2">
                      <div className="flex gap-2">
                        {riskHistory[0].metadata.highRiskCountry && (
                          <Badge variant="destructive" className="text-sm px-3 py-1">High Risk Country</Badge>
                        )}
                        {riskHistory[0].metadata.highRiskIndustry && (
                          <Badge variant="destructive" className="text-sm px-3 py-1">High Risk Industry</Badge>
                        )}
                        {riskHistory[0].metadata.missingDocuments.filter((p) => p == "TAX_CERTIFICATE").length != 0 && (
                          <Badge variant="destructive" className="text-sm px-3 py-1">Missing Tax-Certificate Document</Badge>
                        )}
                        {riskHistory[0].metadata.missingDocuments.filter((p) => p == "REGISTRATION").length != 0 && (
                          <Badge variant="destructive" className="text-sm px-3 py-1">Missing Registration Document</Badge>
                        )}
                        {riskHistory[0].metadata.missingDocuments.filter((p) => p == "INSURANCE_POLICY").length != 0 && (
                          <Badge variant="destructive" className="text-sm px-3 py-1">Missing Insurance-Policy Document</Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle>Status Timeline</CardTitle>
              <CardDescription>History of status changes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {statusHistory.map((entry, index) => {
                  const Icon = STATUS_ICONS[entry.status];
                  return (
                    <div key={entry.id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`rounded-full p-2 ${STATUS_COLORS[entry.status]}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        {index < statusHistory.length - 1 && (
                          <div className="w-0.5 h-full bg-slate-200 my-1" />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="flex items-center justify-between">
                          <Badge className={STATUS_COLORS[entry.status]}>
                            {entry.status.replace('_', ' ')}
                          </Badge>
                          <span className="text-xs text-slate-500">
                            {format(new Date(entry.createdAt), 'PPp')}
                          </span>
                        </div>
                        {entry.reason && (
                          <p className="text-sm text-slate-600 mt-1">{entry.reason}</p>
                        )}
                        <p className="text-xs text-slate-500 mt-1">
                          Changed by {entry.changedBy.email}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Risk History Tab */}
        <TabsContent value="risk">
          <Card>
            <CardHeader>
              <CardTitle>Risk Calculation History</CardTitle>
              <CardDescription>Track risk score changes over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {riskHistory.map((calc, index) => (
                  <div
                    key={calc.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className={`text-xl font-bold ${getRiskLevel(calc.totalScore).color}`}>
                          {calc.totalScore}
                        </span>
                        <div className="text-sm text-slate-600">
                          Country: {calc.countryRisk} | Industry: {calc.industryRisk} | Docs: {calc.documentRisk}
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {format(new Date(calc.createdAt), 'PPp')}
                      </p>
                    </div>
                    {index === 0 && (
                      <Badge variant="outline">Latest</Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Documents</CardTitle>
                  <CardDescription>Uploaded business documents</CardDescription>
                </div>
                {isAdmin && (
                  <Button onClick={() => setUploadDialogOpen(true)}>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {documents.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  No documents uploaded yet
                </div>
              ) : (
                <div className="space-y-3">
                  {documents.map((doc) => {
  const isExpanded = expandedDocId === doc.id;

  return (
    <div key={doc.id} className="border rounded-lg overflow-hidden">
      {/* Clickable Header */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition"
        onClick={() => toggleDocument(doc.id)}
      >
        <div className="flex items-center gap-3">
          <FileText className="h-8 w-8 text-slate-400" />
          <div>
            <p className="font-medium">{doc.filename}</p>
            <p className="text-sm text-slate-600">
              {doc.type.replace('_', ' ')}
            </p>
            <p className="text-xs text-slate-500">
              Uploaded {format(new Date(doc.createdAt), 'PPp')} by{' '}
              {doc.uploadedBy.email}
            </p>
          </div>
        </div>

        <div
          className="flex items-center gap-2"
          onClick={(e) => e.stopPropagation()} // prevent expanding when clicking buttons
        >
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(doc.url, '_blank')}
          >
            <Download className="h-4 w-4" />
          </Button>

          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDocumentDelete(doc.id)}
            >
              <Trash2 className="h-4 w-4 text-red-600" />
            </Button>
          )}
          <ChevronDown
  className={`h-4 w-4 transition-transform ${
    isExpanded ? 'rotate-180' : ''
  }`}
/>

        </div>
      </div>

      {/* Expandable Viewer */}
      {isExpanded && (
        <div className="border-t bg-slate-50 p-4">
          <iframe
            src={doc.url}
            className="w-full h-[600px] rounded-md border"
          />
        </div>
      )}
    </div>
  );
})}

                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      {isAdmin && (
        <>
          <ChangeStatusDialog
            open={statusDialogOpen}
            onOpenChange={setStatusDialogOpen}
            currentStatus={business.status}
            onSubmit={handleStatusChange}
          />
          <UploadDocumentDialog
            open={uploadDialogOpen}
            onOpenChange={setUploadDialogOpen}
            businessId={businessId}
            onSuccess={handleDocumentUpload}
          />
        </>
      )}
    </div>
  );
}