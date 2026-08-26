// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    requestId?: string;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Auth types
export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  tenantId?: string;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  tenantId?: string;
}

// Role types
export type Role =
  | 'SUPER_ADMIN'
  | 'MUNICIPAL_ADMIN'
  | 'COMMISSIONER'
  | 'ZONAL_OFFICER'
  | 'DEPARTMENT_OFFICER'
  | 'FIELD_OFFICER'
  | 'EMPLOYEE'
  | 'CONTRACTOR'
  | 'CITIZEN';

// Tenant types
export interface Tenant {
  id: string;
  name: string;
  code: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  createdAt: string;
}

// Employee types
export interface Employee {
  id: string;
  tenantId: string;
  employeeCode: string;
  name: string;
  email: string;
  phone: string;
  departmentId: string;
  designation: string;
  zoneId?: string;
  circleId?: string;
  wardId?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  joiningDate: string;
  createdAt: string;
}

// Citizen types
export interface Citizen {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  wardId?: string;
  createdAt: string;
}

// Complaint types
export type ComplaintStatus =
  | 'CREATED'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'INSPECTION'
  | 'RESOLVED'
  | 'CITIZEN_VERIFICATION'
  | 'CLOSED'
  | 'REOPENED'
  | 'REJECTED';

export type ComplaintPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface Complaint {
  id: string;
  tenantId: string;
  complaintNumber: string;
  citizenId: string;
  category: string;
  description: string;
  latitude?: number;
  longitude?: number;
  address: string;
  zoneId?: string;
  circleId?: string;
  wardId?: string;
  departmentId?: string;
  assignedTo?: string;
  priority: ComplaintPriority;
  status: ComplaintStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ComplaintEvent {
  id: string;
  complaintId: string;
  action: string;
  description: string;
  performedBy: string;
  createdAt: string;
}

// Property types
export interface Property {
  id: string;
  tenantId: string;
  propertyId: string;
  ownerId: string;
  address: string;
  zoneId?: string;
  circleId?: string;
  wardId?: string;
  propertyType: string;
  area: number;
  annualTax: number;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
}

// License types
export type LicenseStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'DOCUMENT_REVIEW'
  | 'INSPECTION'
  | 'APPROVED'
  | 'REJECTED'
  | 'PAYMENT_PENDING'
  | 'ISSUED'
  | 'EXPIRED';

export interface TradeLicense {
  id: string;
  tenantId: string;
  applicationNumber: string;
  applicantId: string;
  businessName: string;
  businessType: string;
  address: string;
  wardId?: string;
  status: LicenseStatus;
  createdAt: string;
  updatedAt: string;
}

// Project types
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
  tenantId: string;
  win: string; // Work Identification Number
  name: string;
  description: string;
  departmentId: string;
  zoneId?: string;
  circleId?: string;
  wardId?: string;
  contractorId?: string;
  estimatedCost: number;
  approvedCost?: number;
  startDate?: string;
  endDate?: string;
  status: ProjectStatus;
  progress: number;
  createdAt: string;
}

// Dashboard types
export interface DashboardStats {
  totalComplaints: number;
  pendingComplaints: number;
  resolvedComplaints: number;
  openApplications: number;
  activeProjects: number;
  totalEmployees: number;
  totalBudget: number;
  expenditure: number;
}
