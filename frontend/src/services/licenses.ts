import api from './api';
import type { ApiResponse, PaginatedResponse } from '../types';

export type LicenseStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'DOCUMENT_REVIEW'
  | 'INSPECTION'
  | 'APPROVED'
  | 'REJECTED'
  | 'PAYMENT_PENDING'
  | 'ISSUED'
  | 'EXPIRED'
  | 'CANCELLED';

export interface TradeLicense {
  id: string;
  applicationNumber: string;
  applicantId: string;
  applicant?: { name: string; email: string };
  businessName: string;
  businessType: string;
  businessCategory?: string;
  address: string;
  wardId?: string;
  ward?: { name: string; code: string };
  employeeCount?: number;
  annualTurnover?: number;
  licenseNumber?: string;
  status: LicenseStatus;
  applicationDate?: string;
  approvalDate?: string;
  issueDate?: string;
  expiryDate?: string;
  fee?: number;
  paymentStatus?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LicenseFilters {
  status?: string;
  businessType?: string;
  wardId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

interface BackendPaginated<T> {
  items?: T[];
  data?: T[];
  pagination: PaginatedResponse<T>['pagination'];
}

function normalizePaginated<T>(payload: BackendPaginated<T>): PaginatedResponse<T> {
  return {
    data: payload.items ?? payload.data ?? [],
    pagination: payload.pagination,
  };
}

export async function getLicenses(filters: LicenseFilters = {}): Promise<PaginatedResponse<TradeLicense>> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      params.append(key, String(value));
    }
  });
  const response = await api.get<ApiResponse<BackendPaginated<TradeLicense>>>(`/licenses?${params}`);
  if (response.data.success && response.data.data) {
    return normalizePaginated(response.data.data);
  }
  throw new Error(response.data.error?.message || 'Failed to fetch licenses');
}

export interface LicenseWorkflowStep {
  id: string;
  step: string;
  status: string;
  comments?: string;
  performedById?: string;
  completedAt?: string;
  createdAt: string;
}

export async function getLicense(id: string): Promise<TradeLicense & { workflow?: LicenseWorkflowStep[] }> {
  const response = await api.get<ApiResponse<TradeLicense & { workflow?: LicenseWorkflowStep[] }>>(`/licenses/${id}`);
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data.error?.message || 'Failed to fetch license');
}

export async function startDocumentReview(id: string): Promise<TradeLicense> {
  const response = await api.post<ApiResponse<TradeLicense>>(`/licenses/${id}/document-review`);
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data.error?.message || 'Failed to start document review');
}

export async function approveLicense(id: string, comments?: string): Promise<TradeLicense> {
  const response = await api.post<ApiResponse<TradeLicense>>(`/licenses/${id}/approve`, { comments });
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data.error?.message || 'Failed to approve license');
}

export async function rejectLicense(id: string, reason: string): Promise<TradeLicense> {
  const response = await api.post<ApiResponse<TradeLicense>>(`/licenses/${id}/reject`, { reason });
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data.error?.message || 'Failed to reject license');
}

export async function payLicenseFee(id: string, paymentMethod: string): Promise<TradeLicense> {
  const response = await api.post<ApiResponse<TradeLicense>>(`/licenses/${id}/pay`, { paymentMethod });
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data.error?.message || 'Failed to process payment');
}
