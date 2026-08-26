import api from './api';
import type { ApiResponse, PaginatedResponse } from '../types';

export type BuildingStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'DOCUMENT_VERIFICATION'
  | 'INSPECTION'
  | 'OFFICER_REVIEW'
  | 'SENIOR_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'PAYMENT_PENDING'
  | 'PERMIT_ISSUED'
  | 'EXPIRED';

export interface BuildingApplication {
  id: string;
  applicationNumber: string;
  applicantId: string;
  applicant?: { name: string; email?: string; phone?: string };
  plotAddress: string;
  plotArea: number;
  proposedBuiltUpArea: number;
  numberOfFloors: number;
  buildingType: string;
  status: BuildingStatus;
  applicationDate?: string;
  approvalDate?: string;
  permitNumber?: string;
  permitIssueDate?: string;
  permitExpiryDate?: string;
  fee?: number;
  paymentStatus?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BuildingWorkflowStep {
  id: string;
  step: string;
  status: string;
  comments?: string;
  completedAt?: string;
  createdAt: string;
}

export interface BuildingFilters {
  status?: string;
  buildingType?: string;
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

export async function getBuildingApplications(filters: BuildingFilters = {}): Promise<PaginatedResponse<BuildingApplication>> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      params.append(key, String(value));
    }
  });
  const response = await api.get<ApiResponse<BackendPaginated<BuildingApplication>>>(`/building-permits?${params}`);
  if (response.data.success && response.data.data) {
    return normalizePaginated(response.data.data);
  }
  throw new Error(response.data.error?.message || 'Failed to fetch building applications');
}

export async function getBuildingApplication(id: string): Promise<BuildingApplication & { workflow?: BuildingWorkflowStep[] }> {
  const response = await api.get<ApiResponse<BuildingApplication & { workflow?: BuildingWorkflowStep[] }>>(`/building-permits/${id}`);
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data.error?.message || 'Failed to fetch application');
}

export interface CreateBuildingInput {
  plotAddress: string;
  plotArea: number;
  proposedBuiltUpArea: number;
  numberOfFloors: number;
  buildingType: string;
}

export async function createBuildingApplication(input: CreateBuildingInput): Promise<BuildingApplication> {
  const response = await api.post<ApiResponse<BuildingApplication>>('/building-permits', input);
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data.error?.message || 'Failed to create application');
}

export async function approveBuilding(id: string, comments?: string): Promise<BuildingApplication> {
  const response = await api.post<ApiResponse<BuildingApplication>>(`/building-permits/${id}/approve`, { comments });
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data.error?.message || 'Failed to approve');
}

export async function rejectBuilding(id: string, reason: string): Promise<BuildingApplication> {
  const response = await api.post<ApiResponse<BuildingApplication>>(`/building-permits/${id}/reject`, { reason });
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data.error?.message || 'Failed to reject');
}

export async function payBuildingFee(id: string, paymentMethod: string): Promise<BuildingApplication> {
  const response = await api.post<ApiResponse<BuildingApplication>>(`/building-permits/${id}/pay`, { paymentMethod });
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data.error?.message || 'Failed to process payment');
}
