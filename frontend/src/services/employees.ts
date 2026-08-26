import api from './api';
import type { ApiResponse, PaginatedResponse } from '../types';

export interface Employee {
  id: string;
  userId: string;
  name: string;
  email: string;
  designation: string;
  departmentId: string;
  department?: { name: string };
  status: string;
}

interface BackendPaginated<T> {
  items?: T[];
  data?: T[];
  pagination: PaginatedResponse<T>['pagination'];
}

// List employees (used for the complaint assignment dropdown).
export async function getEmployees(limit = 100): Promise<Employee[]> {
  const response = await api.get<ApiResponse<BackendPaginated<Employee>>>(`/employees?limit=${limit}`);
  if (response.data.success && response.data.data) {
    const data = response.data.data;
    return data.items ?? data.data ?? [];
  }
  throw new Error(response.data.error?.message || 'Failed to fetch employees');
}
