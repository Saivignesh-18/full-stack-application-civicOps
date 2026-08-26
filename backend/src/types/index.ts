// Common types used across the application

export interface JwtPayload {
  sub: string;
  userId: string;
  email: string;
  role: string;
  tenantId?: string;
  sessionId: string;
  iat: number;
  exp: number;
}

export interface RefreshTokenPayload {
  sub: string;
  userId: string;
  sessionId: string;
  iat: number;
  exp: number;
}

export type Permission = 
  // Tenant permissions
  | 'tenant:read'
  | 'tenant:update'
  | 'tenant:delete'
  // User permissions
  | 'user:create'
  | 'user:read'
  | 'user:update'
  | 'user:delete'
  // Employee permissions
  | 'employee:create'
  | 'employee:read'
  | 'employee:update'
  | 'employee:delete'
  // Citizen permissions
  | 'citizen:create'
  | 'citizen:read'
  | 'citizen:update'
  | 'citizen:delete'
  // Complaint permissions
  | 'complaint:create'
  | 'complaint:read'
  | 'complaint:update'
  | 'complaint:assign'
  | 'complaint:resolve'
  | 'complaint:delete'
  // Property permissions
  | 'property:create'
  | 'property:read'
  | 'property:update'
  | 'property:delete'
  // License permissions
  | 'license:create'
  | 'license:read'
  | 'license:update'
  | 'license:approve'
  | 'license:reject'
  // Building permissions
  | 'building:create'
  | 'building:read'
  | 'building:update'
  | 'building:approve'
  | 'building:reject'
  // Project permissions
  | 'project:create'
  | 'project:read'
  | 'project:update'
  | 'project:delete'
  // Contractor permissions
  | 'contractor:create'
  | 'contractor:read'
  | 'contractor:update'
  | 'contractor:delete'
  // Finance permissions
  | 'finance:read'
  | 'finance:create'
  | 'finance:update'
  | 'finance:approve'
  // Report permissions
  | 'report:read'
  | 'report:generate'
  // Document permissions
  | 'document:create'
  | 'document:read'
  | 'document:delete'
  // Webhook permissions
  | 'webhook:create'
  | 'webhook:read'
  | 'webhook:update'
  | 'webhook:delete'
  // Audit permissions
  | 'audit:read'
  // Dashboard permissions
  | 'dashboard:read';

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
