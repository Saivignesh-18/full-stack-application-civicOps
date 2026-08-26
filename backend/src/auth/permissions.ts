import type { Permission, Role } from '../types/index.js';

// Define permissions for each role
export const RolePermissions: Record<Role, Permission[]> = {
  SUPER_ADMIN: [
    // Full access to everything
    'tenant:read', 'tenant:update', 'tenant:delete',
    'user:create', 'user:read', 'user:update', 'user:delete',
    'employee:create', 'employee:read', 'employee:update', 'employee:delete',
    'citizen:create', 'citizen:read', 'citizen:update', 'citizen:delete',
    'complaint:create', 'complaint:read', 'complaint:update', 'complaint:assign', 'complaint:resolve', 'complaint:delete',
    'property:create', 'property:read', 'property:update', 'property:delete',
    'license:create', 'license:read', 'license:update', 'license:approve', 'license:reject',
    'building:create', 'building:read', 'building:update', 'building:approve', 'building:reject',
    'project:create', 'project:read', 'project:update', 'project:delete',
    'contractor:create', 'contractor:read', 'contractor:update', 'contractor:delete',
    'finance:read', 'finance:create', 'finance:update', 'finance:approve',
    'report:read', 'report:generate',
    'document:create', 'document:read', 'document:delete',
    'webhook:create', 'webhook:read', 'webhook:update', 'webhook:delete',
    'audit:read',
    'dashboard:read',
  ],

  MUNICIPAL_ADMIN: [
    'tenant:read', 'tenant:update',
    'user:create', 'user:read', 'user:update', 'user:delete',
    'employee:create', 'employee:read', 'employee:update', 'employee:delete',
    'citizen:create', 'citizen:read', 'citizen:update', 'citizen:delete',
    'complaint:read', 'complaint:update', 'complaint:assign', 'complaint:resolve', 'complaint:delete',
    'property:create', 'property:read', 'property:update', 'property:delete',
    'license:create', 'license:read', 'license:update', 'license:approve', 'license:reject',
    'building:create', 'building:read', 'building:update', 'building:approve', 'building:reject',
    'project:create', 'project:read', 'project:update', 'project:delete',
    'contractor:create', 'contractor:read', 'contractor:update', 'contractor:delete',
    'finance:read', 'finance:create', 'finance:update', 'finance:approve',
    'report:read', 'report:generate',
    'document:create', 'document:read', 'document:delete',
    'webhook:create', 'webhook:read', 'webhook:update', 'webhook:delete',
    'audit:read',
    'dashboard:read',
  ],

  COMMISSIONER: [
    'tenant:read',
    'user:read',
    'employee:read', 'employee:update',
    'citizen:read',
    'complaint:read', 'complaint:update', 'complaint:assign', 'complaint:resolve',
    'property:read', 'property:update',
    'license:read', 'license:approve', 'license:reject',
    'building:read', 'building:approve', 'building:reject',
    'project:create', 'project:read', 'project:update',
    'contractor:read', 'contractor:update',
    'finance:read', 'finance:approve',
    'report:read', 'report:generate',
    'document:create', 'document:read',
    'audit:read',
    'dashboard:read',
  ],

  ZONAL_OFFICER: [
    'tenant:read',
    'employee:read',
    'citizen:read',
    'complaint:read', 'complaint:update', 'complaint:assign', 'complaint:resolve',
    'property:read', 'property:update',
    'license:read', 'license:update',
    'building:read', 'building:update',
    'project:read', 'project:update',
    'contractor:read',
    'finance:read',
    'report:read', 'report:generate',
    'document:create', 'document:read',
    'dashboard:read',
  ],

  DEPARTMENT_OFFICER: [
    'tenant:read',
    'employee:read',
    'citizen:read',
    'complaint:read', 'complaint:update', 'complaint:assign', 'complaint:resolve',
    'property:read',
    'license:read', 'license:update',
    'building:read', 'building:update',
    'project:read', 'project:update',
    'contractor:read',
    'finance:read',
    'report:read',
    'document:create', 'document:read',
    'dashboard:read',
  ],

  FIELD_OFFICER: [
    'tenant:read',
    'complaint:read', 'complaint:update', 'complaint:resolve',
    'property:read',
    'license:read',
    'building:read',
    'project:read', 'project:update',
    'document:create', 'document:read',
  ],

  EMPLOYEE: [
    'tenant:read',
    'complaint:read', 'complaint:update',
    'project:read',
    'document:create', 'document:read',
  ],

  CONTRACTOR: [
    'tenant:read',
    'project:read', 'project:update',
    'document:create', 'document:read',
  ],

  CITIZEN: [
    'complaint:create', 'complaint:read',
    'property:read',
    'license:create', 'license:read',
    'building:create', 'building:read',
    'document:create', 'document:read',
  ],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  const permissions = RolePermissions[role];
  return permissions?.includes(permission) ?? false;
}

export function hasAnyPermission(role: Role, permissions: Permission[]): boolean {
  return permissions.some((permission) => hasPermission(role, permission));
}

export function hasAllPermissions(role: Role, permissions: Permission[]): boolean {
  return permissions.every((permission) => hasPermission(role, permission));
}

export function getPermissionsForRole(role: Role): Permission[] {
  return RolePermissions[role] || [];
}
