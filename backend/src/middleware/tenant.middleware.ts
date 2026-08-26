import { Request, Response, NextFunction } from 'express';
import { TenantNotFoundError, TenantAccessDeniedError, UnauthorizedError } from '../errors/AppError.js';
import { prisma } from '../config/database.js';

// Extract and validate tenant from request
export async function tenantMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    // Get tenant ID from header, query, or user's default tenant
    let tenantId = 
      (req.headers['x-tenant-id'] as string) ||
      (req.query.tenantId as string) ||
      req.user.tenantId;

    if (!tenantId) {
      return next(new TenantNotFoundError('Tenant ID is required'));
    }

    // Super admin can access any tenant
    if (req.user.role === 'SUPER_ADMIN') {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { id: true, name: true, code: true, status: true },
      });

      if (!tenant) {
        return next(new TenantNotFoundError(tenantId));
      }

      if (tenant.status !== 'ACTIVE') {
        return next(new TenantAccessDeniedError());
      }

      req.tenant = {
        id: tenant.id,
        name: tenant.name,
        code: tenant.code,
      };

      return next();
    }

    // Check if user has membership in this tenant
    const membership = await prisma.membership.findUnique({
      where: {
        userId_tenantId: {
          userId: req.user.id,
          tenantId: tenantId,
        },
      },
      include: {
        tenant: {
          select: { id: true, name: true, code: true, status: true },
        },
      },
    });

    if (!membership) {
      return next(new TenantAccessDeniedError());
    }

    if (membership.tenant.status !== 'ACTIVE') {
      return next(new TenantAccessDeniedError());
    }

    req.tenant = {
      id: membership.tenant.id,
      name: membership.tenant.name,
      code: membership.tenant.code,
    };

    // Update user role based on membership role for this tenant
    req.user.role = membership.role;

    next();
  } catch (error) {
    next(error);
  }
}

// Optional tenant middleware - sets tenant if available but doesn't require it
export async function optionalTenantMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      return next();
    }

    const tenantId = 
      (req.headers['x-tenant-id'] as string) ||
      (req.query.tenantId as string) ||
      req.user.tenantId;

    if (!tenantId) {
      return next();
    }

    if (req.user.role === 'SUPER_ADMIN') {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { id: true, name: true, code: true },
      });

      if (tenant) {
        req.tenant = tenant;
      }
      return next();
    }

    const membership = await prisma.membership.findUnique({
      where: {
        userId_tenantId: {
          userId: req.user.id,
          tenantId: tenantId,
        },
      },
      include: {
        tenant: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    if (membership) {
      req.tenant = {
        id: membership.tenant.id,
        name: membership.tenant.name,
        code: membership.tenant.code,
      };
      req.user.role = membership.role;
    }

    next();
  } catch (error) {
    next(error);
  }
}
