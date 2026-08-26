import api from './api';
import type { ApiResponse, PaginatedResponse } from '../types';

export type ProjectStatus =
  | 'PROPOSED'
  | 'APPROVED'
  | 'TENDERED'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'ON_HOLD'
  | 'COMPLETED'
  | 'CANCELLED';

export interface Project {
  id: string;
  win: string;
  name: string;
  description?: string;
  departmentId: string;
  department?: { name: string };
  wardId?: string;
  ward?: { name: string };
  contractorId?: string;
  contractor?: { name: string };
  estimatedCost: number;
  approvedCost?: number;
  actualCost?: number;
  startDate?: string;
  expectedEndDate?: string;
  actualEndDate?: string;
  status: ProjectStatus;
  progress: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectFilters {
  status?: string;
  departmentId?: string;
  wardId?: string;
  contractorId?: string;
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

export async function getProjects(filters: ProjectFilters = {}): Promise<PaginatedResponse<Project>> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      params.append(key, String(value));
    }
  });
  const response = await api.get<ApiResponse<BackendPaginated<Project>>>(`/projects?${params}`);
  if (response.data.success && response.data.data) {
    return normalizePaginated(response.data.data);
  }
  throw new Error(response.data.error?.message || 'Failed to fetch projects');
}

export async function getProject(id: string): Promise<Project> {
  const response = await api.get<ApiResponse<Project>>(`/projects/${id}`);
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data.error?.message || 'Failed to fetch project');
}
