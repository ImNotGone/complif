'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { businessesApi } from '@/lib/api/services';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Building2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/lib/store/auth-store';
import { COUNTRIES } from '@/lib/constants/countries';
import { INDUSTRIES } from '@/lib/constants/industries';

export default function EditBusinessPage() {
  const params = useParams();
  const router = useRouter();
  const businessId = params.id as string;
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === 'ADMIN';

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const [formData, setFormData] = useState({
    name: '',
    taxId: '',
    country: '',
    industry: '',
  });

  useEffect(() => {
    if (!isAdmin) {
      toast.error('You do not have permission to edit this business');
      router.push(`/dashboard/businesses/${businessId}`);
      return;
    }

    const fetchBusiness = async () => {
      try {
        const business = await businessesApi.getById(businessId);
        setFormData({
          name: business.name,
          taxId: business.taxId,
          country: business.country,
          industry: business.industry,
        });
      } catch (error) {
        console.error('Failed to fetch business:', error);
        toast.error('Failed to load business data');
        router.push('/dashboard');
      } finally {
        setFetching(false);
      }
    };

    fetchBusiness();
  }, [businessId, isAdmin, router]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.taxId || !formData.country || !formData.industry) {
      toast.error('Please fill in all fields');
      return;
    }

    if (formData.taxId.length < 8) {
      toast.error('Tax ID must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      await businessesApi.update(businessId, formData);
      toast.success('Business updated successfully!');
      router.push(`/dashboard/businesses/${businessId}`);
    } catch (error: any) {
      console.error('Failed to update business:', error);
      toast.error(error.response?.data?.message || 'Failed to update business');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon-lg"
          onClick={() => router.push(`/dashboard/businesses/${businessId}`)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Edit Business</h2>
          <p className="text-slate-600">Update business information</p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Business Information
          </CardTitle>
          <CardDescription>
            Update the business details. Note: Changing country or industry may affect the risk score.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Business Name */}
            <div className="space-y-2">
              <Label htmlFor="name">
                Legal Business Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                placeholder="Acme Corporation"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                required
              />
              <p className="text-xs text-slate-500">
                Official registered name of the business
              </p>
            </div>

            {/* Tax ID */}
            <div className="space-y-2">
              <Label htmlFor="taxId">
                Tax ID / CUIT <span className="text-red-500">*</span>
              </Label>
              <Input
                id="taxId"
                placeholder="30-71234567-8"
                value={formData.taxId}
                onChange={(e) => handleChange('taxId', e.target.value)}
                minLength={8}
                required
              />
              <p className="text-xs text-slate-500">
                Tax identification number (minimum 8 characters)
              </p>
            </div>

            {/* Country */}
            <div className="space-y-2">
              <Label htmlFor="country">
                Country <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.country}
                onValueChange={(value) => handleChange('country', value)}
                required
              >
                <SelectTrigger id="country">
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((country) => (
                    <SelectItem key={country.code} value={country.code}>
                      {country.name} ({country.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500">
                Country where the business is registered
              </p>
            </div>

            {/* Industry */}
            <div className="space-y-2">
              <Label htmlFor="industry">
                Industry <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.industry}
                onValueChange={(value) => handleChange('industry', value)}
                required
              >
                <SelectTrigger id="industry">
                  <SelectValue placeholder="Select industry" />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRIES.map((industry) => (
                    <SelectItem key={industry} value={industry}>
                      {industry.replace('_', ' ').charAt(0).toUpperCase() + 
                       industry.replace('_', ' ').slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500">
                Primary business sector
              </p>
            </div>

            {/* Warning Box */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-amber-900 font-medium mb-1">
                Risk Score May Change
              </p>
              <p className="text-xs text-amber-700">
                Updating the country or industry may affect the risk score. The risk will be 
                automatically recalculated after saving.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/dashboard/businesses/${businessId}`)}
                disabled={loading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
