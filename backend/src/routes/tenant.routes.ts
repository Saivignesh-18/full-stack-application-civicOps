import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';
import { publicLimiter, adminLimiter } from '../middleware/rateLimit.middleware.js';
import { sendSuccess, sendCreated, sendNoContent } from '../utils/response.js';
import { prisma } from '../config/database.js';
import { TenantNotFoundError, ConflictError } from '../errors/AppError.js';
import { parsePaginationParams, getPaginationOffset, createPaginatedResult } from '../utils/pagination.js';

const router = Router();

// Public: list active tenants (municipalities) for the registration dropdown.
// Must be defined BEFORE authMiddleware so it stays unauthenticated.
router.get('/public', publicLimiter, async (_req, res, next) => {
  try {
    const tenants = await prisma.tenant.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, name: true, code: true },
      orderBy: { name: 'asc' },
    });
    sendSuccess(res, tenants);
  } catch (error) {
    next(error);
  }
});

router.use(authMiddleware);
// Admin API tier: 120/min per user for tenant management endpoints
router.use(adminLimiter);

// List tenants (Super Admin only)
router.get('/', requireRole('SUPER_ADMIN'), async (req, res, next) => {
  try {
    const pagination = parsePaginationParams(req.query as any);
    const offset = getPaginationOffset(pagination);

    const where: any = {
      ...(req.query.status && { status: req.query.status }),
      ...(req.query.search && {
        OR: [
          { name: { contains: req.query.search as string, mode: 'insensitive' } },
          { code: { contains: req.query.search as string, mode: 'insensitive' } },
        ],
      }),
    };

    const [tenants, total] = await Promise.all([
      prisma.tenant.findMany({
        where,
        skip: offset,
        take: pagination.limit,
        include: {
          _count: {
            select: { users: true, employees: true, complaints: true },
          },
        },
        orderBy: { name: 'asc' },
      }),
      prisma.tenant.count({ where }),
    ]);

    sendSuccess(res, createPaginatedResult(tenants, total, pagination));
  } catch (error) {
    next(error);
  }
});

// Get tenant by ID
router.get('/:id', requireRole('SUPER_ADMIN', 'MUNICIPAL_ADMIN'), async (req, res, next) => {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.params.id },
      include: {
        zones: { select: { id: true, name: true, code: true } },
        departments: { select: { id: true, name: true, code: true } },
        _count: {
          select: {
            users: true,
            employees: true,
            citizens: true,
            complaints: true,
            projects: true,
          },
        },
      },
    });

    if (!tenant) {
      throw new TenantNotFoundError(req.params.id);
    }

    // Municipal admin can only view their own tenant
    if (req.user!.role === 'MUNICIPAL_ADMIN' && req.user!.tenantId !== tenant.id) {
      throw new TenantNotFoundError(req.params.id);
    }

    sendSuccess(res, tenant);
  } catch (error) {
    next(error);
  }
});

// Create tenant (Super Admin only)
router.post('/', requireRole('SUPER_ADMIN'), async (req, res, next) => {
  try {
    const { code, name, description, contactEmail, contactPhone, website } = req.body;

    // Check for duplicate code
    const existing = await prisma.tenant.findUnique({ where: { code } });
    if (existing) {
      throw new ConflictError('Tenant code already exists');
    }

    const tenant = await prisma.tenant.create({
      data: {
        code,
        name,
        description,
        contactEmail,
        contactPhone,
        website,
        status: 'ACTIVE',
      },
    });

    sendCreated(res, tenant);
  } catch (error) {
    next(error);
  }
});

// Update tenant
router.put('/:id', requireRole('SUPER_ADMIN', 'MUNICIPAL_ADMIN'), async (req, res, next) => {
  try {
    const tenant = await prisma.tenant.findUnique({ where: { id: req.params.id } });

    if (!tenant) {
      throw new TenantNotFoundError(req.params.id);
    }

    // Municipal admin can only update their own tenant
    if (req.user!.role === 'MUNICIPAL_ADMIN' && req.user!.tenantId !== tenant.id) {
      throw new TenantNotFoundError(req.params.id);
    }

    const { code, ...updateData } = req.body;

    const updated = await prisma.tenant.update({
      where: { id: req.params.id },
      data: updateData,
    });

    sendSuccess(res, updated);
  } catch (error) {
    next(error);
  }
});

// Delete tenant (Super Admin only)
router.delete('/:id', requireRole('SUPER_ADMIN'), async (req, res, next) => {
  try {
    const tenant = await prisma.tenant.findUnique({ where: { id: req.params.id } });

    if (!tenant) {
      throw new TenantNotFoundError(req.params.id);
    }

    await prisma.tenant.delete({ where: { id: req.params.id } });
    sendNoContent(res);
  } catch (error) {
    next(error);
  }
});

// Get my tenants (tenants user has membership in)
router.get('/me/list', async (req, res, next) => {
  try {
    const memberships = await prisma.membership.findMany({
      where: { userId: req.user!.id },
      include: {
        tenant: {
          select: { id: true, name: true, code: true, status: true },
        },
      },
    });

    const tenants = memberships.map((m) => ({
      ...m.tenant,
      role: m.role,
      isDefault: m.isDefault,
    }));

    sendSuccess(res, tenants);
  } catch (error) {
    next(error);
  }
});

export default router;
