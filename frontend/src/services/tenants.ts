import api from './api';
import type { ApiResponse } from '../types';

export interface MyTenant {
  id: string;
  name: string;
  code: string;
  status: string;
  role: string;
  isDefault: boolean;
}

// Returns the tenants the current user has membership in.
export async function getMyTenants(): Promise<MyTenant[]> {
  const response = await api.get<ApiResponse<MyTenant[]>>('/tenants/me/list');
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data.error?.message || 'Failed to fetch tenants');
}

export interface PublicTenant {
  id: string;
  name: string;
  code: string;
}

// Public list of municipalities for the registration dropdown (no auth required).
export async function getPublicTenants(): Promise<PublicTenant[]> {
  const response = await api.get<ApiResponse<PublicTenant[]>>('/tenants/public');
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data.error?.message || 'Failed to fetch municipalities');
}
