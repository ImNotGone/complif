export enum BusinessStatus {
  PENDING = 'PENDING',
  IN_REVIEW = 'IN_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum DocumentType {
  TAX_CERTIFICATE = 'TAX_CERTIFICATE',
  REGISTRATION = 'REGISTRATION',
  INSURANCE_POLICY = 'INSURANCE_POLICY',
  OTHER = 'OTHER',
}

export enum Role {
  ADMIN = 'ADMIN',
  VIEWER = 'VIEWER',
}

export interface User {
  id: string;
  email: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
}

export interface UserDto {
  email: string;
  role: string;
}

export interface Business {
  id: string;
  name: string;
  taxId: string;
  country: string;
  industry: string;
  status: BusinessStatus;
  riskScore: number;
  createdById: string;
  updatedById: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy?: UserDto;
  updatedBy?: UserDto;
  _count?: {
    requiredDocuments: number;
    statusHistory: number;
    riskCalculations: number;
  };
}

export interface CreateBusinessDto {
  name: string;
  taxId: string;
  country: string;
  industry: string;
}

export interface UpdateBusinessDto {
  name?: string;
  taxId?: string;
  country?: string;
  industry?: string;
}

export interface ChangeBusinessStatusDto {
  status: BusinessStatus;
  reason?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface StatusHistory {
  id: string;
  businessId: string;
  status: BusinessStatus;
  changedById: string;
  reason: string | null;
  createdAt: string;
  changedBy: UserDto;
}

export interface RiskMetadata {
  highRiskCountry: boolean;
  highRiskIndustry: boolean;
  missingDocuments: DocumentType[];
  documentCompleteness: number;
}

export interface RiskBreakdown {
  totalScore: number;
  countryRisk: number;
  industryRisk: number;
  documentRisk: number;
  metadata: RiskMetadata;
}

export interface RiskCalculation {
  id: string;
  businessId: string;
  totalScore: number;
  countryRisk: number;
  industryRisk: number;
  documentRisk: number;
  reason?: string;
  metadata: RiskMetadata;
  createdAt: string;
}

export interface Document {
  id: string;
  type: DocumentType;
  filename: string;
  url: string;
  s3Key: string;
  businessId: string;
  uploadedById: string;
  createdAt: string;
  deletedAt: string | null;
  uploadedBy: UserDto;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface FindBusinessesQuery {
  page?: number;
  limit?: number;
  status?: BusinessStatus;
  country?: string;
  search?: string;
}
export interface BusinessStats {
  pending: number;
  inReview: number;
  approved: number;
  rejected: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
  stats?: BusinessStats; // Add stats to paginated response
}