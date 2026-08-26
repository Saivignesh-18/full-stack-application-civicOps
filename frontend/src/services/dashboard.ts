import api from './api';
import type { ApiResponse } from '../types';

export interface DashboardOverview {
  complaints: {
    total: number;
    pending: number;
    resolved: number;
    thisMonth: number;
    thisWeek: number;
    resolutionRate: number;
  };
  citizens: number;
  employees: number;
  properties: number;
  licenses: {
    pending: number;
    issued: number;
  };
  budget: {
    allocated: number;
    spent: number;
    utilization: number;
  };
  taxCollection: {
    thisMonth: number;
  };
}

export interface ComplaintAnalytics {
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  byDepartment: Array<{ department: string; departmentId: string; count: number }>;
  byCategory: Array<{ category: string; count: number }>;
  trend: Array<{ month: string; created: number; resolved: number }>;
}

export interface RevenueAnalytics {
  propertyTax: { collected: number; count: number };
  licenseFees: { collected: number; count: number };
  totalRevenue: number;
  monthlyTrend: Array<{
    month: string;
    propertyTax: number;
    licenseFees: number;
    total: number;
  }>;
}

export interface BudgetAnalytics {
  summary: {
    totalAllocated: number;
    totalSpent: number;
    totalRemaining: number;
    overallUtilization: number;
  };
  byDepartment: Array<{
    department: string;
    departmentCode: string;
    allocated: number;
    spent: number;
    remaining: number;
    utilization: number;
  }>;
}

export interface RecentActivity {
  type: 'complaint' | 'license';
  id: string;
  title: string;
  description: string;
  status: string;
  timestamp: string;
  actor?: string;
}

export async function getOverview(): Promise<DashboardOverview> {
  const response = await api.get<ApiResponse<DashboardOverview>>('/dashboard/overview');
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data.error?.message || 'Failed to fetch dashboard overview');
}

export async function getComplaintAnalytics(months = 6): Promise<ComplaintAnalytics> {
  const response = await api.get<ApiResponse<ComplaintAnalytics>>(`/dashboard/complaints?months=${months}`);
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data.error?.message || 'Failed to fetch complaint analytics');
}

export async function getRevenueAnalytics(): Promise<RevenueAnalytics> {
  const response = await api.get<ApiResponse<RevenueAnalytics>>('/dashboard/revenue');
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data.error?.message || 'Failed to fetch revenue analytics');
}

export async function getBudgetAnalytics(): Promise<BudgetAnalytics> {
  const response = await api.get<ApiResponse<BudgetAnalytics>>('/dashboard/budget');
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data.error?.message || 'Failed to fetch budget analytics');
}

export async function getRecentActivity(limit = 10): Promise<RecentActivity[]> {
  const response = await api.get<ApiResponse<RecentActivity[]>>(`/dashboard/activity?limit=${limit}`);
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data.error?.message || 'Failed to fetch recent activity');
}
