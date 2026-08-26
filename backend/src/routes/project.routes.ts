import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { tenantMiddleware } from '../middleware/tenant.middleware.js';
import { requirePermission } from '../middleware/rbac.middleware.js';
import { sendSuccess, sendCreated, sendNoContent } from '../utils/response.js';
import { prisma } from '../config/database.js';
import { parsePaginationParams, getPaginationOffset, createPaginatedResult } from '../utils/pagination.js';
import { NotFoundError, ConflictError } from '../errors/AppError.js';

const router = Router();

router.use(authMiddleware);
router.use(tenantMiddleware);

// Generate work identification number
async function generateWIN(tenantId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `WIN-${year}`;

  const last = await prisma.project.findFirst({
    where: { tenantId, win: { startsWith: prefix } },
    orderBy: { win: 'desc' },
  });

  let sequence = 1;
  if (last) {
    sequence = parseInt(last.win.split('-').pop() || '0', 10) + 1;
  }

  return `${prefix}-${sequence.toString().padStart(4, '0')}`;
}

// List projects
router.get('/', requirePermission('project:read'), async (req, res, next) => {
  try {
    const tenantId = req.tenant!.id;
    const pagination = parsePaginationParams(req.query as any);
    const offset = getPaginationOffset(pagination);

    const where: any = {
      tenantId,
      ...(req.query.status && { status: req.query.status }),
      ...(req.query.departmentId && { departmentId: req.query.departmentId }),
      ...(req.query.wardId && { wardId: req.query.wardId }),
      ...(req.query.contractorId && { contractorId: req.query.contractorId }),
      ...(req.query.search && {
        OR: [
          { win: { contains: req.query.search as string, mode: 'insensitive' } },
          { name: { contains: req.query.search as string, mode: 'insensitive' } },
        ],
      }),
    };

    // Contractors can only see their assigned projects
    if (req.user!.role === 'CONTRACTOR') {
      const contractor = await prisma.contractor.findFirst({
        where: { tenantId, email: req.user!.email },
      });
      if (contractor) where.contractorId = contractor.id;
    }

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        skip: offset,
        take: pagination.limit,
        include: {
          department: { select: { name: true } },
          ward: { select: { name: true } },
          contractor: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.project.count({ where }),
    ]);

    sendSuccess(res, createPaginatedResult(projects, total, pagination));
  } catch (error) {
    next(error);
  }
});

// Get single project
router.get('/:id', requirePermission('project:read'), async (req, res, next) => {
  try {
    const project = await prisma.project.findFirst({
      where: { id: req.params.id, tenantId: req.tenant!.id },
      include: {
        department: true,
        zone: true,
        circle: true,
        ward: true,
        contractor: true,
        milestones: { orderBy: { targetDate: 'asc' } },
        documents: true,
      },
    });

    if (!project) {
      throw new NotFoundError('Project not found', 'PROJECT_NOT_FOUND');
    }

    sendSuccess(res, project);
  } catch (error) {
    next(error);
  }
});

// Create project
router.post('/', requirePermission('project:create'), async (req, res, next) => {
  try {
    const tenantId = req.tenant!.id;
    const win = await generateWIN(tenantId);

    const project = await prisma.project.create({
      data: {
        tenantId,
        win,
        name: req.body.name,
        description: req.body.description,
        departmentId: req.body.departmentId,
        zoneId: req.body.zoneId,
        circleId: req.body.circleId,
        wardId: req.body.wardId,
        estimatedCost: req.body.estimatedCost,
        startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
        expectedEndDate: req.body.expectedEndDate ? new Date(req.body.expectedEndDate) : undefined,
        status: 'PROPOSED',
        createdById: req.user!.id,
      },
    });

    sendCreated(res, project);
  } catch (error) {
    next(error);
  }
});

// Update project
router.put('/:id', requirePermission('project:update'), async (req, res, next) => {
  try {
    const project = await prisma.project.findFirst({
      where: { id: req.params.id, tenantId: req.tenant!.id },
    });

    if (!project) {
      throw new NotFoundError('Project not found', 'PROJECT_NOT_FOUND');
    }

    const updated = await prisma.project.update({
      where: { id: req.params.id },
      data: {
        name: req.body.name,
        description: req.body.description,
        approvedCost: req.body.approvedCost,
        actualCost: req.body.actualCost,
        status: req.body.status,
        progress: req.body.progress,
        startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
        expectedEndDate: req.body.expectedEndDate ? new Date(req.body.expectedEndDate) : undefined,
        actualEndDate: req.body.actualEndDate ? new Date(req.body.actualEndDate) : undefined,
        contractorId: req.body.contractorId,
      },
    });

    sendSuccess(res, updated);
  } catch (error) {
    next(error);
  }
});

// Update project progress
router.patch('/:id/progress', requirePermission('project:update'), async (req, res, next) => {
  try {
    const project = await prisma.project.findFirst({
      where: { id: req.params.id, tenantId: req.tenant!.id },
    });

    if (!project) {
      throw new NotFoundError('Project not found', 'PROJECT_NOT_FOUND');
    }

    const { progress, status } = req.body;

    const updateData: any = {};
    if (typeof progress === 'number') {
      updateData.progress = Math.min(100, Math.max(0, progress));
    }
    if (status) {
      updateData.status = status;
    }
    if (progress === 100) {
      updateData.status = 'COMPLETED';
      updateData.actualEndDate = new Date();
    }

    const updated = await prisma.project.update({
      where: { id: req.params.id },
      data: updateData,
    });

    sendSuccess(res, updated);
  } catch (error) {
    next(error);
  }
});

// Delete project
router.delete('/:id', requirePermission('project:delete'), async (req, res, next) => {
  try {
    const project = await prisma.project.findFirst({
      where: { id: req.params.id, tenantId: req.tenant!.id },
    });

    if (!project) {
      throw new NotFoundError('Project not found', 'PROJECT_NOT_FOUND');
    }

    await prisma.project.delete({ where: { id: req.params.id } });
    sendNoContent(res);
  } catch (error) {
    next(error);
  }
});

export default router;
