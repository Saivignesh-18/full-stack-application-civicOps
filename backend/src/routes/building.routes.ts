import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { tenantMiddleware } from '../middleware/tenant.middleware.js';
import { requirePermission } from '../middleware/rbac.middleware.js';
import { sendSuccess, sendCreated } from '../utils/response.js';
import { prisma } from '../config/database.js';
import { parsePaginationParams, getPaginationOffset, createPaginatedResult } from '../utils/pagination.js';
import { NotFoundError, BadRequestError } from '../errors/AppError.js';

const router = Router();

router.use(authMiddleware);
router.use(tenantMiddleware);

// Building permit fee by type and built-up area (simple slab)
function calculateBuildingFee(buildingType: string, builtUpArea: number): number {
  const ratePerSqFt: Record<string, number> = {
    RESIDENTIAL: 20,
    COMMERCIAL: 40,
    INDUSTRIAL: 50,
    MIXED_USE: 35,
    default: 25,
  };
  const rate = ratePerSqFt[buildingType] || ratePerSqFt.default;
  return Math.round(builtUpArea * rate);
}

async function generateApplicationNumber(tenantId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `BP-${year}`;
  const last = await prisma.buildingApplication.findFirst({
    where: { tenantId, applicationNumber: { startsWith: prefix } },
    orderBy: { applicationNumber: 'desc' },
  });
  let sequence = 1;
  if (last) {
    sequence = parseInt(last.applicationNumber.split('-').pop() || '0', 10) + 1;
  }
  return `${prefix}-${sequence.toString().padStart(4, '0')}`;
}

function generatePermitNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `PERMIT-${year}-${random}`;
}

async function addWorkflowStep(
  applicationId: string,
  step: string,
  status: string,
  comments?: string,
  assignedTo?: string
) {
  return prisma.buildingWorkflowStep.create({
    data: {
      applicationId,
      step,
      status,
      comments,
      assignedTo,
      completedAt: ['COMPLETED', 'APPROVED', 'REJECTED'].includes(status) ? new Date() : null,
    },
  });
}

// List building applications
router.get('/', requirePermission('building:read'), async (req, res, next) => {
  try {
    const tenantId = req.tenant!.id;
    const pagination = parsePaginationParams(req.query as any);
    const offset = getPaginationOffset(pagination);

    const where: any = {
      tenantId,
      ...(req.query.status && { status: req.query.status }),
      ...(req.query.buildingType && { buildingType: req.query.buildingType }),
      ...(req.query.search && {
        OR: [
          { applicationNumber: { contains: req.query.search as string, mode: 'insensitive' } },
          { plotAddress: { contains: req.query.search as string, mode: 'insensitive' } },
          { permitNumber: { contains: req.query.search as string, mode: 'insensitive' } },
        ],
      }),
    };

    // Citizens only see their own applications
    if (req.user!.role === 'CITIZEN') {
      const citizen = await prisma.citizen.findUnique({ where: { userId: req.user!.id } });
      if (citizen) where.applicantId = citizen.id;
      else where.applicantId = '__none__';
    }

    const [items, total] = await Promise.all([
      prisma.buildingApplication.findMany({
        where,
        skip: offset,
        take: pagination.limit,
        include: { applicant: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.buildingApplication.count({ where }),
    ]);

    sendSuccess(res, createPaginatedResult(items, total, pagination));
  } catch (error) {
    next(error);
  }
});

// Get single application
router.get('/:id', requirePermission('building:read'), async (req, res, next) => {
  try {
    const application = await prisma.buildingApplication.findFirst({
      where: { id: req.params.id, tenantId: req.tenant!.id },
      include: {
        applicant: { select: { id: true, name: true, email: true, phone: true } },
        workflow: { orderBy: { createdAt: 'desc' } },
        documents: { select: { id: true, fileName: true, mimeType: true, size: true, createdAt: true } },
      },
    });
    if (!application) {
      throw new NotFoundError('Building application not found', 'BUILDING_NOT_FOUND');
    }
    sendSuccess(res, application);
  } catch (error) {
    next(error);
  }
});

// Create building application
router.post('/', requirePermission('building:create'), async (req, res, next) => {
  try {
    const tenantId = req.tenant!.id;

    // Determine applicant
    let applicantId: string;
    if (req.user!.role === 'CITIZEN') {
      const citizen = await prisma.citizen.findUnique({ where: { userId: req.user!.id } });
      if (!citizen) throw new BadRequestError('Citizen profile not found');
      applicantId = citizen.id;
    } else {
      if (!req.body.applicantId) throw new BadRequestError('applicantId is required');
      applicantId = req.body.applicantId;
    }

    const applicationNumber = await generateApplicationNumber(tenantId);

    const application = await prisma.buildingApplication.create({
      data: {
        tenantId,
        applicationNumber,
        applicantId,
        plotAddress: req.body.plotAddress,
        plotArea: req.body.plotArea,
        proposedBuiltUpArea: req.body.proposedBuiltUpArea,
        numberOfFloors: req.body.numberOfFloors,
        buildingType: req.body.buildingType,
        status: 'SUBMITTED',
        applicationDate: new Date(),
      },
    });

    await addWorkflowStep(application.id, 'APPLICATION_SUBMITTED', 'COMPLETED', 'Application submitted for review');

    sendCreated(res, application);
  } catch (error) {
    next(error);
  }
});

// Approve application -> issues permit number, sets fee
router.post('/:id/approve', requirePermission('building:approve'), async (req, res, next) => {
  try {
    const tenantId = req.tenant!.id;
    const application = await prisma.buildingApplication.findFirst({
      where: { id: req.params.id, tenantId },
    });
    if (!application) throw new NotFoundError('Building application not found', 'BUILDING_NOT_FOUND');

    if (['APPROVED', 'REJECTED', 'PERMIT_ISSUED'].includes(application.status)) {
      throw new BadRequestError('Application cannot be approved in current status');
    }

    const fee = calculateBuildingFee(application.buildingType, application.proposedBuiltUpArea);

    const updated = await prisma.buildingApplication.update({
      where: { id: application.id },
      data: {
        status: 'APPROVED',
        approvalDate: new Date(),
        fee,
        paymentStatus: 'PENDING',
      },
    });

    await addWorkflowStep(application.id, 'APPROVAL', 'APPROVED', req.body?.comments || 'Application approved');

    sendSuccess(res, updated);
  } catch (error) {
    next(error);
  }
});

// Reject application
router.post('/:id/reject', requirePermission('building:reject'), async (req, res, next) => {
  try {
    const tenantId = req.tenant!.id;
    const reason: string = req.body?.reason || '';
    if (reason.trim().length < 10) {
      throw new BadRequestError('Rejection reason must be at least 10 characters');
    }

    const application = await prisma.buildingApplication.findFirst({
      where: { id: req.params.id, tenantId },
    });
    if (!application) throw new NotFoundError('Building application not found', 'BUILDING_NOT_FOUND');

    if (['REJECTED', 'PERMIT_ISSUED'].includes(application.status)) {
      throw new BadRequestError('Application cannot be rejected in current status');
    }

    const updated = await prisma.buildingApplication.update({
      where: { id: application.id },
      data: { status: 'REJECTED', rejectionReason: reason },
    });

    await addWorkflowStep(application.id, 'REJECTION', 'REJECTED', reason);

    sendSuccess(res, updated);
  } catch (error) {
    next(error);
  }
});

// Pay fee -> issue permit
router.post('/:id/pay', requirePermission('building:read'), async (req, res, next) => {
  try {
    const tenantId = req.tenant!.id;
    const application = await prisma.buildingApplication.findFirst({
      where: { id: req.params.id, tenantId },
    });
    if (!application) throw new NotFoundError('Building application not found', 'BUILDING_NOT_FOUND');

    if (application.status !== 'APPROVED') {
      throw new BadRequestError('Application must be approved before payment');
    }

    const now = new Date();
    const expiry = new Date(now.getFullYear() + 3, now.getMonth(), now.getDate()); // permit valid 3 years

    const updated = await prisma.buildingApplication.update({
      where: { id: application.id },
      data: {
        status: 'PERMIT_ISSUED',
        paymentStatus: 'COMPLETED',
        permitNumber: generatePermitNumber(),
        permitIssueDate: now,
        permitExpiryDate: expiry,
      },
    });

    await addWorkflowStep(application.id, 'PAYMENT', 'COMPLETED', `Payment received via ${req.body?.paymentMethod || 'UPI'}`);
    await addWorkflowStep(application.id, 'PERMIT_ISSUANCE', 'COMPLETED', 'Building permit issued');

    sendSuccess(res, updated);
  } catch (error) {
    next(error);
  }
});

export default router;
