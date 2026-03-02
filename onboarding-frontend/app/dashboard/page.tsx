'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { businessesApi } from '@/lib/api/services';
import { useAuthStore } from '@/lib/store/auth-store';
import { useBusinessStore } from '@/lib/store/business-store';
import { COUNTRIES } from '@/lib/constants/countries';
import type { BusinessStatus, FindBusinessesQuery } from '@/lib/types/api';
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

  // Read businesses from the shared store — the BusinessEventsListener calls
  // applyStatusChange on this store when an SSE event arrives, so the table
  // rows update instantly without a refetch.
  const businesses = useBusinessStore((s) => s.businesses);
  const setBusinesses = useBusinessStore((s) => s.setBusinesses);

  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<BusinessStatus | 'ALL'>('ALL');
  const [countryFilter, setCountryFilter] = useState<string>('ALL');

  // Global stats — come from the API response (all businesses, ignoring filters).
  // Kept in sync with SSE patches via the business store.
  const storeStats = useBusinessStore((s) => s.stats);
  const setStats = useBusinessStore((s) => s.setStats);
  const [globalStats, setGlobalStats] = useState({ pending: 0, inReview: 0, approved: 0, rejected: 0 });

  // Mirror store stats into local state so the cards update on SSE patches too.
  useEffect(() => {
    setGlobalStats(storeStats);
  }, [storeStats]);

  // Clear the store when leaving the dashboard so stale data doesn't linger
  useEffect(() => {
    return () => setBusinesses([]);
  }, []);

  const fetchBusinesses = async () => {
    setLoading(true);
    try {
      const query: FindBusinessesQuery = {
        page,
        limit: 10,
      };

      if (search) query.search = search;
      if (statusFilter !== 'ALL') query.status = statusFilter as BusinessStatus;
      if (countryFilter !== 'ALL') query.country = countryFilter;

      const response = await businessesApi.list(query);
      setBusinesses(response.data);
      setTotalPages(response.meta.totalPages);
      setTotal(response.meta.total);
      // Stats come from the API and reflect all businesses regardless of filters.
      if (response.stats) {
        setStats(response.stats);
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
            <CardTitle className="text-sm font-medium text-slate-600">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{globalStats.pending}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">In Review</CardTitle>
            <AlertCircle className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{globalStats.inReview}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{globalStats.approved}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Rejected</CardTitle>
            <CircleX className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{globalStats.rejected}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total</CardTitle>
            <TrendingUp className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {globalStats.pending + globalStats.inReview + globalStats.approved + globalStats.rejected}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Businesses Table */}
      <Card className='gap-4'>
        <CardHeader className='px-0 pb-0'>
          <CardContent>
            <div className="flex items-center gap-2 flex-wrap justify-between">
              <CardTitle>Businesses</CardTitle>
              <div className='flex gap-2'>
                {!loading && (() => {
                const counts = businesses.reduce(
                  (acc, b) => { acc[b.status] = (acc[b.status] || 0) + 1; return acc; },
                  {} as Record<string, number>,
                );
                return (
                  <>
                    {counts['PENDING'] > 0 && (
                      <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-semibold text-yellow-800">
                        {counts['PENDING']} pending
                      </span>
                    )}
                    {counts['IN_REVIEW'] > 0 && (
                      <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
                        {counts['IN_REVIEW']} in review
                      </span>
                    )}
                    {counts['APPROVED'] > 0 && (
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800">
                        {counts['APPROVED']} approved
                      </span>
                    )}
                    {counts['REJECTED'] > 0 && (
                      <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800">
                        {counts['REJECTED']} rejected
                      </span>
                    )}
                  </>
                );
              })()}</div>
            </div>

            <div className="mt-4 flex flex-col md:flex-row md:items-center gap-4">

              <div className="relative md:flex-1">

              <Search className="absolute left-3 top-2 h-5 w-4 text-slate-400" />
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
                <SelectTrigger className="w-[180px]">
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

            <Select
              value={countryFilter}
              onValueChange={setCountryFilter}
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Filter by country" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                <SelectItem value="ALL">All Countries</SelectItem>
                {COUNTRIES.map((country) => (
                  <SelectItem key={country.code} value={country.code}>
                    {country.name} ({country.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
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