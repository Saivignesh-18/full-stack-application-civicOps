import { Request, Response, NextFunction } from 'express';
import { ForbiddenError, InsufficientPermissionsError, UnauthorizedError } from '../errors/AppError.js';
import { hasPermission, hasAnyPermission, hasAllPermissions } from '../auth/permissions.js';
import type { Permission, Role } from '../types/index.js';

// Check if user has specific permission
export function requirePermission(permission: Permission) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (!hasPermission(req.user.role as Role, permission)) {
      return next(new InsufficientPermissionsError(permission));
    }

    next();
  };
}

// Check if user has any of the specified permissions
export function requireAnyPermission(permissions: Permission[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (!hasAnyPermission(req.user.role as Role, permissions)) {
      return next(new InsufficientPermissionsError(permissions.join(' or ')));
    }

    next();
  };
}

// Check if user has all specified permissions
export function requireAllPermissions(permissions: Permission[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (!hasAllPermissions(req.user.role as Role, permissions)) {
      return next(new InsufficientPermissionsError(permissions.join(' and ')));
    }

    next();
  };
}

// Check if user has specific role
export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (!roles.includes(req.user.role as Role)) {
      return next(new ForbiddenError(`Required role: ${roles.join(' or ')}`));
    }

    next();
  };
}

// Check if user is admin (SUPER_ADMIN or MUNICIPAL_ADMIN)
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    return next(new UnauthorizedError('Authentication required'));
  }

  const adminRoles: Role[] = ['SUPER_ADMIN', 'MUNICIPAL_ADMIN'];
  if (!adminRoles.includes(req.user.role as Role)) {
    return next(new ForbiddenError('Admin access required'));
  }

  next();
}

// Check if user can manage employees (officers and above)
export function requireOfficer(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    return next(new UnauthorizedError('Authentication required'));
  }

  const officerRoles: Role[] = [
    'SUPER_ADMIN',
    'MUNICIPAL_ADMIN',
    'COMMISSIONER',
    'ZONAL_OFFICER',
    'DEPARTMENT_OFFICER',
    'FIELD_OFFICER',
  ];

  if (!officerRoles.includes(req.user.role as Role)) {
    return next(new ForbiddenError('Officer access required'));
  }

  next();
}
