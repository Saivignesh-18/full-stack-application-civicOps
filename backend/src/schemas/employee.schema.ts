import { z } from 'zod';

export const createEmployeeSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8).optional(),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  employeeCode: z.string().min(1, 'Employee code is required'),
  designation: z.string().min(1, 'Designation is required'),
  phone: z.string().optional(),
  departmentId: z.string().min(1, 'Department is required'),
  zoneId: z.string().optional(),
  circleId: z.string().optional(),
  wardId: z.string().optional(),
  joiningDate: z.string().optional().transform((val) => val ? new Date(val) : undefined),
  role: z.enum([
    'COMMISSIONER',
    'ZONAL_OFFICER',
    'DEPARTMENT_OFFICER',
    'FIELD_OFFICER',
    'EMPLOYEE',
  ]).optional(),
});

export const updateEmployeeSchema = z.object({
  name: z.string().min(2).optional(),
  designation: z.string().optional(),
  phone: z.string().optional(),
  departmentId: z.string().optional(),
  zoneId: z.string().optional(),
  circleId: z.string().optional(),
  wardId: z.string().optional(),
});

export const assignDepartmentSchema = z.object({
  departmentId: z.string().min(1, 'Department ID is required'),
});

export const assignAreaSchema = z.object({
  zoneId: z.string().optional(),
  circleId: z.string().optional(),
  wardId: z.string().optional(),
});

export const updateStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'TERMINATED']),
});

export const employeeQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  search: z.string().optional(),
  departmentId: z.string().optional(),
  zoneId: z.string().optional(),
  circleId: z.string().optional(),
  wardId: z.string().optional(),
  status: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
export type EmployeeQueryInput = z.infer<typeof employeeQuerySchema>;
