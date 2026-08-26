import { z } from 'zod';

export const createCitizenSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8).optional(),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().optional(),
  address: z.string().optional(),
  wardId: z.string().optional(),
  aadhaarNumber: z.string().length(12, 'Aadhaar must be 12 digits').optional(),
  dateOfBirth: z.string().optional().transform((val) => val ? new Date(val) : undefined),
});

export const updateCitizenSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  wardId: z.string().optional(),
  aadhaarNumber: z.string().length(12).optional(),
  dateOfBirth: z.string().optional().transform((val) => val ? new Date(val) : undefined),
});

export const citizenQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  search: z.string().optional(),
  wardId: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export type CreateCitizenInput = z.infer<typeof createCitizenSchema>;
export type UpdateCitizenInput = z.infer<typeof updateCitizenSchema>;
export type CitizenQueryInput = z.infer<typeof citizenQuerySchema>;
