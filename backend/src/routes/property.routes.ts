import { Router } from 'express';
import { propertyController } from '../controllers/property.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { tenantMiddleware } from '../middleware/tenant.middleware.js';
import { requirePermission, requireRole } from '../middleware/rbac.middleware.js';
import { validateBody, validateQuery } from '../middleware/validation.middleware.js';
import {
  createPropertySchema,
  updatePropertySchema,
  payTaxSchema,
  calculateTaxSchema,
  propertyQuerySchema,
} from '../schemas/property.schema.js';

const router = Router();

router.use(authMiddleware);
router.use(tenantMiddleware);

// Citizen's own properties
router.get(
  '/mine',
  requireRole('CITIZEN'),
  propertyController.findMyProperties.bind(propertyController)
);

// Calculate tax (utility endpoint)
router.post(
  '/calculate-tax',
  requirePermission('property:read'),
  validateBody(calculateTaxSchema),
  propertyController.calculateTax.bind(propertyController)
);

// Statistics
router.get(
  '/stats',
  requirePermission('property:read'),
  propertyController.getStatistics.bind(propertyController)
);

// List properties
router.get(
  '/',
  requirePermission('property:read'),
  validateQuery(propertyQuerySchema),
  propertyController.findAll.bind(propertyController)
);

// Get single property
router.get(
  '/:id',
  requirePermission('property:read'),
  propertyController.findById.bind(propertyController)
);

// Create property
router.post(
  '/',
  requirePermission('property:create'),
  validateBody(createPropertySchema),
  propertyController.create.bind(propertyController)
);

// Update property
router.put(
  '/:id',
  requirePermission('property:update'),
  validateBody(updatePropertySchema),
  propertyController.update.bind(propertyController)
);

// Delete property
router.delete(
  '/:id',
  requirePermission('property:delete'),
  propertyController.delete.bind(propertyController)
);

// Tax operations
router.get(
  '/:id/tax-due',
  requirePermission('property:read'),
  propertyController.getTaxDue.bind(propertyController)
);

router.get(
  '/:id/payment-history',
  requirePermission('property:read'),
  propertyController.getPaymentHistory.bind(propertyController)
);

router.post(
  '/:id/pay-tax',
  requirePermission('property:read'),
  validateBody(payTaxSchema),
  propertyController.payTax.bind(propertyController)
);

export default router;
