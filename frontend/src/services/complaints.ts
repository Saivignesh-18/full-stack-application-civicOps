import api from './api';
import type { ApiResponse, PaginatedResponse } from '../types';

export interface Complaint {
  id: string;
  complaintNumber: string;
  category: string;
  description: string;
  status: 'CREATED' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | 'REJECTED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  address: string;
  wardId?: string;
  latitude?: number;
  longitude?: number;
  citizenId: string;
  citizen?: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  assignedToId?: string;
  assignedTo?: {
    id: string;
    name: string;
    email: string;
    department?: { name: string };
  };
  departmentId?: string;
  department?: {
    id: string;
    name: string;
    code: string;
  };
  resolvedAt?: string;
  resolutionNotes?: string;
  timeline?: ComplaintTimeline[];
  createdAt: string;
  updatedAt: string;
}

export interface ComplaintTimeline {
  id: string;
  action: string;
  description: string;
  userId: string;
  user?: { name: string };
  createdAt: string;
}

export interface CreateComplaintInput {
  category: string;
  description: string;
  address: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  wardId?: string;
  latitude?: number;
  longitude?: number;
}

export interface UpdateComplaintInput {
  category?: string;
  description?: string;
  address?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
}

export interface ComplaintFilters {
  status?: string;
  priority?: string;
  category?: string;
  departmentId?: string;
  wardId?: string;
  page?: number;
  limit?: number;
}

// Backend returns paginated results as { items, pagination }.
// Normalize to the frontend's { data, pagination } shape.
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

export async function getComplaints(filters: ComplaintFilters = {}): Promise<PaginatedResponse<Complaint>> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      params.append(key, String(value));
    }
  });
  const response = await api.get<ApiResponse<BackendPaginated<Complaint>>>(`/complaints?${params}`);
  if (response.data.success && response.data.data) {
    return normalizePaginated(response.data.data);
  }
  throw new Error(response.data.error?.message || 'Failed to fetch complaints');
}

export async function getMyComplaints(filters: ComplaintFilters = {}): Promise<PaginatedResponse<Complaint>> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      params.append(key, String(value));
    }
  });
  const response = await api.get<ApiResponse<BackendPaginated<Complaint>>>(`/complaints/mine?${params}`);
  if (response.data.success && response.data.data) {
    return normalizePaginated(response.data.data);
  }
  throw new Error(response.data.error?.message || 'Failed to fetch complaints');
}

export async function getComplaint(id: string): Promise<Complaint> {
  const response = await api.get<ApiResponse<Complaint>>(`/complaints/${id}`);
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data.error?.message || 'Failed to fetch complaint');
}

export async function createComplaint(data: CreateComplaintInput): Promise<Complaint> {
  const response = await api.post<ApiResponse<Complaint>>('/complaints', data);
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data.error?.message || 'Failed to create complaint');
}

export async function updateComplaint(id: string, data: UpdateComplaintInput): Promise<Complaint> {
  const response = await api.patch<ApiResponse<Complaint>>(`/complaints/${id}`, data);
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data.error?.message || 'Failed to update complaint');
}

export async function assignComplaint(id: string, assignedToId: string, departmentId?: string, comment?: string): Promise<Complaint> {
  const response = await api.patch<ApiResponse<Complaint>>(`/complaints/${id}/assign`, { assignedToId, departmentId, comment });
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data.error?.message || 'Failed to assign complaint');
}

export async function updateComplaintStatus(
  id: string,
  status: string,
  comment?: string
): Promise<Complaint> {
  const response = await api.patch<ApiResponse<Complaint>>(`/complaints/${id}/status`, { status, comment });
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data.error?.message || 'Failed to update status');
}

export async function addComplaintComment(id: string, comment: string): Promise<void> {
  const response = await api.post<ApiResponse<void>>(`/complaints/${id}/timeline`, {
    action: 'COMMENT',
    description: comment,
  });
  if (!response.data.success) {
    throw new Error(response.data.error?.message || 'Failed to add comment');
  }
}
