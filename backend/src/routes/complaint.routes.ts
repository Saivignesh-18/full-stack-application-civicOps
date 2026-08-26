import { Router } from 'express';
import { complaintController } from '../controllers/complaint.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { tenantMiddleware } from '../middleware/tenant.middleware.js';
import { requirePermission, requireAnyPermission } from '../middleware/rbac.middleware.js';
import { complaintCreateLimiter } from '../middleware/rateLimit.middleware.js';
import { validateBody, validateQuery } from '../middleware/validation.middleware.js';
import {
  createComplaintSchema,
  updateComplaintSchema,
  updateComplaintStatusSchema,
  assignComplaintSchema,
  complaintQuerySchema,
} from '../schemas/complaint.schema.js';

const router = Router();

// All routes require authentication and tenant context
router.use(authMiddleware);
router.use(tenantMiddleware);

// Citizen's own complaints
router.get(
  '/mine',
  requirePermission('complaint:read'),
  validateQuery(complaintQuerySchema),
  complaintController.findMine.bind(complaintController)
);

// Create complaint
router.post(
  '/',
  complaintCreateLimiter,
  requirePermission('complaint:create'),
  validateBody(createComplaintSchema),
  complaintController.create.bind(complaintController)
);

// List all complaints (for officers/admins)
router.get(
  '/',
  requirePermission('complaint:read'),
  validateQuery(complaintQuerySchema),
  complaintController.findAll.bind(complaintController)
);

// Get single complaint
router.get(
  '/:id',
  requirePermission('complaint:read'),
  complaintController.findById.bind(complaintController)
);

// Update complaint
router.put(
  '/:id',
  requirePermission('complaint:update'),
  validateBody(updateComplaintSchema),
  complaintController.update.bind(complaintController)
);

// Update complaint status
router.patch(
  '/:id/status',
  requireAnyPermission(['complaint:update', 'complaint:resolve']),
  validateBody(updateComplaintStatusSchema),
  complaintController.updateStatus.bind(complaintController)
);

// Assign complaint
router.patch(
  '/:id/assign',
  requirePermission('complaint:assign'),
  validateBody(assignComplaintSchema),
  complaintController.assign.bind(complaintController)
);

// Delete complaint
router.delete(
  '/:id',
  requirePermission('complaint:delete'),
  complaintController.delete.bind(complaintController)
);

// Get complaint timeline
router.get(
  '/:id/timeline',
  requirePermission('complaint:read'),
  complaintController.getTimeline.bind(complaintController)
);

// Get complaint statistics
router.get(
  '/stats/summary',
  requirePermission('complaint:read'),
  complaintController.getStatistics.bind(complaintController)
);

// Escalate complaint
router.patch(
  '/:id/escalate',
  requirePermission('complaint:update'),
  complaintController.escalate.bind(complaintController)
);

export default router;
