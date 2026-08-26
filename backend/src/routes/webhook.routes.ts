import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { tenantMiddleware } from '../middleware/tenant.middleware.js';
import { requirePermission } from '../middleware/rbac.middleware.js';
import { webhookLimiter } from '../middleware/rateLimit.middleware.js';
import { sendSuccess, sendCreated, sendNoContent } from '../utils/response.js';
import { prisma } from '../config/database.js';
import { NotFoundError } from '../errors/AppError.js';
import crypto from 'crypto';

const router = Router();

router.use(authMiddleware);
router.use(tenantMiddleware);

// List webhook endpoints
router.get('/', requirePermission('webhook:read'), async (req, res, next) => {
  try {
    const tenantId = req.tenant!.id;

    const endpoints = await prisma.webhookEndpoint.findMany({
      where: { tenantId },
      include: {
        _count: { select: { deliveries: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Don't expose secrets
    const safeEndpoints = endpoints.map(({ secret, ...endpoint }) => endpoint);

    sendSuccess(res, safeEndpoints);
  } catch (error) {
    next(error);
  }
});

// Get single endpoint
router.get('/:id', requirePermission('webhook:read'), async (req, res, next) => {
  try {
    const endpoint = await prisma.webhookEndpoint.findFirst({
      where: { id: req.params.id, tenantId: req.tenant!.id },
      include: {
        deliveries: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!endpoint) {
      throw new NotFoundError('Webhook endpoint not found');
    }

    const { secret, ...safeEndpoint } = endpoint;
    sendSuccess(res, safeEndpoint);
  } catch (error) {
    next(error);
  }
});

// Create webhook endpoint
router.post('/', webhookLimiter, requirePermission('webhook:create'), async (req, res, next) => {
  try {
    const tenantId = req.tenant!.id;
    const { url, events, description } = req.body;

    // Generate secret
    const secret = crypto.randomBytes(32).toString('hex');

    const endpoint = await prisma.webhookEndpoint.create({
      data: {
        tenantId,
        userId: req.user!.id,
        url,
        secret,
        events,
        description,
        isActive: true,
      },
    });

    // Return secret only on creation
    sendCreated(res, endpoint);
  } catch (error) {
    next(error);
  }
});

// Update webhook endpoint
router.put('/:id', requirePermission('webhook:update'), async (req, res, next) => {
  try {
    const endpoint = await prisma.webhookEndpoint.findFirst({
      where: { id: req.params.id, tenantId: req.tenant!.id },
    });

    if (!endpoint) {
      throw new NotFoundError('Webhook endpoint not found');
    }

    const { url, events, description, isActive } = req.body;

    const updated = await prisma.webhookEndpoint.update({
      where: { id: req.params.id },
      data: {
        url,
        events,
        description,
        isActive,
      },
    });

    const { secret, ...safeEndpoint } = updated;
    sendSuccess(res, safeEndpoint);
  } catch (error) {
    next(error);
  }
});

// Regenerate secret
router.post('/:id/regenerate-secret', requirePermission('webhook:update'), async (req, res, next) => {
  try {
    const endpoint = await prisma.webhookEndpoint.findFirst({
      where: { id: req.params.id, tenantId: req.tenant!.id },
    });

    if (!endpoint) {
      throw new NotFoundError('Webhook endpoint not found');
    }

    const secret = crypto.randomBytes(32).toString('hex');

    const updated = await prisma.webhookEndpoint.update({
      where: { id: req.params.id },
      data: { secret },
    });

    // Return new secret
    sendSuccess(res, { secret: updated.secret });
  } catch (error) {
    next(error);
  }
});

// Delete webhook endpoint
router.delete('/:id', requirePermission('webhook:delete'), async (req, res, next) => {
  try {
    const endpoint = await prisma.webhookEndpoint.findFirst({
      where: { id: req.params.id, tenantId: req.tenant!.id },
    });

    if (!endpoint) {
      throw new NotFoundError('Webhook endpoint not found');
    }

    await prisma.webhookEndpoint.delete({ where: { id: req.params.id } });
    sendNoContent(res);
  } catch (error) {
    next(error);
  }
});

// List deliveries
router.get('/:id/deliveries', requirePermission('webhook:read'), async (req, res, next) => {
  try {
    const deliveries = await prisma.webhookDelivery.findMany({
      where: { endpointId: req.params.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    sendSuccess(res, deliveries);
  } catch (error) {
    next(error);
  }
});

export default router;
