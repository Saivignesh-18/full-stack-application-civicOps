import api from './api';
import type { ApiResponse, PaginatedResponse } from '../types';

export interface Property {
  id: string;
  propertyId: string;
  propertyNumber?: string;
  ownerId: string;
  ownerName: string;
  address: string;
  wardId?: string;
  ward?: { name: string; code: string };
  zoneId?: string;
  circleId?: string;
  propertyType: 'RESIDENTIAL' | 'COMMERCIAL' | 'INDUSTRIAL' | 'AGRICULTURAL' | 'MIXED_USE';
  builtUpArea?: number;
  plotArea?: number;
  landArea?: number;
  floors?: number;
  constructionYear?: number;
  annualRentalValue?: number;
  annualTax: number;
  status: 'ACTIVE' | 'INACTIVE' | 'DISPUTED';
  lastAssessmentDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PropertyFilters {
  status?: string;
  propertyType?: string;
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

export async function getProperties(filters: PropertyFilters = {}): Promise<PaginatedResponse<Property>> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      params.append(key, String(value));
    }
  });
  const response = await api.get<ApiResponse<BackendPaginated<Property>>>(`/properties?${params}`);
  if (response.data.success && response.data.data) {
    return normalizePaginated(response.data.data);
  }
  throw new Error(response.data.error?.message || 'Failed to fetch properties');
}

export async function getProperty(id: string): Promise<Property> {
  const response = await api.get<ApiResponse<Property>>(`/properties/${id}`);
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data.error?.message || 'Failed to fetch property');
}

export async function getMyProperties(): Promise<Property[]> {
  const response = await api.get<ApiResponse<Property[] | BackendPaginated<Property>>>('/properties/mine');
  if (response.data.success && response.data.data) {
    const data = response.data.data;
    if (Array.isArray(data)) return data;
    return data.items ?? data.data ?? [];
  }
  throw new Error(response.data.error?.message || 'Failed to fetch properties');
}

export interface TaxDue {
  status: 'PAID' | 'PENDING';
  financialYear: string;
  amount: number;
  penalty?: number;
  totalDue?: number;
  dueDate?: string;
  isOverdue?: boolean;
  paidOn?: string;
  receiptNumber?: string;
}

export interface TaxPayment {
  id: string;
  financialYear: string;
  amount: number;
  penalty: number;
  totalAmount: number;
  status: string;
  paymentDate?: string;
  paymentMethod?: string;
  receiptNumber?: string;
}

export async function getTaxDue(propertyId: string): Promise<TaxDue> {
  const response = await api.get<ApiResponse<TaxDue>>(`/properties/${propertyId}/tax-due`);
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data.error?.message || 'Failed to fetch tax due');
}

export async function getPaymentHistory(propertyId: string): Promise<TaxPayment[]> {
  const response = await api.get<ApiResponse<TaxPayment[]>>(`/properties/${propertyId}/payment-history`);
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data.error?.message || 'Failed to fetch payment history');
}

export async function payTax(propertyId: string, financialYear: string, paymentMethod: string): Promise<TaxPayment> {
  const response = await api.post<ApiResponse<TaxPayment>>(`/properties/${propertyId}/pay-tax`, {
    financialYear,
    paymentMethod,
  });
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data.error?.message || 'Failed to pay tax');
}
