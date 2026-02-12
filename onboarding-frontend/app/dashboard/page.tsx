'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { businessesApi } from '@/lib/api/services';
import { useAuthStore } from '@/lib/store/auth-store';
import type { Business, BusinessStatus, FindBusinessesQuery } from '@/lib/types/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Search, TrendingUp, AlertCircle, CheckCircle, Clock, CircleX } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const STATUS_COLORS = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  IN_REVIEW: 'bg-blue-100 text-blue-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
};

const RISK_COLORS = {
  low: 'text-green-600',
  medium: 'text-yellow-600',
  high: 'text-red-600',
};

export default function DashboardPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<BusinessStatus | 'ALL'>('ALL');
  const [countryFilter, setCountryFilter] = useState('');

  // Stats
  const [stats, setStats] = useState({
    pending: 0,
    inReview: 0,
    approved: 0,
    rejected: 0,
  });

  const fetchBusinesses = async () => {
    setLoading(true);
    try {
      const query: FindBusinessesQuery = {
        page,
        limit: 10,
      };

      if (search) query.search = search;
      if (statusFilter !== 'ALL') query.status = statusFilter as BusinessStatus;
      if (countryFilter) query.country = countryFilter;

      const response = await businessesApi.list(query);
      setBusinesses(response.data);
      setTotalPages(response.meta.totalPages);
      setTotal(response.meta.total);

      // Set stats from API response
      if (response.stats) {
        setStats({
          pending: response.stats.pending,
          inReview: response.stats.inReview,
          approved: response.stats.approved,
          rejected: response.stats.rejected,
        });
      }
    } catch (error) {
      console.error('Failed to fetch businesses:', error);
      toast.error('Failed to load businesses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBusinesses();
  }, [page, search, statusFilter, countryFilter]);

  const getRiskLevel = (score: number) => {
    if (score > 70) return 'high';
    if (score > 40) return 'medium';
    return 'low';
  };

  const handleRowClick = (businessId: string) => {
    router.push(`/dashboard/businesses/${businessId}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Dashboard</h2>
          <p className="text-slate-600">Manage business onboarding applications</p>
        </div>
        {user?.role === 'ADMIN' && (
          <Button onClick={() => router.push('/dashboard/businesses/new')}>
            <Plus className="mr-2 h-4 w-4" />
            New Business
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Pending
            </CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              In Review
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inReview}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Approved
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.approved}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Rejected
            </CardTitle>
            <CircleX className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.rejected}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Total
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.pending + stats.inReview + stats.approved + stats.rejected}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by name or tax ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

              <Select
                value={statusFilter}
                onValueChange={(value) =>
                  setStatusFilter(value as BusinessStatus | 'ALL')
                }
                name="status-filter"
              >
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="IN_REVIEW">In Review</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>

            <Input
              placeholder="Filter by country (e.g., AR)"
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value.toUpperCase())}
              maxLength={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Businesses Table */}
      <Card>
        <CardHeader>
          <CardTitle>Businesses ({total})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
            </div>
          ) : businesses.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              No businesses found
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Tax ID</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Industry</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Risk Score</TableHead>
                    <TableHead>Required Docs</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {businesses.map((business) => (
                    <TableRow
                      key={business.id}
                      className="cursor-pointer hover:bg-slate-50"
                      onClick={() => handleRowClick(business.id)}
                    >
                      <TableCell className="font-medium">{business.name}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {business.taxId}
                      </TableCell>
                      <TableCell>{business.country}</TableCell>
                      <TableCell className="capitalize">{business.industry}</TableCell>
                      <TableCell>
                        <Badge className={STATUS_COLORS[business.status]}>
                          {business.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className={`font-semibold ${RISK_COLORS[getRiskLevel(business.riskScore)]}`}>
                          {business.riskScore}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={business._count?.requiredDocuments === 3 ? 'text-green-600 font-medium' : ''}>
                          {business._count?.requiredDocuments || 0}/3
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-slate-500">
                        {format(new Date(business.createdAt), 'MMM d, yyyy')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-between items-center mt-4">
                  <Button
                    variant="outline"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-slate-600">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}