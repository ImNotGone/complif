'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { ArrowLeft, Building2 } from 'lucide-react';
import { toast } from 'sonner';

const INDUSTRIES = [
  'construction',
  'security',
  'casino',
  'money_exchange',
  'retail',
  'software',
  'insurance',
  'media',
  'food',
] as const;

const COUNTRIES = [
  { code: 'AR', name: 'Argentina' },
  { code: 'BR', name: 'Brazil' },
  { code: 'CL', name: 'Chile' },
  { code: 'CO', name: 'Colombia' },
  { code: 'MX', name: 'Mexico' },
  { code: 'PA', name: 'Panama' },
  { code: 'PE', name: 'Peru' },
  { code: 'UY', name: 'Uruguay' },
  { code: 'US', name: 'United States' },
  { code: 'VG', name: 'British Virgin Islands' },
  { code: 'KY', name: 'Cayman Islands' },
  { code: 'CH', name: 'Switzerland' },
];

export default function NewBusinessPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    taxId: '',
    country: '',
    industry: '',
  });

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
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
      const business = await businessesApi.create(formData);
      toast.success('Business created successfully!');
      router.push(`/dashboard/businesses/${business.id}`);
    } catch (error: any) {
      console.error('Failed to create business:', error);
      toast.error(error.response?.data?.message || 'Failed to create business');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/dashboard')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Create New Business</h2>
          <p className="text-slate-600">Register a new business for onboarding</p>
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
            Enter the basic details of the business. Risk assessment will be calculated automatically.
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

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900 font-medium mb-1">
                Automatic Risk Assessment
              </p>
              <p className="text-xs text-blue-700">
                Once created, the system will automatically calculate a risk score based on:
              </p>
              <ul className="text-xs text-blue-700 mt-2 space-y-1 list-disc list-inside">
                <li>Country risk (high-risk jurisdictions)</li>
                <li>Industry risk (regulated sectors)</li>
                <li>Document completeness (initially incomplete)</li>
              </ul>
              <p className="text-xs text-blue-700 mt-2">
                Businesses with risk score &gt; 70 will automatically be marked for manual review.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/dashboard')}
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
                {loading ? 'Creating...' : 'Create Business'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Help Text */}
      <Card className="bg-slate-50">
        <CardContent className="pt-6">
          <h3 className="font-semibold text-sm mb-2">Next Steps</h3>
          <ol className="text-sm text-slate-600 space-y-1 list-decimal list-inside">
            <li>Business will be created with status "Pending" or "In Review"</li>
            <li>Upload required documents (Tax Certificate, Registration, Insurance)</li>
            <li>Risk score will update automatically as documents are added</li>
            <li>Admin can review and approve/reject the application</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}