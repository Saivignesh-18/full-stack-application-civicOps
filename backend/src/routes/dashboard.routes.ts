import { Router } from 'express';
import { dashboardController } from '../controllers/dashboard.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { tenantMiddleware } from '../middleware/tenant.middleware.js';
import { requirePermission } from '../middleware/rbac.middleware.js';

const router = Router();

router.use(authMiddleware);
router.use(tenantMiddleware);

// Overview statistics
router.get(
  '/overview',
  requirePermission('dashboard:read'),
  dashboardController.getOverview.bind(dashboardController)
);

// Complaint analytics
router.get(
  '/complaints',
  requirePermission('dashboard:read'),
  dashboardController.getComplaintAnalytics.bind(dashboardController)
);

// Revenue analytics
router.get(
  '/revenue',
  requirePermission('dashboard:read'),
  dashboardController.getRevenueAnalytics.bind(dashboardController)
);

// Budget analytics
router.get(
  '/budget',
  requirePermission('dashboard:read'),
  dashboardController.getBudgetAnalytics.bind(dashboardController)
);

// Recent activity
router.get(
  '/activity',
  requirePermission('dashboard:read'),
  dashboardController.getRecentActivity.bind(dashboardController)
);

// Ward-wise statistics
router.get(
  '/ward-stats',
  requirePermission('dashboard:read'),
  dashboardController.getWardWiseStats.bind(dashboardController)
);

export default router;
