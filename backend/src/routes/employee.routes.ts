import { Router } from 'express';
import { employeeController } from '../controllers/employee.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { tenantMiddleware } from '../middleware/tenant.middleware.js';
import { requirePermission } from '../middleware/rbac.middleware.js';
import { validateBody, validateQuery } from '../middleware/validation.middleware.js';
import {
  createEmployeeSchema,
  updateEmployeeSchema,
  assignDepartmentSchema,
  assignAreaSchema,
  updateStatusSchema,
  employeeQuerySchema,
} from '../schemas/employee.schema.js';

const router = Router();

router.use(authMiddleware);
router.use(tenantMiddleware);

// List employees
router.get(
  '/',
  requirePermission('employee:read'),
  validateQuery(employeeQuerySchema),
  employeeController.findAll.bind(employeeController)
);

// Get employee statistics
router.get(
  '/stats',
  requirePermission('employee:read'),
  employeeController.getStatistics.bind(employeeController)
);

// Get employees by department
router.get(
  '/by-department/:departmentId',
  requirePermission('employee:read'),
  employeeController.getByDepartment.bind(employeeController)
);

// Get employees by ward
router.get(
  '/by-ward/:wardId',
  requirePermission('employee:read'),
  employeeController.getByWard.bind(employeeController)
);

// Get single employee
router.get(
  '/:id',
  requirePermission('employee:read'),
  employeeController.findById.bind(employeeController)
);

// Create employee
router.post(
  '/',
  requirePermission('employee:create'),
  validateBody(createEmployeeSchema),
  employeeController.create.bind(employeeController)
);

// Update employee
router.put(
  '/:id',
  requirePermission('employee:update'),
  validateBody(updateEmployeeSchema),
  employeeController.update.bind(employeeController)
);

// Assign department
router.patch(
  '/:id/department',
  requirePermission('employee:update'),
  validateBody(assignDepartmentSchema),
  employeeController.assignDepartment.bind(employeeController)
);

// Assign area (zone/circle/ward)
router.patch(
  '/:id/area',
  requirePermission('employee:update'),
  validateBody(assignAreaSchema),
  employeeController.assignArea.bind(employeeController)
);

// Update status
router.patch(
  '/:id/status',
  requirePermission('employee:update'),
  validateBody(updateStatusSchema),
  employeeController.updateStatus.bind(employeeController)
);

// Delete employee
router.delete(
  '/:id',
  requirePermission('employee:delete'),
  employeeController.delete.bind(employeeController)
);

export default router;
