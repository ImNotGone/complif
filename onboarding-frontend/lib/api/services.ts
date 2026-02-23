import axios from 'axios';
import { apiClient } from './client';
import type {
  Business,
  CreateBusinessDto,
  UpdateBusinessDto,
  ChangeBusinessStatusDto,
  PaginatedResponse,
  StatusHistory,
  RiskCalculation,
  Document,
  LoginDto,
  LoginResponse,
  User,
  FindBusinessesQuery,
} from '../types/api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

/**
 * A raw axios instance with no interceptors.
 *
 * If I were to use the apiClient for logout or refresh, the interceptor for 401 would bug the requests
 */
const rawAxios = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Auth API
export const authApi = {
  login: async (data: LoginDto): Promise<LoginResponse> => {
    const response = await apiClient.post('/auth/login', data);
    return response.data;
  },

  refresh: async (refreshToken: string): Promise<{ access_token: string; expires_in: number }> => {
    const response = await rawAxios.post(
      '/auth/refresh',
      {},
      { headers: { Authorization: `Bearer ${refreshToken}` } },
    );
    return response.data;
  },

  logout: async (refreshToken: string): Promise<void> => {
    await rawAxios.post(
      '/auth/logout',
      {},
      { headers: { Authorization: `Bearer ${refreshToken}` } },
    );
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },
};

// Businesses API
export const businessesApi = {
  create: async (data: CreateBusinessDto): Promise<Business> => {
    const response = await apiClient.post('/businesses', data);
    return response.data;
  },

  list: async (query?: FindBusinessesQuery): Promise<PaginatedResponse<Business>> => {
    const response = await apiClient.get('/businesses', { params: query });
    return response.data;
  },

  getById: async (id: string): Promise<Business> => {
    const response = await apiClient.get(`/businesses/${id}`);
    return response.data;
  },

  update: async (id: string, data: UpdateBusinessDto): Promise<Business> => {
    const response = await apiClient.patch(`/businesses/${id}`, data);
    return response.data;
  },

  changeStatus: async (id: string, data: ChangeBusinessStatusDto): Promise<Business> => {
    const response = await apiClient.patch(`/businesses/${id}/status`, data);
    return response.data;
  },

  getStatusHistory: async (id: string): Promise<StatusHistory[]> => {
    const response = await apiClient.get(`/businesses/${id}/status-history`);
    return response.data;
  },

  getRiskHistory: async (id: string): Promise<RiskCalculation[]> => {
    const response = await apiClient.get(`/businesses/${id}/risk-history`);
    return response.data;
  },

  recalculateRisk: async (id: string): Promise<any> => {
    const response = await apiClient.post(`/businesses/${id}/risk/calculate`);
    return response.data;
  },
};

// Documents API
export const documentsApi = {
  upload: async (businessId: string, type: string, file: File): Promise<Document> => {
    const formData = new FormData();
    formData.append('type', type);
    formData.append('file', file);

    const response = await apiClient.post(
      `/businesses/${businessId}/documents`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data;
  },

  list: async (businessId: string): Promise<Document[]> => {
    const response = await apiClient.get(`/businesses/${businessId}/documents`);
    return response.data;
  },

  getById: async (businessId: string, documentId: string): Promise<Document> => {
    const response = await apiClient.get(`/businesses/${businessId}/documents/${documentId}`);
    return response.data;
  },

  delete: async (businessId: string, documentId: string): Promise<void> => {
    await apiClient.delete(`/businesses/${businessId}/documents/${documentId}`);
  },
};