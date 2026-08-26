import { Router } from 'express';
import { citizenController } from '../controllers/citizen.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { tenantMiddleware } from '../middleware/tenant.middleware.js';
import { requirePermission, requireRole } from '../middleware/rbac.middleware.js';
import { validateBody, validateQuery } from '../middleware/validation.middleware.js';
import {
  createCitizenSchema,
  updateCitizenSchema,
  citizenQuerySchema,
} from '../schemas/citizen.schema.js';

const router = Router();

router.use(authMiddleware);
router.use(tenantMiddleware);

// Profile routes for logged-in citizen
router.get(
  '/profile',
  requireRole('CITIZEN'),
  citizenController.getMyProfile.bind(citizenController)
);

router.put(
  '/profile',
  requireRole('CITIZEN'),
  validateBody(updateCitizenSchema),
  citizenController.updateMyProfile.bind(citizenController)
);

// Admin routes
router.get(
  '/',
  requirePermission('citizen:read'),
  validateQuery(citizenQuerySchema),
  citizenController.findAll.bind(citizenController)
);

router.get(
  '/stats',
  requirePermission('citizen:read'),
  citizenController.getStatistics.bind(citizenController)
);

router.get(
  '/:id',
  requirePermission('citizen:read'),
  citizenController.findById.bind(citizenController)
);

router.post(
  '/',
  requirePermission('citizen:create'),
  validateBody(createCitizenSchema),
  citizenController.create.bind(citizenController)
);

router.put(
  '/:id',
  requirePermission('citizen:update'),
  validateBody(updateCitizenSchema),
  citizenController.update.bind(citizenController)
);

router.delete(
  '/:id',
  requirePermission('citizen:delete'),
  citizenController.delete.bind(citizenController)
);

export default router;
