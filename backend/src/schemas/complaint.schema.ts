import { z } from 'zod';

export const createComplaintSchema = z.object({
  category: z.string().min(1, 'Category is required'),
  subCategory: z.string().optional(),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  address: z.string().min(10, 'Address must be at least 10 characters'),
  landmark: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  wardId: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
});

export const updateComplaintSchema = z.object({
  category: z.string().optional(),
  subCategory: z.string().optional(),
  description: z.string().min(20).optional(),
  address: z.string().min(10).optional(),
  landmark: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
});

export const updateComplaintStatusSchema = z.object({
  status: z.enum([
    'CREATED',
    'ASSIGNED',
    'IN_PROGRESS',
    'INSPECTION',
    'RESOLVED',
    'CITIZEN_VERIFICATION',
    'CLOSED',
    'REOPENED',
    'REJECTED',
  ]),
  comment: z.string().optional(),
});

export const assignComplaintSchema = z.object({
  assignedToId: z.string().min(1, 'Assignee is required'),
  departmentId: z.string().optional(),
  comment: z.string().optional(),
});

export const complaintQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  category: z.string().optional(),
  wardId: z.string().optional(),
  departmentId: z.string().optional(),
  assignedToId: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export type CreateComplaintInput = z.infer<typeof createComplaintSchema>;
export type UpdateComplaintInput = z.infer<typeof updateComplaintSchema>;
export type UpdateComplaintStatusInput = z.infer<typeof updateComplaintStatusSchema>;
export type AssignComplaintInput = z.infer<typeof assignComplaintSchema>;
export type ComplaintQueryInput = z.infer<typeof complaintQuerySchema>;
