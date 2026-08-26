import { Router } from 'express';
import { licenseController } from '../controllers/license.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { tenantMiddleware } from '../middleware/tenant.middleware.js';
import { requirePermission, requireAnyPermission } from '../middleware/rbac.middleware.js';
import { validateBody, validateQuery } from '../middleware/validation.middleware.js';
import {
  createLicenseSchema,
  updateLicenseSchema,
  scheduleInspectionSchema,
  completeInspectionSchema,
  rejectLicenseSchema,
  payFeeSchema,
  cancelLicenseSchema,
  licenseQuerySchema,
} from '../schemas/license.schema.js';

const router = Router();

router.use(authMiddleware);
router.use(tenantMiddleware);

// Statistics
router.get(
  '/stats',
  requirePermission('license:read'),
  licenseController.getStatistics.bind(licenseController)
);

// List trade licenses
router.get(
  '/',
  requirePermission('license:read'),
  validateQuery(licenseQuerySchema),
  licenseController.findAll.bind(licenseController)
);

// Get single license
router.get(
  '/:id',
  requirePermission('license:read'),
  licenseController.findById.bind(licenseController)
);

// Create/Apply for trade license
router.post(
  '/',
  requirePermission('license:create'),
  validateBody(createLicenseSchema),
  licenseController.create.bind(licenseController)
);

// Update license (draft/submitted only)
router.put(
  '/:id',
  requirePermission('license:update'),
  validateBody(updateLicenseSchema),
  licenseController.update.bind(licenseController)
);

// Submit application
router.post(
  '/:id/submit',
  requirePermission('license:create'),
  licenseController.submit.bind(licenseController)
);

// Start document review (officer)
router.post(
  '/:id/document-review',
  requirePermission('license:update'),
  licenseController.startDocumentReview.bind(licenseController)
);

// Schedule inspection (officer)
router.post(
  '/:id/schedule-inspection',
  requirePermission('license:update'),
  validateBody(scheduleInspectionSchema),
  licenseController.scheduleInspection.bind(licenseController)
);

// Complete inspection (inspector)
router.post(
  '/:id/complete-inspection',
  requirePermission('license:update'),
  validateBody(completeInspectionSchema),
  licenseController.completeInspection.bind(licenseController)
);

// Approve license
router.post(
  '/:id/approve',
  requirePermission('license:approve'),
  licenseController.approve.bind(licenseController)
);

// Reject license
router.post(
  '/:id/reject',
  requirePermission('license:reject'),
  validateBody(rejectLicenseSchema),
  licenseController.reject.bind(licenseController)
);

// Pay fee
router.post(
  '/:id/pay',
  requirePermission('license:read'),
  validateBody(payFeeSchema),
  licenseController.payFee.bind(licenseController)
);

// Renew license
router.post(
  '/:id/renew',
  requirePermission('license:create'),
  licenseController.renew.bind(licenseController)
);

// Cancel license
router.post(
  '/:id/cancel',
  requirePermission('license:update'),
  validateBody(cancelLicenseSchema),
  licenseController.cancel.bind(licenseController)
);

export default router;
